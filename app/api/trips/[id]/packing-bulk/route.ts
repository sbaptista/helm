import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

// Bulk Owned / Packed / delete for selected packing items: one membership
// check and one statement for the whole selection.
// docs/packing-multi-select-plan.md, Revision 1

const MAX_IDS = 1000

interface PackingBulkBody {
  action?: unknown
  ids?: unknown
  fields?: unknown
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

// Only the two checkbox fields can be set in bulk.
function parseFields(value: unknown): { owned?: boolean; packed?: boolean } | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  const fields: { owned?: boolean; packed?: boolean } = {}
  if (typeof raw.owned === 'boolean') fields.owned = raw.owned
  if (typeof raw.packed === 'boolean') fields.packed = raw.packed
  return Object.keys(fields).length ? fields : null
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id: tripId } = await params
  let body: PackingBulkBody
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const action = body.action
  const ids = Array.isArray(body.ids) ? body.ids.filter((id): id is string => typeof id === 'string') : []
  if (action !== 'update' && action !== 'delete') return Response.json({ error: 'Unknown action.' }, { status: 400 })
  if (ids.length === 0) return Response.json({ error: 'No items selected.' }, { status: 400 })
  if (ids.length > MAX_IDS) return Response.json({ error: 'Too many items selected.' }, { status: 400 })
  const fields = action === 'update' ? parseFields(body.fields) : null
  if (action === 'update' && !fields) return Response.json({ error: 'Nothing to change.' }, { status: 400 })

  const userId = await getAuthenticatedUserId()
  if (!userId) return Response.json({ error: 'Unauthorized.' }, { status: 401 })

  try {
    const supabase = getServiceClient()
    const { data: member } = await supabase
      .from('trip_members')
      .select('id')
      .eq('trip_id', tripId)
      .eq('user_id', userId)
      .maybeSingle()
    if (!member) return Response.json({ error: 'Forbidden.' }, { status: 403 })

    // trip_id in the filter keeps the change inside this trip whatever ids are sent.
    const query = supabase
      .from('packing')
      .update(action === 'delete' ? { deleted_at: new Date().toISOString() } : fields!)
      .eq('trip_id', tripId)
      .in('id', ids)
      .is('deleted_at', null)
    const { data, error } = await query.select()
    if (error) throw new Error(error.message)

    return Response.json(action === 'delete'
      ? { ids: (data ?? []).map((r) => r.id) }
      : { records: data ?? [] })
  } catch (err) {
    await logger.error('api/trips/packing-bulk', 'Unable to apply bulk packing change', {
      error: err instanceof Error ? err.message : String(err),
      action,
      count: ids.length,
      userId,
    }, tripId)
    return Response.json({ error: 'Unable to save changes.' }, { status: 500 })
  }
}
