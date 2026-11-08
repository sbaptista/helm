-- 00.04.0059: automatic map links (docs/links-and-map-tiles-plan.md §2–3).
--
-- maps_url_auto: when true, Helm writes maps_url from the name and address on
-- every save. Records that already have a Maps URL keep it (switch off).
-- map_lat / map_lng: the place's exact location, set on save; used for map
-- tiles (version 3). Written on save only, never filtered on: no index.
-- Idempotent.

alter table public.hotels
  add column if not exists maps_url_auto boolean not null default true,
  add column if not exists map_lat double precision,
  add column if not exists map_lng double precision;

alter table public.restaurants
  add column if not exists maps_url_auto boolean not null default true,
  add column if not exists map_lat double precision,
  add column if not exists map_lng double precision;

-- Keep every Maps URL someone already entered.
update public.hotels set maps_url_auto = false
  where maps_url is not null and btrim(maps_url) <> '' and maps_url_auto;
update public.restaurants set maps_url_auto = false
  where maps_url is not null and btrim(maps_url) <> '' and maps_url_auto;

-- Check:
-- select table_name, column_name, data_type, column_default from information_schema.columns
--   where table_schema = 'public' and table_name in ('hotels', 'restaurants')
--   and column_name in ('maps_url_auto', 'map_lat', 'map_lng') order by 1, 2;
