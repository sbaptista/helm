import { getCityTimezone, getAirportTimezone, toLocalISOString } from './timezones'
import type { FlightRow, HotelRow, TransportationRow, RestaurantRow, ItineraryRowRow, ChecklistRow } from '@/types/sections'

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

function dateAtTimezone(instant: string, timezone: string): string {
  return toLocalISOString(new Date(instant), timezone).slice(0, 10)
}

function storedWallClock(value: string): string {
  return value.slice(0, 19)
}

function addMinutesToWallClock(localISO: string, minutes: number): string {
  return new Date(new Date(`${localISO}Z`).getTime() + minutes * 60_000).toISOString().slice(0, 19)
}

function flightDescription(row: FlightRow): string {
  return buildDescription({
    Confirmation: row.confirmation_number,
    Class: row.cabin_class,
    Seat: row.seat_number,
    Notes: row.notes,
  })
}

function formatFlightCalendarTime(instant: string, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  }).formatToParts(new Date(instant))
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value ?? ''
  return `${value('hour')}:${value('minute')}${value('dayPeriod').toLowerCase()} ${value('timeZoneName')}`
}

function cityName(value: string | null, fallback: string | null): string {
  return value?.split(',')[0]?.trim() || fallback?.trim() || 'destination'
}

function flightCarrierDetails(value: string | null): { carrier: string; checkin: string } {
  const airline = value?.trim() || 'Airline'
  const match = airline.match(/^(.*?)[.,]\s*check\s*in(?:\s+with)?\s+(.+?)\.?$/i)
  if (!match) return { carrier: airline, checkin: airline }
  return {
    carrier: match[1].trim(),
    checkin: match[2].trim().replace(/\.$/, ''),
  }
}

export function buildFlightEvent(row: FlightRow): GCalEvent {
  const timezone = row.departure_timezone ?? getAirportTimezone(row.origin_airport ?? '')
  const arrivalTimezone = row.arrival_timezone ?? getAirportTimezone(row.destination_airport ?? '')
  const instant = row.departure_time ?? ''
  const flight = row.flight_number?.trim() || 'Flight'
  const { carrier, checkin } = flightCarrierDetails(row.airline)
  const firstLine = `${flight} (${carrier}) Checkin ${checkin}`
  const secondLine = `Depart ${row.origin_airport || 'origin'} ${formatFlightCalendarTime(instant, timezone)}, Arrive ${cityName(row.destination_city, row.destination_airport)} ${formatFlightCalendarTime(row.arrival_time ?? '', arrivalTimezone)}`
  const summary = `${row.departure_is_approx || row.arrival_is_approx ? '≈ ' : ''}${firstLine}, ${secondLine}`
  if (row.departure_is_all_day) {
    const date = dateAtTimezone(instant, timezone)
    return { summary, description: flightDescription(row), start: { date }, end: { date: nextDay(date) } }
  }
  const arrival = new Date(row.arrival_time ?? '')
  return {
    summary,
    description: flightDescription(row),
    start: { dateTime: toLocalISOString(new Date(instant), timezone), timeZone: timezone },
    end: { dateTime: toLocalISOString(arrival, arrivalTimezone), timeZone: arrivalTimezone },
  }
}

// ── Hotels ────────────────────────────────────────────────────────

function buildHotelAddress(row: HotelRow): string | null {
  const provinceAndPostalCode = [row.province, row.postal_code]
    .map(part => part?.trim())
    .filter(Boolean)
    .join(' ')
  const address = [row.address, row.city, provinceAndPostalCode]
    .map(part => part?.trim())
    .filter(Boolean)
    .join(', ')
  return address || null
}

export function buildHotelCheckinEvent(row: HotelRow): GCalEvent {
  const tz = getCityTimezone(row.city ?? '')
  const summary = `${row.check_in_is_approx ? '≈ ' : ''}${row.name} · Check-in`
  if (row.check_in_is_all_day) {
    const date = row.check_in_date ?? ''
    return { summary, description: buildDescription({ Address: buildHotelAddress(row), Confirmation: row.confirmation_number, Phone: row.phone, Notes: row.notes }), start: { date }, end: { date: nextDay(date) } }
  }
  const time = row.check_in_time ?? '15:00:00'
  const dateTime = `${row.check_in_date ?? ''}T${time}`

  return {
    summary,
    description: buildDescription({
      Address: buildHotelAddress(row),
      Confirmation: row.confirmation_number,
      Phone: row.phone,
      Notes: row.notes,
    }),
    start: { dateTime, timeZone: tz },
    end:   { dateTime: addMinutesToWallClock(dateTime, 30), timeZone: tz },
  }
}

