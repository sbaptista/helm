import { createClient } from '@supabase/supabase-js';
import { TransportationClient } from './TransportationClient';
import type { Transportation } from './TransportationClient';

export async function TransportationSection({ tripId }: { tripId: string }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );

  const { data: transportations } = await supabase
    .from('transportation')
    .select('id, trip_id, type, provider, origin, destination, departure_time, arrival_time, confirmation_number, notes, sort_order, included, action_required, phone, website_url, cost')
    .eq('trip_id', tripId)
    .is('deleted_at', null)
    .order('departure_time', { ascending: true });

  return (
    <TransportationClient
      tripId={tripId}
      initialTransportations={(transportations ?? []) as Transportation[]}
    />
  );
}
