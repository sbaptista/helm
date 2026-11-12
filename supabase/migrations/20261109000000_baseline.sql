-- Baseline: production's public schema, 2026-11-09 (docs/local-dev-database-plan.md step 2).
-- Schema-only pg_dump (PostgreSQL 17.6) taken by Stan from the admin account; no rows.
-- Contains the effect of every migration in supabase/migrations-applied/.
-- Production already has all of this. It is for the local stack only:
-- never apply it to production.
-- Changed from the dump, for the local stack only:
--   removed psql-only \restrict / \unrestrict lines;
--   removed CREATE SCHEMA public and COMMENT ON SCHEMA public (the local image already has the schema);
--   removed ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin (the local postgres role may not change that role's defaults);
--   added a search_path reset at the end (pg_dump clears it, and later migrations and the seed share the session).
-- Not in a public-schema dump: production's event trigger that calls
-- public.rls_auto_enable() on CREATE TABLE. Migrations enable RLS explicitly.

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--



--
-- Name: checklist_set_item_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.checklist_set_item_number() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  SELECT COALESCE(MAX(item_number), 0) + 1
  INTO NEW.item_number
  FROM checklist
  WHERE trip_id = NEW.trip_id;
  RETURN NEW;
END;
$$;


--
-- Name: clear_trip_data(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.clear_trip_data(p_trip_id uuid, p_user_id uuid, p_mode text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_count integer;
  v_counts jsonb := '{}'::jsonb;
begin
  if p_mode is null or p_mode not in ('archive', 'discard', 'delete') then
    raise exception 'Unknown action: %', p_mode;
  end if;

  if not exists (
    select 1 from public.trip_members
    where trip_id = p_trip_id and user_id = p_user_id and role = 'advisor'
  ) then
    raise exception 'Advisor access to this trip is required.';
  end if;

  if not exists (select 1 from public.trips where id = p_trip_id) then
    raise exception 'This trip no longer exists.';
  end if;

  -- calendar_sync_log points at calendar_events and has no trip_id.
  delete from public.calendar_sync_log
  where calendar_event_id in (select id from public.calendar_events where trip_id = p_trip_id);

  if p_mode = 'delete' then
    delete from public.import_archive where trip_id = p_trip_id;
    delete from public.trips where id = p_trip_id;
    return jsonb_build_object('deleted', true);
  end if;

  -- Children before the rows they reference.
  delete from public.itinerary_rows where trip_id = p_trip_id;
  get diagnostics v_count = row_count;
  if v_count > 0 then v_counts := v_counts || jsonb_build_object('itinerary_rows', v_count); end if;
  delete from public.itinerary_days where trip_id = p_trip_id;
  get diagnostics v_count = row_count;
  if v_count > 0 then v_counts := v_counts || jsonb_build_object('itinerary_days', v_count); end if;
  delete from public.nearby_dining where trip_id = p_trip_id;
  get diagnostics v_count = row_count;
  if v_count > 0 then v_counts := v_counts || jsonb_build_object('nearby_dining', v_count); end if;
  delete from public.hotels where trip_id = p_trip_id;
  get diagnostics v_count = row_count;
  if v_count > 0 then v_counts := v_counts || jsonb_build_object('hotels', v_count); end if;
  delete from public.key_info where trip_id = p_trip_id;
  get diagnostics v_count = row_count;
  if v_count > 0 then v_counts := v_counts || jsonb_build_object('key_info', v_count); end if;
  delete from public.key_info_groups where trip_id = p_trip_id;
  get diagnostics v_count = row_count;
  if v_count > 0 then v_counts := v_counts || jsonb_build_object('key_info_groups', v_count); end if;
  delete from public.packing where trip_id = p_trip_id;
  get diagnostics v_count = row_count;
  if v_count > 0 then v_counts := v_counts || jsonb_build_object('packing', v_count); end if;
  delete from public.packing_subgroups where trip_id = p_trip_id;
  get diagnostics v_count = row_count;
  if v_count > 0 then v_counts := v_counts || jsonb_build_object('packing_subgroups', v_count); end if;
  delete from public.packing_groups where trip_id = p_trip_id;
  get diagnostics v_count = row_count;
  if v_count > 0 then v_counts := v_counts || jsonb_build_object('packing_groups', v_count); end if;
  delete from public.import_jobs where trip_id = p_trip_id;
  get diagnostics v_count = row_count;
  if v_count > 0 then v_counts := v_counts || jsonb_build_object('import_jobs', v_count); end if;
  delete from public.documents where trip_id = p_trip_id;
  get diagnostics v_count = row_count;
  if v_count > 0 then v_counts := v_counts || jsonb_build_object('documents', v_count); end if;
  delete from public.calendar_events where trip_id = p_trip_id;
  get diagnostics v_count = row_count;
  if v_count > 0 then v_counts := v_counts || jsonb_build_object('calendar_events', v_count); end if;
  delete from public.flights where trip_id = p_trip_id;
  get diagnostics v_count = row_count;
  if v_count > 0 then v_counts := v_counts || jsonb_build_object('flights', v_count); end if;
  delete from public.transportation where trip_id = p_trip_id;
  get diagnostics v_count = row_count;
  if v_count > 0 then v_counts := v_counts || jsonb_build_object('transportation', v_count); end if;
  delete from public.restaurants where trip_id = p_trip_id;
  get diagnostics v_count = row_count;
  if v_count > 0 then v_counts := v_counts || jsonb_build_object('restaurants', v_count); end if;
  delete from public.checklist where trip_id = p_trip_id;
  get diagnostics v_count = row_count;
  if v_count > 0 then v_counts := v_counts || jsonb_build_object('checklist', v_count); end if;
  delete from public.checklist_groups where trip_id = p_trip_id;
  get diagnostics v_count = row_count;
  if v_count > 0 then v_counts := v_counts || jsonb_build_object('checklist_groups', v_count); end if;
  delete from public.notifications where trip_id = p_trip_id;
  get diagnostics v_count = row_count;
  if v_count > 0 then v_counts := v_counts || jsonb_build_object('notifications', v_count); end if;
  delete from public.feedback where trip_id = p_trip_id;
  get diagnostics v_count = row_count;
  if v_count > 0 then v_counts := v_counts || jsonb_build_object('feedback', v_count); end if;
  delete from public.import_archive where trip_id = p_trip_id;
  get diagnostics v_count = row_count;
  if v_count > 0 then v_counts := v_counts || jsonb_build_object('import_archive', v_count); end if;

  update public.trips
  set gcal_last_synced_at = null,
      status = case when p_mode = 'archive' then 'archived' else status end
  where id = p_trip_id;

  return jsonb_build_object('counts', v_counts);
end;
$$;


--
-- Name: copy_checklist(uuid, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.copy_checklist(p_source_trip_id uuid, p_target_trip_id uuid, p_user_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_source record;
  v_name text;
  v_target_name text;
  v_sort integer;
  v_number integer;
  v_group_map jsonb := '{}'::jsonb;  -- lower(trim(source name)) -> target name
  v_key text;
  v_groups integer := 0;
  v_items integer := 0;
  v_skipped integer := 0;
begin
  if p_source_trip_id = p_target_trip_id then
    raise exception 'Choose a different trip to copy to.';
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
    where id = p_target_trip_id
      and status <> 'archived'
  ) then
    raise exception 'The destination trip is archived or no longer exists.';
  end if;

  -- Groups: the source's groups in order, then any group name used by an item
  -- that has no group row of its own.
  for v_name in
    select name from (
      select name, sort_order, 0 as pass
      from public.checklist_groups
      where trip_id = p_source_trip_id
      union all
      select distinct group_name, 0, 1
      from public.checklist
      where trip_id = p_source_trip_id and deleted_at is null
        and group_name is not null and btrim(group_name) <> ''
    ) names
    order by pass, sort_order, name
  loop
    v_key := lower(btrim(v_name));
    continue when v_group_map ? v_key;

    select name into v_target_name
    from public.checklist_groups
    where trip_id = p_target_trip_id and lower(btrim(name)) = v_key
    order by sort_order, id
    limit 1;

    if v_target_name is null then
      select coalesce(max(sort_order), 0) + 10 into v_sort
      from public.checklist_groups
      where trip_id = p_target_trip_id;

      v_target_name := btrim(v_name);
      insert into public.checklist_groups (trip_id, name, sort_order)
      values (p_target_trip_id, v_target_name, v_sort);
      v_groups := v_groups + 1;
    end if;

    v_group_map := v_group_map || jsonb_build_object(v_key, v_target_name);
  end loop;

  -- Items, oldest first so their numbers keep the source's order.
  for v_source in
    select * from public.checklist
    where trip_id = p_source_trip_id and deleted_at is null
    order by item_number, id
  loop
    v_target_name := case
      when v_source.group_name is null or btrim(v_source.group_name) = '' then null
      else v_group_map ->> lower(btrim(v_source.group_name)) end;

    if exists (
      select 1 from public.checklist
      where trip_id = p_target_trip_id and deleted_at is null
        and group_name is not distinct from v_target_name
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
      p_target_trip_id, v_number, v_source.task, v_target_name, null, v_source.warning_days,
      v_source.notes, null, null, v_source.action_required, v_source.action_note, 'open',
      v_source.sort_order, false, false
    );
    v_items := v_items + 1;
  end loop;

  return jsonb_build_object('groups', v_groups, 'items', v_items, 'skipped', v_skipped);
end;
$$;


--
-- Name: copy_packing_list(uuid, uuid, text[], uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.copy_packing_list(p_source_trip_id uuid, p_target_trip_id uuid, p_people text[], p_user_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_person text;
  v_source record;
  v_target_id uuid;
  v_sort integer;
  v_group_map jsonb;
  v_subgroup_map jsonb;
  v_target_group uuid;
  v_target_subgroup uuid;
  v_groups integer := 0;
  v_subgroups integer := 0;
  v_items integer := 0;
  v_skipped integer := 0;
begin
  if p_source_trip_id = p_target_trip_id then
    raise exception 'Choose a different trip to copy to.';
  end if;

  if p_people is null or cardinality(p_people) = 0
    or exists (select 1 from unnest(p_people) as p(person) where p.person not in ('stan', 'cathy')) then
    raise exception 'Choose whose packing list to copy.';
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
    where id = p_target_trip_id
      and status <> 'archived'
  ) then
    raise exception 'The destination trip is archived or no longer exists.';
  end if;

  foreach v_person in array p_people loop
    v_group_map := '{}'::jsonb;
    v_subgroup_map := '{}'::jsonb;

    -- Categories
    for v_source in
      select * from public.packing_groups
      where trip_id = p_source_trip_id and person = v_person and deleted_at is null
      order by sort_order, id
    loop
      select id into v_target_id
      from public.packing_groups
      where trip_id = p_target_trip_id and person = v_person and deleted_at is null
        and lower(btrim(name)) = lower(btrim(v_source.name))
      order by sort_order, id
      limit 1;

      if v_target_id is null then
        select coalesce(max(sort_order), 0) + 1 into v_sort
        from public.packing_groups
        where trip_id = p_target_trip_id and person = v_person and deleted_at is null;

        insert into public.packing_groups (trip_id, person, name, sort_order)
        values (p_target_trip_id, v_person, v_source.name, v_sort)
        returning id into v_target_id;
        v_groups := v_groups + 1;
      end if;

      v_group_map := v_group_map || jsonb_build_object(v_source.id::text, v_target_id::text);
    end loop;

    -- Subgroups, within their mapped category
    for v_source in
      select * from public.packing_subgroups
      where trip_id = p_source_trip_id and person = v_person and deleted_at is null
      order by sort_order, id
    loop
      continue when not v_group_map ? v_source.group_id::text;
      v_target_group := (v_group_map ->> v_source.group_id::text)::uuid;

      select id into v_target_id
      from public.packing_subgroups
      where trip_id = p_target_trip_id and group_id = v_target_group and deleted_at is null
        and lower(btrim(name)) = lower(btrim(v_source.name))
      order by sort_order, id
      limit 1;

      if v_target_id is null then
        select coalesce(max(sort_order), 0) + 1 into v_sort
        from public.packing_subgroups
        where trip_id = p_target_trip_id and group_id = v_target_group and deleted_at is null;

        insert into public.packing_subgroups (trip_id, group_id, person, name, sort_order)
        values (p_target_trip_id, v_target_group, v_person, v_source.name, v_sort)
        returning id into v_target_id;
        v_subgroups := v_subgroups + 1;
      end if;

      v_subgroup_map := v_subgroup_map || jsonb_build_object(v_source.id::text, v_target_id::text);
    end loop;

    -- Items
    for v_source in
      select * from public.packing
      where trip_id = p_source_trip_id and person = v_person and deleted_at is null
      order by sort_order, id
    loop
      continue when not v_group_map ? v_source.group_id::text;
      continue when v_source.subgroup_id is not null
        and not v_subgroup_map ? v_source.subgroup_id::text;

      v_target_group := (v_group_map ->> v_source.group_id::text)::uuid;
      v_target_subgroup := case when v_source.subgroup_id is null then null
        else (v_subgroup_map ->> v_source.subgroup_id::text)::uuid end;

      if exists (
        select 1 from public.packing
        where trip_id = p_target_trip_id and person = v_person and deleted_at is null
          and group_id = v_target_group
          and subgroup_id is not distinct from v_target_subgroup
          and lower(btrim(text)) = lower(btrim(v_source.text))
      ) then
        v_skipped := v_skipped + 1;
        continue;
      end if;

      select coalesce(max(sort_order), 0) + 1 into v_sort
      from public.packing
      where trip_id = p_target_trip_id and person = v_person and deleted_at is null
        and group_id = v_target_group
        and subgroup_id is not distinct from v_target_subgroup;

      insert into public.packing (
        trip_id, person, group_id, subgroup_id, text, owned, packed, sort_order
      ) values (
        p_target_trip_id, v_person, v_target_group, v_target_subgroup,
        v_source.text, v_source.owned, false, v_sort
      );
      v_items := v_items + 1;
    end loop;
  end loop;

  return jsonb_build_object(
    'groups', v_groups,
    'subgroups', v_subgroups,
    'items', v_items,
    'skipped', v_skipped
  );
end;
$$;


--
-- Name: copy_records(uuid, uuid, uuid, text, uuid[], date[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.copy_records(p_source_trip_id uuid, p_target_trip_id uuid, p_user_id uuid, p_section text, p_ids uuid[], p_linked_dates date[] DEFAULT '{}'::date[]) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


--
-- Name: copy_trip(uuid, uuid, text, text, date, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.copy_trip(p_source_trip_id uuid, p_created_by uuid, p_title text, p_destination text, p_departure_date date, p_return_date date) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
  -- Dates are optional (placeholder trips) but set together; a one-day trip has
  -- return = departure. Mirrors lib/trip-dates.ts.
  if (p_departure_date is null) <> (p_return_date is null) then
    raise exception 'Set both the start and end dates, or neither.';
  end if;
  if p_return_date < p_departure_date then
    raise exception 'End date can''t be before the start date.';
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
    gcal_last_synced_at,
    show_map_pictures
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
    null,
    show_map_pictures
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
    gcal_include, gcal_dirty, gcal_event_id, gcal_legacy_arrival_event_id, show_in_itinerary
  )
  select
    v_new_trip_id, flight_number, airline, origin_airport, destination_airport, origin_city,
    destination_city, departure_time, arrival_time, departure_timezone, arrival_timezone,
    cabin_class, seat_number, confirmation_number, notes, departure_terminal,
    departure_gate, arrival_terminal, arrival_gate, action_required, sort_order,
    departure_is_all_day, departure_is_approx, arrival_is_all_day, arrival_is_approx,
    false, false, null, null, show_in_itinerary
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
      gcal_dirty, gcal_checkin_event_id, gcal_checkout_event_id, show_in_itinerary,
      timezone, country
    ) values (
      v_new_trip_id, v_source.name, v_source.address, v_source.city, v_source.province,
      v_source.postal_code, v_source.check_in_date, v_source.check_out_date,
      v_source.check_in_time, v_source.check_out_time, v_source.room_type,
      v_source.confirmation_number, v_source.phone, v_source.website_url, v_source.maps_url,
      v_source.notes, v_source.action_required, v_source.action_note, v_source.sort_order,
      v_source.check_in_is_all_day, v_source.check_in_is_approx,
      v_source.check_out_is_all_day, v_source.check_out_is_approx,
      false, false, null, null, v_source.show_in_itinerary,
      v_source.timezone, v_source.country
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
    pickup_is_all_day, pickup_is_approx, gcal_include, gcal_dirty, gcal_event_id, show_in_itinerary
  )
  select
    v_new_trip_id, type, provider, origin, destination, departure_time, arrival_time,
    departure_timezone, arrival_timezone, confirmation_number, notes, phone,
    website_url, cost, included, action_required, action_note, sort_order,
    pickup_is_all_day, pickup_is_approx, false, false, null, show_in_itinerary
  from public.transportation
  where trip_id = p_source_trip_id
    and deleted_at is null;

  insert into public.restaurants (
    trip_id, name, display_label, type, cuisine, style, address, city, state_province,
    postal_code, reservation_time, party_size, confirmation_number, reservation_status,
    confirmed, included, booking_source, booking_url, phone, email, website_url,
    maps_url, notes, action_required, action_note, sort_order, reservation_is_all_day,
    reservation_is_approx, gcal_include, gcal_dirty, gcal_event_id, show_in_itinerary,
    timezone, country
  )
  select
    v_new_trip_id, name, display_label, type, cuisine, style, address, city, state_province,
    postal_code, reservation_time, party_size, confirmation_number, reservation_status,
    confirmed, included, booking_source, booking_url, phone, email, website_url,
    maps_url, notes, action_required, action_note, sort_order, reservation_is_all_day,
    reservation_is_approx, false, false, null, show_in_itinerary,
    timezone, country
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


--
-- Name: delete_checklist_group(uuid, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_checklist_group(p_trip_id uuid, p_user_id uuid, p_group_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_now timestamptz := now();
  v_name text;
  v_item_ids uuid[];
  v_calendar boolean;
begin
  if not exists (
    select 1 from public.trip_members
    where trip_id = p_trip_id and user_id = p_user_id
  ) then
    raise exception 'You are not a member of this trip.';
  end if;

  select name into v_name
  from public.checklist_groups
  where id = p_group_id and trip_id = p_trip_id;
  if not found then
    raise exception 'That group no longer exists.';
  end if;

  with removed as (
    update public.checklist set
      deleted_at = v_now,
      gcal_include = false,
      gcal_dirty = (gcal_due_event_id is not null or gcal_warning_event_id is not null)
    where trip_id = p_trip_id and group_name = v_name and deleted_at is null
    returning id, gcal_dirty
  )
  select coalesce(array_agg(id), '{}'), coalesce(bool_or(gcal_dirty), false)
  into v_item_ids, v_calendar
  from removed;

  delete from public.checklist_groups where id = p_group_id;

  return jsonb_build_object('itemIds', to_jsonb(v_item_ids), 'calendarChanged', v_calendar);
end;
$$;


--
-- Name: delete_packing_category(uuid, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_packing_category(p_trip_id uuid, p_user_id uuid, p_group_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_now timestamptz := now();
  v_item_ids uuid[];
  v_subgroup_ids uuid[];
begin
  if not exists (
    select 1 from public.trip_members
    where trip_id = p_trip_id and user_id = p_user_id
  ) then
    raise exception 'You are not a member of this trip.';
  end if;

  if not exists (
    select 1 from public.packing_groups
    where id = p_group_id and trip_id = p_trip_id and deleted_at is null
  ) then
    raise exception 'That category no longer exists.';
  end if;

  with removed as (
    update public.packing set deleted_at = v_now
    where trip_id = p_trip_id and group_id = p_group_id and deleted_at is null
    returning id
  )
  select coalesce(array_agg(id), '{}') into v_item_ids from removed;

  with removed as (
    update public.packing_subgroups set deleted_at = v_now
    where trip_id = p_trip_id and group_id = p_group_id and deleted_at is null
    returning id
  )
  select coalesce(array_agg(id), '{}') into v_subgroup_ids from removed;

  update public.packing_groups set deleted_at = v_now where id = p_group_id;

  return jsonb_build_object(
    'itemIds', to_jsonb(v_item_ids),
    'subgroupIds', to_jsonb(v_subgroup_ids)
  );
end;
$$;


--
-- Name: helm_set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.helm_set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
begin
  new.updated_at := now();
  return new;
end;
$$;


--
-- Name: import_trip_document(uuid, uuid, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.import_trip_document(p_trip_id uuid, p_user_id uuid, p_payload jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
    confirmation_number, phone, website_url, notes, timezone, show_in_itinerary,
    maps_url, map_lat, map_lng
  )
  select
    p_trip_id, h.name, h.address, h.city, h.check_in_date, h.check_out_date,
    h.confirmation_number, h.phone, h.website_url, h.notes, h.timezone, true,
    h.maps_url, h.map_lat, h.map_lng
  from jsonb_populate_recordset(null::public.hotels, coalesce(p_payload -> 'hotels', '[]'::jsonb)) as h;
  get diagnostics v_count = row_count;
  if v_count > 0 then v_counts := v_counts || jsonb_build_object('hotels', v_count); end if;

  -- ── Transportation ─────────────────────────────────────────────────────────
  insert into public.transportation (
    trip_id, type, origin, destination, departure_time, arrival_time,
    departure_timezone, arrival_timezone, confirmation_number, website_url, notes, show_in_itinerary
  )
  select
    p_trip_id, t.type, t.origin, t.destination, t.departure_time, t.arrival_time,
    t.departure_timezone, t.arrival_timezone, t.confirmation_number, t.website_url, t.notes, true
  from jsonb_populate_recordset(null::public.transportation, coalesce(p_payload -> 'transportation', '[]'::jsonb)) as t;
  get diagnostics v_count = row_count;
  if v_count > 0 then v_counts := v_counts || jsonb_build_object('transportation', v_count); end if;

  -- ── Restaurants ────────────────────────────────────────────────────────────
  insert into public.restaurants (
    trip_id, name, address, city, reservation_time, confirmation_number,
    type, website_url, notes, timezone, show_in_itinerary,
    maps_url, map_lat, map_lng
  )
  select
    p_trip_id, r.name, r.address, r.city, r.reservation_time, r.confirmation_number,
    r.type, r.website_url, r.notes, r.timezone, true,
    r.maps_url, r.map_lat, r.map_lng
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
          website_url         = case when v_fields ? 'website_url'         then v_fields ->> 'website_url'         else h.website_url end,
          maps_url            = case when v_fields ? 'maps_url'            then v_fields ->> 'maps_url'            else h.maps_url end,
          map_lat             = case when v_fields ? 'map_lat'             then (v_fields ->> 'map_lat')::double precision else h.map_lat end,
          map_lng             = case when v_fields ? 'map_lng'             then (v_fields ->> 'map_lng')::double precision else h.map_lng end,
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
          website_url         = case when v_fields ? 'website_url'         then v_fields ->> 'website_url'         else t.website_url end,
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
          website_url         = case when v_fields ? 'website_url'         then v_fields ->> 'website_url'         else r.website_url end,
          maps_url            = case when v_fields ? 'maps_url'            then v_fields ->> 'maps_url'            else r.maps_url end,
          map_lat             = case when v_fields ? 'map_lat'             then (v_fields ->> 'map_lat')::double precision else r.map_lat end,
          map_lng             = case when v_fields ? 'map_lng'             then (v_fields ->> 'map_lng')::double precision else r.map_lng end,
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
      p_trip_id, p_user_id, 'confirmed',
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


--
-- Name: move_copy_packing(uuid, uuid, text, uuid[], uuid, text, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.move_copy_packing(p_trip_id uuid, p_user_id uuid, p_mode text, p_item_ids uuid[], p_subgroup_id uuid, p_person text, p_group_id uuid, p_dest_subgroup_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_now timestamptz := now();
  v_source record;
  v_sub record;
  v_dest_sub uuid;
  v_sort integer;
  v_new_id uuid;
  v_done integer := 0;
  v_skipped integer := 0;
  v_item_ids uuid[] := '{}';
  v_removed_item_ids uuid[] := '{}';
  v_subgroup_ids uuid[] := '{}';
  v_removed_subgroup_ids uuid[] := '{}';
begin
  if p_mode not in ('move', 'copy') then
    raise exception 'Choose Move or Copy.';
  end if;

  if p_person not in ('stan', 'cathy') then
    raise exception 'Choose whose list to use.';
  end if;

  if not exists (
    select 1 from public.trip_members
    where trip_id = p_trip_id and user_id = p_user_id
  ) then
    raise exception 'You are not a member of this trip.';
  end if;

  if not exists (
    select 1 from public.packing_groups
    where id = p_group_id and trip_id = p_trip_id and person = p_person and deleted_at is null
  ) then
    raise exception 'That category no longer exists.';
  end if;

  if (p_item_ids is null) = (p_subgroup_id is null) then
    raise exception 'Choose items or a sub-group.';
  end if;

  -- ── Items ────────────────────────────────────────────────────────────────
  if p_item_ids is not null then
    if p_dest_subgroup_id is not null and not exists (
      select 1 from public.packing_subgroups
      where id = p_dest_subgroup_id and trip_id = p_trip_id and group_id = p_group_id
        and deleted_at is null
    ) then
      raise exception 'That sub-group no longer exists.';
    end if;

    for v_source in
      select p.*
      from public.packing p
      join public.packing_groups g on g.id = p.group_id
      left join public.packing_subgroups s on s.id = p.subgroup_id
      where p.trip_id = p_trip_id and p.id = any(p_item_ids) and p.deleted_at is null
      order by p.person, g.sort_order, g.id, s.sort_order nulls first, s.id, p.sort_order, p.id
    loop
      if p_mode = 'move' then
        if v_source.person = p_person and v_source.group_id = p_group_id
          and v_source.subgroup_id is not distinct from p_dest_subgroup_id then
          v_skipped := v_skipped + 1;
          continue;
        end if;
      elsif exists (
        select 1 from public.packing
        where trip_id = p_trip_id and person = p_person and deleted_at is null
          and group_id = p_group_id
          and subgroup_id is not distinct from p_dest_subgroup_id
          and lower(btrim(text)) = lower(btrim(v_source.text))
      ) then
        v_skipped := v_skipped + 1;
        continue;
      end if;

      select coalesce(max(sort_order), 0) + 1 into v_sort
      from public.packing
      where trip_id = p_trip_id and person = p_person and deleted_at is null
        and group_id = p_group_id
        and subgroup_id is not distinct from p_dest_subgroup_id;

      if p_mode = 'move' then
        update public.packing
        set person = p_person, group_id = p_group_id, subgroup_id = p_dest_subgroup_id,
            sort_order = v_sort
        where id = v_source.id;
        v_item_ids := v_item_ids || v_source.id;
      else
        insert into public.packing (
          trip_id, person, group_id, subgroup_id, text, owned, packed, sort_order
        ) values (
          p_trip_id, p_person, p_group_id, p_dest_subgroup_id,
          v_source.text, v_source.owned, false, v_sort
        )
        returning id into v_new_id;
        v_item_ids := v_item_ids || v_new_id;
      end if;
      v_done := v_done + 1;
    end loop;

  -- ── Sub-group ────────────────────────────────────────────────────────────
  else
    select * into v_sub
    from public.packing_subgroups
    where id = p_subgroup_id and trip_id = p_trip_id and deleted_at is null;
    if not found then
      raise exception 'That sub-group no longer exists.';
    end if;

    if v_sub.group_id = p_group_id then
      raise exception 'Choose a different category.';
    end if;

    select id into v_dest_sub
    from public.packing_subgroups
    where trip_id = p_trip_id and group_id = p_group_id and deleted_at is null
      and lower(btrim(name)) = lower(btrim(v_sub.name))
    order by sort_order, id
    limit 1;

    if v_dest_sub is null then
      select coalesce(max(sort_order), 0) + 1 into v_sort
      from public.packing_subgroups
      where trip_id = p_trip_id and group_id = p_group_id and deleted_at is null;

      if p_mode = 'move' then
        update public.packing_subgroups
        set group_id = p_group_id, person = p_person, sort_order = v_sort
        where id = v_sub.id;
        v_dest_sub := v_sub.id;

        -- Items keep their order inside the sub-group.
        with moved as (
          update public.packing
          set person = p_person, group_id = p_group_id
          where trip_id = p_trip_id and subgroup_id = v_sub.id and deleted_at is null
          returning id
        )
        select coalesce(array_agg(id), '{}'), count(*) into v_item_ids, v_done from moved;
      else
        insert into public.packing_subgroups (trip_id, group_id, person, name, sort_order)
        values (p_trip_id, p_group_id, p_person, v_sub.name, v_sort)
        returning id into v_dest_sub;

        with copied as (
          insert into public.packing (
            trip_id, person, group_id, subgroup_id, text, owned, packed, sort_order
          )
          select p_trip_id, p_person, p_group_id, v_dest_sub, text, owned, false, sort_order
          from public.packing
          where trip_id = p_trip_id and subgroup_id = v_sub.id and deleted_at is null
          returning id
        )
        select coalesce(array_agg(id), '{}'), count(*) into v_item_ids, v_done from copied;
      end if;
      v_subgroup_ids := array[v_dest_sub];

    else
      -- Merge into the destination's sub-group of the same name.
      for v_source in
        select * from public.packing
        where trip_id = p_trip_id and subgroup_id = v_sub.id and deleted_at is null
        order by sort_order, id
      loop
        if exists (
          select 1 from public.packing
          where trip_id = p_trip_id and subgroup_id = v_dest_sub and deleted_at is null
            and lower(btrim(text)) = lower(btrim(v_source.text))
        ) then
          v_skipped := v_skipped + 1;
          if p_mode = 'move' then
            update public.packing set deleted_at = v_now where id = v_source.id;
            v_removed_item_ids := v_removed_item_ids || v_source.id;
          end if;
          continue;
        end if;

        select coalesce(max(sort_order), 0) + 1 into v_sort
        from public.packing
        where trip_id = p_trip_id and subgroup_id = v_dest_sub and deleted_at is null;

        if p_mode = 'move' then
          update public.packing
          set person = p_person, group_id = p_group_id, subgroup_id = v_dest_sub,
              sort_order = v_sort
          where id = v_source.id;
          v_item_ids := v_item_ids || v_source.id;
        else
          insert into public.packing (
            trip_id, person, group_id, subgroup_id, text, owned, packed, sort_order
          ) values (
            p_trip_id, p_person, p_group_id, v_dest_sub,
            v_source.text, v_source.owned, false, v_sort
          )
          returning id into v_new_id;
          v_item_ids := v_item_ids || v_new_id;
        end if;
        v_done := v_done + 1;
      end loop;

      if p_mode = 'move' then
        update public.packing_subgroups set deleted_at = v_now where id = v_sub.id;
        v_removed_subgroup_ids := array[v_sub.id];
      end if;
    end if;
  end if;

  return jsonb_build_object(
    'done', v_done,
    'skipped', v_skipped,
    'items', coalesce((
      select jsonb_agg(to_jsonb(p)) from public.packing p where p.id = any(v_item_ids)
    ), '[]'::jsonb),
    'subgroups', coalesce((
      select jsonb_agg(to_jsonb(s)) from public.packing_subgroups s where s.id = any(v_subgroup_ids)
    ), '[]'::jsonb),
    'removedItemIds', to_jsonb(v_removed_item_ids),
    'removedSubgroupIds', to_jsonb(v_removed_subgroup_ids)
  );
end;
$$;


--
-- Name: rename_checklist_group(uuid, uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rename_checklist_group(p_trip_id uuid, p_user_id uuid, p_group_id uuid, p_name text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_name text := btrim(coalesce(p_name, ''));
  v_old text;
  v_group jsonb;
  v_item_ids uuid[];
begin
  if not exists (
    select 1 from public.trip_members
    where trip_id = p_trip_id and user_id = p_user_id
  ) then
    raise exception 'You are not a member of this trip.';
  end if;

  if v_name = '' then
    raise exception 'Name is required.';
  end if;

  select name into v_old
  from public.checklist_groups
  where id = p_group_id and trip_id = p_trip_id;
  if not found then
    raise exception 'That group no longer exists.';
  end if;

  if exists (
    select 1 from public.checklist_groups
    where trip_id = p_trip_id and id <> p_group_id
      and lower(btrim(name)) = lower(v_name)
  ) then
    raise exception 'Another group already has this name.';
  end if;

  update public.checklist_groups set name = v_name
  where id = p_group_id
  returning to_jsonb(checklist_groups.*) into v_group;

  with changed as (
    update public.checklist set group_name = v_name
    where trip_id = p_trip_id and group_name = v_old and deleted_at is null
    returning id
  )
  select coalesce(array_agg(id), '{}') into v_item_ids from changed;

  return jsonb_build_object('group', v_group, 'itemIds', to_jsonb(v_item_ids));
end;
$$;


--
-- Name: rls_auto_enable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rls_auto_enable() RETURNS event_trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: advisor_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.advisor_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    bio text,
    specialties text[],
    website_url text,
    phone text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: advisor_tenant_memberships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.advisor_tenant_memberships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    advisor_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    trip_id uuid,
    action text NOT NULL,
    table_name text,
    record_id uuid,
    before_json jsonb,
    after_json jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: calendar_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calendar_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    trip_id uuid NOT NULL,
    source_type text NOT NULL,
    source_id uuid NOT NULL,
    title text NOT NULL,
    start_time timestamp with time zone,
    end_time timestamp with time zone,
    location text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: calendar_sync_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calendar_sync_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    calendar_event_id uuid,
    provider text NOT NULL,
    action text NOT NULL,
    success boolean DEFAULT false NOT NULL,
    error_message text,
    synced_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT calendar_sync_log_action_check CHECK ((action = ANY (ARRAY['create'::text, 'update'::text, 'delete'::text])))
);


--
-- Name: checklist; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.checklist (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    trip_id uuid NOT NULL,
    item_number integer DEFAULT 0 NOT NULL,
    task text NOT NULL,
    group_name text,
    ref text,
    due_date date,
    action_required boolean DEFAULT false NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    resolution text,
    notes text,
    sort_order integer DEFAULT 0 NOT NULL,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    action_note text,
    warning_days integer,
    gcal_due_event_id text,
    gcal_warning_event_id text,
    gcal_dirty boolean DEFAULT false,
    gcal_include boolean DEFAULT false,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: checklist_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.checklist_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    trip_id uuid NOT NULL,
    name text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: checklist_reminders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.checklist_reminders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    checklist_item_id uuid NOT NULL,
    user_id uuid NOT NULL,
    remind_at timestamp with time zone NOT NULL,
    sent boolean DEFAULT false NOT NULL,
    sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: connected_calendars; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.connected_calendars (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    provider text NOT NULL,
    access_token text,
    refresh_token text,
    token_expires_at timestamp with time zone,
    calendar_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT connected_calendars_provider_check CHECK ((provider = ANY (ARRAY['google'::text, 'apple'::text])))
);


--
-- Name: documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    trip_id uuid NOT NULL,
    uploaded_by uuid NOT NULL,
    filename text NOT NULL,
    storage_path text NOT NULL,
    mime_type text,
    file_size integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: error_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.error_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    severity text DEFAULT 'error'::text NOT NULL,
    message text NOT NULL,
    context jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT error_log_severity_check CHECK ((severity = ANY (ARRAY['info'::text, 'warning'::text, 'error'::text, 'critical'::text])))
);


--
-- Name: feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feedback (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    trip_id uuid NOT NULL,
    user_id uuid NOT NULL,
    rating integer,
    comment text,
    private boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT feedback_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: flights; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.flights (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    trip_id uuid NOT NULL,
    flight_number text,
    airline text,
    origin_airport text,
    destination_airport text,
    departure_time timestamp with time zone,
    arrival_time timestamp with time zone,
    cabin_class text,
    confirmation_number text,
    notes text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    gcal_event_id text,
    gcal_dirty boolean DEFAULT false,
    gcal_include boolean DEFAULT false,
    origin_city text,
    destination_city text,
    departure_timezone text,
    arrival_timezone text,
    seat_number text,
    departure_terminal text,
    departure_gate text,
    arrival_terminal text,
    arrival_gate text,
    action_required boolean DEFAULT false,
    gcal_legacy_arrival_event_id text,
    departure_is_all_day boolean DEFAULT false NOT NULL,
    departure_is_approx boolean DEFAULT false NOT NULL,
    arrival_is_all_day boolean DEFAULT false NOT NULL,
    arrival_is_approx boolean DEFAULT false NOT NULL,
    show_in_itinerary boolean DEFAULT false NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: google_oauth_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.google_oauth_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    access_token text NOT NULL,
    refresh_token text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: helm_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.helm_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    trip_id uuid,
    level text NOT NULL,
    source text NOT NULL,
    message text NOT NULL,
    payload jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: hotels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hotels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    trip_id uuid NOT NULL,
    name text NOT NULL,
    address text,
    city text,
    check_in_date date,
    check_out_date date,
    check_in_time time without time zone,
    check_out_time time without time zone,
    confirmation_number text,
    phone text,
    website_url text,
    notes text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    action_required boolean DEFAULT false NOT NULL,
    room_type text,
    gcal_checkin_event_id text,
    gcal_checkout_event_id text,
    gcal_dirty boolean DEFAULT false,
    gcal_include boolean DEFAULT false,
    province text,
    postal_code text,
    maps_url text,
    action_note text,
    check_in_is_all_day boolean DEFAULT false NOT NULL,
    check_in_is_approx boolean DEFAULT false NOT NULL,
    check_out_is_all_day boolean DEFAULT false NOT NULL,
    check_out_is_approx boolean DEFAULT false NOT NULL,
    show_in_itinerary boolean DEFAULT false NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    timezone text,
    country text,
    maps_url_auto boolean DEFAULT true NOT NULL,
    map_lat double precision,
    map_lng double precision
);


--
-- Name: import_archive; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.import_archive (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    import_job_id uuid NOT NULL,
    trip_id uuid NOT NULL,
    archived_at timestamp with time zone DEFAULT now() NOT NULL,
    flag_resolutions jsonb,
    section_counts jsonb,
    metadata jsonb
);


--
-- Name: import_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.import_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    trip_id uuid NOT NULL,
    document_id uuid,
    initiated_by uuid NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    input_tokens integer,
    output_tokens integer,
    estimated_cost numeric(10,4),
    result_json jsonb,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT import_jobs_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'review'::text, 'confirmed'::text, 'failed'::text])))
);


--
-- Name: itinerary_days; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.itinerary_days (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    trip_id uuid NOT NULL,
    day_date date,
    day_number integer,
    title text,
    location text,
    notes text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    type text DEFAULT 'free'::text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: itinerary_rows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.itinerary_rows (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    day_id uuid NOT NULL,
    trip_id uuid NOT NULL,
    start_time timestamp with time zone,
    end_time timestamp with time zone,
    title text NOT NULL,
    description text,
    location text,
    category text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    start_timezone text,
    is_all_day boolean DEFAULT false NOT NULL,
    is_approx boolean DEFAULT false NOT NULL,
    is_provided boolean DEFAULT false NOT NULL,
    action_required boolean DEFAULT false NOT NULL,
    action_note text,
    end_timezone text,
    gcal_event_id text,
    gcal_dirty boolean DEFAULT false,
    gcal_include boolean DEFAULT false,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: key_info; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.key_info (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    trip_id uuid NOT NULL,
    category text,
    label text NOT NULL,
    value text,
    url text,
    url_label text,
    show_in_overview boolean DEFAULT false NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    group_id uuid,
    action_required boolean DEFAULT false,
    action_note text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: key_info_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.key_info_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    trip_id uuid NOT NULL,
    name text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: nearby_dining; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nearby_dining (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    hotel_id uuid NOT NULL,
    trip_id uuid NOT NULL,
    name text NOT NULL,
    url text,
    walk text,
    meals text[],
    note text,
    sort_order integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    trip_id uuid,
    title text NOT NULL,
    body text,
    read boolean DEFAULT false NOT NULL,
    read_at timestamp with time zone,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: packing; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.packing (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    trip_id uuid NOT NULL,
    person text NOT NULL,
    group_id uuid NOT NULL,
    subgroup_id uuid,
    text text NOT NULL,
    owned boolean DEFAULT false NOT NULL,
    packed boolean DEFAULT false NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT packing_person_check CHECK ((person = ANY (ARRAY['stan'::text, 'cathy'::text])))
);


--
-- Name: packing_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.packing_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    trip_id uuid NOT NULL,
    person text NOT NULL,
    name text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT packing_groups_person_check CHECK ((person = ANY (ARRAY['stan'::text, 'cathy'::text])))
);


--
-- Name: packing_subgroups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.packing_subgroups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    trip_id uuid NOT NULL,
    group_id uuid NOT NULL,
    person text NOT NULL,
    name text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT packing_subgroups_person_check CHECK ((person = ANY (ARRAY['stan'::text, 'cathy'::text])))
);


--
-- Name: push_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.push_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    endpoint text NOT NULL,
    p256dh text,
    auth text,
    device_name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: restaurants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.restaurants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    trip_id uuid NOT NULL,
    name text DEFAULT ''::text NOT NULL,
    type text DEFAULT 'independent'::text NOT NULL,
    cuisine text,
    address text,
    city text,
    reservation_time timestamp with time zone,
    confirmation_number text,
    phone text,
    website_url text,
    notes text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    action_required boolean DEFAULT false NOT NULL,
    booking_url text,
    party_size integer,
    style text,
    included boolean DEFAULT false NOT NULL,
    gcal_event_id text,
    gcal_dirty boolean DEFAULT false,
    gcal_include boolean DEFAULT false,
    display_label text,
    reservation_status text DEFAULT 'TBD'::text,
    confirmed boolean DEFAULT false,
    booking_source text,
    maps_url text,
    action_note text,
    state_province text,
    postal_code text,
    email text,
    reservation_is_all_day boolean DEFAULT false NOT NULL,
    reservation_is_approx boolean DEFAULT false NOT NULL,
    show_in_itinerary boolean DEFAULT false NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    timezone text,
    country text,
    maps_url_auto boolean DEFAULT true NOT NULL,
    map_lat double precision,
    map_lng double precision,
    CONSTRAINT restaurants_type_check CHECK ((type = ANY (ARRAY['included'::text, 'independent'::text])))
);


--
-- Name: TABLE restaurants; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.restaurants IS 'Stores restaurant reservations and dining details for Helm trips.';


--
-- Name: templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    created_by uuid NOT NULL,
    title text NOT NULL,
    snapshot jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: tenants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    brand_config jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: transportation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transportation (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    trip_id uuid NOT NULL,
    type text,
    provider text,
    origin text,
    destination text,
    departure_time timestamp with time zone,
    arrival_time timestamp with time zone,
    confirmation_number text,
    notes text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    included boolean DEFAULT false NOT NULL,
    action_required boolean DEFAULT false NOT NULL,
    phone text,
    website_url text,
    cost text,
    gcal_event_id text,
    gcal_dirty boolean DEFAULT false,
    gcal_include boolean DEFAULT false,
    departure_timezone text,
    arrival_timezone text,
    action_note text,
    pickup_is_all_day boolean DEFAULT false NOT NULL,
    pickup_is_approx boolean DEFAULT false NOT NULL,
    show_in_itinerary boolean DEFAULT false NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: trip_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trip_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    trip_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT trip_members_role_check CHECK ((role = ANY (ARRAY['advisor'::text, 'traveler'::text])))
);


--
-- Name: trips; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trips (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    created_by uuid NOT NULL,
    title text NOT NULL,
    destination text,
    cover_image_url text,
    departure_date date,
    return_date date,
    permission_preset text DEFAULT 'view_actions'::text NOT NULL,
    trip_mode_active boolean DEFAULT false NOT NULL,
    trip_mode_override boolean DEFAULT false NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    description text,
    status text DEFAULT 'draft'::text NOT NULL,
    gcal_calendar_id text,
    gcal_calendar_name text,
    gcal_last_synced_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    show_map_pictures boolean DEFAULT true NOT NULL,
    CONSTRAINT trips_permission_preset_check CHECK ((permission_preset = ANY (ARRAY['collaborative'::text, 'view_actions'::text, 'view_only'::text])))
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    email text NOT NULL,
    full_name text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    first_name text,
    last_name text
);


--
-- Name: advisor_profiles advisor_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.advisor_profiles
    ADD CONSTRAINT advisor_profiles_pkey PRIMARY KEY (id);


--
-- Name: advisor_profiles advisor_profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.advisor_profiles
    ADD CONSTRAINT advisor_profiles_user_id_key UNIQUE (user_id);


--
-- Name: advisor_tenant_memberships advisor_tenant_memberships_advisor_id_tenant_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.advisor_tenant_memberships
    ADD CONSTRAINT advisor_tenant_memberships_advisor_id_tenant_id_key UNIQUE (advisor_id, tenant_id);


--
-- Name: advisor_tenant_memberships advisor_tenant_memberships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.advisor_tenant_memberships
    ADD CONSTRAINT advisor_tenant_memberships_pkey PRIMARY KEY (id);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: calendar_events calendar_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_pkey PRIMARY KEY (id);


--
-- Name: calendar_sync_log calendar_sync_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_sync_log
    ADD CONSTRAINT calendar_sync_log_pkey PRIMARY KEY (id);


--
-- Name: checklist_groups checklist_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist_groups
    ADD CONSTRAINT checklist_groups_pkey PRIMARY KEY (id);


--
-- Name: checklist checklist_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist
    ADD CONSTRAINT checklist_pkey PRIMARY KEY (id);


--
-- Name: checklist_reminders checklist_reminders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist_reminders
    ADD CONSTRAINT checklist_reminders_pkey PRIMARY KEY (id);


--
-- Name: connected_calendars connected_calendars_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.connected_calendars
    ADD CONSTRAINT connected_calendars_pkey PRIMARY KEY (id);


--
-- Name: connected_calendars connected_calendars_user_id_provider_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.connected_calendars
    ADD CONSTRAINT connected_calendars_user_id_provider_key UNIQUE (user_id, provider);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: error_log error_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.error_log
    ADD CONSTRAINT error_log_pkey PRIMARY KEY (id);


--
-- Name: feedback feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_pkey PRIMARY KEY (id);


--
-- Name: flights flights_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flights
    ADD CONSTRAINT flights_pkey PRIMARY KEY (id);


--
-- Name: google_oauth_tokens google_oauth_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_oauth_tokens
    ADD CONSTRAINT google_oauth_tokens_pkey PRIMARY KEY (id);


--
-- Name: google_oauth_tokens google_oauth_tokens_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_oauth_tokens
    ADD CONSTRAINT google_oauth_tokens_user_id_key UNIQUE (user_id);


--
-- Name: helm_logs helm_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.helm_logs
    ADD CONSTRAINT helm_logs_pkey PRIMARY KEY (id);


--
-- Name: hotels hotels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hotels
    ADD CONSTRAINT hotels_pkey PRIMARY KEY (id);


--
-- Name: import_archive import_archive_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_archive
    ADD CONSTRAINT import_archive_pkey PRIMARY KEY (id);


--
-- Name: import_jobs import_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_jobs
    ADD CONSTRAINT import_jobs_pkey PRIMARY KEY (id);


--
-- Name: itinerary_days itinerary_days_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.itinerary_days
    ADD CONSTRAINT itinerary_days_pkey PRIMARY KEY (id);


--
-- Name: itinerary_rows itinerary_rows_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.itinerary_rows
    ADD CONSTRAINT itinerary_rows_pkey PRIMARY KEY (id);


--
-- Name: key_info_groups key_info_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.key_info_groups
    ADD CONSTRAINT key_info_groups_pkey PRIMARY KEY (id);


--
-- Name: key_info key_info_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.key_info
    ADD CONSTRAINT key_info_pkey PRIMARY KEY (id);


--
-- Name: nearby_dining nearby_dining_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nearby_dining
    ADD CONSTRAINT nearby_dining_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: packing_groups packing_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.packing_groups
    ADD CONSTRAINT packing_groups_pkey PRIMARY KEY (id);


--
-- Name: packing packing_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.packing
    ADD CONSTRAINT packing_pkey PRIMARY KEY (id);


--
-- Name: packing_subgroups packing_subgroups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.packing_subgroups
    ADD CONSTRAINT packing_subgroups_pkey PRIMARY KEY (id);


--
-- Name: push_subscriptions push_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: restaurants restaurants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restaurants
    ADD CONSTRAINT restaurants_pkey PRIMARY KEY (id);


--
-- Name: templates templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_slug_key UNIQUE (slug);


--
-- Name: transportation transportation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transportation
    ADD CONSTRAINT transportation_pkey PRIMARY KEY (id);


--
-- Name: trip_members trip_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trip_members
    ADD CONSTRAINT trip_members_pkey PRIMARY KEY (id);


--
-- Name: trip_members trip_members_trip_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trip_members
    ADD CONSTRAINT trip_members_trip_id_user_id_key UNIQUE (trip_id, user_id);


--
-- Name: trips trips_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT trips_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_audit_log_trip_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_trip_id ON public.audit_log USING btree (trip_id);


--
-- Name: idx_audit_log_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_user_id ON public.audit_log USING btree (user_id);


--
-- Name: idx_calendar_events_trip_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calendar_events_trip_id ON public.calendar_events USING btree (trip_id);


--
-- Name: idx_checklist_groups_trip_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_checklist_groups_trip_id ON public.checklist_groups USING btree (trip_id);


--
-- Name: idx_checklist_trip_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_checklist_trip_id ON public.checklist USING btree (trip_id);


--
-- Name: idx_documents_trip_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documents_trip_id ON public.documents USING btree (trip_id);


--
-- Name: idx_feedback_trip_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feedback_trip_id ON public.feedback USING btree (trip_id);


--
-- Name: idx_flights_trip_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_flights_trip_id ON public.flights USING btree (trip_id);


--
-- Name: idx_helm_logs_trip_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_helm_logs_trip_id ON public.helm_logs USING btree (trip_id);


--
-- Name: idx_hotels_trip_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hotels_trip_id ON public.hotels USING btree (trip_id);


--
-- Name: idx_import_jobs_trip_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_import_jobs_trip_id ON public.import_jobs USING btree (trip_id);


--
-- Name: idx_itinerary_days_trip_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_itinerary_days_trip_id ON public.itinerary_days USING btree (trip_id);


--
-- Name: idx_itinerary_rows_day_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_itinerary_rows_day_id ON public.itinerary_rows USING btree (day_id);


--
-- Name: idx_itinerary_rows_trip_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_itinerary_rows_trip_id ON public.itinerary_rows USING btree (trip_id);


--
-- Name: idx_key_info_groups_trip_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_key_info_groups_trip_id ON public.key_info_groups USING btree (trip_id);


--
-- Name: idx_key_info_trip_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_key_info_trip_id ON public.key_info USING btree (trip_id);


--
-- Name: idx_nearby_dining_trip_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nearby_dining_trip_id ON public.nearby_dining USING btree (trip_id);


--
-- Name: idx_notifications_trip_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_trip_id ON public.notifications USING btree (trip_id);


--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- Name: idx_packing_groups_trip_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_packing_groups_trip_id ON public.packing_groups USING btree (trip_id);


--
-- Name: idx_packing_subgroups_trip_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_packing_subgroups_trip_id ON public.packing_subgroups USING btree (trip_id);


--
-- Name: idx_packing_trip_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_packing_trip_id ON public.packing USING btree (trip_id);


--
-- Name: idx_restaurants_trip_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_restaurants_trip_id ON public.restaurants USING btree (trip_id);


--
-- Name: idx_transportation_trip_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transportation_trip_id ON public.transportation USING btree (trip_id);


--
-- Name: idx_trip_members_trip_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trip_members_trip_id ON public.trip_members USING btree (trip_id);


--
-- Name: idx_trip_members_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trip_members_user_id ON public.trip_members USING btree (user_id);


--
-- Name: idx_trips_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trips_created_by ON public.trips USING btree (created_by);


--
-- Name: idx_trips_departure_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trips_departure_date ON public.trips USING btree (departure_date);


--
-- Name: idx_trips_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trips_tenant_id ON public.trips USING btree (tenant_id);


--
-- Name: checklist checklist_item_number_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER checklist_item_number_trigger BEFORE INSERT ON public.checklist FOR EACH ROW EXECUTE FUNCTION public.checklist_set_item_number();


--
-- Name: checklist helm_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER helm_set_updated_at BEFORE UPDATE ON public.checklist FOR EACH ROW EXECUTE FUNCTION public.helm_set_updated_at();


--
-- Name: checklist_groups helm_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER helm_set_updated_at BEFORE UPDATE ON public.checklist_groups FOR EACH ROW EXECUTE FUNCTION public.helm_set_updated_at();


--
-- Name: flights helm_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER helm_set_updated_at BEFORE UPDATE ON public.flights FOR EACH ROW EXECUTE FUNCTION public.helm_set_updated_at();


--
-- Name: hotels helm_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER helm_set_updated_at BEFORE UPDATE ON public.hotels FOR EACH ROW EXECUTE FUNCTION public.helm_set_updated_at();


--
-- Name: itinerary_days helm_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER helm_set_updated_at BEFORE UPDATE ON public.itinerary_days FOR EACH ROW EXECUTE FUNCTION public.helm_set_updated_at();


--
-- Name: itinerary_rows helm_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER helm_set_updated_at BEFORE UPDATE ON public.itinerary_rows FOR EACH ROW EXECUTE FUNCTION public.helm_set_updated_at();


--
-- Name: key_info helm_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER helm_set_updated_at BEFORE UPDATE ON public.key_info FOR EACH ROW EXECUTE FUNCTION public.helm_set_updated_at();


--
-- Name: key_info_groups helm_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER helm_set_updated_at BEFORE UPDATE ON public.key_info_groups FOR EACH ROW EXECUTE FUNCTION public.helm_set_updated_at();


--
-- Name: packing helm_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER helm_set_updated_at BEFORE UPDATE ON public.packing FOR EACH ROW EXECUTE FUNCTION public.helm_set_updated_at();


--
-- Name: packing_groups helm_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER helm_set_updated_at BEFORE UPDATE ON public.packing_groups FOR EACH ROW EXECUTE FUNCTION public.helm_set_updated_at();


--
-- Name: packing_subgroups helm_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER helm_set_updated_at BEFORE UPDATE ON public.packing_subgroups FOR EACH ROW EXECUTE FUNCTION public.helm_set_updated_at();


--
-- Name: restaurants helm_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER helm_set_updated_at BEFORE UPDATE ON public.restaurants FOR EACH ROW EXECUTE FUNCTION public.helm_set_updated_at();


--
-- Name: transportation helm_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER helm_set_updated_at BEFORE UPDATE ON public.transportation FOR EACH ROW EXECUTE FUNCTION public.helm_set_updated_at();


--
-- Name: trips helm_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER helm_set_updated_at BEFORE UPDATE ON public.trips FOR EACH ROW EXECUTE FUNCTION public.helm_set_updated_at();


--
-- Name: advisor_profiles advisor_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.advisor_profiles
    ADD CONSTRAINT advisor_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: advisor_tenant_memberships advisor_tenant_memberships_advisor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.advisor_tenant_memberships
    ADD CONSTRAINT advisor_tenant_memberships_advisor_id_fkey FOREIGN KEY (advisor_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: advisor_tenant_memberships advisor_tenant_memberships_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.advisor_tenant_memberships
    ADD CONSTRAINT advisor_tenant_memberships_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: audit_log audit_log_trip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE SET NULL;


--
-- Name: audit_log audit_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: calendar_events calendar_events_trip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;


--
-- Name: calendar_sync_log calendar_sync_log_calendar_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_sync_log
    ADD CONSTRAINT calendar_sync_log_calendar_event_id_fkey FOREIGN KEY (calendar_event_id) REFERENCES public.calendar_events(id) ON DELETE SET NULL;


--
-- Name: calendar_sync_log calendar_sync_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_sync_log
    ADD CONSTRAINT calendar_sync_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: checklist_groups checklist_groups_trip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist_groups
    ADD CONSTRAINT checklist_groups_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;


--
-- Name: checklist_reminders checklist_reminders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist_reminders
    ADD CONSTRAINT checklist_reminders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: checklist checklist_trip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist
    ADD CONSTRAINT checklist_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;


--
-- Name: connected_calendars connected_calendars_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.connected_calendars
    ADD CONSTRAINT connected_calendars_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: documents documents_trip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;


--
-- Name: documents documents_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id);


--
-- Name: error_log error_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.error_log
    ADD CONSTRAINT error_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: feedback feedback_trip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;


--
-- Name: feedback feedback_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: flights flights_trip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flights
    ADD CONSTRAINT flights_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;


--
-- Name: google_oauth_tokens google_oauth_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_oauth_tokens
    ADD CONSTRAINT google_oauth_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: helm_logs helm_logs_trip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.helm_logs
    ADD CONSTRAINT helm_logs_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE SET NULL;


--
-- Name: hotels hotels_trip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hotels
    ADD CONSTRAINT hotels_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;


--
-- Name: import_jobs import_jobs_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_jobs
    ADD CONSTRAINT import_jobs_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE SET NULL;


--
-- Name: import_jobs import_jobs_initiated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_jobs
    ADD CONSTRAINT import_jobs_initiated_by_fkey FOREIGN KEY (initiated_by) REFERENCES public.users(id);


--
-- Name: import_jobs import_jobs_trip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_jobs
    ADD CONSTRAINT import_jobs_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;


--
-- Name: itinerary_days itinerary_days_trip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.itinerary_days
    ADD CONSTRAINT itinerary_days_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;


--
-- Name: itinerary_rows itinerary_rows_day_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.itinerary_rows
    ADD CONSTRAINT itinerary_rows_day_id_fkey FOREIGN KEY (day_id) REFERENCES public.itinerary_days(id) ON DELETE CASCADE;


--
-- Name: itinerary_rows itinerary_rows_trip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.itinerary_rows
    ADD CONSTRAINT itinerary_rows_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;


--
-- Name: key_info key_info_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.key_info
    ADD CONSTRAINT key_info_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.key_info_groups(id) ON DELETE SET NULL;


--
-- Name: key_info_groups key_info_groups_trip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.key_info_groups
    ADD CONSTRAINT key_info_groups_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;


--
-- Name: key_info key_info_trip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.key_info
    ADD CONSTRAINT key_info_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;


--
-- Name: nearby_dining nearby_dining_hotel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nearby_dining
    ADD CONSTRAINT nearby_dining_hotel_id_fkey FOREIGN KEY (hotel_id) REFERENCES public.hotels(id) ON DELETE CASCADE;


--
-- Name: nearby_dining nearby_dining_trip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nearby_dining
    ADD CONSTRAINT nearby_dining_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_trip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: packing packing_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.packing
    ADD CONSTRAINT packing_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.packing_groups(id) ON DELETE RESTRICT;


--
-- Name: packing_groups packing_groups_trip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.packing_groups
    ADD CONSTRAINT packing_groups_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;


--
-- Name: packing packing_subgroup_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.packing
    ADD CONSTRAINT packing_subgroup_id_fkey FOREIGN KEY (subgroup_id) REFERENCES public.packing_subgroups(id) ON DELETE SET NULL;


--
-- Name: packing_subgroups packing_subgroups_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.packing_subgroups
    ADD CONSTRAINT packing_subgroups_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.packing_groups(id) ON DELETE CASCADE;


--
-- Name: packing_subgroups packing_subgroups_trip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.packing_subgroups
    ADD CONSTRAINT packing_subgroups_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;


--
-- Name: packing packing_trip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.packing
    ADD CONSTRAINT packing_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;


--
-- Name: push_subscriptions push_subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: restaurants restaurants_trip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restaurants
    ADD CONSTRAINT restaurants_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;


--
-- Name: templates templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: templates templates_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;


--
-- Name: transportation transportation_trip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transportation
    ADD CONSTRAINT transportation_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;


--
-- Name: trip_members trip_members_trip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trip_members
    ADD CONSTRAINT trip_members_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;


--
-- Name: trip_members trip_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trip_members
    ADD CONSTRAINT trip_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: trips trips_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT trips_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: trips trips_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT trips_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;


--
-- Name: users users_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: nearby_dining Trip members can delete nearby_dining; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Trip members can delete nearby_dining" ON public.nearby_dining FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.trip_members
  WHERE ((trip_members.trip_id = nearby_dining.trip_id) AND (trip_members.user_id = auth.uid())))));


--
-- Name: nearby_dining Trip members can insert nearby_dining; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Trip members can insert nearby_dining" ON public.nearby_dining FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.trip_members
  WHERE ((trip_members.trip_id = nearby_dining.trip_id) AND (trip_members.user_id = auth.uid())))));


--
-- Name: nearby_dining Trip members can update nearby_dining; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Trip members can update nearby_dining" ON public.nearby_dining FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.trip_members
  WHERE ((trip_members.trip_id = nearby_dining.trip_id) AND (trip_members.user_id = auth.uid())))));


--
-- Name: nearby_dining Trip members can view nearby_dining; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Trip members can view nearby_dining" ON public.nearby_dining FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.trip_members
  WHERE ((trip_members.trip_id = nearby_dining.trip_id) AND (trip_members.user_id = auth.uid())))));


