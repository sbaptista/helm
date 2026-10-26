import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

interface CreateTripBody {
  title?: unknown
  destination?: unknown
  description?: unknown
}

function requiredString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function optionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
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

export async function POST(request: Request): Promise<Response> {
  let body: CreateTripBody
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const title = requiredString(body.title)
  const destination = requiredString(body.destination)
  const description = optionalString(body.description)

  if (!title) return Response.json({ error: 'Trip name is required.' }, { status: 400 })
  if (!destination) return Response.json({ error: 'Destination is required.' }, { status: 400 })

  const userId = await getAuthenticatedUserId()
  if (!userId) return Response.json({ error: 'Unauthorized.' }, { status: 401 })

  let supabase
  try {
    supabase = getServiceClient()
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Unable to connect to Helm data.' }, { status: 500 })
  }

  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .insert({
      title,
      destination,
      description,
      status: 'draft',
      created_by: userId,
    })
    .select('id, title, destination, status, created_at')
    .single()

  if (tripError || !trip) {
    await logger.error('api/trips', 'Unable to create trip', {
      error: tripError?.message ?? 'Trip insert returned no row',
      userId,
    })
    return Response.json({ error: 'Unable to create trip.' }, { status: 500 })
  }

  const { error: memberError } = await supabase.from('trip_members').insert({
    trip_id: trip.id,
    user_id: userId,
    role: 'advisor',
  })

  if (memberError) {
    const { error: cleanupError } = await supabase.from('trips').delete().eq('id', trip.id)
    await logger.error('api/trips', 'Unable to create advisor membership for new trip', {
      error: memberError.message,
      cleanupError: cleanupError?.message ?? null,
      tripId: trip.id,
      userId,
    })
    return Response.json({ error: 'Unable to finish creating trip.' }, { status: 500 })
  }

  return Response.json({ trip }, { status: 201 })
}
