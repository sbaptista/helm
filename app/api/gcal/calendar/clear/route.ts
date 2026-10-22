import { NextRequest, NextResponse } from 'next/server'
import { getValidAccessToken } from '@/lib/gcal/token'
import { GoogleCalendarApiError } from '@/lib/gcal/client'
import { clearGoogleCalendarEvents, resetTripCalendarSyncState } from '@/lib/gcal/sync-state'
import { getRequestUserId, gcalServiceClient, isTripMember, unauthorized, forbidden } from '@/lib/gcal/request-user'

export async function POST(request: NextRequest) {
  try {
    const { tripId } = await request.json()
    if (!tripId) {
      return NextResponse.json({ error: 'tripId required' }, { status: 400 })
    }

    const userId = await getRequestUserId()
    if (!userId) return unauthorized()
    const supabase = gcalServiceClient()
    if (!(await isTripMember(supabase, tripId, userId))) return forbidden()

    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('gcal_calendar_id')
      .eq('id', tripId)
      .single()

    if (tripError || !trip?.gcal_calendar_id) {
      return NextResponse.json({ error: 'No calendar found for trip' }, { status: 404 })
    }

    const accessToken = await getValidAccessToken(supabase, userId)

    const clearResult = await clearGoogleCalendarEvents(
      accessToken,
      trip.gcal_calendar_id
    )

    // Clear obsolete event IDs, then queue every included record for a full rebuild.
    // Excluded records remain clean and never enter the Update All queue.
    await resetTripCalendarSyncState(supabase, tripId)

    const { error: tripUpdateError } = await supabase
      .from('trips')
      .update({ gcal_last_synced_at: null })
      .eq('id', tripId)
    if (tripUpdateError) throw new Error(`Failed to reset trip calendar state: ${tripUpdateError.message}`)

    return NextResponse.json({ cleared: true, ...clearResult })
  } catch (err) {
    console.error('GCal calendar clear error:', err)
    const error = err instanceof GoogleCalendarApiError
      ? `Google Calendar could not be cleared (Google error ${err.status}).`
      : 'Failed to clear calendar.'
    return NextResponse.json({ error }, { status: 500 })
  }
}