--
-- Name: key_info_groups Users can delete key_info_groups for their trips; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete key_info_groups for their trips" ON public.key_info_groups FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.trip_members
  WHERE ((trip_members.trip_id = key_info_groups.trip_id) AND (trip_members.user_id = auth.uid())))));


--
-- Name: packing Users can delete packing for their trips; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete packing for their trips" ON public.packing FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.trip_members
  WHERE ((trip_members.trip_id = packing.trip_id) AND (trip_members.user_id = auth.uid())))));


--
-- Name: packing_groups Users can delete packing_groups for their trips; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete packing_groups for their trips" ON public.packing_groups FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.trip_members
  WHERE ((trip_members.trip_id = packing_groups.trip_id) AND (trip_members.user_id = auth.uid())))));


--
-- Name: packing_subgroups Users can delete packing_subgroups for their trips; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete packing_subgroups for their trips" ON public.packing_subgroups FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.trip_members
  WHERE ((trip_members.trip_id = packing_subgroups.trip_id) AND (trip_members.user_id = auth.uid())))));


--
-- Name: key_info_groups Users can insert key_info_groups for their trips; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert key_info_groups for their trips" ON public.key_info_groups FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.trip_members
  WHERE ((trip_members.trip_id = key_info_groups.trip_id) AND (trip_members.user_id = auth.uid())))));


