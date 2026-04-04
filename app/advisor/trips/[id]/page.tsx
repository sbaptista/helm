import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { TripDetailView } from '@/components/advisor/TripDetailView';
import { ItinerarySection }      from '@/components/sections/ItinerarySection';
import { FlightsSection }        from '@/components/sections/FlightsSection';
import { HotelsSection }         from '@/components/sections/HotelsSection';
import { TransportationSection } from '@/components/sections/TransportationSection';
import { RestaurantsSection }    from '@/components/sections/RestaurantsSection';
import { ChecklistSection }      from '@/components/sections/ChecklistSection';
import { PackingSection }        from '@/components/sections/PackingSection';
import { KeyInfoSection }        from '@/components/sections/KeyInfoSection';
import type { Trip, TripStatus } from '@/types/trips';

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/auth/login');
  }

  const { data: row } = await supabase
    .from('trips')
    .select('id, title, destination, departure_date, return_date, status, created_at')
    .eq('id', id)
    .single();

  const { data: importJob } = await supabase
    .from('import_jobs')
    .select('id')
    .eq('trip_id', id)
    .eq('status', 'completed')
    .maybeSingle();

  if (!row) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg)',
          fontFamily: "'Lato', sans-serif",
          color: 'var(--text3)',
          fontSize: '15px',
        }}
      >
        Trip not found.
      </div>
    );
  }

  const trip: Trip = {
    id:             row.id as string,
    title:          row.title as string,
    destination:    row.destination as string,
    departure_date: row.departure_date as string,
    return_date:    row.return_date as string,
    status:         row.status as TripStatus,
    created_at:     row.created_at as string,
    traveler_count: 0,
  };

  return (
    <TripDetailView
      trip={trip}
      hasImport={!!importJob}
      itineraryContent={<ItinerarySection      tripId={id} />}
      flightsContent={<FlightsSection          tripId={id} />}
      hotelsContent={<HotelsSection            tripId={id} />}
      transportationContent={<TransportationSection tripId={id} />}
      restaurantsContent={<RestaurantsSection  tripId={id} />}
      checklistContent={<ChecklistSection      tripId={id} />}
      packingContent={<PackingSection          tripId={id} />}
      keyInfoContent={<KeyInfoSection          tripId={id} />}
    />
  );
}
