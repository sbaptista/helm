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
      return pushFlights({ tripId, calendarId, accessToken, supabase, onEvent })
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

async function pushSimple<T extends { id: string; deleted_at?: string | null }>({
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
    .eq('gcal_dirty', true)
  if (readError) throw readError

  for (const row of (rows ?? []) as T[]) {
    const label = getLabel(row)
    const existingEventId = (row as Record<string, unknown>)[gcalIdField] as string | null
    const shouldInclude = (row as Record<string, unknown>).gcal_include === true && !row.deleted_at

    try {
      if (!shouldInclude) {
        await deleteIfPresent(accessToken, calendarId, existingEventId)
        await updateOrThrow(supabase, table, row.id, { [gcalIdField]: null, gcal_dirty: false })
        if (existingEventId) onEvent({ action: 'delete', label, status: 'success' })
        continue
      }
      const { eventId, action } = await upsertEvent(
        accessToken, calendarId, existingEventId, buildEvent(row)
      )
      await updateOrThrow(supabase, table, row.id, { [gcalIdField]: eventId, gcal_dirty: false })
      onEvent({ action, label, status: 'success' })
    } catch (error) {
      onEvent({
        action: shouldInclude ? (existingEventId ? 'update' : 'create') : 'delete',
        label,
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
}

async function pushFlights(options: Omit<PushSectionOptions, 'section'>) {
  const { tripId, calendarId, accessToken, supabase, onEvent } = options
  const { data: rows, error: readError } = await supabase
    .from('flights').select('*').eq('trip_id', tripId).eq('gcal_dirty', true)
  if (readError) throw readError

  for (const row of (rows ?? []) as FlightRow[]) {
    const label = `${row.flight_number ?? ''} · ${row.origin_airport ?? ''} → ${row.destination_airport ?? ''}`.trim()
    let failed = false
    const shouldInclude = row.gcal_include && !row.deleted_at

    if (shouldInclude) {
      try {
        const result = await upsertEvent(accessToken, calendarId, row.gcal_event_id, buildFlightEvent(row))
        await updateOrThrow(supabase, 'flights', row.id, { gcal_event_id: result.eventId })
        onEvent({ action: result.action, label, status: 'success' })
      } catch (error) {
        failed = true
        onEvent({
          action: row.gcal_event_id ? 'update' : 'create', label, status: 'error',
          error: error instanceof Error ? error.message : String(error),
        })
      }
    } else if (row.gcal_event_id) {
      try {
        await deleteIfPresent(accessToken, calendarId, row.gcal_event_id)
        await updateOrThrow(supabase, 'flights', row.id, { gcal_event_id: null })
        onEvent({ action: 'delete', label, status: 'success' })
      } catch (error) {
        failed = true
        onEvent({ action: 'delete', label, status: 'error', error: error instanceof Error ? error.message : String(error) })
      }
    }

    if (row.gcal_legacy_arrival_event_id) {
      const arrivalLabel = `${row.flight_number ?? ''} · Legacy arrival`.trim()
      try {
        await deleteIfPresent(accessToken, calendarId, row.gcal_legacy_arrival_event_id)
        await updateOrThrow(supabase, 'flights', row.id, { gcal_legacy_arrival_event_id: null })
        onEvent({ action: 'delete', label: arrivalLabel, status: 'success' })
      } catch (error) {
        failed = true
        onEvent({ action: 'delete', label: arrivalLabel, status: 'error', error: error instanceof Error ? error.message : String(error) })
      }
    }
    if (!failed) await updateOrThrow(supabase, 'flights', row.id, { gcal_dirty: false })
  }
}

async function pushHotels(options: Omit<PushSectionOptions, 'section'>) {
  const { tripId, calendarId, accessToken, supabase, onEvent } = options
  const { data: rows, error: readError } = await supabase
    .from('hotels').select('*').eq('trip_id', tripId).eq('gcal_dirty', true)
  if (readError) throw readError

  for (const row of rows ?? []) {
    let failed = false
    const shouldInclude = row.gcal_include && !row.deleted_at
    const events = [
      { field: 'gcal_checkin_event_id', label: `${row.name} · Check-in`, build: () => buildHotelCheckinEvent(row) },
      { field: 'gcal_checkout_event_id', label: `${row.name} · Check-out`, build: () => buildHotelCheckoutEvent(row) },
    ]
    for (const event of events) {
      const existingId = row[event.field]
      try {
        if (!shouldInclude) {
          await deleteIfPresent(accessToken, calendarId, existingId)
          await updateOrThrow(supabase, 'hotels', row.id, { [event.field]: null })
          if (existingId) onEvent({ action: 'delete', label: event.label, status: 'success' })
          continue
        }
        const result = await upsertEvent(accessToken, calendarId, existingId ?? null, event.build())
        await updateOrThrow(supabase, 'hotels', row.id, { [event.field]: result.eventId })
        onEvent({ action: result.action, label: event.label, status: 'success' })
      } catch (error) {
        failed = true
        onEvent({ action: shouldInclude ? (existingId ? 'update' : 'create') : 'delete', label: event.label, status: 'error', error: error instanceof Error ? error.message : String(error) })
      }
    }
    if (!failed) await updateOrThrow(supabase, 'hotels', row.id, { gcal_dirty: false })
  }
}

async function pushChecklist(options: Omit<PushSectionOptions, 'section'>) {
  const { tripId, calendarId, accessToken, supabase, onEvent } = options
  const { data: rows, error: readError } = await supabase
    .from('checklist').select('*').eq('trip_id', tripId).eq('gcal_dirty', true)
  if (readError) throw readError

  for (const row of rows ?? []) {
    let failed = false
    const shouldInclude = row.gcal_include && !row.deleted_at

    if (!shouldInclude) {
      const events = [
        { field: 'gcal_due_event_id', label: `${row.task} · Due` },
        { field: 'gcal_warning_event_id', label: `${row.task} · Warning` },
      ]
      for (const event of events) {
        const existingId = row[event.field]
        try {
          await deleteIfPresent(accessToken, calendarId, existingId)
          await updateOrThrow(supabase, 'checklist', row.id, { [event.field]: null })
          if (existingId) onEvent({ action: 'delete', label: event.label, status: 'success' })
        } catch (error) {
          failed = true
          onEvent({ action: 'delete', label: event.label, status: 'error', error: error instanceof Error ? error.message : String(error) })
        }
      }
      if (!failed) await updateOrThrow(supabase, 'checklist', row.id, { gcal_dirty: false })
      continue
    }

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