--
-- Name: packing Users can insert packing for their trips; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert packing for their trips" ON public.packing FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.trip_members
  WHERE ((trip_members.trip_id = packing.trip_id) AND (trip_members.user_id = auth.uid())))));


--
-- Name: packing_groups Users can insert packing_groups for their trips; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert packing_groups for their trips" ON public.packing_groups FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.trip_members
  WHERE ((trip_members.trip_id = packing_groups.trip_id) AND (trip_members.user_id = auth.uid())))));


--
-- Name: packing_subgroups Users can insert packing_subgroups for their trips; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert packing_subgroups for their trips" ON public.packing_subgroups FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.trip_members
  WHERE ((trip_members.trip_id = packing_subgroups.trip_id) AND (trip_members.user_id = auth.uid())))));


--
-- Name: key_info_groups Users can update key_info_groups for their trips; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update key_info_groups for their trips" ON public.key_info_groups FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.trip_members
  WHERE ((trip_members.trip_id = key_info_groups.trip_id) AND (trip_members.user_id = auth.uid())))));


--
-- Name: packing Users can update packing for their trips; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update packing for their trips" ON public.packing FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.trip_members
  WHERE ((trip_members.trip_id = packing.trip_id) AND (trip_members.user_id = auth.uid())))));


--
-- Name: packing_groups Users can update packing_groups for their trips; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update packing_groups for their trips" ON public.packing_groups FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.trip_members
  WHERE ((trip_members.trip_id = packing_groups.trip_id) AND (trip_members.user_id = auth.uid())))));


