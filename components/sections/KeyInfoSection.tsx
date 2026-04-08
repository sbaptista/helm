import { createClient } from '@supabase/supabase-js'
import { KeyInfoClient } from './KeyInfoClient'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  )
}

interface Props {
  tripId: string
}

export async function KeyInfoSection({ tripId }: Props) {
  const supabase = serviceClient()

  const [
    { data: items },
    { data: groups },
  ] = await Promise.all([
    supabase.from('key_info').select('*').eq('trip_id', tripId).is('deleted_at', null).order('sort_order'),
    supabase.from('key_info_groups').select('*').eq('trip_id', tripId).is('deleted_at', null).order('sort_order'),
  ])

  return (
    <KeyInfoClient
      initialItems={items ?? []}
      initialGroups={groups ?? []}
      tripId={tripId}
    />
  )
}
