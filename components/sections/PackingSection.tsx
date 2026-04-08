import { createClient } from '@supabase/supabase-js'
import PackingClient from './PackingClient'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  )
}

interface Props {
  tripId: string
}

export default async function PackingSection({ tripId }: Props) {
  const supabase = serviceClient()

  const [
    { data: items },
    { data: groups },
    { data: subgroups },
  ] = await Promise.all([
    supabase.from('packing').select('*').eq('trip_id', tripId).is('deleted_at', null).order('sort_order'),
    supabase.from('packing_groups').select('*').eq('trip_id', tripId).is('deleted_at', null).order('sort_order'),
    supabase.from('packing_subgroups').select('*').eq('trip_id', tripId).is('deleted_at', null).order('sort_order'),
  ])

  return (
    <PackingClient
      initialItems={items ?? []}
      initialGroups={groups ?? []}
      initialSubgroups={subgroups ?? []}
      tripId={tripId}
    />
  )
}
