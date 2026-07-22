import { deleteEvent, upsertEvent } from '@/lib/gcal/push'
import { isMissingGoogleCalendarResource } from '@/lib/gcal/client'
import {
  buildFlightEvent,
  buildHotelCheckinEvent,
  buildHotelCheckoutEvent,
  buildTransportationEvent,
  buildRestaurantEvent,
  buildItineraryEvent,
  buildChecklistDueEvent,
  buildChecklistWarningEvent,
  type GCalEvent,
} from '@/lib/gcal/events'
import { SupabaseClient } from '@supabase/supabase-js'
import type { FlightRow, TransportationRow, RestaurantRow, ItineraryRowRow } from '@/types/sections'

interface CalendarEventResult {
  action: 'create' | 'update' | 'delete'
  label: string
  status: 'success' | 'error'
  error?: string
}

interface PushSectionOptions {
  section: string
  tripId: string
  calendarId: string
  accessToken: string
  supabase: SupabaseClient
  onEvent: (event: CalendarEventResult) => void
}

export async function pushSection(options: PushSectionOptions) {
  const { section, tripId, calendarId, accessToken, supabase, onEvent } = options
  switch (section) {
    case 'flights':
      return pushSimple<FlightRow>({
        table: 'flights', tripId, calendarId, accessToken, supabase, onEvent,
        buildEvent: buildFlightEvent,
        getLabel: (row) => `${row.airline ?? ''} ${row.flight_number ?? ''} · ${row.origin_airport} → ${row.destination_airport}`.trim(),
        gcalIdField: 'gcal_event_id',
      })
    case 'hotels':
      return pushHotels({ tripId, calendarId, accessToken, supabase, onEvent })
    case 'transportation':
      return pushSimple<TransportationRow>({
        table: 'transportation', tripId, calendarId, accessToken, supabase, onEvent,
        buildEvent: buildTransportationEvent,
        getLabel: (row) => `${row.origin ?? ''} → ${row.destination ?? ''}`,
        gcalIdField: 'gcal_event_id',
      })
    case 'restaurants':
      return pushSimple<RestaurantRow>({
        table: 'restaurants', tripId, calendarId, accessToken, supabase, onEvent,
        buildEvent: buildRestaurantEvent,
        getLabel: (row) => row.name ?? '',
        gcalIdField: 'gcal_event_id',
      })
    case 'itinerary':
      return pushSimple<ItineraryRowRow>({
        table: 'itinerary_rows', tripId, calendarId, accessToken, supabase, onEvent,
        buildEvent: buildItineraryEvent,
        getLabel: (row) => row.title ?? '',
        gcalIdField: 'gcal_event_id',
      })
    case 'checklist':
      return pushChecklist({ tripId, calendarId, accessToken, supabase, onEvent })
  }
}

async function updateOrThrow(
  supabase: SupabaseClient,
  table: string,
  rowId: string,
  values: Record<string, unknown>
) {
  const { error } = await supabase.from(table).update(values).eq('id', rowId)
  if (error) throw new Error(`Failed to update ${table}: ${error.message}`)
}

async function deleteIfPresent(
  accessToken: string,
  calendarId: string,
  eventId: string | null | undefined
) {
  if (!eventId) return
  try {
    await deleteEvent(accessToken, calendarId, eventId)
  } catch (error) {
    if (!isMissingGoogleCalendarResource(error)) throw error
  }
}

