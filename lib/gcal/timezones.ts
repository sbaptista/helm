// Timezones now come from each record (docs/timezone-lookup-plan.md); the old
// city and airport lists and their America/Vancouver fallback are gone.

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
