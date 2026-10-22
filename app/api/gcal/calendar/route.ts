import { NextRequest, NextResponse } from 'next/server'
import { getValidAccessToken } from '@/lib/gcal/token'
import { gcalRequest } from '@/lib/gcal/client'
import {
  getGoogleCalendar,
  listWritableGoogleCalendars,
  resetTripCalendarSyncState,
} from '@/lib/gcal/sync-state'
import { getRequestUserId, gcalServiceClient, isTripMember, unauthorized, forbidden } from '@/lib/gcal/request-user'

// GET — list calendars this user can write to
export async function GET() {
  try {
    const userId = await getRequestUserId()
    if (!userId) return unauthorized()
    const supabase = gcalServiceClient()
    const accessToken = await getValidAccessToken(supabase, userId)
    const calendars = await listWritableGoogleCalendars(accessToken)
    return NextResponse.json({ calendars })
  } catch (err) {
    console.error('GCal calendar list error:', err)
    return NextResponse.json({ error: 'Failed to list calendars' }, { status: 500 })
  }
}

// POST — create a calendar or link an existing writable calendar to the trip
export async function POST(request: NextRequest) {
  try {
    const { tripId, calendarId, calendarName } = await request.json()
    if (!tripId || (!calendarId && !calendarName)) {
      return NextResponse.json({ error: 'tripId and either calendarId or calendarName required' }, { status: 400 })
    }

    const userId = await getRequestUserId()
    if (!userId) return unauthorized()
    const supabase = gcalServiceClient()
    if (!(await isTripMember(supabase, tripId, userId))) return forbidden()
    const accessToken = await getValidAccessToken(supabase, userId)

    const calendar = calendarId
      ? await getGoogleCalendar(accessToken, calendarId)
      : await gcalRequest(accessToken, '/calendars', 'POST', { summary: calendarName })
    const resolvedName = calendar.summaryOverride ?? calendar.summary ?? calendarName ?? calendar.id

    const { error: tripError } = await supabase
      .from('trips')
      .update({
        gcal_calendar_id: calendar.id,
        gcal_calendar_name: resolvedName,
        gcal_last_synced_at: null,
      })
      .eq('id', tripId)
    if (tripError) throw new Error(`Failed to link calendar: ${tripError.message}`)

    await resetTripCalendarSyncState(supabase, tripId)

    return NextResponse.json({ calendarId: calendar.id, calendarName: resolvedName })
  } catch (err) {
    console.error('GCal calendar create error:', err)
    return NextResponse.json({ error: 'Failed to create calendar' }, { status: 500 })
  }
}

// PATCH — rename calendar
export async function PATCH(request: NextRequest) {
  try {
    const { tripId, calendarName } = await request.json()
    if (!tripId || !calendarName) {
      return NextResponse.json({ error: 'tripId and calendarName required' }, { status: 400 })
    }

    const userId = await getRequestUserId()
    if (!userId) return unauthorized()
    const supabase = gcalServiceClient()
    if (!(await isTripMember(supabase, tripId, userId))) return forbidden()

    const { data: trip, error: tripReadError } = await supabase
      .from('trips')
      .select('gcal_calendar_id')
      .eq('id', tripId)
      .single()

    if (tripReadError || !trip?.gcal_calendar_id) {
      return NextResponse.json({ error: 'No calendar found for trip' }, { status: 404 })
    }

    const accessToken = await getValidAccessToken(supabase, userId)

    await gcalRequest(accessToken, `/calendars/${trip.gcal_calendar_id}`, 'PATCH', {
      summary: calendarName,
    })

    const { error: tripUpdateError } = await supabase
      .from('trips')
      .update({ gcal_calendar_name: calendarName })
      .eq('id', tripId)
    if (tripUpdateError) throw new Error(`Failed to save calendar name: ${tripUpdateError.message}`)

    return NextResponse.json({ calendarName })
  } catch (err) {
    console.error('GCal calendar rename error:', err)
    return NextResponse.json({ error: 'Failed to rename calendar' }, { status: 500 })
  }
}
