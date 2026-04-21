import { createClient } from '@supabase/supabase-js'
import { RestaurantsClient } from './RestaurantsClient'

export async function RestaurantsSection({ tripId }: { tripId: string }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  )

  const { data: restaurants } = await supabase
    .from('restaurants')
    .select(
      'id, trip_id, name, cuisine, city, address, reservation_time, party_size, style, confirmation_number, phone, website_url, notes, included, action_required, gcal_include'
    )
    .eq('trip_id', tripId)
    .is('deleted_at', null)
    .order('reservation_time')

  return (
    <RestaurantsClient
      tripId={tripId}
      initialRestaurants={restaurants ?? []}
    />
  )
}
