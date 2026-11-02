import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

// Move or copy selected packing items, or a whole sub-group, within this trip.
// One transaction in move_copy_packing. docs/packing-move-copy-plan.md

const PEOPLE = ['stan', 'cathy']
const MAX_IDS = 1000

interface PackingMoveBody {
  mode?: unknown
  itemIds?: unknown
  subgroupId?: unknown
  person?: unknown
  groupId?: unknown
  destSubgroupId?: unknown
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

function str(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id: tripId } = await params
  let body: PackingMoveBody
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const mode = body.mode
  const itemIds = Array.isArray(body.itemIds)
    ? body.itemIds.filter((id): id is string => typeof id === 'string')
    : null
  const subgroupId = str(body.subgroupId)
  const person = str(body.person)
  const groupId = str(body.groupId)
  const destSubgroupId = str(body.destSubgroupId)

  if (mode !== 'move' && mode !== 'copy') return Response.json({ error: 'Choose Move or Copy.' }, { status: 400 })
  if (!person || !PEOPLE.includes(person)) return Response.json({ error: 'Choose whose list to use.' }, { status: 400 })
  if (!groupId) return Response.json({ error: 'Choose a category.' }, { status: 400 })
  if ((itemIds === null) === (subgroupId === null)) return Response.json({ error: 'Choose items or a sub-group.' }, { status: 400 })
  if (itemIds && itemIds.length === 0) return Response.json({ error: 'No items selected.' }, { status: 400 })
  if (itemIds && itemIds.length > MAX_IDS) return Response.json({ error: 'Too many items selected.' }, { status: 400 })

  const userId = await getAuthenticatedUserId()
  if (!userId) return Response.json({ error: 'Unauthorized.' }, { status: 401 })

  let supabase
  try {
    supabase = getServiceClient()
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Unable to connect to Helm data.' }, { status: 500 })
  }

  const { data, error } = await supabase.rpc('move_copy_packing', {
    p_trip_id: tripId,
    p_user_id: userId,
    p_mode: mode,
    p_item_ids: itemIds,
    p_subgroup_id: subgroupId,
    p_person: person,
    p_group_id: groupId,
    p_dest_subgroup_id: itemIds ? destSubgroupId : null,
  })

  if (error || !data) {
    const migrationMissing = error?.code === 'PGRST202'
    // Exceptions raised by the function (P0001) are user-facing validation messages.
    if (error?.code === 'P0001') return Response.json({ error: error.message }, { status: 400 })
    await logger.error('api/trips/packing-move', 'Unable to move or copy packing', {
      error: error?.message ?? 'Move/copy function returned no result',
      mode,
      count: itemIds?.length ?? null,
      subgroupId,
      userId,
    }, tripId)
    return Response.json(
      { error: migrationMissing ? 'Move and Copy database setup is not yet applied.' : 'Unable to save changes.' },
      { status: migrationMissing ? 503 : 500 },
    )
  }

  return Response.json(data)
}
