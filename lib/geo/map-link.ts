import type { SupabaseClient } from '@supabase/supabase-js'
import { buildMapsUrl, type MapLinkPlace } from './place-query'
import { geocodeExact, pinFromLink, type MapLocation } from './map-location'

// Server side of the automatic Maps URL and the map tile's location
// (docs/links-and-map-tiles-plan.md §2–3). With the switch on (the default),
// maps_url is always written from the name and address, so it follows address
// changes made anywhere, offline included. map_lat/map_lng are set only here.

const PLACE_FIELDS = ['name', 'address', 'city', 'province', 'state_province', 'postal_code', 'country', 'maps_url', 'maps_url_auto']

export type MapTable = 'hotels' | 'restaurants'

export function mapSelect(table: MapTable): string {
  const province = table === 'hotels' ? 'province' : 'state_province'
  return `name, address, city, ${province}, postal_code, country, maps_url, maps_url_auto, map_lat, map_lng`
}

/** Where the record's tile pin goes, or null when it isn't the place itself. */
export async function mapLocationFor(row: MapLinkPlace & { maps_url?: string | null; maps_url_auto?: boolean | null }): Promise<MapLocation | null> {
  if (row.maps_url_auto === false) return pinFromLink(row.maps_url)
  return geocodeExact(row)
}

/**
 * Sets body.maps_url when the record's switch is on, and body.map_lat/map_lng
 * when the link changed (or no location is stored yet). For an update (id
 * given), the stored record fills the fields the request doesn't send.
 * Mutates body.
 */
export async function applyMapLink(
  supabase: SupabaseClient,
  table: MapTable,
  id: string | null,
  body: Record<string, unknown>,
): Promise<void> {
  // Never taken from a request.
  delete body.map_lat
  delete body.map_lng
  if (!PLACE_FIELDS.some((f) => f in body)) return
  let existing: Record<string, unknown> | null = null
  if (id) {
    const { data, error } = await supabase.from(table).select(mapSelect(table)).eq('id', id).maybeSingle()
    if (error) throw new Error(error.message)
    existing = (data as Record<string, unknown> | null) ?? null
  }
  const row = { ...(existing ?? {}), ...body } as MapLinkPlace & { maps_url?: string | null; maps_url_auto?: boolean | null }
  if (row.maps_url_auto !== false) {
    row.maps_url = buildMapsUrl(row)
    body.maps_url = row.maps_url
  }
  const link = row.maps_url ?? null
  if (existing && (existing.maps_url ?? null) === link && existing.map_lat != null) return
  const location = link ? await mapLocationFor(row) : null
  body.map_lat = location?.lat ?? null
  body.map_lng = location?.lng ?? null
}
