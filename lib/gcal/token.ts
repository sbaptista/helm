import { getDataClient } from '@/lib/supabase/data-client'
import { refreshAccessToken } from './auth'

export async function getValidAccessToken(userId: string): Promise<string> {
  const supabase = await getDataClient()

  const { data, error } = await supabase
    .from('google_oauth_tokens')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error || !data) throw new Error('No Google OAuth token found for user')

  const expiresAt = new Date(data.expires_at)
  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000)

  if (expiresAt > fiveMinutesFromNow) {
    return data.access_token
  }

  // Token expired or expiring soon — refresh
  const refreshed = await refreshAccessToken(data.refresh_token)
  const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000)

  await supabase
    .from('google_oauth_tokens')
    .update({
      access_token: refreshed.access_token,
      expires_at: newExpiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  return refreshed.access_token
}
