-- 00.04.0020: Checklist group rename and delete that carry their items, and
-- copying a checklist into another trip. docs/checklist-packing-parity-plan.md
--
-- Checklist items point at their group by name (checklist.group_name), so a
-- rename or delete has to change the items in the same transaction.
-- checklist_groups rows are deleted outright (the table has no deleted_at);
-- items are soft-deleted (deleted_at), as elsewhere.
-- Idempotent (create or replace).

-- ─── Rename ──────────────────────────────────────────────────────────────────

create or replace function public.rename_checklist_group(
  p_trip_id uuid,
  p_user_id uuid,
  p_group_id uuid,
  p_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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

revoke all on function public.rename_checklist_group(uuid, uuid, uuid, text) from public;
revoke all on function public.rename_checklist_group(uuid, uuid, uuid, text) from anon;
revoke all on function public.rename_checklist_group(uuid, uuid, uuid, text) from authenticated;
grant execute on function public.rename_checklist_group(uuid, uuid, uuid, text) to service_role;

-- ─── Delete ──────────────────────────────────────────────────────────────────

-- Calendar handling matches DELETE /api/checklist/[id]: gcal_include off, and
-- gcal_dirty where events exist so the next sync removes them.
create or replace function public.delete_checklist_group(
  p_trip_id uuid,
  p_user_id uuid,
  p_group_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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

revoke all on function public.delete_checklist_group(uuid, uuid, uuid) from public;
revoke all on function public.delete_checklist_group(uuid, uuid, uuid) from anon;
revoke all on function public.delete_checklist_group(uuid, uuid, uuid) from authenticated;
grant execute on function public.delete_checklist_group(uuid, uuid, uuid) to service_role;

-- ─── Copy to another trip ────────────────────────────────────────────────────

-- Merges into the target: groups with the same name (case-insensitive,
-- trimmed) are reused, tasks with the same text in the same group are skipped,
-- and new rows are added after the target's existing ones. Nothing in the
-- target is changed or deleted. Copies start Open, with no due date,
-- reference, resolution or Calendar.
create or replace function public.copy_checklist(
  p_source_trip_id uuid,
  p_target_trip_id uuid,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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

revoke all on function public.copy_checklist(uuid, uuid, uuid) from public;
revoke all on function public.copy_checklist(uuid, uuid, uuid) from anon;
revoke all on function public.copy_checklist(uuid, uuid, uuid) from authenticated;
grant execute on function public.copy_checklist(uuid, uuid, uuid) to service_role;

-- Check after applying:
-- select proname, prosecdef from pg_proc
-- where proname in ('rename_checklist_group', 'delete_checklist_group', 'copy_checklist');
