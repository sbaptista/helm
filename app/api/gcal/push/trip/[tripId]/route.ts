import { NextRequest } from 'next/server'
import { getDataClient } from '@/lib/supabase/data-client'
import { getValidAccessToken } from '@/lib/gcal/token'
import { pushSection } from '../../_shared/pushSection'

function getAuthUserId(): string {
  if (process.env.BYPASS_AUTH_USER_ID) return process.env.BYPASS_AUTH_USER_ID
  throw new Error('Not authenticated')
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params
  const userId = getAuthUserId()
  const supabase = await getDataClient()
  const accessToken = await getValidAccessToken(userId)

  const { data: trip } = await supabase
    .from('trips')
    .select('gcal_calendar_id')
    .eq('id', tripId)
    .single()

  if (!trip?.gcal_calendar_id) {
    return new Response('No calendar for trip', { status: 404 })
  }

  const sections = ['flights', 'hotels', 'transportation', 'restaurants', 'itinerary', 'checklist']

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      const stats = { creates: 0, updates: 0, deletes: 0 }

      for (const section of sections) {
        await pushSection({
          section,
          tripId,
          calendarId: trip.gcal_calendar_id,
          accessToken,
          supabase,
          onEvent: (event) => {
            if (event.action === 'create') stats.creates++
            if (event.action === 'update') stats.updates++
            if (event.action === 'delete') stats.deletes++
            send({ type: 'progress', ...event })
            send({ type: 'stats', ...stats })
          },
        })
      }

      await supabase
        .from('trips')
        .update({ gcal_last_synced_at: new Date().toISOString() })
        .eq('id', tripId)

      send({ type: 'complete', syncedAt: new Date().toISOString() })
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
