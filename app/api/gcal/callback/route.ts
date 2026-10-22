import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForTokens } from '@/lib/gcal/auth'
import {
  getRequestUserId,
  gcalServiceClient,
  parseOAuthState,
  OAUTH_STATE_COOKIE,
  OAUTH_STATE_COOKIE_OPTIONS,
} from '@/lib/gcal/request-user'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const { nonce, tripId } = parseOAuthState(searchParams.get('state') ?? '')
  const expectedNonce = request.cookies.get(OAUTH_STATE_COOKIE)?.value
  const base = new URL(process.env.GOOGLE_REDIRECT_URI!).origin

  // The nonce is single-use: clear it on every outcome.
  const redirect = (url: string) => {
    const response = NextResponse.redirect(url)
    response.cookies.set(OAUTH_STATE_COOKIE, '', { ...OAUTH_STATE_COOKIE_OPTIONS, maxAge: 0 })
    return response
  }

  if (error || !code) {
    return redirect(`${base}/?gcal_error=${encodeURIComponent(error ?? 'missing_code')}`)
  }

  if (!expectedNonce || !nonce || nonce !== expectedNonce) {
    return redirect(`${base}/?gcal_error=state_mismatch`)
  }

  try {
    const userId = await getRequestUserId()
    if (!userId) return redirect(`${base}/?gcal_error=not_signed_in`)

    const tokens = await exchangeCodeForTokens(code)
    const supabase = gcalServiceClient()
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)

    const { error: upsertError } = await supabase
      .from('google_oauth_tokens')
      .upsert({
        user_id: userId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

    if (upsertError) throw new Error(`Token storage failed: ${upsertError.message}`)

    return redirect(
      tripId
        ? `${base}/advisor/trips/${tripId}?gcal_connected=true`
        : `${base}/?gcal_connected=true`
    )
  } catch (err) {
    console.error('GCal callback error:', err)
    return redirect(`${base}/?gcal_error=callback_failed`)
  }
}
