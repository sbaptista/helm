import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

// Bulk Complete / Reopen / Attention / Move / delete for selected checklist
// items: one membership check and one statement for the whole selection.
// Calendar handling matches /api/checklist/[id]. docs/checklist-packing-parity-plan.md

const MAX_IDS = 1000

// Rows with Calendar events, or set to sync, need the next sync to look at them.
const HAS_CALENDAR = 'gcal_include.eq.true,gcal_due_event_id.not.is.null,gcal_warning_event_id.not.is.null'
const HAS_EVENTS = 'gcal_due_event_id.not.is.null,gcal_warning_event_id.not.is.null'

type ChecklistBulkFields = { status?: 'open' | 'completed'; action_required?: boolean; group_name?: string | null }

interface ChecklistBulkBody {
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

// Only status, Attention Required and group can be set in bulk.
function parseFields(value: unknown): ChecklistBulkFields | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  const fields: ChecklistBulkFields = {}
  if (raw.status === 'open' || raw.status === 'completed') fields.status = raw.status
  if (typeof raw.action_required === 'boolean') fields.action_required = raw.action_required
  if ('group_name' in raw && (raw.group_name === null || typeof raw.group_name === 'string')) {
    fields.group_name = typeof raw.group_name === 'string' && raw.group_name.trim() ? raw.group_name.trim() : null
  }
  return Object.keys(fields).length ? fields : null
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id: tripId } = await params
  let body: ChecklistBulkBody
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

    // Mark Calendar rows first, so the main statement can return the final rows.
    // trip_id in every filter keeps the change inside this trip whatever ids are sent.
    const { error: dirtyError } = await supabase
      .from('checklist')
      .update({ gcal_dirty: true })
      .eq('trip_id', tripId)
      .in('id', ids)
      .is('deleted_at', null)
      .or(action === 'delete' ? HAS_EVENTS : HAS_CALENDAR)
    if (dirtyError) throw new Error(dirtyError.message)

    const { data, error } = await supabase
      .from('checklist')
      .update(action === 'delete'
        ? { deleted_at: new Date().toISOString(), gcal_include: false }
        : fields!)
      .eq('trip_id', tripId)
      .in('id', ids)
      .is('deleted_at', null)
      .select()
    if (error) throw new Error(error.message)

    return Response.json(action === 'delete'
      ? { ids: (data ?? []).map((r) => r.id) }
      : { records: data ?? [] })
  } catch (err) {
    await logger.error('api/trips/checklist-bulk', 'Unable to apply bulk checklist change', {
      error: err instanceof Error ? err.message : String(err),
      action,
      count: ids.length,
      userId,
    }, tripId)
    return Response.json({ error: 'Unable to save changes.' }, { status: 500 })
  }
}
