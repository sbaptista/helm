import { NextRequest, NextResponse } from 'next/server'
import { getDataClient } from '@/lib/supabase/data-client'
import { getValidAccessToken } from '@/lib/gcal/token'
import { gcalRequest } from '@/lib/gcal/client'

function getAuthUserId(): string {
  if (process.env.BYPASS_AUTH_USER_ID) return process.env.BYPASS_AUTH_USER_ID
  throw new Error('Not authenticated')
}

// POST — create calendar and store gcal_calendar_id on trip
export async function POST(request: NextRequest) {
  try {
    const { tripId, calendarName } = await request.json()
    if (!tripId || !calendarName) {
      return NextResponse.json({ error: 'tripId and calendarName required' }, { status: 400 })
    }

    const userId = getAuthUserId()
    const accessToken = await getValidAccessToken(userId)

    const calendar = await gcalRequest(accessToken, '/calendars', 'POST', {
      summary: calendarName,
    })

    const supabase = await getDataClient()
    await supabase
      .from('trips')
      .update({
        gcal_calendar_id: calendar.id,
        gcal_calendar_name: calendarName,
      })
      .eq('id', tripId)

    return NextResponse.json({ calendarId: calendar.id, calendarName })
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

    await gcalRequest(accessToken, `/calendars/${trip.gcal_calendar_id}`, 'PATCH', {
      summary: calendarName,
    })

    await supabase
      .from('trips')
      .update({ gcal_calendar_name: calendarName })
      .eq('id', tripId)

    return NextResponse.json({ calendarName })
  } catch (err) {
    console.error('GCal calendar rename error:', err)
    return NextResponse.json({ error: 'Failed to rename calendar' }, { status: 500 })
  }
}
