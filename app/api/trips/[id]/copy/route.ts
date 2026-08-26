import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

interface CopyTripBody {
  title?: unknown
  destination?: unknown
  departure_date?: unknown
  return_date?: unknown
}

function requiredString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function isISODate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
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
  let body: CopyTripBody
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const title = requiredString(body.title)
  const destination = requiredString(body.destination)
  const departureDate = requiredString(body.departure_date)
  const returnDate = requiredString(body.return_date)

  if (!title) return Response.json({ error: 'Trip name is required.' }, { status: 400 })
  if (!destination) return Response.json({ error: 'Destination is required.' }, { status: 400 })
  if (!departureDate || !isISODate(departureDate)) {
    return Response.json({ error: 'A valid departure date is required.' }, { status: 400 })
  }
  if (!returnDate || !isISODate(returnDate)) {
    return Response.json({ error: 'A valid return date is required.' }, { status: 400 })
  }
  if (returnDate <= departureDate) {
    return Response.json({ error: 'Return date must be after departure date.' }, { status: 400 })
  }

  const userId = await getAuthenticatedUserId()
  if (!userId) return Response.json({ error: 'Unauthorized.' }, { status: 401 })

  let supabase
  try {
    supabase = getServiceClient()
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Unable to connect to Helm data.' }, { status: 500 })
  }

  const { data: membership } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', sourceTripId)
    .eq('user_id', userId)
    .eq('role', 'advisor')
    .maybeSingle()

  if (!membership) return Response.json({ error: 'Advisor access required.' }, { status: 403 })

  const { data: newTripId, error: copyError } = await supabase.rpc('copy_trip', {
    p_source_trip_id: sourceTripId,
    p_created_by: userId,
    p_title: title,
    p_destination: destination,
    p_departure_date: departureDate,
    p_return_date: returnDate,
  })

  if (copyError || !newTripId) {
    await logger.error('api/trips/copy', 'Unable to copy trip', {
      error: copyError?.message ?? 'Copy function returned no trip ID',
      sourceTripId,
      userId,
    }, sourceTripId)
    const migrationMissing = copyError?.code === 'PGRST202' || copyError?.message.includes('copy_trip')
    return Response.json(
      { error: migrationMissing ? 'Copy Trip database setup is not yet applied.' : 'Unable to copy trip.' },
      { status: migrationMissing ? 503 : 500 },
    )
  }

  const { data: trip } = await supabase
    .from('trips')
    .select('id, title, destination, departure_date, return_date, status, created_at')
    .eq('id', newTripId)
    .single()

  return Response.json({ trip: trip ?? { id: newTripId } }, { status: 201 })
}