--
-- Name: packing_subgroups Users can update packing_subgroups for their trips; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update packing_subgroups for their trips" ON public.packing_subgroups FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.trip_members
  WHERE ((trip_members.trip_id = packing_subgroups.trip_id) AND (trip_members.user_id = auth.uid())))));


--
-- Name: key_info_groups Users can view key_info_groups for their trips; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view key_info_groups for their trips" ON public.key_info_groups FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.trip_members
  WHERE ((trip_members.trip_id = key_info_groups.trip_id) AND (trip_members.user_id = auth.uid())))));


--
-- Name: packing Users can view packing for their trips; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view packing for their trips" ON public.packing FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.trip_members
  WHERE ((trip_members.trip_id = packing.trip_id) AND (trip_members.user_id = auth.uid())))));


--
-- Name: packing_groups Users can view packing_groups for their trips; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view packing_groups for their trips" ON public.packing_groups FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.trip_members
  WHERE ((trip_members.trip_id = packing_groups.trip_id) AND (trip_members.user_id = auth.uid())))));


--
-- Name: packing_subgroups Users can view packing_subgroups for their trips; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view packing_subgroups for their trips" ON public.packing_subgroups FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.trip_members
  WHERE ((trip_members.trip_id = packing_subgroups.trip_id) AND (trip_members.user_id = auth.uid())))));


