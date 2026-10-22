import { NextRequest } from 'next/server'
import { getValidAccessToken } from '@/lib/gcal/token'
import { pushSection } from '../../_shared/pushSection'
import { getRequestUserId, gcalServiceClient, isTripMember, unauthorized, forbidden } from '@/lib/gcal/request-user'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ section: string; tripId: string }> }
) {
  const { section, tripId } = await params
  const userId = await getRequestUserId()
  if (!userId) return unauthorized()
  const supabase = gcalServiceClient()
  if (!(await isTripMember(supabase, tripId, userId))) return forbidden()
  const accessToken = await getValidAccessToken(supabase, userId)

  const { data: trip } = await supabase
    .from('trips')
    .select('gcal_calendar_id')
    .eq('id', tripId)
    .single()

  if (!trip?.gcal_calendar_id) {
    return new Response('No calendar for trip', { status: 404 })
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      const stats = { creates: 0, updates: 0, deletes: 0 }

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
