// Readable names for IANA timezones, from the browser's own data
// (docs/timezone-lookup-plan.md). Client and server safe.

/** "America/Los_Angeles" → "Los Angeles"; "America/Argentina/Buenos_Aires" → "Buenos Aires". */
export function timezoneCity(id: string): string {
  const parts = id.split('/')
  return (parts[parts.length - 1] ?? id).replace(/_/g, ' ')
}

export function timezoneRegion(id: string): string {
  return id.includes('/') ? id.split('/')[0] : 'Other'
}

function namePart(id: string, style: 'short' | 'longGeneric', date: Date): string {
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: id, timeZoneName: style })
      .formatToParts(date).find(part => part.type === 'timeZoneName')?.value ?? ''
  } catch {
    return ''
  }
}

/** "Pacific Time", "Japan Standard Time". */
export function timezoneGenericName(id: string, date = new Date()): string {
  return namePart(id, 'longGeneric', date)
}

/** "PST", "GMT+9", for the given date so daylight saving is right. */
export function timezoneAbbreviation(id: string, date = new Date()): string {
  return namePart(id, 'short', date)
}

/** "Los Angeles — Pacific Time (PST)". */
export function timezoneLabel(id: string, date = new Date()): string {
  const generic = timezoneGenericName(id, date)
  const abbreviation = timezoneAbbreviation(id, date)
  return `${timezoneCity(id)}${generic ? ` — ${generic}` : ''}${abbreviation ? ` (${abbreviation})` : ''}`
}

/** Every timezone the browser knows, sorted by region then city. */
export function allTimezones(): string[] {
  const supported = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf
  const ids = supported ? supported('timeZone') : []
  return [...ids].sort((a, b) =>
    timezoneRegion(a).localeCompare(timezoneRegion(b)) || timezoneCity(a).localeCompare(timezoneCity(b)))
}
