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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tripId } = await params
  try {
    const supabase = serviceClient()
    const { data, error } = await supabase
      .from('itinerary_rows')
      .select('*')
      .eq('trip_id', tripId)
      .is('deleted_at', null)
      .order('is_all_day', { ascending: false })
      .order('start_time', { ascending: true, nullsFirst: false })
      .order('sort_order', { ascending: true })
    if (error) {
      logger.error('api/itinerary', 'Supabase error on GET', { error: error.message, recordId: tripId })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data)
  } catch (err) {
    logger.critical('api/itinerary', 'Unhandled exception in GET handler', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tripId } = await params
  try {
    const userId = await getAuthUserId()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = serviceClient()
    const { data: member } = await supabase
      .from('trip_members')
      .select('id')
      .eq('trip_id', tripId)
      .eq('user_id', userId)
      .single()
    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const insert: Record<string, unknown> = { trip_id: tripId }
    const allowed = [
      'day_id', 'title', 'description', 'location', 'category',
      'start_timezone', 'end_timezone', 'is_all_day', 'start_time', 'end_time', 'sort_order',
      'is_approx', 'is_provided', 'action_required', 'action_note',
    ]
    for (const key of allowed) {
      if (key in body) insert[key] = body[key]
    }
    const { data, error } = await supabase
      .from('itinerary_rows')
      .insert(insert)
      .select()
      .single()
    if (error) {
      logger.error('api/itinerary', 'Supabase error on POST', { error: error.message, recordId: tripId })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    logger.critical('api/itinerary', 'Unhandled exception in POST handler', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 })
  }
}
