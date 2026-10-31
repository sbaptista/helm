-- Offline editing (docs/offline-editing-plan.md, Phases B–C): every record
-- the sections edit carries updated_at, set on each update, so changes made
-- offline can tell whether someone else changed the record meanwhile.
-- Idempotent: safe whether or not a table already has the column.

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

do $$
declare
  t text;
begin
  foreach t in array array[
    'checklist', 'checklist_groups', 'flights', 'hotels',
    'itinerary_days', 'itinerary_rows', 'key_info', 'key_info_groups',
    'packing', 'packing_groups', 'packing_subgroups', 'restaurants',
    'transportation'
  ]
  loop
    execute format(
      'alter table public.%I add column if not exists updated_at timestamptz not null default now()', t);
    execute format('drop trigger if exists helm_set_updated_at on public.%I', t);
    execute format(
      'create trigger helm_set_updated_at before update on public.%I '
      'for each row execute function public.helm_set_updated_at()', t);
  end loop;
end;
$$;

-- Check (expect 13 rows, each with a trigger):
-- select c.table_name, exists (
--   select 1 from information_schema.triggers tr
--   where tr.event_object_table = c.table_name and tr.trigger_name = 'helm_set_updated_at'
-- ) as has_trigger
-- from information_schema.columns c
-- where c.table_schema = 'public' and c.column_name = 'updated_at'
--   and c.table_name in ('checklist','checklist_groups','flights','hotels','itinerary_days',
--     'itinerary_rows','key_info','key_info_groups','packing','packing_groups',
--     'packing_subgroups','restaurants','transportation')
-- order by 1;
