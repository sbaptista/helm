import { createClient } from '@supabase/supabase-js';
import ItineraryClient from './ItineraryClient';

export async function ItinerarySection({ tripId }: { tripId: string }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );

  const [{ data: days }, { data: rows }] = await Promise.all([
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
  ]);

  return (
    <ItineraryClient 
      tripId={tripId} 
      initialDays={days ?? []} 
      initialRows={rows ?? []} 
    />
  );
}

