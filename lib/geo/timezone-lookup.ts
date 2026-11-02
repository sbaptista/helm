// Server only: a place's text → Google Geocoding → coordinates → Google Time
// Zone → IANA timezone name. The key never reaches the browser.
// docs/timezone-lookup-plan.md
import { logger } from '@/lib/logger'

export type TimezoneLookupResult =
  | { ok: true; timezone: string; place: string; city: string | null }
  | { ok: false; reason: 'not-found' | 'no-key' | 'google-error' | 'network'; message: string }

const TIMEOUT_MS = 5000

async function getJson(url: string): Promise<Record<string, unknown>> {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), cache: 'no-store' })
  return (await res.json()) as Record<string, unknown>
}

interface GeocodeComponent { long_name: string; short_name: string; types: string[] }
interface GeocodeResult {
  formatted_address: string
  geometry: { location: { lat: number; lng: number } }
  address_components: GeocodeComponent[]
}

// "Ann Arbor, MI" / "Kyoto, Japan" from the geocoder's address parts.
function cityLabel(result: GeocodeResult): string | null {
  const find = (type: string) => result.address_components.find(c => c.types.includes(type))
  const city = find('locality') ?? find('postal_town') ?? find('administrative_area_level_2')
  if (!city) return null
  const country = find('country')
  const region = find('administrative_area_level_1')
  if (country && (country.short_name === 'US' || country.short_name === 'CA') && region) {
    return `${city.long_name}, ${region.short_name}`
  }
  return country ? `${city.long_name}, ${country.long_name}` : city.long_name
}

export async function lookupTimezone(query: string): Promise<TimezoneLookupResult> {
  const text = query.trim()
  if (!text) return { ok: false, reason: 'not-found', message: 'Nothing to look up.' }
  const key = process.env.GOOGLE_MAPS_API_KEY
  if (!key) return { ok: false, reason: 'no-key', message: 'GOOGLE_MAPS_API_KEY is not set.' }

  try {
    const geo = await getJson(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(text)}&key=${encodeURIComponent(key)}`
    )
    if (geo.status === 'ZERO_RESULTS') return { ok: false, reason: 'not-found', message: `No place found for "${text}".` }
    if (geo.status !== 'OK') {
      const message = `Geocoding: ${geo.status}${geo.error_message ? ` — ${geo.error_message}` : ''}`
      logger.error('lib/geo', 'Geocoding request refused', { status: String(geo.status), error: message })
      return { ok: false, reason: 'google-error', message }
    }
    const result = (geo.results as GeocodeResult[])[0]
    const { lat, lng } = result.geometry.location

    const tz = await getJson(
      `https://maps.googleapis.com/maps/api/timezone/json?location=${lat},${lng}&timestamp=${Math.floor(Date.now() / 1000)}&key=${encodeURIComponent(key)}`
    )
    if (tz.status === 'ZERO_RESULTS') return { ok: false, reason: 'not-found', message: `No timezone found for "${text}".` }
    if (tz.status !== 'OK' || typeof tz.timeZoneId !== 'string') {
      const message = `Time Zone: ${tz.status}${tz.errorMessage ? ` — ${tz.errorMessage}` : ''}`
      logger.error('lib/geo', 'Time Zone request refused', { status: String(tz.status), error: message })
      return { ok: false, reason: 'google-error', message }
    }
    return { ok: true, timezone: tz.timeZoneId, place: result.formatted_address, city: cityLabel(result) }
  } catch (err) {
    return { ok: false, reason: 'network', message: err instanceof Error ? err.message : String(err) }
  }
}

export { airportQuery, placeQuery } from './place-query'

/**
 * Fill empty timezone fields on a save, from their place. Fields the form
 * already filled (looked up in the form, or chosen by the person) are kept.
 * Mutates and returns `record`.
 */
export async function fillMissingTimezones(
  record: Record<string, unknown>,
  fields: Array<{ timezone: string; query: string }>
): Promise<Record<string, unknown>> {
  for (const { timezone, query } of fields) {
    if (typeof record[timezone] === 'string' && record[timezone]) continue
    if (!query) continue
    const found = await lookupTimezone(query)
    if (found.ok) record[timezone] = found.timezone
  }
  return record
}
