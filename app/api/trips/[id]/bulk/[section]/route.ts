import { logger } from '@/lib/logger'
import { requireTripMember, tripServiceClient } from '@/lib/auth/trip-access'

// ─── POST /api/trips/[id]/bulk/[section] ──────────────────────────────────────
//
// body: { action: 'update' | 'delete', ids: string[], fields?: {...} }
//
// One change to the selected records of one section (docs/bulk-selection-plan.md,
// D4). Only the fields listed for the section can be set. Calendar handling
// matches the single-record routes: a change to a record on Google Calendar
// (or with events) marks it gcal_dirty; delete is a soft delete that turns
// Calendar off and leaves records with events as tombstones for the next sync.
// Called through apiBulk(), which falls back to the single-record routes offline.

const MAX_IDS = 1000

type FieldKind = 'boolean' | 'trip-key-info-group'

interface SectionConfig {
  table: string
  fields: Record<string, FieldKind>
  // Event id columns; empty when the section has no Calendar.
  events: string[]
  // Columns that must be set before a record can go on Google Calendar.
  calendarNeeds: string[]
}

const SECTIONS: Record<string, SectionConfig> = {
  flights: {
    table: 'flights',
    fields: { action_required: 'boolean', show_in_itinerary: 'boolean', gcal_include: 'boolean' },
    events: ['gcal_event_id', 'gcal_legacy_arrival_event_id'],
    calendarNeeds: ['departure_time', 'arrival_time'],
  },
  hotels: {
    table: 'hotels',
    fields: { action_required: 'boolean', show_in_itinerary: 'boolean', gcal_include: 'boolean' },
    events: ['gcal_checkin_event_id', 'gcal_checkout_event_id'],
    calendarNeeds: ['check_in_date'],
  },
  restaurants: {
    table: 'restaurants',
    fields: { action_required: 'boolean', show_in_itinerary: 'boolean', gcal_include: 'boolean' },
    events: ['gcal_event_id'],
    calendarNeeds: ['reservation_time'],
  },
  transportation: {
    table: 'transportation',
    fields: { action_required: 'boolean', show_in_itinerary: 'boolean', gcal_include: 'boolean' },
    events: ['gcal_event_id'],
    calendarNeeds: ['departure_time'],
  },
  'key-info': {
    table: 'key_info',
    fields: { action_required: 'boolean', show_in_overview: 'boolean', group_id: 'trip-key-info-group' },
    events: [],
    calendarNeeds: [],
  },
}

type Fields = Record<string, boolean | string | null>

function parseFields(config: SectionConfig, value: unknown): Fields | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  const fields: Fields = {}
  for (const [key, kind] of Object.entries(config.fields)) {
    if (!(key in raw)) continue
    const v = raw[key]
    if (kind === 'boolean') {
      if (typeof v !== 'boolean') return null
      fields[key] = v
    } else {
      if (v !== null && (typeof v !== 'string' || !v)) return null
      fields[key] = v as string | null
    }
  }
  if (Object.keys(raw).some((key) => !(key in config.fields))) return null
  return Object.keys(fields).length ? fields : null
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; section: string }> },
): Promise<Response> {
  const { id: tripId, section } = await params
  const config = SECTIONS[section]
  if (!config) return Response.json({ error: 'Unknown section.' }, { status: 404 })

  let body: { action?: unknown; ids?: unknown; fields?: unknown }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const action = body.action
  const ids = Array.isArray(body.ids) ? [...new Set(body.ids.filter((id): id is string => typeof id === 'string'))] : []
  if (action !== 'update' && action !== 'delete') return Response.json({ error: 'Unknown action.' }, { status: 400 })
  if (ids.length === 0) return Response.json({ error: 'Nothing selected.' }, { status: 400 })
  if (ids.length > MAX_IDS) return Response.json({ error: 'Too many records selected.' }, { status: 400 })
  const fields = action === 'update' ? parseFields(config, body.fields) : null
  if (action === 'update' && !fields) return Response.json({ error: 'Nothing to change.' }, { status: 400 })
  if (fields && 'gcal_include' in fields && config.events.length === 0) {
    return Response.json({ error: 'This section has no Calendar.' }, { status: 400 })
  }

  const access = await requireTripMember(tripId)
  if ('response' in access) return access.response

  try {
    const supabase = tripServiceClient()

    // A group to move to must belong to this trip.
    if (typeof fields?.group_id === 'string') {
      const { data: group, error } = await supabase.from('key_info_groups').select('id')
        .eq('id', fields.group_id).eq('trip_id', tripId).maybeSingle()
      if (error) throw new Error(error.message)
      if (!group) return Response.json({ error: 'That group isn’t in this trip.' }, { status: 400 })
    }

    // Records that can't go on Calendar (no date) are left alone.
    const turningCalendarOn = fields?.gcal_include === true
    const scoped = <Q extends { eq: (c: string, v: string) => Q; in: (c: string, v: string[]) => Q; is: (c: string, v: null) => Q; not: (c: string, op: string, v: null) => Q }>(query: Q): Q => {
      let q = query.eq('trip_id', tripId).in('id', ids).is('deleted_at', null)
      if (turningCalendarOn) for (const col of config.calendarNeeds) q = q.not(col, 'is', null)
      return q
    }

    // Mark Calendar records first, so the main statement returns the final rows.
    if (config.events.length > 0) {
      const withEvents = config.events.map((col) => `${col}.not.is.null`)
      const onCalendar = action === 'delete' ? withEvents : ['gcal_include.eq.true', ...withEvents]
      let dirty = scoped(supabase.from(config.table).update({ gcal_dirty: true }))
      if (!turningCalendarOn) dirty = dirty.or(onCalendar.join(','))
      const { error } = await dirty
      if (error) throw new Error(error.message)
    }

    const change: Record<string, unknown> = action === 'delete'
      ? { deleted_at: new Date().toISOString(), ...(config.events.length ? { gcal_include: false } : {}) }
      : { ...fields }
    const { data, error } = await scoped(supabase.from(config.table).update(change)).select()
    if (error) throw new Error(error.message)

    return Response.json(action === 'delete'
      ? { ids: (data ?? []).map((r: { id: string }) => r.id) }
      : { records: data ?? [] })
  } catch (err) {
    await logger.error('api/trips/bulk', 'Unable to apply bulk change', {
      error: err instanceof Error ? err.message : String(err),
      section, action, count: ids.length, userId: access.userId,
    }, tripId)
    return Response.json({ error: 'Unable to save changes.' }, { status: 500 })
  }
}
