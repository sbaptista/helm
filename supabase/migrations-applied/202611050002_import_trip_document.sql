-- 00.04.0032: save an imported trip document in one transaction.
-- 00.04.0037: updates to bookings already on the trip; exact repeats of
-- itinerary items and Key Info skipped.
-- docs/import-fix-plan.md (Step 5), docs/reimport-updates-plan.md
--
-- POST /api/trips/import/confirm prepares every row (timezone lookups, date and
-- time normalisation) and calls this once. Either the whole import is saved or
-- nothing is. trip_id always comes from p_trip_id, never from the payload.
--
-- Payload (jsonb object; every key optional):
--   days            [{ key, day_date, title }]       key links rows to their day
--   rows            [{ day_key, title, start_time, end_time, description, category }]
--   flights, hotels, transportation, restaurants     rows shaped like the tables
--   updates         [{ section, id, fields }]  accepted changes to bookings
--                   already on the trip (only the columns listed below)
--   linked_dates    [date]  days the travel records need (inserted if missing)
--   key_info        [{ category, label, value, url, action_required }]
--   packing         [{ category, sub_group, text }]  saved for Stan
--   checklist       [{ task, group_name, due_date, notes }]
--   flag_resolutions                                 stored in import_jobs.result_json
--
-- Merging: an imported day whose date already has a day reuses it; packing
-- categories and sub-groups and checklist groups with the same name
-- (case-insensitive, trimmed) are reused; packing items and checklist tasks
-- with the same text in the same place are skipped; an itinerary item with the
-- same day, title and start, and a Key Info item with the same label and value,
-- are skipped. Existing bookings change only through `updates`, which Stan
-- accepted field by field; nothing is deleted. Idempotent (create or replace).

