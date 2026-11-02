import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

// Copy this trip's checklist into another existing trip (merge, never
// overwrite). docs/checklist-packing-parity-plan.md, section 7

interface ChecklistCopyBody {
  targetTripId?: unknown
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
  let body: ChecklistCopyBody
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const targetTripId = typeof body.targetTripId === 'string' ? body.targetTripId : null
  if (!targetTripId) return Response.json({ error: 'Choose a trip to copy to.' }, { status: 400 })
  if (targetTripId === sourceTripId) return Response.json({ error: 'Choose a different trip to copy to.' }, { status: 400 })

  const userId = await getAuthenticatedUserId()
  if (!userId) return Response.json({ error: 'Unauthorized.' }, { status: 401 })

  let supabase
  try {
    supabase = getServiceClient()
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Unable to connect to Helm data.' }, { status: 500 })
  }

  const { data, error } = await supabase.rpc('copy_checklist', {
    p_source_trip_id: sourceTripId,
    p_target_trip_id: targetTripId,
    p_user_id: userId,
  })

  if (error || !data) {
    const migrationMissing = error?.code === 'PGRST202'
    // Exceptions raised by the function (P0001) are user-facing validation messages.
    if (error?.code === 'P0001') return Response.json({ error: error.message }, { status: 400 })
    await logger.error('api/trips/checklist-copy', 'Unable to copy checklist', {
      error: error?.message ?? 'Copy function returned no result',
      sourceTripId,
      targetTripId,
      userId,
    }, sourceTripId)
    return Response.json(
      { error: migrationMissing ? 'Copy Checklist database setup is not yet applied.' : 'Unable to copy checklist.' },
      { status: migrationMissing ? 503 : 500 },
    )
  }

  return Response.json(data)
}
