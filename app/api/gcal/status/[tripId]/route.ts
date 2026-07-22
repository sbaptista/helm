import { NextRequest, NextResponse } from 'next/server'
import { getDataClient } from '@/lib/supabase/data-client'
import { getValidAccessToken } from '@/lib/gcal/token'
import { isMissingGoogleCalendarResource } from '@/lib/gcal/client'
import { getGoogleCalendar } from '@/lib/gcal/sync-state'

function getAuthUserId(): string {
  if (process.env.BYPASS_AUTH_USER_ID) return process.env.BYPASS_AUTH_USER_ID
  throw new Error('Not authenticated')
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params
  try {
    const userId = getAuthUserId()
    const supabase = await getDataClient()

    // Check token exists
    const { data: token, error: tokenError } = await supabase
      .from('google_oauth_tokens')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (tokenError || !token) {
      return NextResponse.json({ state: 'unconnected' })
    }

    // Check trip calendar
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('gcal_calendar_id, gcal_calendar_name, gcal_last_synced_at')
      .eq('id', tripId)
      .single()

    if (tripError || !trip?.gcal_calendar_id) {
      return NextResponse.json({ state: 'unconnected' })
    }

    if (request.nextUrl.searchParams.get('validate') === 'true') {
      try {
        const accessToken = await getValidAccessToken(userId)
        await getGoogleCalendar(accessToken, trip.gcal_calendar_id)
      } catch (error) {
        if (isMissingGoogleCalendarResource(error)) {
          return NextResponse.json({
            state: 'calendar_missing',
            calendarName: trip.gcal_calendar_name,
            lastSyncedAt: trip.gcal_last_synced_at,
          })
        }
        throw error
      }
    }

    // Check dirty count across all calendar-enabled sections
    const tables = [
      'flights', 'hotels', 'transportation',
      'restaurants', 'itinerary_rows', 'checklist'
    ]
    const counts = await Promise.all(
      tables.map(table =>
        supabase
          .from(table)
          .select('id', { count: 'exact', head: true })
          .eq('trip_id', tripId)
          .is('deleted_at', null)
          .eq('gcal_include', true)
          .eq('gcal_dirty', true)
          .then(({ count, error }) => {
            if (error) throw error
            return count ?? 0
          })
      )
    )
    const dirtyCount = counts.reduce((sum, n) => sum + n, 0)

    return NextResponse.json({
      state: dirtyCount > 0 ? 'update_required' : 'connected',
      calendarName: trip.gcal_calendar_name,
      lastSyncedAt: trip.gcal_last_synced_at,
      dirtyCount,
    })
  } catch (err) {
    console.error('GCal status error:', err)
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 })
  }
}
