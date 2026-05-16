import { createClient } from '@supabase/supabase-js';
import { OverviewClient } from '@/components/trips/overview/OverviewClient';

interface OverviewSectionProps {
  tripId: string;
  trip: { title: string; departure_date: string | null; return_date: string | null };
  sectionCounts?: {
    flights: number;
    hotels: number;
    transportation: number;
    restaurants: number;
    packing: number;
    checklist: number;
  };
}

export async function OverviewSection({ tripId, trip, sectionCounts }: OverviewSectionProps) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
  );

  const [
    checklistOpenCount,
    checklistTotalCount,
    checklistAttentionResult,
    itineraryAttentionResult,
    keyInfoAttentionResult,
    daysResult,
    rowsResult,
    keyInfoFlaggedResult,
    ...countResults
  ] = await Promise.all([
    supabase.from('checklist').select('*', { count: 'exact', head: true }).eq('trip_id', tripId).eq('status', 'open'),
    sectionCounts
      ? { count: sectionCounts.checklist }
      : supabase.from('checklist').select('*', { count: 'exact', head: true }).eq('trip_id', tripId),
    supabase.from('checklist').select('id, task, action_note').eq('trip_id', tripId).eq('action_required', true).neq('status', 'completed').order('sort_order'),
    supabase.from('itinerary_rows').select('id, title, action_note').eq('trip_id', tripId).eq('action_required', true).is('deleted_at', null).order('sort_order'),
    supabase.from('key_info').select('id, label, action_note').eq('trip_id', tripId).eq('action_required', true).is('deleted_at', null).order('sort_order'),
    supabase.from('itinerary_days').select('id, day_date, day_number, title, location, type').eq('trip_id', tripId).is('deleted_at', null).order('day_date', { ascending: true, nullsFirst: false }).order('day_number', { ascending: true }),
    supabase.from('itinerary_rows').select('id, day_id').eq('trip_id', tripId).is('deleted_at', null),
    supabase.from('key_info').select('id, label, value, url, url_label').eq('trip_id', tripId).eq('show_in_overview', true).order('sort_order'),
    ...(sectionCounts ? [] : [
      supabase.from('flights').select('*', { count: 'exact', head: true }).eq('trip_id', tripId).is('deleted_at', null),
      supabase.from('hotels').select('*', { count: 'exact', head: true }).eq('trip_id', tripId).is('deleted_at', null),
      supabase.from('transportation').select('*', { count: 'exact', head: true }).eq('trip_id', tripId).is('deleted_at', null),
      supabase.from('restaurants').select('*', { count: 'exact', head: true }).eq('trip_id', tripId).is('deleted_at', null),
      supabase.from('packing').select('*', { count: 'exact', head: true }).eq('trip_id', tripId),
    ]),
  ]);

  const counts = sectionCounts
    ? sectionCounts
    : {
        flights: countResults[0]?.count ?? 0,
        hotels: countResults[1]?.count ?? 0,
        transportation: countResults[2]?.count ?? 0,
        restaurants: countResults[3]?.count ?? 0,
        packing: countResults[4]?.count ?? 0,
        checklist: 0,
      };

  // Build row_count map
  const rowCountMap = new Map<string, number>();
  for (const row of (rowsResult.data ?? [])) {
    rowCountMap.set(row.day_id, (rowCountMap.get(row.day_id) ?? 0) + 1);
  }

  const timeline = (daysResult.data ?? []).map((day) => ({
    id: day.id as string,
    day_date: day.day_date as string | null,
    day_number: day.day_number as number,
    title: day.title as string | null,
    location: day.location as string | null,
    type: day.type as string | null,
    row_count: rowCountMap.get(day.id) ?? 0,
  }));

  // Build unified attention required array
  const attentionRequired = [
    ...(checklistAttentionResult.data ?? []).map((item) => ({
      id: item.id as string,
      source: 'Checklist' as const,
      label: item.task as string,
      action_note: item.action_note as string | null,
    })),
    ...(itineraryAttentionResult.data ?? []).map((item) => ({
      id: item.id as string,
      source: 'Itinerary' as const,
      label: item.title as string,
      action_note: item.action_note as string | null,
    })),
    ...(keyInfoAttentionResult.data ?? []).map((item) => ({
      id: item.id as string,
      source: 'Key Info' as const,
      label: item.label as string,
      action_note: item.action_note as string | null,
    })),
  ];

  return (
    <OverviewClient
      tripId={tripId}
      trip={trip}
      counts={{
        flights: counts.flights,
        hotels: counts.hotels,
        transportation: counts.transportation,
        restaurants: counts.restaurants,
        packing: counts.packing,
        checklist_open: checklistOpenCount.count ?? 0,
        checklist_total: checklistTotalCount.count ?? 0,
      }}
      attentionRequired={attentionRequired}
      timeline={timeline}
      keyInfoFlagged={(keyInfoFlaggedResult.data ?? []).map((item) => ({
        id: item.id,
        label: item.label,
        value: item.value,
        url: item.url,
        url_label: item.url_label,
      }))}
    />
  );
}
