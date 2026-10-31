import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

// Trips this trip's content can be copied into: the user's other advisor
// trips, excluding Archived. docs/copy-packing-list-plan.md

async function getAuthenticatedUserId(): Promise<string | null> {
  if (process.env.BYPASS_AUTH_USER_ID) return process.env.BYPASS_AUTH_USER_ID
  const authClient = await createServerClient()
  return (await authClient.auth.getUser()).data.user?.id ?? null
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY
  if (!url || !key) throw new Error('Supabase credentials not configured.')
  return createServiceClient(url, key)
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id: tripId } = await params

  const userId = await getAuthenticatedUserId()
  if (!userId) return Response.json({ error: 'Unauthorized.' }, { status: 401 })

  try {
    const supabase = getServiceClient()
    const { data: memberships, error: memberError } = await supabase
      .from('trip_members')
      .select('trip_id')
      .eq('user_id', userId)
      .eq('role', 'advisor')
    if (memberError) throw new Error(memberError.message)

    const tripIds = (memberships ?? []).map((m) => m.trip_id).filter((id) => id !== tripId)
    if (tripIds.length === 0) return Response.json([])

    const { data: trips, error: tripsError } = await supabase
      .from('trips')
      .select('id, title, destination, status')
      .in('id', tripIds)
      .neq('status', 'archived')
      .order('created_at', { ascending: false })
    if (tripsError) throw new Error(tripsError.message)

    return Response.json(trips ?? [])
  } catch (err) {
    await logger.error('api/trips/copy-targets', 'Unable to list copy targets', {
      error: err instanceof Error ? err.message : String(err),
      userId,
    }, tripId)
    return Response.json({ error: 'Unable to load trips.' }, { status: 500 })
  }
}
