import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

function serverClient() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!) }

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: tripId } = await params
  try {
    const supabase = serverClient()
    const { data, error } = await supabase.from('hotels').select('*').eq('trip_id', tripId).is('deleted_at', null).order('check_in_date', { ascending: true }).order('sort_order', { ascending: true })
    if (error) {
      logger.error('api/hotels', 'Supabase error on GET', { error: error.message, recordId: tripId })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data)
  } catch (err) {
    logger.critical('api/hotels', 'Unhandled exception in GET handler', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: tripId } = await params
  try {
    const supabase = serverClient()
    const body = await request.json()
    const { data, error } = await supabase.from('hotels').insert({ ...body, trip_id: tripId }).select().single()
    if (error) {
      logger.error('api/hotels', 'Supabase error on POST', { error: error.message, recordId: tripId })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    logger.critical('api/hotels', 'Unhandled exception in POST handler', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 })
  }
}
