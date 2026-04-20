import { getCityTimezone, getAirportTimezone, toLocalISOString } from './timezones'

// ── Shared types ──────────────────────────────────────────────────

export interface GCalEvent {
  summary: string
  description?: string
  start: { dateTime?: string; date?: string; timeZone?: string }
  end:   { dateTime?: string; date?: string; timeZone?: string }
}

// Add one day to a YYYY-MM-DD string (for all-day event end)
function nextDay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

function buildDescription(parts: Record<string, string | null | undefined>): string {
  return Object.entries(parts)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')
}

// ── Flights ───────────────────────────────────────────────────────

export function buildFlightEvent(row: any): GCalEvent {
  const tz = getAirportTimezone(row.origin_airport)
  const arrTz = getAirportTimezone(row.destination_airport)
  const dep = new Date(row.departure_time)
  const arr = new Date(row.arrival_time)

  return {
    summary: `${row.airline ?? ''} ${row.flight_number ?? ''} · ${row.origin_airport} → ${row.destination_airport}`.trim(),
    description: buildDescription({
      Confirmation: row.confirmation_number,
      Class: row.cabin_class,
      Notes: row.notes,
    }),
    start: { dateTime: toLocalISOString(dep, tz), timeZone: tz },
    end:   { dateTime: toLocalISOString(arr, arrTz), timeZone: arrTz },
  }
}

// ── Hotels ────────────────────────────────────────────────────────

export function buildHotelCheckinEvent(row: any): GCalEvent {
  const tz = getCityTimezone(row.city)
  const time = row.check_in_time ?? '15:00:00'
  const dateTime = `${row.check_in_date}T${time}`

  return {
    summary: `${row.name} · Check-in`,
    description: buildDescription({
      Address: row.address,
      Confirmation: row.confirmation_number,
      Phone: row.phone,
      Notes: row.notes,
    }),
    start: { dateTime, timeZone: tz },
    end:   { dateTime: addOneHour(dateTime), timeZone: tz },
  }
}

export function buildHotelCheckoutEvent(row: any): GCalEvent {
  const tz = getCityTimezone(row.city)
  const time = row.check_out_time ?? '11:00:00'
  const dateTime = `${row.check_out_date}T${time}`

  return {
    summary: `${row.name} · Check-out`,
    description: buildDescription({
      Address: row.address,
      Confirmation: row.confirmation_number,
      Notes: row.notes,
    }),
    start: { dateTime, timeZone: tz },
    end:   { dateTime: addOneHour(dateTime), timeZone: tz },
  }
}

function addOneHour(localISO: string): string {
  const [datePart, timePart] = localISO.split('T')
  const [h, m, s] = timePart.split(':').map(Number)
  const newH = String((h + 1) % 24).padStart(2, '0')
  return `${datePart}T${newH}:${String(m).padStart(2, '0')}:${String(s || 0).padStart(2, '0')}`
}

// ── Transportation ────────────────────────────────────────────────

export function buildTransportationEvent(row: any): GCalEvent {
  const tz = getCityTimezone(row.origin)
  const arrTz = getCityTimezone(row.destination)
  const dep = new Date(row.departure_time)
  const arr = row.arrival_time ? new Date(row.arrival_time) : null

  return {
    summary: `${row.origin} → ${row.destination} · ${row.provider ?? row.type ?? ''}`.trim(),
    description: buildDescription({
      Type: row.type,
      Provider: row.provider,
      Confirmation: row.confirmation_number,
      Notes: row.notes,
    }),
    start: { dateTime: toLocalISOString(dep, tz), timeZone: tz },
    end: arr
      ? { dateTime: toLocalISOString(arr, arrTz), timeZone: arrTz }
      : { dateTime: toLocalISOString(new Date(dep.getTime() + 3600000), tz), timeZone: tz },
  }
}

// ── Restaurants ───────────────────────────────────────────────────

export function buildRestaurantEvent(row: any): GCalEvent {
  const tz = getCityTimezone(row.city)
  const start = new Date(row.reservation_time)
  const end = new Date(start.getTime() + 2 * 3600000)

  return {
    summary: row.name,
    description: buildDescription({
      Cuisine: row.cuisine,
      Address: row.address,
      'Party size': row.party_size ? String(row.party_size) : null,
      Confirmation: row.confirmation_number,
      Notes: row.notes,
    }),
    start: { dateTime: toLocalISOString(start, tz), timeZone: tz },
    end:   { dateTime: toLocalISOString(end, tz), timeZone: tz },
  }
}

// ── Itinerary ─────────────────────────────────────────────────────

export function buildItineraryEvent(row: any): GCalEvent {
  const tz = row.start_timezone ?? 'America/Vancouver'

  if (row.is_all_day) {
    const date = new Date(row.start_time).toISOString().slice(0, 10)
    return {
      summary: row.title,
      description: buildDescription({ Description: row.description, Location: row.location }),
      start: { date },
      end:   { date: nextDay(date) },
    }
  }

  const start = new Date(row.start_time)
  const end = row.end_time
    ? new Date(row.end_time)
    : new Date(start.getTime() + 3600000)
  const endTz = row.end_timezone ?? tz

  return {
    summary: row.title,
    description: buildDescription({ Description: row.description, Location: row.location }),
    start: { dateTime: toLocalISOString(start, tz), timeZone: tz },
    end:   { dateTime: toLocalISOString(end, endTz), timeZone: endTz },
  }
}

// ── Checklist ─────────────────────────────────────────────────────

export function buildChecklistDueEvent(row: any): GCalEvent {
  return {
    summary: `${row.task} · Due`,
    description: buildDescription({ Group: row.group_name, Notes: row.notes }),
    start: { date: row.due_date },
    end:   { date: nextDay(row.due_date) },
  }
}

export function buildChecklistWarningEvent(row: any): GCalEvent {
  const dueDate = new Date(row.due_date + 'T00:00:00')
  dueDate.setDate(dueDate.getDate() - (row.warning_days ?? 7))
  const warningDate = dueDate.toISOString().slice(0, 10)

  return {
    summary: `⚠️ ${row.task} · Due in ${row.warning_days} days`,
    description: buildDescription({ Group: row.group_name, Notes: row.notes }),
    start: { date: warningDate },
    end:   { date: nextDay(warningDate) },
  }
}
