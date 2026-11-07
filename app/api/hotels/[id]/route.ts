import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { ensureDaysForLinkedRecord } from '@/lib/itinerary/linked-entries'
import { fillMissingTimezones, placeQuery } from '@/lib/geo/timezone-lookup'
import { requireRecordMember } from '@/lib/auth/trip-access'

// Never set from a request: identity, trip, timestamps and Calendar sync state.
const PROTECTED_FIELDS = ['id', 'trip_id', 'created_at', 'updated_at', 'deleted_at', 'gcal_dirty', 'gcal_checkin_event_id', 'gcal_checkout_event_id']

function serverClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  )
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const supabase = serverClient()
    const access = await requireRecordMember('hotels', id, { supabase })
    if ('response' in access) return access.response
    const body = await request.json()
    for (const field of PROTECTED_FIELDS) delete body[field]
    // A form save sends timezone; an empty one is looked up from the place.
    if ('timezone' in body) await fillMissingTimezones(body, [{ timezone: 'timezone', query: placeQuery(body) }])
    const { data: existing } = await supabase
      .from('hotels')
      .select('gcal_include, gcal_checkin_event_id, gcal_checkout_event_id')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle()
    if (!existing) return NextResponse.json({ error: 'Hotel not found' }, { status: 404 })
    const nextInclude = 'gcal_include' in body ? body.gcal_include === true : existing.gcal_include === true
    const gcalDirty = nextInclude || existing.gcal_include === true || !!existing.gcal_checkin_event_id || !!existing.gcal_checkout_event_id

    const { data, error } = await supabase
      .from('hotels')
      .update({ ...body, gcal_dirty: gcalDirty })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      logger.error('api/hotels', 'Supabase error on PATCH', { error: error.message, recordId: id })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    await ensureDaysForLinkedRecord(supabase, 'Hotels', data)
    return NextResponse.json(data)
  } catch (err) {
    logger.critical('api/hotels', 'Unhandled exception in PATCH handler', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const supabase = serverClient()
    const access = await requireRecordMember('hotels', id, { supabase })
    if ('response' in access) return access.response
    const { data: hotel } = await supabase
      .from('hotels')
      .select('gcal_checkin_event_id, gcal_checkout_event_id')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle()
    if (!hotel) return NextResponse.json({ error: 'Hotel not found' }, { status: 404 })

    const { error } = await supabase
      .from('hotels')
      .update({
        deleted_at: new Date().toISOString(),
        gcal_include: false,
        gcal_dirty: !!hotel.gcal_checkin_event_id || !!hotel.gcal_checkout_event_id,
      })
      .eq('id', id)

    if (error) {
      logger.error('api/hotels', 'Supabase error on DELETE', { error: error.message, recordId: id })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    logger.critical('api/hotels', 'Unhandled exception in DELETE handler', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 })
  }
}
