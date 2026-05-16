import { NextRequest } from 'next/server'
import { getDataClient } from '@/lib/supabase/data-client'
import { getValidAccessToken } from '@/lib/gcal/token'
import { pushSection } from '../../_shared/pushSection'
import { logger } from '@/lib/logger'

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

    const { data: trip } = await supabase.from('trips').select('gcal_calendar_id').eq('id', tripId).single()
    if (!trip?.gcal_calendar_id) return new Response('No calendar for trip', { status: 404 })

    const sections = ['flights', 'hotels', 'transportation', 'restaurants', 'itinerary', 'checklist'] as const
    const sectionTables: Record<string, string> = {
      flights: 'flights', hotels: 'hotels', transportation: 'transportation',
      restaurants: 'restaurants', itinerary: 'itinerary_rows', checklist: 'checklist',
    }

    // Count total dirty records upfront so the client can show a real progress bar
    let totalDirty = 0
    for (const section of sections) {
      const { count } = await supabase
        .from(sectionTables[section])
        .select('id', { count: 'exact', head: true })
        .eq('trip_id', tripId)
        .is('deleted_at', null)
        .eq('gcal_include', true)
        .eq('gcal_dirty', true)
      totalDirty += count ?? 0
    }

    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: object) => {
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`))
        }
        try {
          const stats = { creates: 0, updates: 0, deletes: 0 }
          let current = 0
          send({ type: 'progress', current: 0, total: totalDirty })
          for (const section of sections) {
            await pushSection({ section, tripId, calendarId: trip.gcal_calendar_id, accessToken, supabase, onEvent: (event) => {
              if (event.action === 'create') stats.creates++
              if (event.action === 'update') stats.updates++
              if (event.action === 'delete') stats.deletes++
              current++
              send({ type: 'progress', current, total: totalDirty, ...event })
              send({ type: 'stats', ...stats })
            }})
          }
          await supabase.from('trips').update({ gcal_last_synced_at: new Date().toISOString() }).eq('id', tripId)
          send({ type: 'complete', syncedAt: new Date().toISOString() })
          controller.close()
        } catch (err) {
          logger.critical('api/calendar/push', 'Unhandled exception — SSE stream aborted', { error: err instanceof Error ? err.message : String(err) })
          send({ type: 'complete' })
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
    })
  } catch (err) {
    logger.critical('api/calendar/push', 'Unhandled exception in POST handler', { error: err instanceof Error ? err.message : String(err) })
    return new Response('Unexpected server error', { status: 500 })
  }
}
