import { NextRequest, NextResponse } from 'next/server'
import { buildAuthUrl } from '@/lib/gcal/auth'
import {
  getRequestUserId,
  gcalServiceClient,
  unauthorized,
  buildOAuthState,
  OAUTH_STATE_COOKIE,
  OAUTH_STATE_COOKIE_OPTIONS,
} from '@/lib/gcal/request-user'

export async function GET(request: NextRequest) {
  const userId = await getRequestUserId()
  if (!userId) return NextResponse.redirect(new URL('/auth/login', request.url))

  const tripId = request.nextUrl.searchParams.get('tripId') ?? ''
  const nonce = crypto.randomUUID()
  const response = NextResponse.redirect(buildAuthUrl(buildOAuthState(nonce, tripId)))
  response.cookies.set(OAUTH_STATE_COOKIE, nonce, OAUTH_STATE_COOKIE_OPTIONS)
  return response
}

export async function DELETE() {
  try {
    const userId = await getRequestUserId()
    if (!userId) return unauthorized()
    const supabase = gcalServiceClient()
    const { error } = await supabase
      .from('google_oauth_tokens')
      .delete()
      .eq('user_id', userId)
    if (error) throw new Error(`Token removal failed: ${error.message}`)
    return NextResponse.json({ disconnected: true })
  } catch (err) {
    console.error('GCal disconnect error:', err)
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 })
  }
}
