import { gcalRequest } from './client'
import { GCalEvent } from './events'

export async function upsertEvent(
  accessToken: string,
  calendarId: string,
  existingEventId: string | null,
  event: GCalEvent
): Promise<{ eventId: string; action: 'create' | 'update' }> {
  if (existingEventId) {
    await gcalRequest(
      accessToken,
      `/calendars/${calendarId}/events/${existingEventId}`,
      'PUT',
      event
    )
    return { eventId: existingEventId, action: 'update' }
  } else {
    const created = await gcalRequest(
      accessToken,
      `/calendars/${calendarId}/events`,
      'POST',
      event
    )
    return { eventId: created.id, action: 'create' }
  }
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
