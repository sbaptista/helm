export interface ZonedDateTimeInput {
  date: string
  time: string
}

interface DateTimeParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

function parseLocalDateTime(localISO: string): DateTimeParts | null {
  const match = localISO.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/)
  if (!match) return null
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
    second: Number(match[6] ?? 0),
  }
}

function partsAtInstant(instantMs: number, timezone: string): DateTimeParts {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(instantMs))
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find(part => part.type === type)?.value ?? 0)
  return {
    year: value('year'),
    month: value('month'),
    day: value('day'),
    hour: value('hour'),
    minute: value('minute'),
    second: value('second'),
  }
}

function partsAsUtcMs(parts: DateTimeParts): number {
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
}

/** Convert an airport-local wall-clock value plus IANA timezone into a UTC instant. */
export function zonedLocalDateTimeToUtc(localISO: string, timezone: string): string {
  const desired = parseLocalDateTime(localISO)
  if (!desired) throw new Error(`Invalid local date/time: ${localISO}`)

  const desiredAsUtc = partsAsUtcMs(desired)
  let candidate = desiredAsUtc
  for (let attempt = 0; attempt < 3; attempt++) {
    const observedAsUtc = partsAsUtcMs(partsAtInstant(candidate, timezone))
    const correction = desiredAsUtc - observedAsUtc
    candidate += correction
    if (correction === 0) break
  }
  return new Date(candidate).toISOString()
}

export function normalizeZonedDateTime(value: unknown, timezone: unknown): unknown {
  if (typeof value !== 'string' || !value || typeof timezone !== 'string' || !timezone) return value
  if (/(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) return new Date(value).toISOString()
  return zonedLocalDateTimeToUtc(value, timezone)
}

/** Convert a stored UTC instant back to the local values used by date/time inputs. */
export function instantToZonedInput(iso: string | null, timezone: string | null): ZonedDateTimeInput {
  if (!iso) return { date: '', time: '' }
  if (!timezone) return { date: iso.slice(0, 10), time: iso.slice(11, 16) }
  const parts = partsAtInstant(new Date(iso).getTime(), timezone)
  return {
    date: `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`,
    time: `${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`,
  }
}

/** Format a stored instant in the location's timezone, including date-correct DST abbreviation. */
export function formatZonedDateTime(iso: string | null, timezone: string | null): string {
  if (!iso) return '—'
  if (!timezone) return new Date(iso).toLocaleString()
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(iso))
}