--
-- Name: advisor_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.advisor_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: advisor_tenant_memberships; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.advisor_tenant_memberships ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: calendar_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

--
-- Name: calendar_sync_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.calendar_sync_log ENABLE ROW LEVEL SECURITY;

--
-- Name: checklist; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.checklist ENABLE ROW LEVEL SECURITY;

--
-- Name: checklist_groups; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.checklist_groups ENABLE ROW LEVEL SECURITY;

--
-- Name: checklist checklist_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY checklist_insert ON public.checklist FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.trip_members
  WHERE ((trip_members.trip_id = checklist.trip_id) AND (trip_members.user_id = auth.uid())))));


--
-- Name: checklist_reminders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.checklist_reminders ENABLE ROW LEVEL SECURITY;

--
-- Name: checklist checklist_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY checklist_select ON public.checklist FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.trip_members
  WHERE ((trip_members.trip_id = checklist.trip_id) AND (trip_members.user_id = auth.uid())))));


--
-- Name: checklist checklist_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY checklist_update ON public.checklist FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.trip_members
  WHERE ((trip_members.trip_id = checklist.trip_id) AND (trip_members.user_id = auth.uid())))));


--
-- Name: connected_calendars; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.connected_calendars ENABLE ROW LEVEL SECURITY;

