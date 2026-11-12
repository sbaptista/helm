-- 00.04.0040: Archive, Clear Data and Delete remove a trip's data in one
-- transaction, from the tables Helm actually uses. docs/archive-route-plan.md
-- (Part 2, §9 for the foreign keys and delete order).
--
-- Modes:
--   archive  delete every section's data, keep the trip, set status 'archived'
--            (no longer used: Stan removed Archive on 2026-11-06 because it was
--            Delete under another name; kept so the applied function matches)
--   discard  delete every section's data, keep the trip and its status
--   delete   delete the trip (its rows cascade; import_archive has no foreign key)
-- trip_members, audit_log and helm_logs are kept by archive / discard; a deleted
-- trip's logs keep their rows with trip_id set to null (existing foreign keys).
-- Google Calendar events are removed by the route before this runs.
-- Idempotent (create index if not exists, create or replace).

-- ── trip_id indexes (pre-check 2026-11-06: these had none) ──────────────────
create index if not exists idx_checklist_trip_id on public.checklist (trip_id);
create index if not exists idx_checklist_groups_trip_id on public.checklist_groups (trip_id);
create index if not exists idx_key_info_groups_trip_id on public.key_info_groups (trip_id);
create index if not exists idx_packing_trip_id on public.packing (trip_id);
create index if not exists idx_packing_groups_trip_id on public.packing_groups (trip_id);
create index if not exists idx_packing_subgroups_trip_id on public.packing_subgroups (trip_id);
create index if not exists idx_nearby_dining_trip_id on public.nearby_dining (trip_id);
create index if not exists idx_helm_logs_trip_id on public.helm_logs (trip_id);
create index if not exists idx_feedback_trip_id on public.feedback (trip_id);
create index if not exists idx_notifications_trip_id on public.notifications (trip_id);

-- ── clear_trip_data ─────────────────────────────────────────────────────────
create or replace function public.clear_trip_data(
  p_trip_id uuid,
  p_user_id uuid,
  p_mode text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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

revoke all on function public.clear_trip_data(uuid, uuid, text) from public;
revoke all on function public.clear_trip_data(uuid, uuid, text) from anon;
revoke all on function public.clear_trip_data(uuid, uuid, text) from authenticated;
grant execute on function public.clear_trip_data(uuid, uuid, text) to service_role;

-- Check after applying:
-- select proname, prosecdef from pg_proc where proname = 'clear_trip_data';
-- select indexname from pg_indexes where indexname like 'idx_%_trip_id' order by 1;
