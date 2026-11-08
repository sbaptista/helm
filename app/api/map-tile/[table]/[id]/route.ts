import { logger } from '@/lib/logger'
import { requireRecordMember, tripServiceClient } from '@/lib/auth/trip-access'

// GET /api/map-tile/{hotels|restaurants}/{id} → a small map image with a pin
// at the record's stored location (docs/links-and-map-tiles-plan.md §3).
// Google's Maps Static API is called here so the key never reaches the
// browser; the browser keeps the image as long as Google's response allows.
// The card adds ?v=lat,lng, so a moved pin is a new image.

const TABLES = new Set(['hotels', 'restaurants'])
const TIMEOUT_MS = 8000

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ table: string; id: string }> },
): Promise<Response> {
  const { table, id } = await params
  if (!TABLES.has(table)) return Response.json({ error: 'Not found.' }, { status: 404 })

  const supabase = tripServiceClient()
  const access = await requireRecordMember(table, id, { supabase })
  if ('response' in access) return access.response

  const key = process.env.GOOGLE_MAPS_API_KEY
  if (!key) return Response.json({ error: 'Maps key not configured.' }, { status: 503 })

  try {
    const { data, error } = await supabase.from(table).select('map_lat, map_lng').eq('id', id).maybeSingle()
    if (error) throw new Error(error.message)
    const lat = (data as { map_lat?: number | null } | null)?.map_lat
    const lng = (data as { map_lng?: number | null } | null)?.map_lng
    if (lat == null || lng == null) return Response.json({ error: 'No map location.' }, { status: 404 })

    const at = `${lat},${lng}`
    const google = await fetch(
      'https://maps.googleapis.com/maps/api/staticmap'
        + `?center=${at}&zoom=16&size=320x160&scale=2&markers=${encodeURIComponent(`color:red|${at}`)}`
        + `&key=${encodeURIComponent(key)}`,
      { signal: AbortSignal.timeout(TIMEOUT_MS), cache: 'no-store' },
    )
    const type = google.headers.get('content-type') ?? ''
    if (!google.ok || !type.startsWith('image/')) {
      const detail = type.startsWith('image/') ? '' : (await google.text()).slice(0, 300)
      await logger.error('api/map-tile', 'Maps Static API refused the request', {
        status: google.status, detail, table, recordId: id,
      }, access.tripId)
      return Response.json({ error: 'Map image unavailable.' }, { status: 502 })
    }
    const maxAge = Number(/max-age=(\d+)/.exec(google.headers.get('cache-control') ?? '')?.[1] ?? 86400)
    return new Response(google.body, {
      headers: {
        'Content-Type': type,
        'Cache-Control': `private, max-age=${Math.min(maxAge, 86400 * 7)}`,
      },
    })
  } catch (err) {
    await logger.error('api/map-tile', 'Unable to get map image', {
      error: err instanceof Error ? err.message : String(err), table, recordId: id,
    }, access.tripId)
    return Response.json({ error: 'Map image unavailable.' }, { status: 502 })
  }
}
