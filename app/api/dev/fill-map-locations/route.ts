import { logger } from '@/lib/logger'
import { getAuthUserId, tripServiceClient } from '@/lib/auth/trip-access'
import { mapSelect, type MapTable } from '@/lib/geo/map-link'
import { geocodeExactDetail, pinFromLink } from '@/lib/geo/map-location'
import { buildMapsUrl, type MapLinkPlace } from '@/lib/geo/place-query'

// POST /api/dev/fill-map-locations — development only (DEV panel). Finds the
// map location for hotels and restaurants on the signed-in user's trips that
// have a map link (or the switch on) but no location yet, writing the link
// first for switch-on records saved before version 2, so existing records get a tile without
// being saved again (docs/links-and-map-tiles-plan.md §3). The database is
// shared, so this fills production records too. Records that stay without a
// location (no precise match, no pin in the link) are counted, not retried
// differently. Returns { checked, found, failed, linked, notFound } (name: reason).

const TABLES: MapTable[] = ['hotels', 'restaurants']
const LIMIT = 200

export async function POST(): Promise<Response> {
  if (process.env.NODE_ENV !== 'development') return Response.json({ error: 'Not found.' }, { status: 404 })
  const userId = await getAuthUserId()
  if (!userId) return Response.json({ error: 'Unauthorized.' }, { status: 401 })

  try {
    const supabase = tripServiceClient()
    const { data: members, error: memberError } = await supabase.from('trip_members').select('trip_id').eq('user_id', userId)
    if (memberError) throw new Error(memberError.message)
    const tripIds = (members ?? []).map((m) => m.trip_id as string)
    let checked = 0, found = 0, failed = 0, linked = 0
    const notFound: string[] = []
    for (const table of TABLES) {
      if (tripIds.length === 0) break
      const { data: rows, error } = await supabase.from(table).select(`id, ${mapSelect(table)}`)
        .in('trip_id', tripIds).is('deleted_at', null).is('map_lat', null).or('maps_url.not.is.null,maps_url_auto.eq.true').limit(LIMIT)
      if (error) throw new Error(error.message)
      for (const row of (rows ?? []) as unknown as Array<Record<string, unknown> & { id: string }>) {
        checked++
        let location, reason
        if (row.maps_url_auto === false) {
          location = await pinFromLink(row.maps_url as string)
          reason = 'no pin in the link'
        } else {
          // Records saved before version 2 may not have their link yet.
          const link = buildMapsUrl(row as MapLinkPlace)
          if (link && link !== row.maps_url) {
            const { error: linkError } = await supabase.from(table).update({ maps_url: link }).eq('id', row.id)
            if (linkError) { failed++; continue }
            linked++
          }
          if (!link) { notFound.push(`${row.name ?? row.id}: no street address and city`); continue }
          ({ location, reason } = await geocodeExactDetail(row as MapLinkPlace))
        }
        if (!location) { notFound.push(`${row.name ?? row.id}: ${reason}`); continue }
        const { error: updateError } = await supabase.from(table)
          .update({ map_lat: location.lat, map_lng: location.lng }).eq('id', row.id)
        if (updateError) failed++
        else found++
      }
    }
    return Response.json({ checked, found, failed, linked, notFound })
  } catch (err) {
    await logger.error('api/dev/fill-map-locations', 'Unable to fill map locations', {
      error: err instanceof Error ? err.message : String(err),
    })
    return Response.json({ error: 'Unable to fill map locations.' }, { status: 500 })
  }
}
