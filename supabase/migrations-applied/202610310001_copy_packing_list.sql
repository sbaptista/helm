-- 00.04.0011: copy one trip's packing list into another existing trip.
-- docs/copy-packing-list-plan.md
--
-- Merges into the target: categories and subgroups with the same name
-- (case-insensitive, trimmed) are reused, items with the same text in the same
-- category and subgroup are skipped, and everything new is appended after the
-- target's existing rows. Nothing in the target is changed or deleted.
-- Copied items start unpacked; owned is kept. Idempotent (create or replace).

create or replace function public.copy_packing_list(
  p_source_trip_id uuid,
  p_target_trip_id uuid,
  p_people text[],
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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

revoke all on function public.copy_packing_list(uuid, uuid, text[], uuid) from public;
revoke all on function public.copy_packing_list(uuid, uuid, text[], uuid) from anon;
revoke all on function public.copy_packing_list(uuid, uuid, text[], uuid) from authenticated;
grant execute on function public.copy_packing_list(uuid, uuid, text[], uuid) to service_role;

-- Check after applying:
-- select proname, prosecdef from pg_proc where proname = 'copy_packing_list';
