-- 00.04.0016: move or copy packing items, or a whole sub-group, within a trip.
-- docs/packing-move-copy-plan.md
--
-- Items mode (p_item_ids): the selected items go to the end of the destination
-- category / sub-group, in list order. Move skips items already there; copy
-- skips items whose text (case-insensitive, trimmed) is already there.
-- Sub-group mode (p_subgroup_id): the sub-group and its items go to another
-- category. A sub-group with the same name there is merged into: duplicate
-- items are skipped (on a move they are removed from the source, since the
-- destination already has them) and the emptied source sub-group is removed.
-- Copies keep owned and start unpacked. Removal is soft (deleted_at).
-- Returns the changed rows so the client can update its list and device copy.
-- Idempotent (create or replace).

create or replace function public.move_copy_packing(
  p_trip_id uuid,
  p_user_id uuid,
  p_mode text,
  p_item_ids uuid[],
  p_subgroup_id uuid,
  p_person text,
  p_group_id uuid,
  p_dest_subgroup_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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

revoke all on function public.move_copy_packing(uuid, uuid, text, uuid[], uuid, text, uuid, uuid) from public;
revoke all on function public.move_copy_packing(uuid, uuid, text, uuid[], uuid, text, uuid, uuid) from anon;
revoke all on function public.move_copy_packing(uuid, uuid, text, uuid[], uuid, text, uuid, uuid) from authenticated;
grant execute on function public.move_copy_packing(uuid, uuid, text, uuid[], uuid, text, uuid, uuid) to service_role;

-- Check after applying:
-- select proname, prosecdef from pg_proc where proname = 'move_copy_packing';
