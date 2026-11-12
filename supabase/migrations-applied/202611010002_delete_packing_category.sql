-- 00.04.0018: delete a packing category together with its sub-groups and items.
-- docs/packing-delete-category-plan.md
--
-- Soft delete (deleted_at), one timestamp, one transaction. Returns the ids
-- removed so the client can update its list and device copy.
-- Idempotent (create or replace).

create or replace function public.delete_packing_category(
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

revoke all on function public.delete_packing_category(uuid, uuid, uuid) from public;
revoke all on function public.delete_packing_category(uuid, uuid, uuid) from anon;
revoke all on function public.delete_packing_category(uuid, uuid, uuid) from authenticated;
grant execute on function public.delete_packing_category(uuid, uuid, uuid) to service_role;

-- Check after applying:
-- select proname, prosecdef from pg_proc where proname = 'delete_packing_category';
