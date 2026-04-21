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
} from '@/lib/gcal/events'
import { SupabaseClient } from '@supabase/supabase-js'

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
      await pushSimple({
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
      await pushSimple({
        table: 'transportation',
        tripId, calendarId, accessToken, supabase, onEvent,
        buildEvent: buildTransportationEvent,
        getLabel: (r) => `${r.origin} → ${r.destination}`,
        gcalIdField: 'gcal_event_id',
      })
      break

    case 'restaurants':
      await pushSimple({
        table: 'restaurants',
        tripId, calendarId, accessToken, supabase, onEvent,
        buildEvent: buildRestaurantEvent,
        getLabel: (r) => r.name,
        gcalIdField: 'gcal_event_id',
      })
      break

    case 'itinerary':
      await pushSimple({
        table: 'itinerary_rows',
        tripId, calendarId, accessToken, supabase, onEvent,
        buildEvent: buildItineraryEvent,
        getLabel: (r) => r.title,
        gcalIdField: 'gcal_event_id',
      })
      break

    case 'checklist':
      await pushChecklist({ tripId, calendarId, accessToken, supabase, onEvent })
      break
  }
}

// ── Simple sections (one event per record) ────────────────────────

async function pushSimple({
  table, tripId, calendarId, accessToken, supabase, onEvent,
  buildEvent, getLabel, gcalIdField,
}: {
  table: string
  tripId: string
  calendarId: string
  accessToken: string
  supabase: SupabaseClient
  onEvent: PushSectionOptions['onEvent']
  buildEvent: (row: any) => any
  getLabel: (row: any) => string
  gcalIdField: string
}) {
  const { data: rows } = await supabase
    .from(table)
    .select('*')
    .eq('trip_id', tripId)
    .is('deleted_at', null)
    .eq('gcal_include', true)
    .eq('gcal_dirty', true)

  for (const row of rows ?? []) {
    const label = getLabel(row)
    try {
      const event = buildEvent(row)
      const { eventId, action } = await upsertEvent(
        accessToken, calendarId, row[gcalIdField] ?? null, event
      )
      await supabase
        .from(table)
        .update({ [gcalIdField]: eventId, gcal_dirty: false })
        .eq('id', row.id)
      onEvent({ action, label, status: 'success' })
    } catch (err: any) {
      onEvent({ action: row[gcalIdField] ? 'update' : 'create', label, status: 'error', error: err.message })
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
    } catch (err: any) {
      onEvent({ action: row.gcal_checkin_event_id ? 'update' : 'create', label: `${row.name} · Check-in`, status: 'error', error: err.message })
    }

    // Check-out
    try {
      const event = buildHotelCheckoutEvent(row)
      const { eventId, action } = await upsertEvent(accessToken, calendarId, row.gcal_checkout_event_id ?? null, event)
      await supabase.from('hotels').update({ gcal_checkout_event_id: eventId, gcal_dirty: false }).eq('id', row.id)
      onEvent({ action, label: `${row.name} · Check-out`, status: 'success' })
    } catch (err: any) {
      onEvent({ action: row.gcal_checkout_event_id ? 'update' : 'create', label: `${row.name} · Check-out`, status: 'error', error: err.message })
    }
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
    } catch (err: any) {
      onEvent({ action: row.gcal_due_event_id ? 'update' : 'create', label: `${row.task} · Due`, status: 'error', error: err.message })
    }

    // Warning event (only if warning_days set)
    if (row.warning_days) {
      try {
        const event = buildChecklistWarningEvent(row)
        const { eventId, action } = await upsertEvent(accessToken, calendarId, row.gcal_warning_event_id ?? null, event)
        await supabase.from('checklist').update({ gcal_warning_event_id: eventId, gcal_dirty: false }).eq('id', row.id)
        onEvent({ action, label: `⚠️ ${row.task} · Warning`, status: 'success' })
      } catch (err: any) {
        onEvent({ action: row.gcal_warning_event_id ? 'update' : 'create', label: `⚠️ ${row.task} · Warning`, status: 'error', error: err.message })
      }
    } else {
      // No warning event needed — just clear dirty flag
      await supabase.from('checklist').update({ gcal_dirty: false }).eq('id', row.id)
    }
  }
}
