// Server only: where a record's map pin goes (docs/links-and-map-tiles-plan.md §3).
// A location is kept only when it is the place itself, never a guess: a
// precise Geocoding match of the street address (switch on), or the pin in the
// person's own link (switch off). Otherwise null, and no map tile is shown.
import { logger } from '@/lib/logger'
import { hasMapAddress, type MapLinkPlace } from './place-query'

export interface MapLocation { lat: number; lng: number }

const TIMEOUT_MS = 5000
const PRECISE = new Set(['ROOFTOP', 'RANGE_INTERPOLATED'])
// GEOMETRIC_CENTER is also the centre of one building (Google's "premise");
// it counts only for those result types, never for a street, area or town.
const BUILDING_TYPES = ['street_address', 'premise', 'subpremise', 'establishment', 'point_of_interest', 'lodging']

function valid(lat: number, lng: number): MapLocation | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
  if (lat === 0 && lng === 0) return null
  return { lat, lng }
}

function join(parts: Array<string | null | undefined>): string {
  return parts.map(p => (typeof p === 'string' ? p.trim() : '')).filter(Boolean).join(', ')
}

/** Switch on: Geocoding of the street address, precise matches only. */
export async function geocodeExact(row: MapLinkPlace): Promise<MapLocation | null> {
  return (await geocodeExactDetail(row)).location
}

/** geocodeExact with the reason when there is no location (DEV panel). */
export async function geocodeExactDetail(row: MapLinkPlace): Promise<{ location: MapLocation | null; reason: string }> {
  const none = (reason: string) => ({ location: null, reason })
  if (!hasMapAddress(row)) return none('no street address and city')
  const key = process.env.GOOGLE_MAPS_API_KEY
  if (!key) return none('no key')
  const address = join([row.address, row.city, row.province || row.state_province, row.postal_code, row.country])
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${encodeURIComponent(key)}`,
      { signal: AbortSignal.timeout(TIMEOUT_MS), cache: 'no-store' },
    )
    const geo = (await res.json()) as {
      status?: string
      error_message?: string
      results?: Array<{ partial_match?: boolean; formatted_address?: string; types?: string[]; geometry?: { location_type?: string; location?: { lat: number; lng: number } } }>
    }
    if (geo.status === 'ZERO_RESULTS') return none('Google found no place')
    if (geo.status !== 'OK') {
      logger.error('lib/geo', 'Geocoding request refused (map location)', { status: String(geo.status), error: geo.error_message ?? '' })
      return none(`Google refused: ${geo.status}`)
    }
    const result = geo.results?.[0]
    const type = result?.geometry?.location_type ?? 'none'
    if (!result) return none('Google found no place')
    if (result.partial_match) return none(`partial match (${type}): ${result.formatted_address ?? ''}`)
    const building = type === 'GEOMETRIC_CENTER' && (result.types ?? []).some(t => BUILDING_TYPES.includes(t))
    if (!PRECISE.has(type) && !building) return none(`not exact (${type}, ${(result.types ?? []).join('/')}): ${result.formatted_address ?? ''}`)
    const loc = result.geometry?.location
    const location = loc ? valid(loc.lat, loc.lng) : null
    return location ? { location, reason: '' } : none('no coordinates')
  } catch (err) {
    return none(`network: ${err instanceof Error ? err.message : String(err)}`)
  }
}

const COORD = '(-?\\d{1,3}(?:\\.\\d+)?)'

/**
 * The pin in a map link, if it has one: Google's place data (`!3d…!4d…`),
 * a `q=`/`query=` of coordinates, or `/maps/place/lat,lng`. Apple Maps `ll`
 * with `q` marks a pin too. A map centre alone (`@lat,lng`) is not a pin.
 */
export function pinFromUrl(link: string): MapLocation | null {
  let url: URL
  try { url = new URL(link) } catch { return null }
  const text = decodeURIComponent(url.href)

  const place = text.match(new RegExp(`!3d${COORD}!4d${COORD}`))
  if (place) return valid(Number(place[1]), Number(place[2]))

  const pair = new RegExp(`^\\s*${COORD}\\s*,\\s*${COORD}\\s*$`)
  for (const name of ['q', 'query', 'daddr', 'destination']) {
    const m = (url.searchParams.get(name) ?? '').match(pair)
    if (m) return valid(Number(m[1]), Number(m[2]))
  }

  const path = url.pathname.match(new RegExp(`/maps/(?:place|search)/${COORD},\\+?${COORD}(?:/|$)`))
  if (path) return valid(Number(path[1]), Number(path[2]))

  if (url.hostname === 'maps.apple.com' && url.searchParams.get('q')) {
    const m = (url.searchParams.get('ll') ?? '').match(pair)
    if (m) return valid(Number(m[1]), Number(m[2]))
  }
  return null
}

const SHORT_HOSTS = new Set(['maps.app.goo.gl', 'goo.gl'])

/**
 * Short links (maps.app.goo.gl) are opened on the server only far enough to
 * read where they redirect; nothing but Google's short-link hosts is fetched.
 */
async function expandShortLink(link: string): Promise<string> {
  let current = link
  for (let hop = 0; hop < 5; hop++) {
    let url: URL
    try { url = new URL(current) } catch { return current }
    if (url.protocol !== 'https:' || !SHORT_HOSTS.has(url.hostname)) return current
    if (url.hostname === 'goo.gl' && !url.pathname.startsWith('/maps')) return current
    try {
      const res = await fetch(url.href, { redirect: 'manual', signal: AbortSignal.timeout(TIMEOUT_MS), cache: 'no-store' })
      const next = res.headers.get('location')
      if (!next) return current
      current = new URL(next, url).href
    } catch {
      return current
    }
  }
  return current
}

/** Switch off: the pin in the person's own link. */
export async function pinFromLink(link: string | null | undefined): Promise<MapLocation | null> {
  if (!link?.trim()) return null
  return pinFromUrl(await expandShortLink(link.trim()))
}
