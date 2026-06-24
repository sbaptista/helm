import { upsertEvent } from '@/lib/gcal/push'
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

interface PushSectionOptions {
  section: string
  tripId: string
  calendarId: string
  accessToken: string
  supabase: SupabaseClient
  onEvent: (event: {
    action: 'create' | 'update' | 'delete'
    label: string
    status: 'success' | 'error'
    error?: string
  }) => void
}

export async function pushSection({
  section, tripId, calendarId, accessToken, supabase, onEvent
}: PushSectionOptions) {
  switch (section) {
    case 'flights':
      await pushSimple<FlightRow>({
        table: 'flights',
        tripId, calendarId, accessToken, supabase, onEvent,
        buildEvent: buildFlightEvent,
        getLabel: (r) => `${r.airline ?? ''} ${r.flight_number ?? ''} · ${r.origin_airport} → ${r.destination_airport}`.trim(),
        gcalIdField: 'gcal_event_id',
      })
      break

    case 'hotels':
      await pushHotels({ tripId, calendarId, accessToken, supabase, onEvent })
      break

    case 'transportation':
      await pushSimple<TransportationRow>({
        table: 'transportation',
        tripId, calendarId, accessToken, supabase, onEvent,
        buildEvent: buildTransportationEvent,
        getLabel: (r) => `${r.origin ?? ''} → ${r.destination ?? ''}`,
        gcalIdField: 'gcal_event_id',
      })
      break

    case 'restaurants':
      await pushSimple<RestaurantRow>({
        table: 'restaurants',
        tripId, calendarId, accessToken, supabase, onEvent,
        buildEvent: buildRestaurantEvent,
        getLabel: (r) => r.name ?? '',
        gcalIdField: 'gcal_event_id',
      })
      break

    case 'itinerary':
      await pushSimple<ItineraryRowRow>({
        table: 'itinerary_rows',
        tripId, calendarId, accessToken, supabase, onEvent,
        buildEvent: buildItineraryEvent,
        getLabel: (r) => r.title ?? '',
        gcalIdField: 'gcal_event_id',
      })
      break

    case 'checklist':
      await pushChecklist({ tripId, calendarId, accessToken, supabase, onEvent })
      break
  }
}

// ── Simple sections (one event per record) ────────────────────────

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
  const { data: rows } = await supabase
    .from(table)
    .select('*')
    .eq('trip_id', tripId)
    .is('deleted_at', null)
    .eq('gcal_include', true)
    .eq('gcal_dirty', true)

  for (const row of (rows ?? []) as T[]) {
    const label = getLabel(row)
    try {
      const event = buildEvent(row)
      const existingEventId = (row as Record<string, unknown>)[gcalIdField] as string | null
      const { eventId, action } = await upsertEvent(
        accessToken, calendarId, existingEventId ?? null, event
      )
      const { error: resetError, data: resetData, count } = await supabase
        .from(table)
        .update({ [gcalIdField]: eventId, gcal_dirty: false })
        .eq('id', row.id)
        .select()
      console.log('[PUSH RESET]', table, row.id, { resetError, resetData, count })
      if (resetError) throw new Error(`Failed to reset gcal_dirty: ${resetError.message}`)
      onEvent({ action, label, status: 'success' })
    } catch (err: unknown) {
      const existingEventId = (row as Record<string, unknown>)[gcalIdField]
      const msg = err instanceof Error ? err.message : String(err)
      onEvent({ action: existingEventId ? 'update' : 'create', label, status: 'error', error: msg })
    }
  }
}

// ── Hotels (two events per record) ────────────────────────────────

async function pushHotels({ tripId, calendarId, accessToken, supabase, onEvent }: Omit<PushSectionOptions, 'section'>) {
  const { data: rows } = await supabase
    .from('hotels')
    .select('*')
    .eq('trip_id', tripId)
    .is('deleted_at', null)
    .eq('gcal_include', true)
    .eq('gcal_dirty', true)

  for (const row of rows ?? []) {
    // Check-in
    try {
      const event = buildHotelCheckinEvent(row)
      const { eventId, action } = await upsertEvent(accessToken, calendarId, row.gcal_checkin_event_id ?? null, event)
      await supabase.from('hotels').update({ gcal_checkin_event_id: eventId }).eq('id', row.id)
      onEvent({ action, label: `${row.name} · Check-in`, status: 'success' })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      onEvent({ action: row.gcal_checkin_event_id ? 'update' : 'create', label: `${row.name} · Check-in`, status: 'error', error: msg })
    }

    // Check-out
    try {
      const event = buildHotelCheckoutEvent(row)
      const { eventId, action } = await upsertEvent(accessToken, calendarId, row.gcal_checkout_event_id ?? null, event)
      await supabase.from('hotels').update({ gcal_checkout_event_id: eventId }).eq('id', row.id)
      onEvent({ action, label: `${row.name} · Check-out`, status: 'success' })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      onEvent({ action: row.gcal_checkout_event_id ? 'update' : 'create', label: `${row.name} · Check-out`, status: 'error', error: msg })
    }

    await supabase.from('hotels').update({ gcal_dirty: false }).eq('id', row.id)
  }
}

// ── Checklist (two events per record when due_date set) ───────────

async function pushChecklist({ tripId, calendarId, accessToken, supabase, onEvent }: Omit<PushSectionOptions, 'section'>) {
  const { data: rows } = await supabase
    .from('checklist')
    .select('*')
    .eq('trip_id', tripId)
    .is('deleted_at', null)
    .eq('gcal_include', true)
    .eq('gcal_dirty', true)

  for (const row of rows ?? []) {
    // Due event
    try {
      const event = buildChecklistDueEvent(row)
      const { eventId, action } = await upsertEvent(accessToken, calendarId, row.gcal_due_event_id ?? null, event)
      await supabase.from('checklist').update({ gcal_due_event_id: eventId }).eq('id', row.id)
      onEvent({ action, label: `${row.task} · Due`, status: 'success' })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      onEvent({ action: row.gcal_due_event_id ? 'update' : 'create', label: `${row.task} · Due`, status: 'error', error: msg })
    }

    // Warning event (only if warning_days set)
    if (row.warning_days) {
      try {
        const event = buildChecklistWarningEvent(row)
        const { eventId, action } = await upsertEvent(accessToken, calendarId, row.gcal_warning_event_id ?? null, event)
        await supabase.from('checklist').update({ gcal_warning_event_id: eventId }).eq('id', row.id)
        onEvent({ action, label: `⚠️ ${row.task} · Warning`, status: 'success' })
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        onEvent({ action: row.gcal_warning_event_id ? 'update' : 'create', label: `⚠️ ${row.task} · Warning`, status: 'error', error: msg })
      }
    }

    await supabase.from('checklist').update({ gcal_dirty: false }).eq('id', row.id)
  }
}
