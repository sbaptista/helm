import { NextRequest, NextResponse } from 'next/server'
import { getDataClient } from '@/lib/supabase/data-client'
import { exchangeCodeForTokens } from '@/lib/gcal/auth'

function getAuthUserId(): string {
  if (process.env.BYPASS_AUTH_USER_ID) return process.env.BYPASS_AUTH_USER_ID
  throw new Error('No auth user — bypass not active and session auth not implemented here yet')
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const tripId = searchParams.get('state') ?? ''
  const base = new URL(process.env.GOOGLE_REDIRECT_URI!).origin

  if (error || !code) {
    return NextResponse.redirect(
      `${base}/?gcal_error=${error ?? 'missing_code'}`
    )
  }

  try {
    const tokens = await exchangeCodeForTokens(code)
    const userId = getAuthUserId()
    const supabase = await getDataClient()
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

    return NextResponse.redirect(
      tripId
        ? `${base}/advisor/trips/${tripId}?gcal_connected=true`
        : `${base}/?gcal_connected=true`
    )
  } catch (err) {
    console.error('GCal callback error:', err)
    return NextResponse.redirect(`${base}/?gcal_error=callback_failed`)
  }
}