create or replace function public.import_trip_document(
  p_trip_id uuid,
  p_user_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_person constant text := 'stan';
  v_item jsonb;
  v_day_ids jsonb := '{}'::jsonb;
  v_day_id uuid;
  v_day_sort integer;
  v_name text;
  v_sub text;
  v_text text;
  v_group_id uuid;
  v_subgroup_id uuid;
  v_sort integer;
  v_number integer;
  v_count integer;
  v_counts jsonb := '{}'::jsonb;
  v_days integer := 0;
  v_days_reused integer := 0;
  v_packed integer := 0;
  v_pack_skipped integer := 0;
  v_tasks integer := 0;
  v_task_skipped integer := 0;
  v_job_error text;
  v_fields jsonb;
  v_updated jsonb := '{}'::jsonb;
  v_rows_total integer := 0;
  v_rows_skipped integer := 0;
  v_key_skipped integer := 0;
begin
  if not exists (
    select 1 from public.trip_members
    where trip_id = p_trip_id and user_id = p_user_id and role = 'advisor'
  ) then
    raise exception 'Advisor access to this trip is required.';
  end if;

  if not exists (
    select 1 from public.trips where id = p_trip_id and status <> 'archived'
  ) then
    raise exception 'This trip is archived or no longer exists.';
  end if;

  -- ── Itinerary days ─────────────────────────────────────────────────────────
  select coalesce(max(sort_order), -1) + 1 into v_day_sort
  from public.itinerary_days where trip_id = p_trip_id and deleted_at is null;

  for v_item in select * from jsonb_array_elements(coalesce(p_payload -> 'days', '[]'::jsonb))
  loop
    v_day_id := null;
    if nullif(v_item ->> 'day_date', '') is not null then
      select id into v_day_id from public.itinerary_days
      where trip_id = p_trip_id and deleted_at is null
        and day_date = (v_item ->> 'day_date')::date
      order by sort_order, id
      limit 1;
    end if;

    if v_day_id is null then
      insert into public.itinerary_days (trip_id, day_date, title, sort_order)
      values (
        p_trip_id,
        nullif(v_item ->> 'day_date', '')::date,
        nullif(btrim(coalesce(v_item ->> 'title', '')), ''),
        v_day_sort
      )
      returning id into v_day_id;
      v_day_sort := v_day_sort + 1;
      v_days := v_days + 1;
    else
      v_days_reused := v_days_reused + 1;
    end if;

    v_day_ids := v_day_ids || jsonb_build_object(v_item ->> 'key', v_day_id::text);
  end loop;
  if v_days + v_days_reused > 0 then
    v_counts := v_counts || jsonb_build_object('itinerary_days', v_days + v_days_reused);
  end if;

  -- ── Itinerary rows (an exact repeat on the same day is skipped) ───────────
  v_rows_total := jsonb_array_length(coalesce(p_payload -> 'rows', '[]'::jsonb));
  insert into public.itinerary_rows (
    trip_id, day_id, title, start_time, end_time, description, category, sort_order
  )
  select p_trip_id, n.day_id, n.title, n.start_time, n.end_time, n.description, n.category, n.sort_order
  from (
    select
      (v_day_ids ->> (r.value ->> 'day_key'))::uuid as day_id,
      nullif(r.value ->> 'title', '') as title,
      nullif(r.value ->> 'start_time', '')::timestamptz as start_time,
      nullif(r.value ->> 'end_time', '')::timestamptz as end_time,
      nullif(r.value ->> 'description', '') as description,
      nullif(r.value ->> 'category', '') as category,
      (r.ordinality - 1)::integer as sort_order
    from jsonb_array_elements(coalesce(p_payload -> 'rows', '[]'::jsonb)) with ordinality as r(value, ordinality)
  ) n
  where not exists (
    select 1 from public.itinerary_rows x
    where x.trip_id = p_trip_id and x.deleted_at is null
      and x.day_id is not distinct from n.day_id
      and lower(btrim(coalesce(x.title, ''))) = lower(btrim(coalesce(n.title, '')))
      and x.start_time is not distinct from n.start_time
  );
  get diagnostics v_count = row_count;
  v_rows_skipped := v_rows_total - v_count;
  if v_count > 0 then v_counts := v_counts || jsonb_build_object('itinerary_rows', v_count); end if;

  -- ── Flights ────────────────────────────────────────────────────────────────
  insert into public.flights (
    trip_id, flight_number, airline, origin_airport, destination_airport,
    departure_time, arrival_time, departure_timezone, arrival_timezone,
    confirmation_number, notes, show_in_itinerary
  )
  select
    p_trip_id, f.flight_number, f.airline, f.origin_airport, f.destination_airport,
    f.departure_time, f.arrival_time, f.departure_timezone, f.arrival_timezone,
    f.confirmation_number, f.notes, true
  from jsonb_populate_recordset(null::public.flights, coalesce(p_payload -> 'flights', '[]'::jsonb)) as f;
  get diagnostics v_count = row_count;
  if v_count > 0 then v_counts := v_counts || jsonb_build_object('flights', v_count); end if;

  -- ── Hotels ─────────────────────────────────────────────────────────────────
  insert into public.hotels (
    trip_id, name, address, city, check_in_date, check_out_date,
    confirmation_number, phone, notes, timezone, show_in_itinerary
  )
  select
    p_trip_id, h.name, h.address, h.city, h.check_in_date, h.check_out_date,
    h.confirmation_number, h.phone, h.notes, h.timezone, true
  from jsonb_populate_recordset(null::public.hotels, coalesce(p_payload -> 'hotels', '[]'::jsonb)) as h;
  get diagnostics v_count = row_count;
  if v_count > 0 then v_counts := v_counts || jsonb_build_object('hotels', v_count); end if;

  -- ── Transportation ─────────────────────────────────────────────────────────
  insert into public.transportation (
    trip_id, type, origin, destination, departure_time, arrival_time,
    departure_timezone, arrival_timezone, confirmation_number, notes, show_in_itinerary
  )
  select
    p_trip_id, t.type, t.origin, t.destination, t.departure_time, t.arrival_time,
    t.departure_timezone, t.arrival_timezone, t.confirmation_number, t.notes, true
  from jsonb_populate_recordset(null::public.transportation, coalesce(p_payload -> 'transportation', '[]'::jsonb)) as t;
  get diagnostics v_count = row_count;
  if v_count > 0 then v_counts := v_counts || jsonb_build_object('transportation', v_count); end if;

  -- ── Restaurants ────────────────────────────────────────────────────────────
  insert into public.restaurants (
    trip_id, name, address, city, reservation_time, confirmation_number,
    type, notes, timezone, show_in_itinerary
  )
  select
    p_trip_id, r.name, r.address, r.city, r.reservation_time, r.confirmation_number,
    r.type, r.notes, r.timezone, true
  from jsonb_populate_recordset(null::public.restaurants, coalesce(p_payload -> 'restaurants', '[]'::jsonb)) as r;
  get diagnostics v_count = row_count;
  if v_count > 0 then v_counts := v_counts || jsonb_build_object('restaurants', v_count); end if;

  -- ── Updates to bookings already on the trip ────────────────────────────────
  -- Only the fields Stan accepted, only these columns. gcal_dirty as the edit
  -- routes set it, so the next Calendar sync moves the event; updated_at comes
  -- from the helm_set_updated_at trigger.
  for v_item in select * from jsonb_array_elements(coalesce(p_payload -> 'updates', '[]'::jsonb))
  loop
    v_fields := coalesce(v_item -> 'fields', '{}'::jsonb);
    case v_item ->> 'section'
      when 'flights' then
        update public.flights f set
          flight_number       = case when v_fields ? 'flight_number'       then v_fields ->> 'flight_number'       else f.flight_number end,
          airline             = case when v_fields ? 'airline'             then v_fields ->> 'airline'             else f.airline end,
          origin_airport      = case when v_fields ? 'origin_airport'      then v_fields ->> 'origin_airport'      else f.origin_airport end,
          destination_airport = case when v_fields ? 'destination_airport' then v_fields ->> 'destination_airport' else f.destination_airport end,
          departure_time      = case when v_fields ? 'departure_time'      then (v_fields ->> 'departure_time')::timestamptz else f.departure_time end,
          arrival_time        = case when v_fields ? 'arrival_time'        then (v_fields ->> 'arrival_time')::timestamptz   else f.arrival_time end,
          departure_timezone  = case when v_fields ? 'departure_timezone'  then v_fields ->> 'departure_timezone'  else f.departure_timezone end,
          arrival_timezone    = case when v_fields ? 'arrival_timezone'    then v_fields ->> 'arrival_timezone'    else f.arrival_timezone end,
          confirmation_number = case when v_fields ? 'confirmation_number' then v_fields ->> 'confirmation_number' else f.confirmation_number end,
          gcal_dirty = f.gcal_dirty or f.gcal_include = true
            or f.gcal_event_id is not null or f.gcal_legacy_arrival_event_id is not null
        where f.id = (v_item ->> 'id')::uuid and f.trip_id = p_trip_id and f.deleted_at is null;
      when 'hotels' then
        update public.hotels h set
          name                = case when v_fields ? 'name'                then v_fields ->> 'name'                else h.name end,
          address             = case when v_fields ? 'address'             then v_fields ->> 'address'             else h.address end,
          city                = case when v_fields ? 'city'                then v_fields ->> 'city'                else h.city end,
          check_in_date       = case when v_fields ? 'check_in_date'       then (v_fields ->> 'check_in_date')::date  else h.check_in_date end,
          check_out_date      = case when v_fields ? 'check_out_date'      then (v_fields ->> 'check_out_date')::date else h.check_out_date end,
          confirmation_number = case when v_fields ? 'confirmation_number' then v_fields ->> 'confirmation_number' else h.confirmation_number end,
          phone               = case when v_fields ? 'phone'               then v_fields ->> 'phone'               else h.phone end,
          timezone            = case when v_fields ? 'timezone'            then v_fields ->> 'timezone'            else h.timezone end,
          gcal_dirty = h.gcal_dirty or h.gcal_include = true
            or h.gcal_checkin_event_id is not null or h.gcal_checkout_event_id is not null
        where h.id = (v_item ->> 'id')::uuid and h.trip_id = p_trip_id and h.deleted_at is null;
      when 'transportation' then
        update public.transportation t set
          type                = case when v_fields ? 'type'                then v_fields ->> 'type'                else t.type end,
          origin              = case when v_fields ? 'origin'              then v_fields ->> 'origin'              else t.origin end,
          destination         = case when v_fields ? 'destination'         then v_fields ->> 'destination'         else t.destination end,
          departure_time      = case when v_fields ? 'departure_time'      then (v_fields ->> 'departure_time')::timestamptz else t.departure_time end,
          arrival_time        = case when v_fields ? 'arrival_time'        then (v_fields ->> 'arrival_time')::timestamptz   else t.arrival_time end,
          departure_timezone  = case when v_fields ? 'departure_timezone'  then v_fields ->> 'departure_timezone'  else t.departure_timezone end,
          arrival_timezone    = case when v_fields ? 'arrival_timezone'    then v_fields ->> 'arrival_timezone'    else t.arrival_timezone end,
          confirmation_number = case when v_fields ? 'confirmation_number' then v_fields ->> 'confirmation_number' else t.confirmation_number end,
          gcal_dirty = t.gcal_dirty or t.gcal_include = true or t.gcal_event_id is not null
        where t.id = (v_item ->> 'id')::uuid and t.trip_id = p_trip_id and t.deleted_at is null;
      when 'restaurants' then
        update public.restaurants r set
          name                = case when v_fields ? 'name'                then v_fields ->> 'name'                else r.name end,
          address             = case when v_fields ? 'address'             then v_fields ->> 'address'             else r.address end,
          city                = case when v_fields ? 'city'                then v_fields ->> 'city'                else r.city end,
          reservation_time    = case when v_fields ? 'reservation_time'    then (v_fields ->> 'reservation_time')::timestamptz else r.reservation_time end,
          type                = case when v_fields ? 'type'                then v_fields ->> 'type'                else r.type end,
          confirmation_number = case when v_fields ? 'confirmation_number' then v_fields ->> 'confirmation_number' else r.confirmation_number end,
          timezone            = case when v_fields ? 'timezone'            then v_fields ->> 'timezone'            else r.timezone end,
          gcal_dirty = r.gcal_dirty or r.gcal_include = true or r.gcal_event_id is not null
        where r.id = (v_item ->> 'id')::uuid and r.trip_id = p_trip_id and r.deleted_at is null;
      else
        raise exception 'Unknown section in import updates: %', v_item ->> 'section';
    end case;

    get diagnostics v_count = row_count;
    if v_count = 0 then
      raise exception 'A booking chosen for an update is no longer on this trip.';
    end if;
    v_updated := v_updated || jsonb_build_object(
      v_item ->> 'section', coalesce((v_updated ->> (v_item ->> 'section'))::integer, 0) + 1
    );
  end loop;

  -- ── Days the travel records need (as ensureDaysForLinkedRecord) ────────────
  insert into public.itinerary_days (trip_id, day_date, title)
  select distinct p_trip_id, d.value::date, '[Inserted day]'
  from jsonb_array_elements_text(coalesce(p_payload -> 'linked_dates', '[]'::jsonb)) as d(value)
  where nullif(d.value, '') is not null
    and not exists (
      select 1 from public.itinerary_days x
      where x.trip_id = p_trip_id and x.deleted_at is null and x.day_date = d.value::date
    );

  -- ── Key Info ───────────────────────────────────────────────────────────────
  -- Items sit in key_info_groups by group_id; the document's category names
  -- the group (matched by name, created when missing). "Urgent" is
  -- action_required, shown as ATTENTION REQUIRED.
  v_count := 0;
  for v_item in select * from jsonb_array_elements(coalesce(p_payload -> 'key_info', '[]'::jsonb))
  loop
    v_text := coalesce(nullif(btrim(coalesce(v_item ->> 'label', '')), ''), nullif(btrim(coalesce(v_item ->> 'value', '')), ''));
    continue when v_text is null;
    v_name := nullif(btrim(coalesce(v_item ->> 'category', '')), '');

    -- The same label and value already on the trip: an exact repeat.
    if exists (
      select 1 from public.key_info
      where trip_id = p_trip_id and deleted_at is null
        and lower(btrim(coalesce(label, ''))) = lower(v_text)
        and lower(btrim(coalesce(value, ''))) = lower(btrim(coalesce(v_item ->> 'value', '')))
    ) then
      v_key_skipped := v_key_skipped + 1;
      continue;
    end if;

    v_group_id := null;
    if v_name is not null then
      select id into v_group_id from public.key_info_groups
      where trip_id = p_trip_id and lower(btrim(name)) = lower(v_name)
      order by sort_order, id
      limit 1;

      if v_group_id is null then
        select coalesce(max(sort_order), 0) + 1 into v_sort
        from public.key_info_groups where trip_id = p_trip_id;

        insert into public.key_info_groups (trip_id, name, sort_order)
        values (p_trip_id, v_name, v_sort)
        returning id into v_group_id;
      end if;
    end if;

    select coalesce(max(sort_order), 0) + 1 into v_sort
    from public.key_info
    where trip_id = p_trip_id and deleted_at is null
      and group_id is not distinct from v_group_id;

    insert into public.key_info (
      trip_id, group_id, category, label, value, url, show_in_overview, action_required, sort_order
    ) values (
      p_trip_id, v_group_id, v_name, v_text,
      coalesce(btrim(v_item ->> 'value'), ''),
      nullif(btrim(coalesce(v_item ->> 'url', '')), ''),
      false,
      coalesce((v_item ->> 'action_required')::boolean, false),
      v_sort
    );
    v_count := v_count + 1;
  end loop;
  if v_count > 0 then v_counts := v_counts || jsonb_build_object('key_info', v_count); end if;

  -- ── Packing (Stan) ─────────────────────────────────────────────────────────
  for v_item in select * from jsonb_array_elements(coalesce(p_payload -> 'packing', '[]'::jsonb))
  loop
    v_text := btrim(coalesce(v_item ->> 'text', ''));
    continue when v_text = '';
    v_name := coalesce(nullif(btrim(coalesce(v_item ->> 'category', '')), ''), 'Imported');
    v_sub := nullif(btrim(coalesce(v_item ->> 'sub_group', '')), '');

    select id into v_group_id from public.packing_groups
    where trip_id = p_trip_id and person = v_person and deleted_at is null
      and lower(btrim(name)) = lower(v_name)
    order by sort_order, id
    limit 1;

    if v_group_id is null then
      select coalesce(max(sort_order), 0) + 1 into v_sort
      from public.packing_groups
      where trip_id = p_trip_id and person = v_person and deleted_at is null;

      insert into public.packing_groups (trip_id, person, name, sort_order)
      values (p_trip_id, v_person, v_name, v_sort)
      returning id into v_group_id;
    end if;

    v_subgroup_id := null;
    if v_sub is not null then
      select id into v_subgroup_id from public.packing_subgroups
      where trip_id = p_trip_id and group_id = v_group_id and deleted_at is null
        and lower(btrim(name)) = lower(v_sub)
      order by sort_order, id
      limit 1;

      if v_subgroup_id is null then
        select coalesce(max(sort_order), 0) + 1 into v_sort
        from public.packing_subgroups
        where trip_id = p_trip_id and group_id = v_group_id and deleted_at is null;

        insert into public.packing_subgroups (trip_id, group_id, person, name, sort_order)
        values (p_trip_id, v_group_id, v_person, v_sub, v_sort)
        returning id into v_subgroup_id;
      end if;
    end if;

    if exists (
      select 1 from public.packing
      where trip_id = p_trip_id and person = v_person and deleted_at is null
        and group_id = v_group_id
        and subgroup_id is not distinct from v_subgroup_id
        and lower(btrim(text)) = lower(v_text)
    ) then
      v_pack_skipped := v_pack_skipped + 1;
      continue;
    end if;

    select coalesce(max(sort_order), 0) + 1 into v_sort
    from public.packing
    where trip_id = p_trip_id and person = v_person and deleted_at is null
      and group_id = v_group_id
      and subgroup_id is not distinct from v_subgroup_id;

    insert into public.packing (trip_id, person, group_id, subgroup_id, text, owned, packed, sort_order)
    values (p_trip_id, v_person, v_group_id, v_subgroup_id, v_text, false, false, v_sort);
    v_packed := v_packed + 1;
  end loop;
  if v_packed > 0 then v_counts := v_counts || jsonb_build_object('packing_items', v_packed); end if;

  -- ── Checklist ──────────────────────────────────────────────────────────────
  for v_item in select * from jsonb_array_elements(coalesce(p_payload -> 'checklist', '[]'::jsonb))
  loop
    v_text := btrim(coalesce(v_item ->> 'task', ''));
    continue when v_text = '';
    v_name := nullif(btrim(coalesce(v_item ->> 'group_name', '')), '');

    if v_name is not null then
      select name into v_sub from public.checklist_groups
      where trip_id = p_trip_id and lower(btrim(name)) = lower(v_name)
      order by sort_order, id
      limit 1;

      if v_sub is null then
        select coalesce(max(sort_order), 0) + 10 into v_sort
        from public.checklist_groups where trip_id = p_trip_id;

        insert into public.checklist_groups (trip_id, name, sort_order)
        values (p_trip_id, v_name, v_sort);
      else
        v_name := v_sub;
      end if;
      v_sub := null;
    end if;

    if exists (
      select 1 from public.checklist
      where trip_id = p_trip_id and deleted_at is null
        and group_name is not distinct from v_name
        and lower(btrim(task)) = lower(v_text)
    ) then
      v_task_skipped := v_task_skipped + 1;
      continue;
    end if;

    select coalesce(max(item_number), 0) + 1, coalesce(max(sort_order), 0) + 1
    into v_number, v_sort
    from public.checklist where trip_id = p_trip_id;

    insert into public.checklist (
      trip_id, item_number, task, group_name, due_date, notes, status, sort_order,
      gcal_include, gcal_dirty
    ) values (
      p_trip_id, v_number, v_text, v_name,
      nullif(v_item ->> 'due_date', '')::date,
      nullif(btrim(coalesce(v_item ->> 'notes', '')), ''),
      'open', v_sort, false, false
    );
    v_tasks := v_tasks + 1;
  end loop;
  if v_tasks > 0 then v_counts := v_counts || jsonb_build_object('checklist_items', v_tasks); end if;

  -- ── Import record ──────────────────────────────────────────────────────────
  -- import_jobs keeps the counts and flag resolutions in result_json. It is a
  -- record, not trip data: if it can't be written, the import still stands and
  -- the error is returned for Logs.
  begin
    insert into public.import_jobs (trip_id, initiated_by, status, result_json)
    values (
      p_trip_id, p_user_id, 'completed',
      jsonb_build_object(
        'section_counts', v_counts,
        'updated', v_updated,
        'skipped', jsonb_build_object(
          'itinerary_days', v_days_reused,
          'itinerary_rows', v_rows_skipped,
          'key_info', v_key_skipped,
          'packing_items', v_pack_skipped,
          'checklist_items', v_task_skipped
        ),
        'flag_resolutions', p_payload -> 'flag_resolutions'
      )
    );
  exception when others then
    v_job_error := sqlerrm;
  end;

  return jsonb_build_object(
    'job_error', v_job_error,
    'counts', v_counts,
    'updated', v_updated,
    'skipped', jsonb_build_object(
      'itinerary_days', v_days_reused,
      'itinerary_rows', v_rows_skipped,
      'key_info', v_key_skipped,
      'packing_items', v_pack_skipped,
      'checklist_items', v_task_skipped
    )
  );
end;
$$;

revoke all on function public.import_trip_document(uuid, uuid, jsonb) from public;
revoke all on function public.import_trip_document(uuid, uuid, jsonb) from anon;
revoke all on function public.import_trip_document(uuid, uuid, jsonb) from authenticated;
grant execute on function public.import_trip_document(uuid, uuid, jsonb) to service_role;

-- Check after applying:
-- select proname, prosecdef from pg_proc where proname = 'import_trip_document';
