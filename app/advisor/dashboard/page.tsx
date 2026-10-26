export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getDataClient } from '@/lib/supabase/data-client';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { tripRangeFromDays } from '@/lib/trip-range';
import { DashboardView } from '@/components/advisor/DashboardView';
import type { Trip, TripStatus } from '@/types/trips';

async function fetchTrips(userId: string): Promise<Trip[]> {
  const supabase = await getDataClient();

  // Get all trip_ids where this user is an advisor
  const { data: memberRows, error: memberError } = await supabase
    .from('trip_members')
    .select('trip_id')
    .eq('user_id', userId)
    .eq('role', 'advisor');

  if (memberError || !memberRows || memberRows.length === 0) return [];

  const tripIds = memberRows.map((r) => r.trip_id as string);

  // Fetch trip details
  const { data: tripRows, error: tripsError } = await supabase
    .from('trips')
    .select('id, title, destination, status, created_at')
    .in('id', tripIds)
    .order('created_at', { ascending: false });

  if (tripsError || !tripRows) return [];

  // Fetch traveler member counts for each trip
  const { data: travelerRows } = await supabase
    .from('trip_members')
    .select('trip_id')
    .in('trip_id', tripIds)
    .eq('role', 'traveler');

  // Trip dates come from itinerary days. Read with the service client: tripIds
  // are already limited to trips this user advises.
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
  );
  const { data: dayRows } = await serviceClient
    .from('itinerary_days')
    .select('trip_id, day_date')
    .in('trip_id', tripIds)
    .is('deleted_at', null)
    .not('day_date', 'is', null);
  const daysByTrip: Record<string, Array<{ day_date: string | null }>> = {};
  dayRows?.forEach((d) => {
    (daysByTrip[d.trip_id as string] ??= []).push({ day_date: d.day_date as string });
  });

  // Count travelers per trip
  const travelerCounts: Record<string, number> = {};
  travelerRows?.forEach((r) => {
    const id = r.trip_id as string;
    travelerCounts[id] = (travelerCounts[id] ?? 0) + 1;
  });

  return tripRows.map((t) => ({
    id:             t.id as string,
    title:          t.title as string,
    destination:    t.destination as string,
    ...tripRangeFromDays(daysByTrip[t.id as string] ?? []),
    status:         t.status as TripStatus,
    created_at:     t.created_at as string,
    traveler_count: travelerCounts[t.id as string] ?? 0,
  }));
}

export default async function AdvisorDashboardPage() {
  const supabase = await getDataClient();

  const bypassId = process.env.BYPASS_AUTH_USER_ID;
  const user = bypassId
    ? { id: bypassId, email: '' }
    : (await supabase.auth.getUser()).data.user;
  if (!user) redirect('/auth/login');

  let trips: Trip[] = [];
  let fetchError: string | null = null;

  try {
    trips = await fetchTrips(user.id);
  } catch {
    fetchError = 'Unable to load trips. Please refresh the page.';
  }

  return (
    <DashboardView
      trips={trips}
      userEmail={user.email ?? ''}
      fetchError={fetchError}
      showSignOut={true}
    />
  );
}