--
-- Name: documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

--
-- Name: error_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.error_log ENABLE ROW LEVEL SECURITY;

--
-- Name: error_log error_log_insert_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY error_log_insert_authenticated ON public.error_log FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: error_log error_log_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY error_log_select_own ON public.error_log FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: feedback; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

--
-- Name: flights; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.flights ENABLE ROW LEVEL SECURITY;

--
-- Name: google_oauth_tokens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.google_oauth_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: helm_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.helm_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: hotels; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;

--
-- Name: import_archive; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.import_archive ENABLE ROW LEVEL SECURITY;

--
-- Name: import_jobs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;

--
-- Name: itinerary_days; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.itinerary_days ENABLE ROW LEVEL SECURITY;

--
-- Name: itinerary_rows; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.itinerary_rows ENABLE ROW LEVEL SECURITY;

--
-- Name: key_info; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.key_info ENABLE ROW LEVEL SECURITY;

--
-- Name: key_info_groups; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.key_info_groups ENABLE ROW LEVEL SECURITY;

--
-- Name: nearby_dining; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.nearby_dining ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: packing; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.packing ENABLE ROW LEVEL SECURITY;

--
-- Name: packing_groups; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.packing_groups ENABLE ROW LEVEL SECURITY;

--
-- Name: packing_subgroups; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.packing_subgroups ENABLE ROW LEVEL SECURITY;

