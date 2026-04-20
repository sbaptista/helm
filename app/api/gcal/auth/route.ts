import { NextRequest, NextResponse } from 'next/server'
import { buildAuthUrl } from '@/lib/gcal/auth'
import { getDataClient } from '@/lib/supabase/data-client'

function getAuthUserId(): string {
  if (process.env.BYPASS_AUTH_USER_ID) return process.env.BYPASS_AUTH_USER_ID
  throw new Error('Not authenticated')
}

export async function GET(request: NextRequest) {
  const tripId = new URL(request.url).searchParams.get('tripId') ?? ''
  const url = buildAuthUrl(tripId)
  return NextResponse.redirect(url)
}

export async function DELETE() {
  try {
    const userId = getAuthUserId()
    const supabase = await getDataClient()
    await supabase
      .from('google_oauth_tokens')
      .delete()
      .eq('user_id', userId)
    return NextResponse.json({ disconnected: true })
  } catch (err) {
    console.error('GCal disconnect error:', err)
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 })
  }
}
