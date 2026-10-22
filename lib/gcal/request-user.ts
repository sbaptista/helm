import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createClient as createSessionClient } from '@/lib/supabase/server'

// Bypass first (unchanged behaviour wherever it is set), then the signed-in session.
export async function getRequestUserId(): Promise<string | null> {
  if (process.env.BYPASS_AUTH_USER_ID) return process.env.BYPASS_AUTH_USER_ID
  const supabase = await createSessionClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

// Service client for Calendar data. Callers authenticate the user first and
// scope every query by that user or by a trip they are a member of.
export function gcalServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY
  if (!url || !key) throw new Error('Supabase credentials not configured.')
  return createClient(url, key)
}

export async function isTripMember(supabase: SupabaseClient, tripId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', tripId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new Error(`Trip membership check failed: ${error.message}`)
  return !!data
}

export const unauthorized = () => Response.json({ error: 'Sign in to use Google Calendar.' }, { status: 401 })
export const forbidden = () => Response.json({ error: 'You do not have access to this trip.' }, { status: 403 })

// OAuth state: a one-time nonce, bound to the browser by an httpOnly cookie,
// plus the trip to return to. Stops a callback started by someone else from
// attaching their Google account to the signed-in Helm user.
export const OAUTH_STATE_COOKIE = 'gcal_oauth_state'
export const OAUTH_STATE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax' as const,
  path: '/api/gcal',
  maxAge: 10 * 60,
}

const TRIP_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function buildOAuthState(nonce: string, tripId: string): string {
  return TRIP_ID_PATTERN.test(tripId) ? `${nonce}.${tripId}` : nonce
}

export function parseOAuthState(state: string): { nonce: string; tripId: string } {
  const dot = state.indexOf('.')
  const nonce = dot === -1 ? state : state.slice(0, dot)
  const tripId = dot === -1 ? '' : state.slice(dot + 1)
  return { nonce, tripId: TRIP_ID_PATTERN.test(tripId) ? tripId : '' }
}