--
-- Name: push_subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: restaurants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

--
-- Name: templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

--
-- Name: tenants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

--
-- Name: transportation; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.transportation ENABLE ROW LEVEL SECURITY;

--
-- Name: trip_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.trip_members ENABLE ROW LEVEL SECURITY;

--
-- Name: trip_members trip_members_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY trip_members_insert_own ON public.trip_members FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: trip_members trip_members_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY trip_members_select_own ON public.trip_members FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: trips; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

--
-- Name: trips trips_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY trips_delete_own ON public.trips FOR DELETE USING ((auth.uid() = created_by));


--
-- Name: trips trips_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY trips_insert_own ON public.trips FOR INSERT WITH CHECK ((auth.uid() = created_by));


--
-- Name: trips trips_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY trips_select_own ON public.trips FOR SELECT USING ((auth.uid() = created_by));


--
-- Name: trips trips_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY trips_update_own ON public.trips FOR UPDATE USING ((auth.uid() = created_by));


--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- Name: users users_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_insert_own ON public.users FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: users users_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_select_own ON public.users FOR SELECT USING ((auth.uid() = id));


--
-- Name: users users_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_update_own ON public.users FOR UPDATE USING ((auth.uid() = id));


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: FUNCTION checklist_set_item_number(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.checklist_set_item_number() TO anon;
GRANT ALL ON FUNCTION public.checklist_set_item_number() TO authenticated;
GRANT ALL ON FUNCTION public.checklist_set_item_number() TO service_role;


--
-- Name: FUNCTION clear_trip_data(p_trip_id uuid, p_user_id uuid, p_mode text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.clear_trip_data(p_trip_id uuid, p_user_id uuid, p_mode text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.clear_trip_data(p_trip_id uuid, p_user_id uuid, p_mode text) TO service_role;


--
-- Name: FUNCTION copy_checklist(p_source_trip_id uuid, p_target_trip_id uuid, p_user_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.copy_checklist(p_source_trip_id uuid, p_target_trip_id uuid, p_user_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.copy_checklist(p_source_trip_id uuid, p_target_trip_id uuid, p_user_id uuid) TO service_role;


--
-- Name: FUNCTION copy_packing_list(p_source_trip_id uuid, p_target_trip_id uuid, p_people text[], p_user_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.copy_packing_list(p_source_trip_id uuid, p_target_trip_id uuid, p_people text[], p_user_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.copy_packing_list(p_source_trip_id uuid, p_target_trip_id uuid, p_people text[], p_user_id uuid) TO service_role;


--
-- Name: FUNCTION copy_records(p_source_trip_id uuid, p_target_trip_id uuid, p_user_id uuid, p_section text, p_ids uuid[], p_linked_dates date[]); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.copy_records(p_source_trip_id uuid, p_target_trip_id uuid, p_user_id uuid, p_section text, p_ids uuid[], p_linked_dates date[]) FROM PUBLIC;
GRANT ALL ON FUNCTION public.copy_records(p_source_trip_id uuid, p_target_trip_id uuid, p_user_id uuid, p_section text, p_ids uuid[], p_linked_dates date[]) TO service_role;


--
-- Name: FUNCTION copy_trip(p_source_trip_id uuid, p_created_by uuid, p_title text, p_destination text, p_departure_date date, p_return_date date); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.copy_trip(p_source_trip_id uuid, p_created_by uuid, p_title text, p_destination text, p_departure_date date, p_return_date date) FROM PUBLIC;
GRANT ALL ON FUNCTION public.copy_trip(p_source_trip_id uuid, p_created_by uuid, p_title text, p_destination text, p_departure_date date, p_return_date date) TO service_role;


--
-- Name: FUNCTION delete_checklist_group(p_trip_id uuid, p_user_id uuid, p_group_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.delete_checklist_group(p_trip_id uuid, p_user_id uuid, p_group_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.delete_checklist_group(p_trip_id uuid, p_user_id uuid, p_group_id uuid) TO service_role;


--
-- Name: FUNCTION delete_packing_category(p_trip_id uuid, p_user_id uuid, p_group_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.delete_packing_category(p_trip_id uuid, p_user_id uuid, p_group_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.delete_packing_category(p_trip_id uuid, p_user_id uuid, p_group_id uuid) TO service_role;


--
-- Name: FUNCTION helm_set_updated_at(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.helm_set_updated_at() TO anon;
GRANT ALL ON FUNCTION public.helm_set_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.helm_set_updated_at() TO service_role;


--
-- Name: FUNCTION import_trip_document(p_trip_id uuid, p_user_id uuid, p_payload jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.import_trip_document(p_trip_id uuid, p_user_id uuid, p_payload jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.import_trip_document(p_trip_id uuid, p_user_id uuid, p_payload jsonb) TO service_role;


--
-- Name: FUNCTION move_copy_packing(p_trip_id uuid, p_user_id uuid, p_mode text, p_item_ids uuid[], p_subgroup_id uuid, p_person text, p_group_id uuid, p_dest_subgroup_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.move_copy_packing(p_trip_id uuid, p_user_id uuid, p_mode text, p_item_ids uuid[], p_subgroup_id uuid, p_person text, p_group_id uuid, p_dest_subgroup_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.move_copy_packing(p_trip_id uuid, p_user_id uuid, p_mode text, p_item_ids uuid[], p_subgroup_id uuid, p_person text, p_group_id uuid, p_dest_subgroup_id uuid) TO service_role;


--
-- Name: FUNCTION rename_checklist_group(p_trip_id uuid, p_user_id uuid, p_group_id uuid, p_name text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.rename_checklist_group(p_trip_id uuid, p_user_id uuid, p_group_id uuid, p_name text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.rename_checklist_group(p_trip_id uuid, p_user_id uuid, p_group_id uuid, p_name text) TO service_role;


--
-- Name: FUNCTION rls_auto_enable(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.rls_auto_enable() TO anon;
GRANT ALL ON FUNCTION public.rls_auto_enable() TO authenticated;
GRANT ALL ON FUNCTION public.rls_auto_enable() TO service_role;


--
-- Name: TABLE advisor_profiles; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.advisor_profiles TO anon;
GRANT ALL ON TABLE public.advisor_profiles TO authenticated;
GRANT ALL ON TABLE public.advisor_profiles TO service_role;


--
-- Name: TABLE advisor_tenant_memberships; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.advisor_tenant_memberships TO anon;
GRANT ALL ON TABLE public.advisor_tenant_memberships TO authenticated;
GRANT ALL ON TABLE public.advisor_tenant_memberships TO service_role;


--
-- Name: TABLE audit_log; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.audit_log TO anon;
GRANT ALL ON TABLE public.audit_log TO authenticated;
GRANT ALL ON TABLE public.audit_log TO service_role;


--
-- Name: TABLE calendar_events; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.calendar_events TO anon;
GRANT ALL ON TABLE public.calendar_events TO authenticated;
GRANT ALL ON TABLE public.calendar_events TO service_role;


--
-- Name: TABLE calendar_sync_log; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.calendar_sync_log TO anon;
GRANT ALL ON TABLE public.calendar_sync_log TO authenticated;
GRANT ALL ON TABLE public.calendar_sync_log TO service_role;


--
-- Name: TABLE checklist; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.checklist TO anon;
GRANT ALL ON TABLE public.checklist TO authenticated;
GRANT ALL ON TABLE public.checklist TO service_role;


--
-- Name: TABLE checklist_groups; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.checklist_groups TO anon;
GRANT ALL ON TABLE public.checklist_groups TO authenticated;
GRANT ALL ON TABLE public.checklist_groups TO service_role;


--
-- Name: TABLE checklist_reminders; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.checklist_reminders TO anon;
GRANT ALL ON TABLE public.checklist_reminders TO authenticated;
GRANT ALL ON TABLE public.checklist_reminders TO service_role;


--
-- Name: TABLE connected_calendars; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.connected_calendars TO anon;
GRANT ALL ON TABLE public.connected_calendars TO authenticated;
GRANT ALL ON TABLE public.connected_calendars TO service_role;


--
-- Name: TABLE documents; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.documents TO anon;
GRANT ALL ON TABLE public.documents TO authenticated;
GRANT ALL ON TABLE public.documents TO service_role;


--
-- Name: TABLE error_log; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.error_log TO anon;
GRANT ALL ON TABLE public.error_log TO authenticated;
GRANT ALL ON TABLE public.error_log TO service_role;


--
-- Name: TABLE feedback; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.feedback TO anon;
GRANT ALL ON TABLE public.feedback TO authenticated;
GRANT ALL ON TABLE public.feedback TO service_role;


--
-- Name: TABLE flights; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.flights TO anon;
GRANT ALL ON TABLE public.flights TO authenticated;
GRANT ALL ON TABLE public.flights TO service_role;


--
-- Name: TABLE google_oauth_tokens; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.google_oauth_tokens TO anon;
GRANT ALL ON TABLE public.google_oauth_tokens TO authenticated;
GRANT ALL ON TABLE public.google_oauth_tokens TO service_role;


--
-- Name: TABLE helm_logs; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.helm_logs TO anon;
GRANT ALL ON TABLE public.helm_logs TO authenticated;
GRANT ALL ON TABLE public.helm_logs TO service_role;


--
-- Name: TABLE hotels; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.hotels TO anon;
GRANT ALL ON TABLE public.hotels TO authenticated;
GRANT ALL ON TABLE public.hotels TO service_role;


--
-- Name: TABLE import_archive; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.import_archive TO anon;
GRANT ALL ON TABLE public.import_archive TO authenticated;
GRANT ALL ON TABLE public.import_archive TO service_role;


--
-- Name: TABLE import_jobs; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.import_jobs TO anon;
GRANT ALL ON TABLE public.import_jobs TO authenticated;
GRANT ALL ON TABLE public.import_jobs TO service_role;


--
-- Name: TABLE itinerary_days; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.itinerary_days TO anon;
GRANT ALL ON TABLE public.itinerary_days TO authenticated;
GRANT ALL ON TABLE public.itinerary_days TO service_role;


--
-- Name: TABLE itinerary_rows; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.itinerary_rows TO anon;
GRANT ALL ON TABLE public.itinerary_rows TO authenticated;
GRANT ALL ON TABLE public.itinerary_rows TO service_role;


--
-- Name: TABLE key_info; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.key_info TO anon;
GRANT ALL ON TABLE public.key_info TO authenticated;
GRANT ALL ON TABLE public.key_info TO service_role;


--
-- Name: TABLE key_info_groups; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.key_info_groups TO anon;
GRANT ALL ON TABLE public.key_info_groups TO authenticated;
GRANT ALL ON TABLE public.key_info_groups TO service_role;


--
-- Name: TABLE nearby_dining; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.nearby_dining TO anon;
GRANT ALL ON TABLE public.nearby_dining TO authenticated;
GRANT ALL ON TABLE public.nearby_dining TO service_role;


--
-- Name: TABLE notifications; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.notifications TO anon;
GRANT ALL ON TABLE public.notifications TO authenticated;
GRANT ALL ON TABLE public.notifications TO service_role;


--
-- Name: TABLE packing; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.packing TO anon;
GRANT ALL ON TABLE public.packing TO authenticated;
GRANT ALL ON TABLE public.packing TO service_role;


--
-- Name: TABLE packing_groups; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.packing_groups TO anon;
GRANT ALL ON TABLE public.packing_groups TO authenticated;
GRANT ALL ON TABLE public.packing_groups TO service_role;


--
-- Name: TABLE packing_subgroups; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.packing_subgroups TO anon;
GRANT ALL ON TABLE public.packing_subgroups TO authenticated;
GRANT ALL ON TABLE public.packing_subgroups TO service_role;


--
-- Name: TABLE push_subscriptions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.push_subscriptions TO anon;
GRANT ALL ON TABLE public.push_subscriptions TO authenticated;
GRANT ALL ON TABLE public.push_subscriptions TO service_role;


--
-- Name: TABLE restaurants; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.restaurants TO anon;
GRANT ALL ON TABLE public.restaurants TO authenticated;
GRANT ALL ON TABLE public.restaurants TO service_role;


--
-- Name: TABLE templates; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.templates TO anon;
GRANT ALL ON TABLE public.templates TO authenticated;
GRANT ALL ON TABLE public.templates TO service_role;


--
-- Name: TABLE tenants; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.tenants TO anon;
GRANT ALL ON TABLE public.tenants TO authenticated;
GRANT ALL ON TABLE public.tenants TO service_role;


--
-- Name: TABLE transportation; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.transportation TO anon;
GRANT ALL ON TABLE public.transportation TO authenticated;
GRANT ALL ON TABLE public.transportation TO service_role;


--
-- Name: TABLE trip_members; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.trip_members TO anon;
GRANT ALL ON TABLE public.trip_members TO authenticated;
GRANT ALL ON TABLE public.trip_members TO service_role;


--
-- Name: TABLE trips; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.trips TO anon;
GRANT ALL ON TABLE public.trips TO authenticated;
GRANT ALL ON TABLE public.trips TO service_role;


--
-- Name: TABLE users; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.users TO anon;
GRANT ALL ON TABLE public.users TO authenticated;
GRANT ALL ON TABLE public.users TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--



--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--



--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--



--
-- PostgreSQL database dump complete
--

-- Restore the normal search_path (pg_dump set it to '' at the top).
SELECT pg_catalog.set_config('search_path', '"$user", public, extensions', false);
