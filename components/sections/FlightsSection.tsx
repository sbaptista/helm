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
    .select('id, flight_number, airline, origin_airport, destination_airport, origin_city, destination_city, departure_time, arrival_time, departure_timezone, arrival_timezone, cabin_class, seat_number, confirmation_number, departure_terminal, departure_gate, arrival_terminal, arrival_gate, notes, gcal_include, action_required')
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
