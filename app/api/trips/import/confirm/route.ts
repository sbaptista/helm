import { createClient } from '@supabase/supabase-js';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ImportResult {
  itinerary_days:   Record<string, unknown>[];
  itinerary_rows:   Record<string, unknown>[];
  flights:          Record<string, unknown>[];
  hotels:           Record<string, unknown>[];
  transportation:   Record<string, unknown>[];
  restaurants:      Record<string, unknown>[];
  checklist_items:  Record<string, unknown>[];
  packing_items:    Record<string, unknown>[];
  key_info:         Record<string, unknown>[];
  unmapped:         string[];
  flags:            unknown[];
}

interface ConfirmBody {
  tripId:           string;
  result:           ImportResult;
  flagResolutions:  unknown;
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  let body: ConfirmBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { tripId, result, flagResolutions } = body;

  if (!tripId || typeof tripId !== 'string') {
    return Response.json({ error: 'tripId is required.' }, { status: 400 });
  }
  if (!result || typeof result !== 'object') {
    return Response.json({ error: 'result is required.' }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !serviceKey) {
    return Response.json({ error: 'Supabase credentials not configured.' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const counts: Record<string, number> = {};

  // ── itinerary_days ───────────────────────────────────────────────────────────
  // Insert days first and capture returned IDs so itinerary_rows can reference
  // day_id (the real FK) rather than day_number.
  const dayNumberToId: Record<number, string> = {};

  if (result.itinerary_days?.length) {
    const dayRows = result.itinerary_days.map((day, i) => ({
      trip_id:    tripId,
      day_number: (day.day_number as number) ?? i + 1,
      date:       (day.date as string)       ?? null,
      title:      (day.title as string)      ?? null,
      sort_order: i,
    }));

    const { data: insertedDays, error: daysErr } = await supabase
      .from('itinerary_days')
      .insert(dayRows)
      .select('id, day_number');

    if (daysErr) {
      return Response.json({ error: `itinerary_days: ${daysErr.message}` }, { status: 500 });
    }

    counts.itinerary_days = dayRows.length;
    insertedDays?.forEach((d) => { dayNumberToId[d.day_number as number] = d.id as string; });
  }

  // ── itinerary_rows ───────────────────────────────────────────────────────────
  if (result.itinerary_rows?.length) {
    const rowRows = result.itinerary_rows.map((row, i) => ({
      day_id:      dayNumberToId[row.day_number as number] ?? null,
      title:       (row.title as string)       ?? null,
      time:        (row.time as string)        ?? null,
      description: (row.description as string) ?? null,
      type:        (row.type as string)        ?? null,
      sort_order:  i,
    }));

    const { error: rowsErr } = await supabase.from('itinerary_rows').insert(rowRows);
    if (rowsErr) {
      return Response.json({ error: `itinerary_rows: ${rowsErr.message}` }, { status: 500 });
    }
    counts.itinerary_rows = rowRows.length;
  }

  // ── flights ──────────────────────────────────────────────────────────────────
  if (result.flights?.length) {
    const rows = result.flights.map((f) => ({
      trip_id:           tripId,
      flight_number:     (f.flight_number as string)     ?? null,
      airline:           (f.airline as string)           ?? null,
      departure_airport: (f.departure_airport as string) ?? null,
      arrival_airport:   (f.arrival_airport as string)   ?? null,
      departure_time:    (f.departure_time as string)    ?? null,
      arrival_time:      (f.arrival_time as string)      ?? null,
      confirmation_code: (f.confirmation_code as string) ?? null,
      notes:             (f.notes as string)             ?? null,
    }));
    const { error } = await supabase.from('flights').insert(rows);
    if (error) return Response.json({ error: `flights: ${error.message}` }, { status: 500 });
    counts.flights = rows.length;
  }

  // ── hotels ───────────────────────────────────────────────────────────────────
  if (result.hotels?.length) {
    const rows = result.hotels.map((h) => ({
      trip_id:           tripId,
      name:              (h.name as string)              ?? null,
      location:          (h.location as string)          ?? null,
      check_in_date:     (h.check_in_date as string)     ?? null,
      check_out_date:    (h.check_out_date as string)    ?? null,
      confirmation_code: (h.confirmation_code as string) ?? null,
      address:           (h.address as string)           ?? null,
      phone:             (h.phone as string)             ?? null,
      notes:             (h.notes as string)             ?? null,
    }));
    const { error } = await supabase.from('hotels').insert(rows);
    if (error) return Response.json({ error: `hotels: ${error.message}` }, { status: 500 });
    counts.hotels = rows.length;
  }

  // ── transportation ───────────────────────────────────────────────────────────
  if (result.transportation?.length) {
    const rows = result.transportation.map((t) => ({
      trip_id:            tripId,
      type:               (t.type as string)               ?? null,
      description:        (t.description as string)        ?? null,
      departure_location: (t.departure_location as string) ?? null,
      arrival_location:   (t.arrival_location as string)   ?? null,
      departure_time:     (t.departure_time as string)     ?? null,
      arrival_time:       (t.arrival_time as string)       ?? null,
      confirmation_code:  (t.confirmation_code as string)  ?? null,
      notes:              (t.notes as string)              ?? null,
    }));
    const { error } = await supabase.from('transportation').insert(rows);
    if (error) return Response.json({ error: `transportation: ${error.message}` }, { status: 500 });
    counts.transportation = rows.length;
  }

  // ── restaurants ──────────────────────────────────────────────────────────────
  if (result.restaurants?.length) {
    const rows = result.restaurants.map((r) => ({
      trip_id:           tripId,
      name:              (r.name as string)              ?? null,
      location:          (r.location as string)          ?? null,
      date:              (r.date as string)              ?? null,
      time:              (r.time as string)              ?? null,
      confirmation_code: (r.confirmation_code as string) ?? null,
      type:              (r.type as string)              ?? null,
      notes:             (r.notes as string)             ?? null,
    }));
    const { error } = await supabase.from('restaurants').insert(rows);
    if (error) return Response.json({ error: `restaurants: ${error.message}` }, { status: 500 });
    counts.restaurants = rows.length;
  }

  // ── key_info ─────────────────────────────────────────────────────────────────
  if (result.key_info?.length) {
    const rows = result.key_info.map((k) => ({
      trip_id:   tripId,
      category:  (k.category as string)  ?? null,
      label:     (k.label as string)     ?? null,
      value:     (k.value as string)     ?? null,
      url:       (k.url as string)       ?? null,
      is_urgent: (k.is_urgent as boolean) ?? false,
    }));
    const { error } = await supabase.from('key_info').insert(rows);
    if (error) return Response.json({ error: `key_info: ${error.message}` }, { status: 500 });
    counts.key_info = rows.length;
  }

  // ── packing_items ────────────────────────────────────────────────────────────
  if (result.packing_items?.length) {
    const rows = result.packing_items.map((p) => ({
      trip_id:  tripId,
      name:     (p.name as string)     ?? null,
      category: (p.category as string) ?? null,
    }));
    const { error } = await supabase.from('packing_items').insert(rows);
    if (error) return Response.json({ error: `packing_items: ${error.message}` }, { status: 500 });
    counts.packing_items = rows.length;
  }

  // ── import_jobs (best-effort — table may not exist yet) ──────────────────────
  try {
    await supabase.from('import_jobs').insert({
      trip_id:        tripId,
      status:         'completed',
      section_counts: counts,
      flag_resolutions: flagResolutions ?? null,
    });
  } catch {
    // Non-fatal: table may not be provisioned yet.
  }

  const totalSections = Object.keys(counts).length;
  return Response.json({ success: true, counts, totalSections });
}
