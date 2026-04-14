import { createClient } from '@supabase/supabase-js';
import { createClient as createAuthClient } from '@/lib/supabase/server';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('Supabase credentials not configured.');
  return createClient(url, key);
}

// ─── GET /api/trips/[id]/overview ────────────────────────────────────────────

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;

  // Auth
  const authClient = await createAuthClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized.' }, { status: 401 });

  let supabase;
  try { supabase = getServiceClient(); } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }

  // Validate trip access
  const { data: member } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!member) return Response.json({ error: 'Access denied.' }, { status: 403 });

  // Trip record
  const { data: trip } = await supabase
    .from('trips')
    .select('id, title, departure_date, return_date')
    .eq('id', id)
    .single();

  if (!trip) return Response.json({ error: 'Trip not found.' }, { status: 404 });

  // Counts (parallel)
  const [
    flightsCount,
    hotelsCount,
    transportationCount,
    restaurantsCount,
    packingCount,
    checklistOpenCount,
    checklistTotalCount,
    urgentResult,
    daysResult,
    rowsResult,
    keyInfoResult,
  ] = await Promise.all([
    supabase.from('flights').select('*', { count: 'exact', head: true }).eq('trip_id', id).is('deleted_at', null),
    supabase.from('hotels').select('*', { count: 'exact', head: true }).eq('trip_id', id).is('deleted_at', null),
    supabase.from('transportation').select('*', { count: 'exact', head: true }).eq('trip_id', id).is('deleted_at', null),
    supabase.from('restaurants').select('*', { count: 'exact', head: true }).eq('trip_id', id).is('deleted_at', null),
    supabase.from('packing').select('*', { count: 'exact', head: true }).eq('trip_id', id),
    supabase.from('checklist').select('*', { count: 'exact', head: true }).eq('trip_id', id).eq('status', 'open'),
    supabase.from('checklist').select('*', { count: 'exact', head: true }).eq('trip_id', id),
    supabase.from('checklist').select('id, task, group_name').eq('trip_id', id).eq('action_required', true).neq('status', 'completed').order('sort_order'),
    supabase.from('itinerary_days').select('id, day_date, day_number, title, location, type').eq('trip_id', id).is('deleted_at', null).order('day_date', { ascending: true, nullsFirst: false }).order('day_number', { ascending: true }),
    supabase.from('itinerary_rows').select('id, day_id').eq('trip_id', id).is('deleted_at', null),
    supabase.from('key_info').select('id, label, value, url, url_label').eq('trip_id', id).eq('show_in_overview', true).order('sort_order'),
  ]);

  // Build row_count map
  const rowCountMap = new Map<string, number>();
  for (const row of (rowsResult.data ?? [])) {
    const dayId = row.day_id as string;
    rowCountMap.set(dayId, (rowCountMap.get(dayId) ?? 0) + 1);
  }

  const timeline = (daysResult.data ?? []).map((day) => ({
    id: day.id as string,
    day_date: day.day_date as string | null,
    day_number: day.day_number as number,
    title: day.title as string | null,
    location: day.location as string | null,
    type: day.type as string | null,
    row_count: rowCountMap.get(day.id as string) ?? 0,
  }));

  return Response.json({
    trip: {
      id: trip.id,
      title: trip.title,
      departure_date: trip.departure_date,
      return_date: trip.return_date,
    },
    counts: {
      flights: flightsCount.count ?? 0,
      hotels: hotelsCount.count ?? 0,
      transportation: transportationCount.count ?? 0,
      restaurants: restaurantsCount.count ?? 0,
      packing: packingCount.count ?? 0,
      checklist_open: checklistOpenCount.count ?? 0,
      checklist_total: checklistTotalCount.count ?? 0,
    },
    urgent_checklist: (urgentResult.data ?? []).map((item) => ({
      id: item.id,
      task: item.task,
      group_name: item.group_name,
    })),
    timeline,
    key_info_flagged: (keyInfoResult.data ?? []).map((item) => ({
      id: item.id,
      label: item.label,
      value: item.value,
      url: item.url,
      url_label: item.url_label,
    })),
  });
}
