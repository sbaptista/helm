import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getDataClient } from '@/lib/supabase/data-client';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { TripDetailView } from '@/components/advisor/TripDetailView';
import { OverviewSection }       from '@/components/sections/OverviewSection';
import { ItinerarySection }      from '@/components/sections/ItinerarySection';
import { FlightsSection }        from '@/components/sections/FlightsSection';
import { HotelsSection }         from '@/components/sections/HotelsSection';
import { TransportationSection } from '@/components/sections/TransportationSection';
import { RestaurantsSection }    from '@/components/sections/RestaurantsSection';
import { ChecklistSection }      from '@/components/sections/ChecklistSection';
import { PackingSection }        from '@/components/sections/PackingSection';
import { KeyInfoSection }        from '@/components/sections/KeyInfoSection';
import type { Trip, TripStatus } from '@/types/trips';

function SectionSkeleton() {
  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} style={{ height: 64, borderRadius: 8, background: 'var(--border)', opacity: 0.4 - i * 0.1 }} />
      ))}
    </div>
  );
}

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await getDataClient();

  const BYPASS = process.env.BYPASS_AUTH_USER_ID
  const user = BYPASS
    ? { id: BYPASS }
    : (await supabase.auth.getUser()).data.user
  if (!user) redirect('/auth/login');

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

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
  );

  const sectionChecks = await Promise.all([
    serviceClient.from('flights').select('id', { count: 'exact', head: true }).eq('trip_id', id).is('deleted_at', null),
    serviceClient.from('hotels').select('id', { count: 'exact', head: true }).eq('trip_id', id).is('deleted_at', null),
    serviceClient.from('transportation').select('id', { count: 'exact', head: true }).eq('trip_id', id).is('deleted_at', null),
    serviceClient.from('restaurants').select('id', { count: 'exact', head: true }).eq('trip_id', id).is('deleted_at', null),
    serviceClient.from('itinerary_rows').select('id', { count: 'exact', head: true }).eq('trip_id', id).is('deleted_at', null),
    serviceClient.from('checklist').select('id', { count: 'exact', head: true }).eq('trip_id', id).is('deleted_at', null),
    serviceClient.from('packing').select('id', { count: 'exact', head: true }).eq('trip_id', id),
    serviceClient.from('key_info').select('id, label, value').eq('trip_id', id),
    serviceClient.from('itinerary_days').select('id, day_number, day_date, title').eq('trip_id', id).is('deleted_at', null).order('day_number'),
  ]);

  const days = sectionChecks[8].data ?? [];

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
      hasSectionData={sectionChecks.some((r) => (r.count ?? 0) > 0)}
      overviewContent={<OverviewSection tripId={id} trip={{ title: trip.title, departure_date: trip.departure_date, return_date: trip.return_date }} sectionCounts={{
        flights: sectionChecks[0].count ?? 0,
        hotels: sectionChecks[1].count ?? 0,
        transportation: sectionChecks[2].count ?? 0,
        restaurants: sectionChecks[3].count ?? 0,
        packing: sectionChecks[6].count ?? 0,
        checklist: sectionChecks[5].count ?? 0,
      }} />}
      itineraryContent={<Suspense fallback={<SectionSkeleton />}><ItinerarySection      tripId={id} /></Suspense>}
      flightsContent={<Suspense fallback={<SectionSkeleton />}><FlightsSection          tripId={id} /></Suspense>}
      hotelsContent={<Suspense fallback={<SectionSkeleton />}><HotelsSection            tripId={id} /></Suspense>}
      transportationContent={<Suspense fallback={<SectionSkeleton />}><TransportationSection tripId={id} /></Suspense>}
      restaurantsContent={<Suspense fallback={<SectionSkeleton />}><RestaurantsSection  tripId={id} /></Suspense>}
      checklistContent={<Suspense fallback={<SectionSkeleton />}><ChecklistSection      tripId={id} /></Suspense>}
      packingContent={<Suspense fallback={<SectionSkeleton />}><PackingSection          tripId={id} /></Suspense>}
      keyInfoContent={<Suspense fallback={<SectionSkeleton />}><KeyInfoSection          tripId={id} /></Suspense>}
      days={days}
    />
  );
}
