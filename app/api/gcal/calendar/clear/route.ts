import { NextRequest, NextResponse } from 'next/server'
import { getDataClient } from '@/lib/supabase/data-client'
import { getValidAccessToken } from '@/lib/gcal/token'
import { gcalRequest } from '@/lib/gcal/client'

function getAuthUserId(): string {
  if (process.env.BYPASS_AUTH_USER_ID) return process.env.BYPASS_AUTH_USER_ID
  throw new Error('Not authenticated')
}

export async function POST(request: NextRequest) {
  try {
    const { tripId } = await request.json()
    if (!tripId) {
      return NextResponse.json({ error: 'tripId required' }, { status: 400 })
    }

    const userId = getAuthUserId()
    const supabase = await getDataClient()

    const { data: trip } = await supabase
      .from('trips')
      .select('gcal_calendar_id')
      .eq('id', tripId)
      .single()

    if (!trip?.gcal_calendar_id) {
      return NextResponse.json({ error: 'No calendar found for trip' }, { status: 404 })
    }

    const accessToken = await getValidAccessToken(userId)

    // Google Calendar clear — deletes all events in the calendar
    await gcalRequest(accessToken, `/calendars/${trip.gcal_calendar_id}/clear`, 'POST')

    // Reset all gcal fields across all calendar-enabled sections
    const singleEventTables = ['flights', 'transportation', 'restaurants', 'itinerary_rows']
    for (const table of singleEventTables) {
      await supabase
        .from(table)
        .update({ gcal_event_id: null, gcal_dirty: false })
        .eq('trip_id', tripId)
    }

    await supabase
      .from('hotels')
      .update({
        gcal_checkin_event_id: null,
        gcal_checkout_event_id: null,
        gcal_dirty: false,
      })
      .eq('trip_id', tripId)

    await supabase
      .from('checklist')
      .update({
        gcal_due_event_id: null,
        gcal_warning_event_id: null,
        gcal_dirty: false,
      })
      .eq('trip_id', tripId)

    await supabase
      .from('trips')
      .update({ gcal_last_synced_at: null })
      .eq('id', tripId)

    return NextResponse.json({ cleared: true })
  } catch (err) {
    console.error('GCal calendar clear error:', err)
    return NextResponse.json({ error: 'Failed to clear calendar' }, { status: 500 })
  }
}
