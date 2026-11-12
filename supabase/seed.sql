-- Local test data (docs/local-dev-database-plan.md step 3). Runs after the
-- migrations on every `npx supabase db reset`. Local stack only: never run
-- against production. Everything here is invented; the places are public.
--
-- Test accounts. They sign in with a one-time code; the local mail catcher at
-- http://127.0.0.1:54324 shows the code (no real email is sent). No passwords.
--   Stan Test   stan.test@helm.test    11111111-1111-4111-8111-111111111111
--   Agent Test  agent.test@helm.test   22222222-2222-4222-8222-222222222222
-- Both are advisors on the test trip 33333333-3333-4333-8333-333333333333.

-- ── Accounts ────────────────────────────────────────────────────────────────
-- GoTrue can't read NULL in its token columns, so they are set to ''.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email, '', now(),
       '', '', '', '', '', '', '', '',
       '{"provider":"email","providers":["email"]}'::jsonb,
       jsonb_build_object('first_name', u.first_name, 'last_name', u.last_name),
       now(), now()
from (values
  ('11111111-1111-4111-8111-111111111111'::uuid, 'stan.test@helm.test',  'Stan',  'Test'),
  ('22222222-2222-4222-8222-222222222222'::uuid, 'agent.test@helm.test', 'Agent', 'Test')
) as u(id, email, first_name, last_name);

insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text, 'email',
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       now(), now(), now()
from auth.users u
where u.id in ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222');

insert into public.users (id, email, full_name, first_name, last_name) values
  ('11111111-1111-4111-8111-111111111111', 'stan.test@helm.test',  'Stan Test',  'Stan',  'Test'),
  ('22222222-2222-4222-8222-222222222222', 'agent.test@helm.test', 'Agent Test', 'Agent', 'Test');

-- ── Trip ────────────────────────────────────────────────────────────────────
insert into public.trips (id, created_by, title, destination, description, status, departure_date, return_date)
values ('33333333-3333-4333-8333-333333333333', '11111111-1111-4111-8111-111111111111',
        'Test Trip — Rockies', 'Banff, Alberta, Canada',
        'Local test data. Safe to change or delete; `npx supabase db reset` restores it.',
        'upcoming', '2027-06-14', '2027-06-18');

insert into public.trip_members (trip_id, user_id, role) values
  ('33333333-3333-4333-8333-333333333333', '11111111-1111-4111-8111-111111111111', 'advisor'),
  ('33333333-3333-4333-8333-333333333333', '22222222-2222-4222-8222-222222222222', 'advisor');

-- ── Itinerary ───────────────────────────────────────────────────────────────
insert into public.itinerary_days (id, trip_id, day_date, day_number, title, location, sort_order) values
  ('44444444-0000-4000-8000-000000000001', '33333333-3333-4333-8333-333333333333', '2027-06-14', 1, 'Arrive in Calgary', 'Calgary, AB', 1),
  ('44444444-0000-4000-8000-000000000002', '33333333-3333-4333-8333-333333333333', '2027-06-15', 2, 'Drive to Banff',    'Banff, AB',   2),
  ('44444444-0000-4000-8000-000000000003', '33333333-3333-4333-8333-333333333333', '2027-06-16', 3, 'Lake Louise',       'Lake Louise, AB', 3),
  ('44444444-0000-4000-8000-000000000004', '33333333-3333-4333-8333-333333333333', '2027-06-17', 4, 'Free day',          'Banff, AB',   4),
  ('44444444-0000-4000-8000-000000000005', '33333333-3333-4333-8333-333333333333', '2027-06-18', 5, 'Fly home',          'Calgary, AB', 5);

insert into public.itinerary_rows (trip_id, day_id, title, description, location, start_time, start_timezone, is_all_day, sort_order, gcal_include) values
  ('33333333-3333-4333-8333-333333333333', '44444444-0000-4000-8000-000000000002', 'Banff Gondola', 'Tickets at the base station.', 'Banff Gondola, Mountain Ave, Banff, AB', '2027-06-15 15:00-06', 'America/Edmonton', false, 1, true),
  ('33333333-3333-4333-8333-333333333333', '44444444-0000-4000-8000-000000000003', 'Moraine Lake shuttle', 'Parks Canada shuttle from the Lake Louise Park & Ride.', 'Lake Louise, AB', '2027-06-16 08:30-06', 'America/Edmonton', false, 1, false),
  ('33333333-3333-4333-8333-333333333333', '44444444-0000-4000-8000-000000000004', 'Hot springs (time TBD)', null, 'Banff Upper Hot Springs, Banff, AB', null, null, true, 1, false);

