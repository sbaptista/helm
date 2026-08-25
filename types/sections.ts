export interface FlightRow {
  id: string
  trip_id: string
  flight_number: string | null
  airline: string | null
  origin_airport: string | null
  destination_airport: string | null
  origin_city: string | null
  destination_city: string | null
  departure_time: string | null
  arrival_time: string | null
  departure_timezone: string | null
  arrival_timezone: string | null
  cabin_class: string | null
  seat_number: string | null
  confirmation_number: string | null
  notes: string | null
  gcal_include: boolean
  gcal_dirty: boolean
  gcal_event_id: string | null
  gcal_legacy_arrival_event_id: string | null
  departure_is_all_day: boolean
  departure_is_approx: boolean
  arrival_is_all_day: boolean
  arrival_is_approx: boolean
  deleted_at: string | null
}

export interface HotelRow {
  id: string
  trip_id: string
  name: string | null
  address: string | null
  city: string | null
  province: string | null
  postal_code: string | null
  phone: string | null
  check_in_date: string | null
  check_in_time: string | null
  check_out_date: string | null
  check_out_time: string | null
  confirmation_number: string | null
  notes: string | null
  gcal_include: boolean
  gcal_dirty: boolean
  gcal_checkin_event_id: string | null
  gcal_checkout_event_id: string | null
  check_in_is_all_day: boolean
  check_in_is_approx: boolean
  check_out_is_all_day: boolean
  check_out_is_approx: boolean
  deleted_at: string | null
}

export interface TransportationRow {
  id: string
  trip_id: string
  type: string | null
  provider: string | null
  origin: string | null
  destination: string | null
  departure_time: string | null
  arrival_time: string | null
  departure_timezone: string | null
  arrival_timezone: string | null
  confirmation_number: string | null
  phone: string | null
  cost: string | null
  notes: string | null
  gcal_include: boolean
  gcal_dirty: boolean
  gcal_event_id: string | null
  pickup_is_all_day: boolean
  pickup_is_approx: boolean
  deleted_at: string | null
}

export interface RestaurantRow {
  id: string
  trip_id: string
  name: string | null
  address: string | null
  city: string | null
  display_label: string | null
  cuisine: string | null
  reservation_time: string | null
  party_size: number | null
  confirmation_number: string | null
  phone: string | null
  type: string | null
  notes: string | null
  gcal_include: boolean
  gcal_dirty: boolean
  gcal_event_id: string | null
  reservation_is_all_day: boolean
  reservation_is_approx: boolean
  deleted_at: string | null
}

export interface ItineraryDayRow {
  id: string
  trip_id: string
  day_number: number
  day_date: string | null
  title: string | null
  sort_order: number
  deleted_at: string | null
}

export interface ItineraryRowRow {
  id: string
  trip_id: string
  day_id: string | null
  title: string | null
  start_time: string | null
  end_time: string | null
  start_timezone: string | null
  end_timezone: string | null
  is_all_day: boolean
  is_approx: boolean
  description: string | null
  location: string | null
  category: string | null
  sort_order: number
  gcal_include: boolean
  gcal_dirty: boolean
  gcal_event_id: string | null
  deleted_at: string | null
}

export interface ChecklistRow {
  id: string
  trip_id: string
  task: string | null
  title: string | null
  group_name: string | null
  due_date: string | null
  warning_days: number | null
  status: string | null
  notes: string | null
  gcal_include: boolean
  gcal_dirty: boolean
  gcal_due_event_id: string | null
  gcal_warning_event_id: string | null
  deleted_at: string | null
}

export interface PackingRow {
  id: string
  trip_id: string
  item: string | null
  category: string | null
  packed: boolean
  sort_order: number
}

export interface KeyInfoRow {
  id: string
  trip_id: string
  category: string | null
  label: string | null
  value: string | null
  url: string | null
  flag: boolean
  show_in_overview: boolean
  deleted_at: string | null
}
