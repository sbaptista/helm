import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

// Copy this trip's packing list into another existing trip (merge, never
// overwrite). docs/copy-packing-list-plan.md

const PEOPLE = ['stan', 'cathy']

interface PackingCopyBody {
  targetTripId?: unknown
  people?: unknown
}

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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id: sourceTripId } = await params
  let body: PackingCopyBody
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const targetTripId = typeof body.targetTripId === 'string' ? body.targetTripId : null
  const people = Array.isArray(body.people)
    ? body.people.filter((p): p is string => typeof p === 'string' && PEOPLE.includes(p))
    : []

  if (!targetTripId) return Response.json({ error: 'Choose a trip to copy to.' }, { status: 400 })
  if (targetTripId === sourceTripId) return Response.json({ error: 'Choose a different trip to copy to.' }, { status: 400 })
  if (people.length === 0) return Response.json({ error: 'Choose whose packing list to copy.' }, { status: 400 })

  const userId = await getAuthenticatedUserId()
  if (!userId) return Response.json({ error: 'Unauthorized.' }, { status: 401 })

  let supabase
  try {
    supabase = getServiceClient()
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Unable to connect to Helm data.' }, { status: 500 })
  }

  const { data, error } = await supabase.rpc('copy_packing_list', {
    p_source_trip_id: sourceTripId,
    p_target_trip_id: targetTripId,
    p_people: people,
    p_user_id: userId,
  })

  if (error || !data) {
    const migrationMissing = error?.code === 'PGRST202'
    // Exceptions raised by the function (P0001) are user-facing validation messages.
    if (error?.code === 'P0001') return Response.json({ error: error.message }, { status: 400 })
    await logger.error('api/trips/packing-copy', 'Unable to copy packing list', {
      error: error?.message ?? 'Copy function returned no result',
      sourceTripId,
      targetTripId,
      userId,
    }, sourceTripId)
    return Response.json(
      { error: migrationMissing ? 'Copy Packing List database setup is not yet applied.' : 'Unable to copy packing list.' },
      { status: migrationMissing ? 503 : 500 },
    )
  }

  return Response.json(data)
}