async function pushSimple<T extends { id: string }>({
  table, tripId, calendarId, accessToken, supabase, onEvent,
  buildEvent, getLabel, gcalIdField,
}: {
  table: string
  tripId: string
  calendarId: string
  accessToken: string
  supabase: SupabaseClient
  onEvent: PushSectionOptions['onEvent']
  buildEvent: (row: T) => GCalEvent
  getLabel: (row: T) => string
  gcalIdField: string
}) {
  const { data: rows, error: readError } = await supabase
    .from(table)
    .select('*')
    .eq('trip_id', tripId)
    .is('deleted_at', null)
    .eq('gcal_include', true)
    .eq('gcal_dirty', true)
  if (readError) throw readError

  for (const row of (rows ?? []) as T[]) {
    const label = getLabel(row)
    const existingEventId = (row as Record<string, unknown>)[gcalIdField] as string | null

    try {
      const { eventId, action } = await upsertEvent(
        accessToken, calendarId, existingEventId, buildEvent(row)
      )
      await updateOrThrow(supabase, table, row.id, { [gcalIdField]: eventId, gcal_dirty: false })
      onEvent({ action, label, status: 'success' })
    } catch (error) {
      onEvent({
        action: existingEventId ? 'update' : 'create',
        label,
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
}

async function pushHotels(options: Omit<PushSectionOptions, 'section'>) {
  const { tripId, calendarId, accessToken, supabase, onEvent } = options
  const { data: rows, error: readError } = await supabase
    .from('hotels').select('*').eq('trip_id', tripId).is('deleted_at', null).eq('gcal_include', true).eq('gcal_dirty', true)
  if (readError) throw readError

  for (const row of rows ?? []) {
    let failed = false
    const events = [
      { field: 'gcal_checkin_event_id', label: `${row.name} · Check-in`, build: () => buildHotelCheckinEvent(row) },
      { field: 'gcal_checkout_event_id', label: `${row.name} · Check-out`, build: () => buildHotelCheckoutEvent(row) },
    ]
    for (const event of events) {
      const existingId = row[event.field]
      try {
        const result = await upsertEvent(accessToken, calendarId, existingId ?? null, event.build())
        await updateOrThrow(supabase, 'hotels', row.id, { [event.field]: result.eventId })
        onEvent({ action: result.action, label: event.label, status: 'success' })
      } catch (error) {
        failed = true
        onEvent({ action: existingId ? 'update' : 'create', label: event.label, status: 'error', error: error instanceof Error ? error.message : String(error) })
      }
    }
    if (!failed) await updateOrThrow(supabase, 'hotels', row.id, { gcal_dirty: false })
  }
}

async function pushChecklist(options: Omit<PushSectionOptions, 'section'>) {
  const { tripId, calendarId, accessToken, supabase, onEvent } = options
  const { data: rows, error: readError } = await supabase
    .from('checklist').select('*').eq('trip_id', tripId).is('deleted_at', null).eq('gcal_include', true).eq('gcal_dirty', true)
  if (readError) throw readError

  for (const row of rows ?? []) {
    let failed = false
    try {
      const result = await upsertEvent(accessToken, calendarId, row.gcal_due_event_id ?? null, buildChecklistDueEvent(row))
      await updateOrThrow(supabase, 'checklist', row.id, { gcal_due_event_id: result.eventId })
      onEvent({ action: result.action, label: `${row.task} · Due`, status: 'success' })
    } catch (error) {
      failed = true
      onEvent({ action: row.gcal_due_event_id ? 'update' : 'create', label: `${row.task} · Due`, status: 'error', error: error instanceof Error ? error.message : String(error) })
    }

    if (row.warning_days) {
      try {
        const result = await upsertEvent(accessToken, calendarId, row.gcal_warning_event_id ?? null, buildChecklistWarningEvent(row))
        await updateOrThrow(supabase, 'checklist', row.id, { gcal_warning_event_id: result.eventId })
        onEvent({ action: result.action, label: `${row.task} · Warning`, status: 'success' })
      } catch (error) {
        failed = true
        onEvent({ action: row.gcal_warning_event_id ? 'update' : 'create', label: `${row.task} · Warning`, status: 'error', error: error instanceof Error ? error.message : String(error) })
      }
    } else if (row.gcal_warning_event_id) {
      try {
        await deleteIfPresent(accessToken, calendarId, row.gcal_warning_event_id)
        await updateOrThrow(supabase, 'checklist', row.id, { gcal_warning_event_id: null })
        onEvent({ action: 'delete', label: `${row.task} · Warning`, status: 'success' })
      } catch (error) {
        failed = true
        onEvent({ action: 'delete', label: `${row.task} · Warning`, status: 'error', error: error instanceof Error ? error.message : String(error) })
      }
    }

    if (!failed) await updateOrThrow(supabase, 'checklist', row.id, { gcal_dirty: false })
  }
}
