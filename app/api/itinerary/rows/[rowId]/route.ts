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
  { params }: { params: Promise<{ rowId: string }> }
) {
  const { rowId } = await params
  try {
    const userId = await getAuthUserId()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = serviceClient()

    const { data: rowData } = await supabase
      .from('itinerary_rows')
      .select('trip_id')
      .eq('id', rowId)
      .single()

    if (!rowData) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data: member } = await supabase
      .from('trip_members')
      .select('id')
      .eq('trip_id', rowData.trip_id)
      .eq('user_id', userId)
      .single()

    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const update: Record<string, unknown> = {}
    const allowed = [
      'day_id', 'title', 'description', 'location', 'category',
      'start_timezone', 'end_timezone', 'is_all_day', 'start_time', 'end_time', 'sort_order',
      'is_approx', 'is_provided', 'action_required', 'action_note', 'gcal_include',
    ]
    for (const key of allowed) {
      if (key in body) update[key] = body[key]
    }
    update.gcal_dirty = update.gcal_include === true ? true : false
    const { data, error } = await supabase
      .from('itinerary_rows')
      .update(update)
      .eq('id', rowId)
      .select()
      .single()

    if (error) {
      logger.error('api/itinerary', 'Supabase error on PATCH', { error: error.message, recordId: rowId })
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
  { params }: { params: Promise<{ rowId: string }> }
) {
  const { rowId } = await params
  try {
    const userId = await getAuthUserId()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = serviceClient()

    const { data: rowData } = await supabase
      .from('itinerary_rows')
      .select('trip_id')
      .eq('id', rowId)
      .single()

    if (!rowData) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data: member } = await supabase
      .from('trip_members')
      .select('id')
      .eq('trip_id', rowData.trip_id)
      .eq('user_id', userId)
      .single()

    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { error } = await supabase
      .from('itinerary_rows')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', rowId)

    if (error) {
      logger.error('api/itinerary', 'Supabase error on DELETE', { error: error.message, recordId: rowId })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    logger.critical('api/itinerary', 'Unhandled exception in DELETE handler', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 })
  }
}
