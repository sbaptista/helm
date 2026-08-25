import type { SupabaseClient } from '@supabase/supabase-js'
import { getAirportTimezone, getCityTimezone } from '@/lib/gcal/timezones'
import { instantToZonedInput, zonedLocalDateTimeToUtc } from '@/lib/zoned-time'
import type { FlightRow, HotelRow, RestaurantRow, TransportationRow } from '@/types/sections'

export type LinkedItinerarySection = 'Flights' | 'Hotels' | 'Restaurants' | 'Transportation'

export interface LinkedItineraryEntry {
  id: string
  source_id: string
  source_section: LinkedItinerarySection
  occurrence: 'departure' | 'arrival' | 'check-in' | 'check-out' | 'reservation' | 'pickup'
  day_date: string
  start_time: string | null
  timezone: string | null
  is_all_day: boolean
  is_approx: boolean
  title: string
  description: string | null
  location: string | null
  category: 'Flight' | 'Hotel' | 'Restaurant' | 'Transportation'
}

export interface LinkedItinerarySources {
  flights: FlightRow[]
  hotels: HotelRow[]
  restaurants: RestaurantRow[]
  transportation: TransportationRow[]
}

function clean(parts: Array<string | null | undefined>, separator = ' · '): string | null {
  const value = parts.map(part => part?.trim()).filter(Boolean).join(separator)
  return value || null
}

function localDate(instant: string | null, timezone: string): string | null {
  if (!instant) return null
  try {
    return instantToZonedInput(instant, timezone).date || null
  } catch {
    return instant.slice(0, 10) || null
  }
}

function hotelInstant(date: string | null, time: string | null, timezone: string): string | null {
  if (!date || !time) return null
  try {
    return zonedLocalDateTimeToUtc(`${date}T${time}`, timezone)
  } catch {
    return null
  }
}

function wallClockParts(value: string | null, timezone: string): { date: string; instant: string } | null {
  if (!value) return null
  const match = value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/)
  if (!match) return null
  try {
    return { date: match[1], instant: zonedLocalDateTimeToUtc(`${match[1]}T${match[2]}`, timezone) }
  } catch {
    return null
  }
}

function flightEntries(row: FlightRow): LinkedItineraryEntry[] {
  const label = clean([row.airline, row.flight_number]) ?? 'Flight'
  const departureTimezone = row.departure_timezone ?? getAirportTimezone(row.origin_airport ?? '')
  const arrivalTimezone = row.arrival_timezone ?? getAirportTimezone(row.destination_airport ?? '')
  const departureDate = localDate(row.departure_time, departureTimezone)
  const arrivalDate = localDate(row.arrival_time, arrivalTimezone)
  const result: LinkedItineraryEntry[] = []

  if (departureDate) result.push({
    id: `flight:${row.id}:departure`, source_id: row.id, source_section: 'Flights', occurrence: 'departure',
    day_date: departureDate, start_time: row.departure_is_all_day ? null : row.departure_time,
    timezone: departureTimezone, is_all_day: row.departure_is_all_day, is_approx: row.departure_is_approx,
    title: `✈️ Depart ${row.origin_airport || row.origin_city || 'airport'} — ${label}`,
    description: clean([row.confirmation_number ? `Confirmation ${row.confirmation_number}` : null, row.seat_number ? `Seat ${row.seat_number}` : null]),
    location: clean([row.origin_airport, row.origin_city], ', '), category: 'Flight',
  })
  if (arrivalDate) result.push({
    id: `flight:${row.id}:arrival`, source_id: row.id, source_section: 'Flights', occurrence: 'arrival',
    day_date: arrivalDate, start_time: row.arrival_is_all_day ? null : row.arrival_time,
    timezone: arrivalTimezone, is_all_day: row.arrival_is_all_day, is_approx: row.arrival_is_approx,
    title: `🛬 Arrive ${row.destination_airport || row.destination_city || 'airport'} — ${label}`,
    description: null, location: clean([row.destination_airport, row.destination_city], ', '), category: 'Flight',
  })
  return result
}

