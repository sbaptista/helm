import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { logger } from '@/lib/logger'
import { ensureDaysForLinkedRecord } from '@/lib/itinerary/linked-entries'
import { fillMissingTimezones, placeQuery } from '@/lib/geo/timezone-lookup'
import { applyMapLink } from '@/lib/geo/map-link'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  )
}

async function getAuthUserId(): Promise<string | null> {
  if (process.env.BYPASS_AUTH_USER_ID) {
    return process.env.BYPASS_AUTH_USER_ID;
  }
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const userId = await getAuthUserId()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = serviceClient()
    const { data: record } = await supabase
      .from('restaurants')
      .select('trip_id, gcal_include, gcal_event_id')
      .eq('id', id)
      .single()
    if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data: member } = await supabase
      .from('trip_members')
      .select('id')
      .eq('trip_id', record.trip_id)
      .eq('user_id', userId)
      .single()
    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    // A form save sends timezone; an empty one is looked up from the place.
    if ('timezone' in body) await fillMissingTimezones(body, [{ timezone: 'timezone', query: placeQuery(body) }])
    await applyMapLink(supabase, 'restaurants', id, body)
    const {
      name, cuisine, city, address, reservation_time, party_size, style,
      confirmation_number, phone, website_url, notes, included, action_required,
      gcal_include,
      display_label, reservation_status, confirmed, booking_source, maps_url,
      action_note, state_province, postal_code, email, booking_url,
      reservation_is_all_day, reservation_is_approx,
      show_in_itinerary, timezone, country, maps_url_auto, map_lat, map_lng,
    } = body
    const nextInclude = 'gcal_include' in body ? gcal_include === true : record.gcal_include === true
    const gcalDirty = nextInclude || record.gcal_include === true || !!record.gcal_event_id
    const { data, error } = await supabase
      .from('restaurants')
      .update({
        name, cuisine, city, address, reservation_time, party_size, style,
        confirmation_number, phone, website_url, notes, included, action_required,
        gcal_include,
        gcal_dirty: gcalDirty,
        display_label, reservation_status, confirmed, booking_source, maps_url,
        action_note, state_province, postal_code, email, booking_url,
        reservation_is_all_day, reservation_is_approx,
        show_in_itinerary, timezone, country, maps_url_auto, map_lat, map_lng,
      })
      .eq('id', id)
      .select()
      .single()
    if (error) {
      logger.error('api/restaurants', 'Supabase error on PATCH', { error: error.message, recordId: id })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    await ensureDaysForLinkedRecord(supabase, 'Restaurants', data)
    return NextResponse.json(data)
  } catch (err) {
    logger.critical('api/restaurants', 'Unhandled exception in PATCH handler', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const userId = await getAuthUserId()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = serviceClient()
    const { data: record } = await supabase
      .from('restaurants')
      .select('trip_id, gcal_event_id')
      .eq('id', id)
      .single()
    if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data: member } = await supabase
      .from('trip_members')
      .select('id')
      .eq('trip_id', record.trip_id)
      .eq('user_id', userId)
      .single()
    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { error } = await supabase
      .from('restaurants')
      .update({
        deleted_at: new Date().toISOString(),
        gcal_include: false,
        gcal_dirty: !!record.gcal_event_id,
      })
      .eq('id', id)
    if (error) {
      logger.error('api/restaurants', 'Supabase error on DELETE', { error: error.message, recordId: id })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    logger.critical('api/restaurants', 'Unhandled exception in DELETE handler', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 })
  }
}
