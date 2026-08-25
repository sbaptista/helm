import { NextRequest } from 'next/server'
import { getDataClient } from '@/lib/supabase/data-client'
import { getValidAccessToken } from '@/lib/gcal/token'
import { pushSection } from '../../_shared/pushSection'
import { logger } from '@/lib/logger'
import { isMissingGoogleCalendarResource } from '@/lib/gcal/client'
import { getGoogleCalendar } from '@/lib/gcal/sync-state'

function getAuthUserId(): string {
  if (process.env.BYPASS_AUTH_USER_ID) return process.env.BYPASS_AUTH_USER_ID
  throw new Error('Not authenticated')
}

export async function POST(_request: NextRequest, { params }: { params: Promise<{ tripId: string }> }) {
  try {
    const { tripId } = await params
    const userId = getAuthUserId()
    const supabase = await getDataClient()
    const accessToken = await getValidAccessToken(userId)

    const { data: trip, error: tripError } = await supabase.from('trips').select('gcal_calendar_id').eq('id', tripId).single()
    if (tripError) throw tripError
    if (!trip?.gcal_calendar_id) return new Response('No calendar for trip', { status: 404 })

    try {
      await getGoogleCalendar(accessToken, trip.gcal_calendar_id)
    } catch (error) {
      if (isMissingGoogleCalendarResource(error)) {
        return Response.json(
          { error: 'calendar_missing', message: 'The linked Google calendar no longer exists.' },
          { status: 410 }
        )
      }
      throw error
    }

    const sections = ['flights', 'hotels', 'transportation', 'restaurants', 'itinerary', 'checklist'] as const
    const progressFields: Record<string, { table: string; ids: string[]; extra?: string }> = {
      flights: { table: 'flights', ids: ['gcal_event_id', 'gcal_legacy_arrival_event_id'] },
      hotels: { table: 'hotels', ids: ['gcal_checkin_event_id', 'gcal_checkout_event_id'] },
      transportation: { table: 'transportation', ids: ['gcal_event_id'] },
      restaurants: { table: 'restaurants', ids: ['gcal_event_id'] },
      itinerary: { table: 'itinerary_rows', ids: ['gcal_event_id'] },
      checklist: { table: 'checklist', ids: ['gcal_due_event_id', 'gcal_warning_event_id'], extra: 'warning_days' },
    }

    // Count actual create/update/delete operations so two-event records report accurately.
    let totalDirty = 0
    for (const section of sections) {
      const config = progressFields[section]
      const { data: dirtyRows, error: countError } = await supabase
        .from(config.table)
        .select(['gcal_include', ...config.ids, ...(config.extra ? [config.extra] : [])].join(','))
        .eq('trip_id', tripId)
        .is('deleted_at', null)
        .eq('gcal_dirty', true)
      if (countError) throw countError
      for (const row of (dirtyRows ?? []) as unknown as Array<Record<string, unknown>>) {
        if (row.gcal_include) {
          totalDirty += section === 'checklist'
            ? 1 + (row.warning_days ? 1 : 0)
            : section === 'flights'
              ? 1 + (row.gcal_legacy_arrival_event_id ? 1 : 0)
              : config.ids.length
        } else {
          totalDirty += config.ids.filter(field => !!row[field]).length
        }
      }
    }

    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: object) => {
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`))
        }
        try {
          const stats = { creates: 0, updates: 0, deletes: 0, errors: 0 }
          let current = 0
          send({ type: 'progress', current: 0, total: totalDirty })
          for (const section of sections) {
            await pushSection({ section, tripId, calendarId: trip.gcal_calendar_id, accessToken, supabase, onEvent: (event) => {
              if (event.status === 'success') {
                if (event.action === 'create') stats.creates++
                if (event.action === 'update') stats.updates++
                if (event.action === 'delete') stats.deletes++
              } else {
                stats.errors++
                void logger.error('api/calendar/push', 'Calendar item sync failed', {
                  section,
                  label: event.label,
                  action: event.action,
                  error: event.error,
                }, tripId)
              }
              current++
              send({ type: 'progress', current, total: totalDirty, ...event })
              send({ type: 'stats', ...stats })
            }})
          }
          if (stats.errors === 0) {
            const syncedAt = new Date().toISOString()
            const { error: syncStampError } = await supabase
              .from('trips')
              .update({ gcal_last_synced_at: syncedAt })
              .eq('id', tripId)
            if (syncStampError) throw syncStampError
            send({ type: 'complete', success: true, syncedAt, errors: 0 })
          } else {
            send({
              type: 'complete',
              success: false,
              errors: stats.errors,
              error: `${stats.errors} calendar operation${stats.errors === 1 ? '' : 's'} failed.`,
            })
          }
          controller.close()
        } catch (err) {
          logger.critical('api/calendar/push', 'Unhandled exception — SSE stream aborted', { error: err instanceof Error ? err.message : String(err) })
          send({
            type: 'complete',
            success: false,
            errors: 1,
            error: err instanceof Error ? err.message : 'Unexpected server error',
          })
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (err) {
    logger.critical('api/calendar/push', 'Unhandled exception in POST handler', { error: err instanceof Error ? err.message : String(err) })
    return new Response('Unexpected server error', { status: 500 })
  }
}
