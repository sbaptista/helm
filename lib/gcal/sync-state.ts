import type { SupabaseClient } from '@supabase/supabase-js'
import { gcalRequest } from './client'

export interface WritableGoogleCalendar {
  id: string
  summary: string
  primary: boolean
  accessRole: string
}

export async function getGoogleCalendar(
  accessToken: string,
  calendarId: string
): Promise<WritableGoogleCalendar> {
  const calendar = await gcalRequest(
    accessToken,
    `/users/me/calendarList/${encodeURIComponent(calendarId)}`
  )
  return {
    id: calendar.id,
    summary: calendar.summaryOverride ?? calendar.summary ?? calendar.id,
    primary: calendar.primary === true,
    accessRole: calendar.accessRole ?? 'reader',
  }
}

export async function listWritableGoogleCalendars(
  accessToken: string
): Promise<WritableGoogleCalendar[]> {
  const result = await gcalRequest(
    accessToken,
    '/users/me/calendarList?minAccessRole=writer&maxResults=250'
  )
  return (result.items ?? []).map((calendar: Record<string, unknown>) => ({
    id: String(calendar.id),
    summary: String(calendar.summaryOverride ?? calendar.summary ?? calendar.id),
    primary: calendar.primary === true,
    accessRole: String(calendar.accessRole ?? 'writer'),
  }))
}

const SYNC_TABLES = [
  { table: 'flights', eventIds: ['gcal_event_id'] },
  { table: 'hotels', eventIds: ['gcal_checkin_event_id', 'gcal_checkout_event_id'] },
  { table: 'transportation', eventIds: ['gcal_event_id'] },
  { table: 'restaurants', eventIds: ['gcal_event_id'] },
  { table: 'itinerary_rows', eventIds: ['gcal_event_id'] },
  { table: 'checklist', eventIds: ['gcal_due_event_id', 'gcal_warning_event_id'] },
] as const

export async function resetTripCalendarSyncState(
  supabase: SupabaseClient,
  tripId: string
): Promise<void> {
  for (const { table, eventIds } of SYNC_TABLES) {
    const reset: Record<string, string | boolean | null> = { gcal_dirty: false }
    for (const field of eventIds) reset[field] = null

    const { error: resetError } = await supabase
      .from(table)
      .update(reset)
      .eq('trip_id', tripId)
      .is('deleted_at', null)
    if (resetError) throw new Error(`Failed to reset ${table}: ${resetError.message}`)

    const { error: dirtyError } = await supabase
      .from(table)
      .update({ gcal_dirty: true })
      .eq('trip_id', tripId)
      .is('deleted_at', null)
      .eq('gcal_include', true)
    if (dirtyError) throw new Error(`Failed to rebuild ${table}: ${dirtyError.message}`)
  }
}