function hotelEntries(row: HotelRow): LinkedItineraryEntry[] {
  const timezone = getCityTimezone(row.city ?? '')
  const address = clean([row.address, row.city, clean([row.province, row.postal_code], ' ')], ', ')
  const result: LinkedItineraryEntry[] = []
  if (row.check_in_date) result.push({
    id: `hotel:${row.id}:check-in`, source_id: row.id, source_section: 'Hotels', occurrence: 'check-in',
    day_date: row.check_in_date, start_time: row.check_in_is_all_day ? null : hotelInstant(row.check_in_date, row.check_in_time, timezone),
    timezone, is_all_day: row.check_in_is_all_day, is_approx: row.check_in_is_approx,
    title: `🏨 Check in — ${row.name || 'Hotel'}`, description: row.confirmation_number ? `Confirmation ${row.confirmation_number}` : null,
    location: address, category: 'Hotel',
  })
  if (row.check_out_date) result.push({
    id: `hotel:${row.id}:check-out`, source_id: row.id, source_section: 'Hotels', occurrence: 'check-out',
    day_date: row.check_out_date, start_time: row.check_out_is_all_day ? null : hotelInstant(row.check_out_date, row.check_out_time, timezone),
    timezone, is_all_day: row.check_out_is_all_day, is_approx: row.check_out_is_approx,
    title: `🏨 Check out — ${row.name || 'Hotel'}`, description: null, location: address, category: 'Hotel',
  })
  return result
}

function restaurantEntry(row: RestaurantRow): LinkedItineraryEntry | null {
  const timezone = getCityTimezone(row.city ?? '')
  const timing = wallClockParts(row.reservation_time, timezone)
  if (!timing) return null
  return {
    id: `restaurant:${row.id}:reservation`, source_id: row.id, source_section: 'Restaurants', occurrence: 'reservation',
    day_date: timing.date, start_time: row.reservation_is_all_day ? null : timing.instant,
    timezone, is_all_day: row.reservation_is_all_day, is_approx: row.reservation_is_approx,
    title: `🍽️ ${row.display_label || row.name || 'Restaurant reservation'}`,
    description: clean([row.party_size ? `Party of ${row.party_size}` : null, row.confirmation_number ? `Confirmation ${row.confirmation_number}` : null]),
    location: clean([row.address, row.city], ', '), category: 'Restaurant',
  }
}

function transportationEntry(row: TransportationRow): LinkedItineraryEntry | null {
  const timezone = row.departure_timezone ?? getCityTimezone(row.origin ?? '')
  const timing = wallClockParts(row.departure_time, timezone)
  if (!timing) return null
  const provider = clean([row.provider, row.type]) ?? 'Transportation'
  return {
    id: `transportation:${row.id}:pickup`, source_id: row.id, source_section: 'Transportation', occurrence: 'pickup',
    day_date: timing.date, start_time: row.pickup_is_all_day ? null : timing.instant,
    timezone, is_all_day: row.pickup_is_all_day, is_approx: row.pickup_is_approx,
    title: `Pickup — ${provider}`, description: clean([row.origin, row.destination], ' → '),
    location: row.origin, category: 'Transportation',
  }
}

export function projectLinkedItineraryEntries(sources: LinkedItinerarySources): LinkedItineraryEntry[] {
  return [
    ...sources.flights.flatMap(flightEntries),
    ...sources.hotels.flatMap(hotelEntries),
    ...sources.restaurants.map(restaurantEntry).filter((entry): entry is LinkedItineraryEntry => entry !== null),
    ...sources.transportation.map(transportationEntry).filter((entry): entry is LinkedItineraryEntry => entry !== null),
  ].sort((a, b) => {
    const dateOrder = a.day_date.localeCompare(b.day_date)
    if (dateOrder !== 0) return dateOrder
    if (a.is_all_day !== b.is_all_day) return a.is_all_day ? -1 : 1
    return (a.start_time ?? '').localeCompare(b.start_time ?? '') || a.title.localeCompare(b.title)
  })
}

export async function loadLinkedItinerarySources(supabase: SupabaseClient, tripId: string): Promise<LinkedItinerarySources> {
  const [flights, hotels, restaurants, transportation] = await Promise.all([
    supabase.from('flights').select('*').eq('trip_id', tripId).is('deleted_at', null),
    supabase.from('hotels').select('*').eq('trip_id', tripId).is('deleted_at', null),
    supabase.from('restaurants').select('*').eq('trip_id', tripId).is('deleted_at', null),
    supabase.from('transportation').select('*').eq('trip_id', tripId).is('deleted_at', null),
  ])
  const failed = [flights, hotels, restaurants, transportation].find(result => result.error)
  if (failed?.error) throw failed.error
  return {
    flights: (flights.data ?? []) as FlightRow[], hotels: (hotels.data ?? []) as HotelRow[],
    restaurants: (restaurants.data ?? []) as RestaurantRow[], transportation: (transportation.data ?? []) as TransportationRow[],
  }
}

export async function loadLinkedItineraryEntries(supabase: SupabaseClient, tripId: string): Promise<LinkedItineraryEntry[]> {
  return projectLinkedItineraryEntries(await loadLinkedItinerarySources(supabase, tripId))
}
