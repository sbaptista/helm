-- 00.04.0051: Copy to Trip for selected records (A5 release 2).
-- docs/bulk-selection-plan.md, D5.
--
-- copy_records(source, target, user, section, ids, linked_dates) copies the
-- selected records of one section into another trip the user is an advisor
-- on, in one transaction. Nothing in the target is changed or deleted.
--
-- - Copies keep their fields; Google Calendar is reset (off, no event ids).
-- - A record that matches one already in the target is skipped:
--     flights         same flight number and departure time
--     hotels          same name and check-in date
--     restaurants     same name and reservation time
--     transportation  same type, origin, destination and departure time
--     itinerary_rows  same title and start time on the same date
--     key_info        same label in the same group
--     checklist       same task in the same group
--     packing         same text in the same person, category and sub-group
-- - Groups, categories and sub-groups are matched by name (case-insensitive,
--   trimmed) and created when missing. Itinerary rows go to the target's day
--   with the same date, inserted ("[Inserted day]") when missing; so are the
--   days in p_linked_dates (travel records shown in the Itinerary), as
--   ensureDaysForLinkedRecord does.
-- - Checklist copies start Open with no due date, reference or resolution, and
--   packing copies start unpacked, as copy_checklist and copy_packing_list do.
--
-- Returns { copied, skipped, days, groups }. Idempotent (create or replace).

