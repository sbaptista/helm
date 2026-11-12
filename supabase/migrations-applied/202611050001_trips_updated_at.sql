-- Edit Trip offline (docs/edit-trip-in-trip-plan.md, decision A): trips carry
-- updated_at, set on each update, so a title or destination edited offline
-- can tell whether it was changed elsewhere meanwhile, and the later edit
-- wins, as for the sections (202610300001_offline_updated_at.sql).
-- Idempotent: safe whether or not the column or trigger already exists.
-- Reuses public.helm_set_updated_at() from 202610300001; recreated here so
-- this file also works on its own.

create or replace function public.helm_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

alter table public.trips add column if not exists updated_at timestamptz not null default now();

drop trigger if exists helm_set_updated_at on public.trips;
create trigger helm_set_updated_at before update on public.trips
  for each row execute function public.helm_set_updated_at();

-- Check (expect one row, has_trigger = true):
-- select c.column_name, exists (
--   select 1 from information_schema.triggers tr
--   where tr.event_object_schema = 'public' and tr.event_object_table = 'trips'
--     and tr.trigger_name = 'helm_set_updated_at'
-- ) as has_trigger
-- from information_schema.columns c
-- where c.table_schema = 'public' and c.table_name = 'trips' and c.column_name = 'updated_at';
