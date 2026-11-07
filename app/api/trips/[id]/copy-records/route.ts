import { logger } from '@/lib/logger'
import { requireTripMember, tripServiceClient } from '@/lib/auth/trip-access'
import { linkedDayDates, type LinkedItinerarySection } from '@/lib/itinerary/linked-entries'

// ─── POST /api/trips/[id]/copy-records ────────────────────────────────────────
//
// body: { section, ids: string[], targetTripId }
//
// Copy to Trip for selected records (docs/bulk-selection-plan.md, D5). One
// transaction in copy_records; the caller must be an advisor on both trips.
// Online only. Returns { copied, skipped, days, groups }.

const SECTIONS: Record<string, { fn: string; table: string; linked?: LinkedItinerarySection }> = {
  flights:          { fn: 'flights',        table: 'flights',        linked: 'Flights' },
  hotels:           { fn: 'hotels',         table: 'hotels',         linked: 'Hotels' },
  restaurants:      { fn: 'restaurants',    table: 'restaurants',    linked: 'Restaurants' },
  transportation:   { fn: 'transportation', table: 'transportation', linked: 'Transportation' },
  'key-info':       { fn: 'key_info',       table: 'key_info' },
  checklist:        { fn: 'checklist',      table: 'checklist' },
  packing:          { fn: 'packing',        table: 'packing' },
}

const MAX_IDS = 1000

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id: sourceTripId } = await params

  let body: { section?: unknown; ids?: unknown; targetTripId?: unknown }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const config = typeof body.section === 'string' ? SECTIONS[body.section] : undefined
  if (!config) return Response.json({ error: 'Unknown section.' }, { status: 400 })
  const ids = Array.isArray(body.ids) ? [...new Set(body.ids.filter((id): id is string => typeof id === 'string'))] : []
  if (ids.length === 0) return Response.json({ error: 'Nothing selected to copy.' }, { status: 400 })
  if (ids.length > MAX_IDS) return Response.json({ error: 'Too many records selected.' }, { status: 400 })
  const targetTripId = typeof body.targetTripId === 'string' ? body.targetTripId : null
  if (!targetTripId) return Response.json({ error: 'Choose a trip to copy to.' }, { status: 400 })
  if (targetTripId === sourceTripId) return Response.json({ error: 'Choose a different trip to copy to.' }, { status: 400 })

  const access = await requireTripMember(sourceTripId, { role: 'advisor' })
  if ('response' in access) return access.response

  try {
    const supabase = tripServiceClient()

    // Travel records shown in the Itinerary need a day on their dates in the
    // target trip; the copies keep their times, so the dates are the source's.
    let linkedDates: string[] = []
    if (config.linked) {
      const { data: rows, error } = await supabase.from(config.table).select('*')
        .eq('trip_id', sourceTripId).in('id', ids).is('deleted_at', null)
      if (error) throw new Error(error.message)
      const dates = new Set<string>()
      for (const row of (rows ?? []) as Record<string, unknown>[]) {
        for (const date of linkedDayDates(config.linked, row)) dates.add(date)
      }
      linkedDates = [...dates]
    }

    const { data, error } = await supabase.rpc('copy_records', {
      p_source_trip_id: sourceTripId,
      p_target_trip_id: targetTripId,
      p_user_id: access.userId,
      p_section: config.fn,
      p_ids: ids,
      p_linked_dates: linkedDates,
    })

    if (error || !data) {
      // Exceptions raised by the function (P0001) are messages for the user.
      if (error?.code === 'P0001') return Response.json({ error: error.message }, { status: 400 })
      const migrationMissing = error?.code === 'PGRST202'
      await logger.error('api/trips/copy-records', 'Unable to copy records', {
        error: error?.message ?? 'Copy function returned no result',
        section: body.section, count: ids.length, targetTripId, userId: access.userId,
      }, sourceTripId)
      return Response.json(
        { error: migrationMissing ? 'Copy to Trip database setup is not yet applied.' : 'Unable to copy.' },
        { status: migrationMissing ? 503 : 500 },
      )
    }

    return Response.json(data)
  } catch (err) {
    await logger.error('api/trips/copy-records', 'Unable to copy records', {
      error: err instanceof Error ? err.message : String(err),
      section: body.section, count: ids.length, targetTripId, userId: access.userId,
    }, sourceTripId)
    return Response.json({ error: 'Unable to copy.' }, { status: 500 })
  }
}