create or replace function public.copy_records(
  p_source_trip_id uuid,
  p_target_trip_id uuid,
  p_user_id uuid,
  p_section text,
  p_ids uuid[],
  p_linked_dates date[] default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source record;
  v_new_id uuid;
  v_day_id uuid;
  v_day_date date;
  v_group_id uuid;
  v_subgroup_id uuid;
  v_group_name text;
  v_sort integer;
  v_number integer;
  v_copied integer := 0;
  v_skipped integer := 0;
  v_days integer := 0;
  v_groups integer := 0;
  v_count integer;
begin
  if p_source_trip_id = p_target_trip_id then
    raise exception 'Choose a different trip to copy to.';
  end if;

  if p_section not in ('flights', 'hotels', 'restaurants', 'transportation',
                       'itinerary_rows', 'key_info', 'checklist', 'packing') then
    raise exception 'Unknown section.';
  end if;

  if p_ids is null or cardinality(p_ids) = 0 then
    raise exception 'Nothing selected to copy.';
  end if;
  if cardinality(p_ids) > 1000 then
    raise exception 'Too many records selected.';
  end if;

  if (
    select count(distinct trip_id)
    from public.trip_members
    where trip_id in (p_source_trip_id, p_target_trip_id)
      and user_id = p_user_id
      and role = 'advisor'
  ) <> 2 then
    raise exception 'Advisor access to both trips is required.';
  end if;

  if not exists (
    select 1 from public.trips
    where id = p_target_trip_id and deleted_at is null and status <> 'archived'
  ) then
    raise exception 'The destination trip no longer exists.';
  end if;

  -- ── Flights ────────────────────────────────────────────────────────────────
  if p_section = 'flights' then
    for v_source in
      select * from public.flights
      where trip_id = p_source_trip_id and id = any(p_ids) and deleted_at is null
      order by departure_time nulls last, sort_order, id
    loop
      if nullif(btrim(coalesce(v_source.flight_number, '')), '') is not null and exists (
        select 1 from public.flights
        where trip_id = p_target_trip_id and deleted_at is null
          and lower(btrim(flight_number)) = lower(btrim(v_source.flight_number))
          and departure_time is not distinct from v_source.departure_time
      ) then
        v_skipped := v_skipped + 1;
        continue;
      end if;
      insert into public.flights (
        trip_id, flight_number, airline, origin_airport, destination_airport, origin_city,
        destination_city, departure_time, arrival_time, departure_timezone, arrival_timezone,
        cabin_class, seat_number, confirmation_number, notes, departure_terminal,
        departure_gate, arrival_terminal, arrival_gate, action_required, sort_order,
        departure_is_all_day, departure_is_approx, arrival_is_all_day, arrival_is_approx,
        gcal_include, gcal_dirty, gcal_event_id, gcal_legacy_arrival_event_id, show_in_itinerary
      ) values (
        p_target_trip_id, v_source.flight_number, v_source.airline, v_source.origin_airport,
        v_source.destination_airport, v_source.origin_city, v_source.destination_city,
        v_source.departure_time, v_source.arrival_time, v_source.departure_timezone,
        v_source.arrival_timezone, v_source.cabin_class, v_source.seat_number,
        v_source.confirmation_number, v_source.notes, v_source.departure_terminal,
        v_source.departure_gate, v_source.arrival_terminal, v_source.arrival_gate,
        v_source.action_required, v_source.sort_order,
        v_source.departure_is_all_day, v_source.departure_is_approx,
        v_source.arrival_is_all_day, v_source.arrival_is_approx,
        false, false, null, null, v_source.show_in_itinerary
      );
      v_copied := v_copied + 1;
    end loop;

  -- ── Hotels (with their nearby dining) ──────────────────────────────────────
  elsif p_section = 'hotels' then
    for v_source in
      select * from public.hotels
      where trip_id = p_source_trip_id and id = any(p_ids) and deleted_at is null
      order by check_in_date nulls last, sort_order, id
    loop
      if exists (
        select 1 from public.hotels
        where trip_id = p_target_trip_id and deleted_at is null
          and lower(btrim(name)) = lower(btrim(v_source.name))
          and check_in_date is not distinct from v_source.check_in_date
      ) then
        v_skipped := v_skipped + 1;
        continue;
      end if;
      insert into public.hotels (
        trip_id, name, address, city, province, postal_code, check_in_date, check_out_date,
        check_in_time, check_out_time, room_type, confirmation_number, phone, website_url,
        maps_url, notes, action_required, action_note, sort_order, check_in_is_all_day,
        check_in_is_approx, check_out_is_all_day, check_out_is_approx, gcal_include,
        gcal_dirty, gcal_checkin_event_id, gcal_checkout_event_id, show_in_itinerary,
        timezone, country
      ) values (
        p_target_trip_id, v_source.name, v_source.address, v_source.city, v_source.province,
        v_source.postal_code, v_source.check_in_date, v_source.check_out_date,
        v_source.check_in_time, v_source.check_out_time, v_source.room_type,
        v_source.confirmation_number, v_source.phone, v_source.website_url, v_source.maps_url,
        v_source.notes, v_source.action_required, v_source.action_note, v_source.sort_order,
        v_source.check_in_is_all_day, v_source.check_in_is_approx,
        v_source.check_out_is_all_day, v_source.check_out_is_approx,
        false, false, null, null, v_source.show_in_itinerary,
        v_source.timezone, v_source.country
      ) returning id into v_new_id;

      insert into public.nearby_dining (hotel_id, trip_id, name, url, walk, meals, note, sort_order)
      select v_new_id, p_target_trip_id, name, url, walk, meals, note, sort_order
      from public.nearby_dining
      where hotel_id = v_source.id;

      v_copied := v_copied + 1;
    end loop;

  -- ── Restaurants ────────────────────────────────────────────────────────────
  elsif p_section = 'restaurants' then
    for v_source in
      select * from public.restaurants
      where trip_id = p_source_trip_id and id = any(p_ids) and deleted_at is null
      order by reservation_time nulls last, sort_order, id
    loop
      if exists (
        select 1 from public.restaurants
        where trip_id = p_target_trip_id and deleted_at is null
          and lower(btrim(coalesce(name, ''))) = lower(btrim(coalesce(v_source.name, '')))
          and reservation_time is not distinct from v_source.reservation_time
      ) then
        v_skipped := v_skipped + 1;
        continue;
      end if;
      insert into public.restaurants (
        trip_id, name, display_label, type, cuisine, style, address, city, state_province,
        postal_code, reservation_time, party_size, confirmation_number, reservation_status,
        confirmed, included, booking_source, booking_url, phone, email, website_url,
        maps_url, notes, action_required, action_note, sort_order, reservation_is_all_day,
        reservation_is_approx, gcal_include, gcal_dirty, gcal_event_id, show_in_itinerary,
        timezone, country
      ) values (
        p_target_trip_id, v_source.name, v_source.display_label, v_source.type, v_source.cuisine,
        v_source.style, v_source.address, v_source.city, v_source.state_province,
        v_source.postal_code, v_source.reservation_time, v_source.party_size,
        v_source.confirmation_number, v_source.reservation_status, v_source.confirmed,
        v_source.included, v_source.booking_source, v_source.booking_url, v_source.phone,
        v_source.email, v_source.website_url, v_source.maps_url, v_source.notes,
        v_source.action_required, v_source.action_note, v_source.sort_order,
        v_source.reservation_is_all_day, v_source.reservation_is_approx,
        false, false, null, v_source.show_in_itinerary,
        v_source.timezone, v_source.country
      );
      v_copied := v_copied + 1;
    end loop;

  -- ── Transportation ─────────────────────────────────────────────────────────
  elsif p_section = 'transportation' then
    for v_source in
      select * from public.transportation
      where trip_id = p_source_trip_id and id = any(p_ids) and deleted_at is null
      order by departure_time nulls last, sort_order, id
    loop
      if exists (
        select 1 from public.transportation
        where trip_id = p_target_trip_id and deleted_at is null
          and lower(btrim(coalesce(type, ''))) = lower(btrim(coalesce(v_source.type, '')))
          and lower(btrim(coalesce(origin, ''))) = lower(btrim(coalesce(v_source.origin, '')))
          and lower(btrim(coalesce(destination, ''))) = lower(btrim(coalesce(v_source.destination, '')))
          and departure_time is not distinct from v_source.departure_time
      ) then
        v_skipped := v_skipped + 1;
        continue;
      end if;
      insert into public.transportation (
        trip_id, type, provider, origin, destination, departure_time, arrival_time,
        departure_timezone, arrival_timezone, confirmation_number, notes, phone,
        website_url, cost, included, action_required, action_note, sort_order,
        pickup_is_all_day, pickup_is_approx, gcal_include, gcal_dirty, gcal_event_id, show_in_itinerary
      ) values (
        p_target_trip_id, v_source.type, v_source.provider, v_source.origin, v_source.destination,
        v_source.departure_time, v_source.arrival_time, v_source.departure_timezone,
        v_source.arrival_timezone, v_source.confirmation_number, v_source.notes, v_source.phone,
        v_source.website_url, v_source.cost, v_source.included, v_source.action_required,
        v_source.action_note, v_source.sort_order, v_source.pickup_is_all_day,
        v_source.pickup_is_approx, false, false, null, v_source.show_in_itinerary
      );
      v_copied := v_copied + 1;
    end loop;

  -- ── Itinerary rows: onto the target's day with the same date ───────────────
  elsif p_section = 'itinerary_rows' then
    for v_source in
      select r.*, d.day_date as source_day_date
      from public.itinerary_rows r
      join public.itinerary_days d on d.id = r.day_id
      where r.trip_id = p_source_trip_id and r.id = any(p_ids) and r.deleted_at is null
      order by d.day_date nulls last, r.start_time nulls first, r.sort_order, r.id
    loop
      v_day_date := v_source.source_day_date;
      if v_day_date is null then
        v_skipped := v_skipped + 1;
        continue;
      end if;

      v_day_id := null;
      select id into v_day_id
      from public.itinerary_days
      where trip_id = p_target_trip_id and deleted_at is null and day_date = v_day_date
      order by sort_order, id
      limit 1;

      if v_day_id is not null and exists (
        select 1 from public.itinerary_rows
        where trip_id = p_target_trip_id and deleted_at is null and day_id = v_day_id
          and lower(btrim(title)) = lower(btrim(v_source.title))
          and start_time is not distinct from v_source.start_time
      ) then
        v_skipped := v_skipped + 1;
        continue;
      end if;

      if v_day_id is null then
        insert into public.itinerary_days (trip_id, day_date, title)
        values (p_target_trip_id, v_day_date, '[Inserted day]')
        returning id into v_day_id;
        v_days := v_days + 1;
      end if;

      insert into public.itinerary_rows (
        day_id, trip_id, title, start_time, end_time, start_timezone, end_timezone,
        is_all_day, is_approx, is_provided, description, location, category,
        action_required, action_note, sort_order, gcal_include, gcal_dirty, gcal_event_id
      ) values (
        v_day_id, p_target_trip_id, v_source.title, v_source.start_time, v_source.end_time,
        v_source.start_timezone, v_source.end_timezone, v_source.is_all_day, v_source.is_approx,
        v_source.is_provided, v_source.description, v_source.location, v_source.category,
        v_source.action_required, v_source.action_note, v_source.sort_order, false, false, null
      );
      v_copied := v_copied + 1;
    end loop;

  -- ── Key Info: into the group with the same name ────────────────────────────
  elsif p_section = 'key_info' then
    for v_source in
      select k.*, g.name as source_group_name
      from public.key_info k
      left join public.key_info_groups g on g.id = k.group_id
      where k.trip_id = p_source_trip_id and k.id = any(p_ids) and k.deleted_at is null
      order by g.sort_order nulls last, k.sort_order, k.id
    loop
      v_group_id := null;
      v_group_name := nullif(btrim(coalesce(v_source.source_group_name, '')), '');
      if v_group_name is not null then
        select id into v_group_id
        from public.key_info_groups
        where trip_id = p_target_trip_id and deleted_at is null
          and lower(btrim(name)) = lower(v_group_name)
        order by sort_order, id
        limit 1;
      end if;

      if exists (
        select 1 from public.key_info
        where trip_id = p_target_trip_id and deleted_at is null
          and group_id is not distinct from v_group_id
          and lower(btrim(label)) = lower(btrim(v_source.label))
      ) and (v_group_name is null or v_group_id is not null) then
        v_skipped := v_skipped + 1;
        continue;
      end if;

      if v_group_name is not null and v_group_id is null then
        select coalesce(max(sort_order), 0) + 1 into v_sort
        from public.key_info_groups
        where trip_id = p_target_trip_id and deleted_at is null;
        insert into public.key_info_groups (trip_id, name, sort_order)
        values (p_target_trip_id, v_group_name, v_sort)
        returning id into v_group_id;
        v_groups := v_groups + 1;
      end if;

      select coalesce(max(sort_order), 0) + 1 into v_sort
      from public.key_info
      where trip_id = p_target_trip_id and deleted_at is null
        and group_id is not distinct from v_group_id;

      insert into public.key_info (
        trip_id, group_id, category, label, value, url, url_label,
        show_in_overview, action_required, action_note, sort_order
      ) values (
        p_target_trip_id, v_group_id, v_source.category, v_source.label, v_source.value,
        v_source.url, v_source.url_label, v_source.show_in_overview,
        v_source.action_required, v_source.action_note, v_sort
      );
      v_copied := v_copied + 1;
    end loop;

  -- ── Checklist: into the group with the same name (as copy_checklist) ───────
  elsif p_section = 'checklist' then
    for v_source in
      select * from public.checklist
      where trip_id = p_source_trip_id and id = any(p_ids) and deleted_at is null
      order by item_number, id
    loop
      v_group_name := nullif(btrim(coalesce(v_source.group_name, '')), '');
      if v_group_name is not null then
        select name into v_group_name
        from (
          select name, sort_order, id from public.checklist_groups
          where trip_id = p_target_trip_id and lower(btrim(name)) = lower(v_group_name)
          order by sort_order, id
          limit 1
        ) found;
        if v_group_name is null then
          v_group_name := btrim(v_source.group_name);
          select coalesce(max(sort_order), 0) + 10 into v_sort
          from public.checklist_groups
          where trip_id = p_target_trip_id;
          insert into public.checklist_groups (trip_id, name, sort_order)
          values (p_target_trip_id, v_group_name, v_sort);
          v_groups := v_groups + 1;
        end if;
      end if;

      if exists (
        select 1 from public.checklist
        where trip_id = p_target_trip_id and deleted_at is null
          and group_name is not distinct from v_group_name
          and lower(btrim(task)) = lower(btrim(v_source.task))
      ) then
        v_skipped := v_skipped + 1;
        continue;
      end if;

      select coalesce(max(item_number), 0) + 1 into v_number
      from public.checklist
      where trip_id = p_target_trip_id;

      insert into public.checklist (
        trip_id, item_number, task, group_name, due_date, warning_days, notes, ref,
        resolution, action_required, action_note, status, sort_order,
        gcal_include, gcal_dirty
      ) values (
        p_target_trip_id, v_number, v_source.task, v_group_name, null, v_source.warning_days,
        v_source.notes, null, null, v_source.action_required, v_source.action_note, 'open',
        v_source.sort_order, false, false
      );
      v_copied := v_copied + 1;
    end loop;

  -- ── Packing: same person, category and sub-group (as copy_packing_list) ────
  elsif p_section = 'packing' then
    for v_source in
      select p.*, g.name as source_group_name, s.name as source_subgroup_name
      from public.packing p
      join public.packing_groups g on g.id = p.group_id
      left join public.packing_subgroups s on s.id = p.subgroup_id
      where p.trip_id = p_source_trip_id and p.id = any(p_ids) and p.deleted_at is null
      order by g.sort_order, s.sort_order nulls first, p.sort_order, p.id
    loop
      v_group_id := null;
      select id into v_group_id
      from public.packing_groups
      where trip_id = p_target_trip_id and person = v_source.person and deleted_at is null
        and lower(btrim(name)) = lower(btrim(v_source.source_group_name))
      order by sort_order, id
      limit 1;
      if v_group_id is null then
        select coalesce(max(sort_order), 0) + 1 into v_sort
        from public.packing_groups
        where trip_id = p_target_trip_id and person = v_source.person and deleted_at is null;
        insert into public.packing_groups (trip_id, person, name, sort_order)
        values (p_target_trip_id, v_source.person, btrim(v_source.source_group_name), v_sort)
        returning id into v_group_id;
        v_groups := v_groups + 1;
      end if;

      v_subgroup_id := null;
      if v_source.source_subgroup_name is not null then
        select id into v_subgroup_id
        from public.packing_subgroups
        where trip_id = p_target_trip_id and group_id = v_group_id and deleted_at is null
          and lower(btrim(name)) = lower(btrim(v_source.source_subgroup_name))
        order by sort_order, id
        limit 1;
        if v_subgroup_id is null then
          select coalesce(max(sort_order), 0) + 1 into v_sort
          from public.packing_subgroups
          where trip_id = p_target_trip_id and group_id = v_group_id and deleted_at is null;
          insert into public.packing_subgroups (trip_id, group_id, person, name, sort_order)
          values (p_target_trip_id, v_group_id, v_source.person, btrim(v_source.source_subgroup_name), v_sort)
          returning id into v_subgroup_id;
          v_groups := v_groups + 1;
        end if;
      end if;

      if exists (
        select 1 from public.packing
        where trip_id = p_target_trip_id and person = v_source.person and deleted_at is null
          and group_id = v_group_id
          and subgroup_id is not distinct from v_subgroup_id
          and lower(btrim(text)) = lower(btrim(v_source.text))
      ) then
        v_skipped := v_skipped + 1;
        continue;
      end if;

      select coalesce(max(sort_order), 0) + 1 into v_sort
      from public.packing
      where trip_id = p_target_trip_id and person = v_source.person and deleted_at is null
        and group_id = v_group_id
        and subgroup_id is not distinct from v_subgroup_id;

      insert into public.packing (
        trip_id, person, group_id, subgroup_id, text, owned, packed, sort_order
      ) values (
        p_target_trip_id, v_source.person, v_group_id, v_subgroup_id,
        v_source.text, v_source.owned, false, v_sort
      );
      v_copied := v_copied + 1;
    end loop;
  end if;

  -- ── Days the copied travel records need (as ensureDaysForLinkedRecord) ─────
  if v_copied > 0 and p_section in ('flights', 'hotels', 'restaurants', 'transportation') then
    insert into public.itinerary_days (trip_id, day_date, title)
    select distinct p_target_trip_id, d.day_date, '[Inserted day]'
    from unnest(coalesce(p_linked_dates, '{}'::date[])) as d(day_date)
    where d.day_date is not null
      and not exists (
        select 1 from public.itinerary_days x
        where x.trip_id = p_target_trip_id and x.deleted_at is null and x.day_date = d.day_date
      );
    get diagnostics v_count = row_count;
    v_days := v_days + v_count;
  end if;

  return jsonb_build_object('copied', v_copied, 'skipped', v_skipped, 'days', v_days, 'groups', v_groups);
end;
$$;

revoke all on function public.copy_records(uuid, uuid, uuid, text, uuid[], date[]) from public;
revoke all on function public.copy_records(uuid, uuid, uuid, text, uuid[], date[]) from anon;
revoke all on function public.copy_records(uuid, uuid, uuid, text, uuid[], date[]) from authenticated;
grant execute on function public.copy_records(uuid, uuid, uuid, text, uuid[], date[]) to service_role;

-- Check after applying (prosecdef should be true):
-- select proname, prosecdef from pg_proc where proname = 'copy_records';
