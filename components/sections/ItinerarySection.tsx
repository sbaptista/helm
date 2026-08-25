import { createClient } from '@supabase/supabase-js';
import ItineraryClient from './ItineraryClient';
import { loadLinkedItineraryEntries } from '@/lib/itinerary/linked-entries';

export async function ItinerarySection({ tripId }: { tripId: string }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );

  const [{ data: days }, { data: rows }, { data: trip }, linkedEntries] = await Promise.all([
    supabase
      .from('itinerary_days')
      .select('*')
      .eq('trip_id', tripId)
      .is('deleted_at', null)
      .order('sort_order'),
    supabase
      .from('itinerary_rows')
      .select('*')
      .eq('trip_id', tripId)
      .is('deleted_at', null)
      .order('sort_order'),
    supabase
      .from('trips')
      .select('departure_date, return_date')
      .eq('id', tripId)
      .single(),
    loadLinkedItineraryEntries(supabase, tripId),
  ]);

  return (
    <ItineraryClient
      tripId={tripId}
      initialDays={days ?? []}
      initialRows={rows ?? []}
      initialLinkedEntries={linkedEntries}
      tripStartDate={trip?.departure_date ?? ''}
      tripEndDate={trip?.return_date ?? ''}
    />
  );
}
