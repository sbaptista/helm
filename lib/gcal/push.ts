import { gcalRequest, isMissingGoogleCalendarResource } from './client'
import { GCalEvent } from './events'

export async function upsertEvent(
  accessToken: string,
  calendarId: string,
  existingEventId: string | null,
  event: GCalEvent
): Promise<{ eventId: string; action: 'create' | 'update' }> {
  if (existingEventId) {
    try {
      await gcalRequest(
        accessToken,
        `/calendars/${calendarId}/events/${existingEventId}`,
        'PUT',
        event
      )
      return { eventId: existingEventId, action: 'update' }
    } catch (error) {
      if (!isMissingGoogleCalendarResource(error)) throw error
      // The calendar still exists (validated before sync), but this individual
      // event was removed in Google. Recreate it and store the replacement ID.
    }
  }
  const created = await gcalRequest(
    accessToken,
    `/calendars/${calendarId}/events`,
    'POST',
    event
  )
  return { eventId: created.id, action: 'create' }
}

export async function deleteEvent(
  accessToken: string,
  calendarId: string,
  eventId: string
): Promise<void> {
  await gcalRequest(
    accessToken,
    `/calendars/${calendarId}/events/${eventId}`,
    'DELETE'
  )
}
