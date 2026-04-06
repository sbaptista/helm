// components/sections/HotelsSection.tsx

import { createClient } from '@supabase/supabase-js'
import HotelsClient from './HotelsClient'

function serverClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  )
}

export default async function HotelsSection({ tripId }: { tripId: string }) {
  const supabase = serverClient()

  const [hotelsResult, diningResult] = await Promise.all([
    supabase
      .from('hotels')
      .select('*')
      .eq('trip_id', tripId)
      .is('deleted_at', null)
      .order('check_in_date', { ascending: true })
      .order('sort_order', { ascending: true }),
    supabase
      .from('nearby_dining')
      .select('*')
      .eq('trip_id', tripId)
      .order('sort_order', { ascending: true }),
  ])

  return (
    <HotelsClient
      tripId={tripId}
      initialHotels={hotelsResult.data ?? []}
      nearbyDining={diningResult.data ?? []}
    />
  )
}
