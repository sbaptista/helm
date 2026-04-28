import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { logger } from '@/lib/logger'

function serverClient() {
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
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const userId = await getAuthUserId()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const supabase = serverClient()
    const body = await request.json()
    const { gcal_include } = body

    const { data, error } = await supabase
      .from('hotels')
      .update({ ...body, gcal_dirty: gcal_include === true ? true : false })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      logger.error('api/hotels', 'Supabase error on PATCH', { error: error.message, recordId: id })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
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

    const { error } = await supabase
      .from('hotels')
      .update({ deleted_at: new Date().toISOString() })
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
