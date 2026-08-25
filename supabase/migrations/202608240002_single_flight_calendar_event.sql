-- Return Flights to one canonical Calendar event while retaining the temporary
-- arrival ID long enough for Update All to delete the already-created events.

alter table public.flights
  rename column gcal_departure_event_id to gcal_event_id;

alter table public.flights
  rename column gcal_arrival_event_id to gcal_legacy_arrival_event_id;

update public.flights
set gcal_dirty = true
where gcal_include = true
  and deleted_at is null;