-- ── Bookings ────────────────────────────────────────────────────────────────
insert into public.flights (trip_id, airline, flight_number, origin_airport, origin_city, destination_airport, destination_city,
                            departure_time, departure_timezone, arrival_time, arrival_timezone, confirmation_number, sort_order) values
  ('33333333-3333-4333-8333-333333333333', 'Test Air', 'TA 101', 'SEA', 'Seattle', 'YYC', 'Calgary',
   '2027-06-14 09:00-07', 'America/Los_Angeles', '2027-06-14 11:45-06', 'America/Edmonton', 'TEST01', 1),
  ('33333333-3333-4333-8333-333333333333', 'Test Air', 'TA 102', 'YYC', 'Calgary', 'SEA', 'Seattle',
   '2027-06-18 17:00-06', 'America/Edmonton', '2027-06-18 17:50-07', 'America/Los_Angeles', 'TEST02', 2);

insert into public.hotels (trip_id, name, address, city, province, country, check_in_date, check_out_date, check_in_time, check_out_time,
                           confirmation_number, website_url, timezone, sort_order) values
  ('33333333-3333-4333-8333-333333333333', 'Test Lodge Banff', '100 Banff Ave', 'Banff', 'AB', 'Canada',
   '2027-06-15', '2027-06-18', '16:00', '11:00', 'HTEST1', 'https://www.banfflakelouise.com', 'America/Edmonton', 1);

insert into public.restaurants (trip_id, name, type, cuisine, city, reservation_time, timezone, party_size, confirmation_number, notes, sort_order) values
  ('33333333-3333-4333-8333-333333333333', 'Test Bistro', 'independent', 'Canadian', 'Banff', '2027-06-15 19:00-06', 'America/Edmonton', 2, 'RTEST1', 'Window table requested.', 1),
  ('33333333-3333-4333-8333-333333333333', 'Possible: Lakeside Café', 'independent', 'Café', 'Lake Louise', null, 'America/Edmonton', null, null, 'Not booked; a possibility.', 2);

insert into public.transportation (trip_id, type, provider, origin, destination, departure_time, departure_timezone, confirmation_number, sort_order) values
  ('33333333-3333-4333-8333-333333333333', 'Shuttle', 'Test Shuttle Co.', 'Calgary Airport (YYC)', 'Banff', '2027-06-15 10:00-06', 'America/Edmonton', 'STEST1', 1);

-- ── Key Info ────────────────────────────────────────────────────────────────
insert into public.key_info_groups (id, trip_id, name, sort_order) values
  ('55555555-0000-4000-8000-000000000001', '33333333-3333-4333-8333-333333333333', 'Contacts', 1),
  ('55555555-0000-4000-8000-000000000002', '33333333-3333-4333-8333-333333333333', 'Park',     2);

insert into public.key_info (trip_id, group_id, label, value, url, show_in_overview, sort_order) values
  ('33333333-3333-4333-8333-333333333333', '55555555-0000-4000-8000-000000000001', 'Tour office', '555-0100 (test number)', null, true, 1),
  ('33333333-3333-4333-8333-333333333333', '55555555-0000-4000-8000-000000000002', 'Parks Canada pass', 'Buy online before arrival.', 'https://parks.canada.ca', false, 1);

-- ── Checklist ───────────────────────────────────────────────────────────────
insert into public.checklist_groups (trip_id, name, sort_order) values
  ('33333333-3333-4333-8333-333333333333', 'Before we go', 1),
  ('33333333-3333-4333-8333-333333333333', 'On the trip',  2);

insert into public.checklist (trip_id, task, group_name, due_date, status, sort_order) values
  ('33333333-3333-4333-8333-333333333333', 'Buy Parks Canada pass', 'Before we go', '2027-06-01', 'open',      1),
  ('33333333-3333-4333-8333-333333333333', 'Check passports',       'Before we go', '2027-05-15', 'completed', 2),
  ('33333333-3333-4333-8333-333333333333', 'Book the gondola',      'On the trip',  null,         'open',      3);

-- ── Packing ─────────────────────────────────────────────────────────────────
insert into public.packing_groups (id, trip_id, person, name, sort_order) values
  ('66666666-0000-4000-8000-000000000001', '33333333-3333-4333-8333-333333333333', 'stan', 'Clothes', 1),
  ('66666666-0000-4000-8000-000000000002', '33333333-3333-4333-8333-333333333333', 'stan', 'Gear',    2);

insert into public.packing_subgroups (id, trip_id, group_id, person, name, sort_order) values
  ('77777777-0000-4000-8000-000000000001', '33333333-3333-4333-8333-333333333333', '66666666-0000-4000-8000-000000000001', 'stan', 'Layers', 1);

insert into public.packing (trip_id, person, group_id, subgroup_id, text, owned, packed, sort_order) values
  ('33333333-3333-4333-8333-333333333333', 'stan', '66666666-0000-4000-8000-000000000001', '77777777-0000-4000-8000-000000000001', 'Rain jacket', true,  false, 1),
  ('33333333-3333-4333-8333-333333333333', 'stan', '66666666-0000-4000-8000-000000000001', '77777777-0000-4000-8000-000000000001', 'Fleece',      true,  true,  2),
  ('33333333-3333-4333-8333-333333333333', 'stan', '66666666-0000-4000-8000-000000000002', null,                                   'Binoculars',  false, false, 3);
