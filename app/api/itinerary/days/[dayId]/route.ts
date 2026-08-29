import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { logger } from '@/lib/logger'

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
  { params }: { params: Promise<{ dayId: string }> }
) {
  const { dayId } = await params
  try {
    const userId = await getAuthUserId()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = serviceClient()

    const { data: dayData } = await supabase
      .from('itinerary_days')
      .select('trip_id')
      .eq('id', dayId)
      .single()

    if (!dayData) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data: member } = await supabase
      .from('trip_members')
      .select('id')
      .eq('trip_id', dayData.trip_id)
      .eq('user_id', userId)
      .single()

    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const { data, error } = await supabase
      .from('itinerary_days')
      .update(body)
      .eq('id', dayId)
      .select()
      .single()

    if (error) {
      logger.error('api/itinerary', 'Supabase error on PATCH', { error: error.message, recordId: dayId })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data)
  } catch (err) {
    logger.critical('api/itinerary', 'Unhandled exception in PATCH handler', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ dayId: string }> }
) {
  const { dayId } = await params
  try {
    const userId = await getAuthUserId()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = serviceClient()

    const { data: dayData } = await supabase
      .from('itinerary_days')
      .select('trip_id')
      .eq('id', dayId)
      .single()

    if (!dayData) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data: member } = await supabase
      .from('trip_members')
      .select('id')
      .eq('trip_id', dayData.trip_id)
      .eq('user_id', userId)
      .single()

    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const deletedAt = new Date().toISOString()
    const { error: linkedRowsError } = await supabase
      .from('itinerary_rows')
      .update({ deleted_at: deletedAt, gcal_include: false, gcal_dirty: true })
      .eq('day_id', dayId)
      .is('deleted_at', null)
      .not('gcal_event_id', 'is', null)

    if (linkedRowsError) {
      logger.error('api/itinerary', 'Supabase error queueing linked rows on day DELETE', { error: linkedRowsError.message, recordId: dayId })
      return NextResponse.json({ error: linkedRowsError.message }, { status: 500 })
    }

    const { error: unlinkedRowsError } = await supabase
      .from('itinerary_rows')
      .update({ deleted_at: deletedAt, gcal_include: false, gcal_dirty: false })
      .eq('day_id', dayId)
      .is('deleted_at', null)
      .is('gcal_event_id', null)

    if (unlinkedRowsError) {
      logger.error('api/itinerary', 'Supabase error deleting unlinked rows on day DELETE', { error: unlinkedRowsError.message, recordId: dayId })
      return NextResponse.json({ error: unlinkedRowsError.message }, { status: 500 })
    }

    const { error } = await supabase
      .from('itinerary_days')
      .update({ deleted_at: deletedAt })
      .eq('id', dayId)

    if (error) {
      logger.error('api/itinerary', 'Supabase error on DELETE', { error: error.message, recordId: dayId })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    logger.critical('api/itinerary', 'Unhandled exception in DELETE handler', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 })
  }
}
