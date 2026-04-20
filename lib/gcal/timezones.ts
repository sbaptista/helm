export const CITY_TIMEZONES: Record<string, string> = {
  // Hawaii
  honolulu: 'Pacific/Honolulu',
  // BC
  vancouver: 'America/Vancouver',
  kamloops: 'America/Vancouver',
  // Alberta
  jasper: 'America/Edmonton',
  'lake louise': 'America/Edmonton',
  banff: 'America/Edmonton',
  calgary: 'America/Edmonton',
}

export const AIRPORT_TIMEZONES: Record<string, string> = {
  HNL: 'Pacific/Honolulu',
  YVR: 'America/Vancouver',
  YKA: 'America/Vancouver',
  YXS: 'America/Vancouver',
  YXC: 'America/Edmonton',
  YYC: 'America/Edmonton',
  YJA: 'America/Edmonton',
  // add more as needed
}

export function getCityTimezone(city: string): string {
  return CITY_TIMEZONES[city?.toLowerCase()?.trim()] ?? 'America/Vancouver'
}

export function getAirportTimezone(airport: string): string {
  const code = airport?.toUpperCase()?.trim()
  return AIRPORT_TIMEZONES[code] ?? 'America/Vancouver'
}

// Convert UTC Date to local ISO string (no offset) for Google Calendar API
export function toLocalISOString(utcDate: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(utcDate)
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '00'
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`
}

// Add hours to a local ISO string (for default durations)
export function addHoursToLocalISO(localISO: string, hours: number): string {
  const d = new Date(localISO)
  d.setHours(d.getHours() + hours)
  return d.toISOString().slice(0, 19)
}
