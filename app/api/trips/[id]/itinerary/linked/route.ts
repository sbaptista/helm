import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { loadLinkedItineraryEntries } from '@/lib/itinerary/linked-entries'
import { logger } from '@/lib/logger'

async function getAuthUserId(): Promise<string | null> {
  if (process.env.BYPASS_AUTH_USER_ID) return process.env.BYPASS_AUTH_USER_ID
  const cookieStore = await cookies()
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  )
  return (await authClient.auth.getUser()).data.user?.id ?? null
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: tripId } = await params
  try {
    const userId = await getAuthUserId()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!)
    const { data: member } = await supabase.from('trip_members').select('id').eq('trip_id', tripId).eq('user_id', userId).maybeSingle()
    if (!member) return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    return NextResponse.json(await loadLinkedItineraryEntries(supabase, tripId))
  } catch (error) {
    logger.error('api/itinerary/linked', 'Unable to load linked itinerary entries', {
      error: error instanceof Error ? error.message : String(error), tripId,
    })
    return NextResponse.json({ error: 'Unable to load linked itinerary entries' }, { status: 500 })
  }
}
