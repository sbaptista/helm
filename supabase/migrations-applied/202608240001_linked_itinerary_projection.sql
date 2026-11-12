-- Source-owned itinerary projection metadata and dual Flight Calendar events.

alter table public.flights
  rename column gcal_event_id to gcal_departure_event_id;

alter table public.flights
  add column gcal_arrival_event_id text,
  add column departure_is_all_day boolean not null default false,
  add column departure_is_approx boolean not null default false,
  add column arrival_is_all_day boolean not null default false,
  add column arrival_is_approx boolean not null default false;

alter table public.hotels
  add column check_in_is_all_day boolean not null default false,
  add column check_in_is_approx boolean not null default false,
  add column check_out_is_all_day boolean not null default false,
  add column check_out_is_approx boolean not null default false;

alter table public.restaurants
  add column reservation_is_all_day boolean not null default false,
  add column reservation_is_approx boolean not null default false;

alter table public.transportation
  add column pickup_is_all_day boolean not null default false,
  add column pickup_is_approx boolean not null default false;

-- Existing included flights must replace their former duration event with the
-- departure marker and create the new arrival marker on the next Update All.
update public.flights
set gcal_dirty = true
where gcal_include = true
  and deleted_at is null;