export function buildHotelCheckoutEvent(row: HotelRow): GCalEvent {
  const tz = getCityTimezone(row.city ?? '')
  const summary = `${row.check_out_is_approx ? '≈ ' : ''}${row.name} · Check-out`
  if (row.check_out_is_all_day) {
    const date = row.check_out_date ?? ''
    return { summary, description: buildDescription({ Address: buildHotelAddress(row), Confirmation: row.confirmation_number, Notes: row.notes }), start: { date }, end: { date: nextDay(date) } }
  }
  const time = row.check_out_time ?? '11:00:00'
  const dateTime = `${row.check_out_date ?? ''}T${time}`

  return {
    summary,
    description: buildDescription({
      Address: buildHotelAddress(row),
      Confirmation: row.confirmation_number,
      Notes: row.notes,
    }),
    start: { dateTime, timeZone: tz },
    end:   { dateTime: addMinutesToWallClock(dateTime, 30), timeZone: tz },
  }
}

// ── Transportation ────────────────────────────────────────────────

export function buildTransportationEvent(row: TransportationRow): GCalEvent {
  const tz = row.departure_timezone ?? getCityTimezone(row.origin ?? '')
  const arrTz = row.arrival_timezone ?? getCityTimezone(row.destination ?? '')
  const summary = `${row.pickup_is_approx ? '≈ ' : ''}${row.origin} → ${row.destination} · ${row.provider ?? row.type ?? ''}`.trim()
  const description = buildDescription({
    Type: row.type,
    Provider: row.provider,
    Confirmation: row.confirmation_number,
    Notes: row.notes,
  })
  if (row.pickup_is_all_day) {
    const date = (row.departure_time ?? '').slice(0, 10)
    return { summary, description, start: { date }, end: { date: nextDay(date) } }
  }
  const localStart = storedWallClock(row.departure_time ?? '')
  const localEnd = row.arrival_time ? storedWallClock(row.arrival_time) : addMinutesToWallClock(localStart, 60)
  return {
    summary,
    description,
    start: { dateTime: localStart, timeZone: tz },
    end: { dateTime: localEnd, timeZone: row.arrival_time ? arrTz : tz },
  }
}

// ── Restaurants ───────────────────────────────────────────────────

export function buildRestaurantEvent(row: RestaurantRow): GCalEvent {
  const tz = getCityTimezone(row.city ?? '')
  const localStart = storedWallClock(row.reservation_time ?? '')
  const localEnd = addMinutesToWallClock(localStart, 30)

  const summary = `${row.reservation_is_approx ? '≈ ' : ''}${row.display_label || row.name || ''}`
  const description = buildDescription({
      Cuisine: row.cuisine,
      Address: row.address,
      'Party size': row.party_size ? String(row.party_size) : null,
      Confirmation: row.confirmation_number,
      Notes: row.notes,
    })
  if (row.reservation_is_all_day) {
    const date = (row.reservation_time ?? '').slice(0, 10)
    return { summary, description, start: { date }, end: { date: nextDay(date) } }
  }
  return {
    summary,
    description,
    start: { dateTime: localStart, timeZone: tz },
    end:   { dateTime: localEnd, timeZone: tz },
  }
}

// ── Itinerary ─────────────────────────────────────────────────────

export function buildItineraryEvent(row: ItineraryRowRow): GCalEvent {
  const tz = row.start_timezone ?? 'America/Vancouver'

  if (row.is_all_day) {
    const date = new Date(row.start_time ?? '').toISOString().slice(0, 10)
    return {
      summary: row.title ?? '',
      description: buildDescription({ Description: row.description, Location: row.location }),
      start: { date },
      end:   { date: nextDay(date) },
    }
  }

  const start = new Date(row.start_time ?? '')
  const end = row.end_time
    ? new Date(row.end_time)
    : new Date(start.getTime() + 3600000)
  const endTz = row.end_timezone ?? tz

  return {
    summary: row.title ?? '',
    description: buildDescription({ Description: row.description, Location: row.location }),
    start: { dateTime: toLocalISOString(start, tz), timeZone: tz },
    end:   { dateTime: toLocalISOString(end, endTz), timeZone: endTz },
  }
}

// ── Checklist ─────────────────────────────────────────────────────

export function buildChecklistDueEvent(row: ChecklistRow): GCalEvent {
  return {
    summary: `${row.task} · Due`,
    description: buildDescription({ Group: row.group_name, Notes: row.notes }),
    start: { date: row.due_date ?? undefined },
    end:   { date: nextDay(row.due_date ?? '') },
  }
}

export function buildChecklistWarningEvent(row: ChecklistRow): GCalEvent {
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
