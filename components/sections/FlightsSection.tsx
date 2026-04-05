import { createClient } from '@supabase/supabase-js';
import { FlightsClient } from './FlightsClient';
import type { Flight } from './FlightsClient';

export async function FlightsSection({ tripId }: { tripId: string }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );

  const { data: flights } = await supabase
    .from('flights')
    .select('id, flight_number, airline, origin_airport, destination_airport, departure_time, arrival_time, cabin_class, confirmation_number, notes')
    .eq('trip_id', tripId)
    .is('deleted_at', null)
    .order('departure_time');

  return (
    <FlightsClient
      tripId={tripId}
      initialFlights={(flights ?? []) as Flight[]}
    />
  );
}
