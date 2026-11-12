-- Transactionally duplicate one trip's active, user-facing content.
-- Calendar integrations and operational history are deliberately excluded.

create or replace function public.copy_trip(
  p_source_trip_id uuid,
  p_created_by uuid,
  p_title text,
  p_destination text,
  p_departure_date date,
  p_return_date date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_trip_id uuid;
  v_new_id uuid;
  v_source record;
  v_day_map jsonb := '{}'::jsonb;
  v_hotel_map jsonb := '{}'::jsonb;
  v_packing_group_map jsonb := '{}'::jsonb;
  v_packing_subgroup_map jsonb := '{}'::jsonb;
  v_key_info_group_map jsonb := '{}'::jsonb;
begin
  if not exists (
    select 1
    from public.trip_members
    where trip_id = p_source_trip_id
      and user_id = p_created_by
      and role = 'advisor'
  ) then
    raise exception 'Advisor access required to copy this trip.';
  end if;

  if nullif(btrim(p_title), '') is null then
    raise exception 'Trip name is required.';
  end if;
  if nullif(btrim(p_destination), '') is null then
    raise exception 'Destination is required.';
  end if;
  if p_departure_date is null or p_return_date is null or p_return_date <= p_departure_date then
    raise exception 'Return date must be after departure date.';
  end if;

  insert into public.trips (
    tenant_id,
    created_by,
    title,
    destination,
    cover_image_url,
    departure_date,
    return_date,
    permission_preset,
    trip_mode_active,
    trip_mode_override,
    sort_order,
    description,
    status,
    gcal_calendar_id,
    gcal_calendar_name,
    gcal_last_synced_at
  )
  select
    tenant_id,
    p_created_by,
    btrim(p_title),
    btrim(p_destination),
    cover_image_url,
    p_departure_date,
    p_return_date,
    permission_preset,
    false,
    false,
    sort_order,
    description,
    'draft',
    null,
    null,
    null
  from public.trips
  where id = p_source_trip_id
    and deleted_at is null
  returning id into v_new_trip_id;

  if v_new_trip_id is null then
    raise exception 'Source trip not found.';
  end if;

  insert into public.trip_members (trip_id, user_id, role)
  select v_new_trip_id, user_id, role
  from public.trip_members
  where trip_id = p_source_trip_id;

  for v_source in
    select *
    from public.itinerary_days
    where trip_id = p_source_trip_id
      and deleted_at is null
    order by sort_order, day_number, id
  loop
    insert into public.itinerary_days (
      trip_id, day_number, day_date, title, location, notes, sort_order, type
    ) values (
      v_new_trip_id, v_source.day_number, v_source.day_date, v_source.title,
      v_source.location, v_source.notes, v_source.sort_order, v_source.type
    ) returning id into v_new_id;
    v_day_map := v_day_map || jsonb_build_object(v_source.id::text, v_new_id::text);
  end loop;

  for v_source in
    select *
    from public.itinerary_rows
    where trip_id = p_source_trip_id
      and deleted_at is null
    order by sort_order, id
  loop
    if v_day_map ? v_source.day_id::text then
      insert into public.itinerary_rows (
        day_id, trip_id, title, start_time, end_time, start_timezone, end_timezone,
        is_all_day, is_approx, is_provided, description, location, category,
        action_required, action_note, sort_order, gcal_include, gcal_dirty, gcal_event_id
      ) values (
        (v_day_map ->> v_source.day_id::text)::uuid, v_new_trip_id, v_source.title,
        v_source.start_time, v_source.end_time, v_source.start_timezone, v_source.end_timezone,
        v_source.is_all_day, v_source.is_approx, v_source.is_provided, v_source.description,
        v_source.location, v_source.category, v_source.action_required, v_source.action_note,
        v_source.sort_order, false, false, null
      );
    end if;
  end loop;

  insert into public.flights (
    trip_id, flight_number, airline, origin_airport, destination_airport, origin_city,
    destination_city, departure_time, arrival_time, departure_timezone, arrival_timezone,
    cabin_class, seat_number, confirmation_number, notes, departure_terminal,
    departure_gate, arrival_terminal, arrival_gate, action_required, sort_order,
    departure_is_all_day, departure_is_approx, arrival_is_all_day, arrival_is_approx,
    gcal_include, gcal_dirty, gcal_event_id, gcal_legacy_arrival_event_id
  )
  select
    v_new_trip_id, flight_number, airline, origin_airport, destination_airport, origin_city,
    destination_city, departure_time, arrival_time, departure_timezone, arrival_timezone,
    cabin_class, seat_number, confirmation_number, notes, departure_terminal,
    departure_gate, arrival_terminal, arrival_gate, action_required, sort_order,
    departure_is_all_day, departure_is_approx, arrival_is_all_day, arrival_is_approx,
    false, false, null, null
  from public.flights
  where trip_id = p_source_trip_id
    and deleted_at is null;

  for v_source in
    select *
    from public.hotels
    where trip_id = p_source_trip_id
      and deleted_at is null
    order by sort_order, id
  loop
    insert into public.hotels (
      trip_id, name, address, city, province, postal_code, check_in_date, check_out_date,
      check_in_time, check_out_time, room_type, confirmation_number, phone, website_url,
      maps_url, notes, action_required, action_note, sort_order, check_in_is_all_day,
      check_in_is_approx, check_out_is_all_day, check_out_is_approx, gcal_include,
      gcal_dirty, gcal_checkin_event_id, gcal_checkout_event_id
    ) values (
      v_new_trip_id, v_source.name, v_source.address, v_source.city, v_source.province,
      v_source.postal_code, v_source.check_in_date, v_source.check_out_date,
      v_source.check_in_time, v_source.check_out_time, v_source.room_type,
      v_source.confirmation_number, v_source.phone, v_source.website_url, v_source.maps_url,
      v_source.notes, v_source.action_required, v_source.action_note, v_source.sort_order,
      v_source.check_in_is_all_day, v_source.check_in_is_approx,
      v_source.check_out_is_all_day, v_source.check_out_is_approx,
      false, false, null, null
    ) returning id into v_new_id;
    v_hotel_map := v_hotel_map || jsonb_build_object(v_source.id::text, v_new_id::text);
  end loop;

  for v_source in
    select *
    from public.nearby_dining
    where trip_id = p_source_trip_id
    order by sort_order, id
  loop
    if v_hotel_map ? v_source.hotel_id::text then
      insert into public.nearby_dining (
        hotel_id, trip_id, name, url, walk, meals, note, sort_order
      ) values (
        (v_hotel_map ->> v_source.hotel_id::text)::uuid, v_new_trip_id,
        v_source.name, v_source.url, v_source.walk, v_source.meals,
        v_source.note, v_source.sort_order
      );
    end if;
  end loop;

  insert into public.transportation (
    trip_id, type, provider, origin, destination, departure_time, arrival_time,
    departure_timezone, arrival_timezone, confirmation_number, notes, phone,
    website_url, cost, included, action_required, action_note, sort_order,
    pickup_is_all_day, pickup_is_approx, gcal_include, gcal_dirty, gcal_event_id
  )
  select
    v_new_trip_id, type, provider, origin, destination, departure_time, arrival_time,
    departure_timezone, arrival_timezone, confirmation_number, notes, phone,
    website_url, cost, included, action_required, action_note, sort_order,
    pickup_is_all_day, pickup_is_approx, false, false, null
  from public.transportation
  where trip_id = p_source_trip_id
    and deleted_at is null;

  insert into public.restaurants (
    trip_id, name, display_label, type, cuisine, style, address, city, state_province,
    postal_code, reservation_time, party_size, confirmation_number, reservation_status,
    confirmed, included, booking_source, booking_url, phone, email, website_url,
    maps_url, notes, action_required, action_note, sort_order, reservation_is_all_day,
    reservation_is_approx, gcal_include, gcal_dirty, gcal_event_id
  )
  select
    v_new_trip_id, name, display_label, type, cuisine, style, address, city, state_province,
    postal_code, reservation_time, party_size, confirmation_number, reservation_status,
    confirmed, included, booking_source, booking_url, phone, email, website_url,
    maps_url, notes, action_required, action_note, sort_order, reservation_is_all_day,
    reservation_is_approx, false, false, null
  from public.restaurants
  where trip_id = p_source_trip_id
    and deleted_at is null;

  insert into public.checklist_groups (trip_id, name, sort_order)
  select v_new_trip_id, name, sort_order
  from public.checklist_groups
  where trip_id = p_source_trip_id;

  insert into public.checklist (
    trip_id, item_number, task, group_name, due_date, warning_days, notes, ref,
    resolution, action_required, action_note, status, sort_order,
    gcal_include, gcal_dirty, gcal_due_event_id, gcal_warning_event_id
  )
  select
    v_new_trip_id, item_number, task, group_name, due_date, warning_days, notes, ref,
    resolution, action_required, action_note, status, sort_order,
    false, false, null, null
  from public.checklist
  where trip_id = p_source_trip_id
    and deleted_at is null;

  for v_source in
    select *
    from public.packing_groups
    where trip_id = p_source_trip_id
      and deleted_at is null
    order by sort_order, id
  loop
    insert into public.packing_groups (trip_id, person, name, sort_order)
    values (v_new_trip_id, v_source.person, v_source.name, v_source.sort_order)
    returning id into v_new_id;
    v_packing_group_map := v_packing_group_map || jsonb_build_object(v_source.id::text, v_new_id::text);
  end loop;

  for v_source in
    select *
    from public.packing_subgroups
    where trip_id = p_source_trip_id
      and deleted_at is null
    order by sort_order, id
  loop
    if v_packing_group_map ? v_source.group_id::text then
      insert into public.packing_subgroups (trip_id, group_id, person, name, sort_order)
      values (
        v_new_trip_id, (v_packing_group_map ->> v_source.group_id::text)::uuid,
        v_source.person, v_source.name, v_source.sort_order
      ) returning id into v_new_id;
      v_packing_subgroup_map := v_packing_subgroup_map || jsonb_build_object(v_source.id::text, v_new_id::text);
    end if;
  end loop;

  for v_source in
    select *
    from public.packing
    where trip_id = p_source_trip_id
      and deleted_at is null
    order by sort_order, id
  loop
    if v_packing_group_map ? v_source.group_id::text
      and (v_source.subgroup_id is null or v_packing_subgroup_map ? v_source.subgroup_id::text) then
      insert into public.packing (
        trip_id, person, group_id, subgroup_id, text, owned, packed, sort_order
      ) values (
        v_new_trip_id, v_source.person,
        (v_packing_group_map ->> v_source.group_id::text)::uuid,
        case when v_source.subgroup_id is null then null
          else (v_packing_subgroup_map ->> v_source.subgroup_id::text)::uuid end,
        v_source.text, v_source.owned, v_source.packed, v_source.sort_order
      );
    end if;
  end loop;

  for v_source in
    select *
    from public.key_info_groups
    where trip_id = p_source_trip_id
      and deleted_at is null
    order by sort_order, id
  loop
    insert into public.key_info_groups (trip_id, name, sort_order)
    values (v_new_trip_id, v_source.name, v_source.sort_order)
    returning id into v_new_id;
    v_key_info_group_map := v_key_info_group_map || jsonb_build_object(v_source.id::text, v_new_id::text);
  end loop;

  for v_source in
    select *
    from public.key_info
    where trip_id = p_source_trip_id
      and deleted_at is null
    order by sort_order, id
  loop
    if v_source.group_id is null or v_key_info_group_map ? v_source.group_id::text then
      insert into public.key_info (
        trip_id, group_id, category, label, value, url, url_label,
        show_in_overview, action_required, action_note, sort_order
      ) values (
        v_new_trip_id,
        case when v_source.group_id is null then null
          else (v_key_info_group_map ->> v_source.group_id::text)::uuid end,
        v_source.category, v_source.label, v_source.value, v_source.url, v_source.url_label,
        v_source.show_in_overview, v_source.action_required, v_source.action_note,
        v_source.sort_order
      );
    end if;
  end loop;

  return v_new_trip_id;
end;
$$;

revoke all on function public.copy_trip(uuid, uuid, text, text, date, date) from public;
revoke all on function public.copy_trip(uuid, uuid, text, text, date, date) from anon;
revoke all on function public.copy_trip(uuid, uuid, text, text, date, date) from authenticated;
grant execute on function public.copy_trip(uuid, uuid, text, text, date, date) to service_role;
