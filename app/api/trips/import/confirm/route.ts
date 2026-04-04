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

interface FlagResolution {
  field:         string;
  issue:         string;
  action:        string;  // 'fixed' | 'edited' | 'keep' | 'deleted' | 'unresolved'
  originalValue: unknown;
  newValue:      unknown;
}

interface ConfirmBody {
  tripId:          string;
  userId:          string;
  result:          ImportResult;
  flagResolutions: FlagResolution[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toTimestamp(date: string | null | undefined, time: string | null | undefined): string | null {
  if (!date || !time) return null;
  let t = time.trim();

  // Handle 12-hour format: "8:00 AM", "11:50 PM", "8:00:00 AM"
  const ampm = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (ampm) {
    let hours = parseInt(ampm[1], 10);
    const minutes = ampm[2];
    const seconds = ampm[3] ?? '00';
    const period = ampm[4].toUpperCase();
    if (period === 'AM' && hours === 12) hours = 0;
    if (period === 'PM' && hours !== 12) hours += 12;
    t = `${String(hours).padStart(2, '0')}:${minutes}:${seconds}`;
  } else {
    // Handle 24-hour format: "8:00", "08:00", "08:00:00"
    const parts = t.split(':');
    if (parts.length === 2) t = `${parts[0].padStart(2, '0')}:${parts[1]}:00`;
    else if (parts.length === 3) t = `${parts[0].padStart(2, '0')}:${parts[1]}:${parts[2]}`;
  }

  return `${date}T${t}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function logError(
  supabase: any,
  message: string,
  context: string,
): Promise<void> {
  try {
    await supabase.from('error_log').insert({ severity: 'error', context, message });
  } catch {
    // Best-effort — never throw from here.
  }
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  let body: ConfirmBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { tripId, userId, result, flagResolutions } = body;

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

  // Helper: return an error response and best-effort log it.
  const fail = async (message: string, status = 500): Promise<Response> => {
    await logError(supabase, message, 'import_confirm');
    return Response.json({ error: message }, { status });
  };

  // ── itinerary_days ───────────────────────────────────────────────────────────
  // Insert days first and capture returned IDs so itinerary_rows can reference
  // day_id (the real FK) rather than day_number.
  const dayNumberToId:   Record<number, string> = {};
  const dayNumberToDate: Record<number, string> = {};

  if (result.itinerary_days?.length) {
    const dayRows = result.itinerary_days.map((day, i) => {
      const dayNum  = (day.day_number as number) ?? i + 1;
      const dayDate = (day.date as string) ?? null;
      if (dayDate) dayNumberToDate[dayNum] = dayDate;
      return {
        trip_id:    tripId,
        day_number: dayNum,
        day_date:   dayDate,
        title:      (day.title as string) ?? null,
        sort_order: i,
      };
    });

    const { data: insertedDays, error: daysErr } = await supabase
      .from('itinerary_days')
      .insert(dayRows)
      .select('id, day_number');

    if (daysErr) {
      return fail(`itinerary_days: ${daysErr.message}`);
    }

    counts.itinerary_days = dayRows.length;
    insertedDays?.forEach((d) => { dayNumberToId[d.day_number as number] = d.id as string; });
  }

  // ── itinerary_rows ───────────────────────────────────────────────────────────
  if (result.itinerary_rows?.length) {
    const rowRows = result.itinerary_rows.map((row, i) => {
      const dayNum  = row.day_number as number;
      const dayDate = dayNumberToDate[dayNum] ?? null;
      return {
        trip_id:     tripId,
        day_id:      dayNumberToId[dayNum] ?? null,
        title:       (row.title as string)       ?? null,
        start_time:  toTimestamp(dayDate, row.time as string),
        end_time:    toTimestamp(dayDate, row.end_time as string),
        description: (row.description as string) ?? null,
        category:    (row.type as string)        ?? null,
        sort_order:  i,
      };
    });

    const { error: rowsErr } = await supabase.from('itinerary_rows').insert(rowRows);
    if (rowsErr) {
      return fail(`itinerary_rows: ${rowsErr.message}`);
    }
    counts.itinerary_rows = rowRows.length;
  }

  // ── flights ──────────────────────────────────────────────────────────────────
  if (result.flights?.length) {
    const rows = result.flights.map((f) => ({
      trip_id:           tripId,
      flight_number:        (f.flight_number as string)     ?? null,
      airline:              (f.airline as string)           ?? null,
      origin_airport:       (f.departure_airport as string) ?? null,
      destination_airport:  (f.arrival_airport as string)   ?? null,
      departure_time:       (f.departure_time as string)    ?? null,
      arrival_time:         (f.arrival_time as string)      ?? null,
      confirmation_number:  (f.confirmation_code as string) ?? null,
      notes:                (f.notes as string)             ?? null,
    }));
    const { error } = await supabase.from('flights').insert(rows);
    if (error) return fail(`flights: ${error.message}`);
    counts.flights = rows.length;
  }

  // ── hotels ───────────────────────────────────────────────────────────────────
  if (result.hotels?.length) {
    const rows = result.hotels.map((h) => ({
      trip_id:           tripId,
      name:                (h.name as string)              ?? null,
      address:             (h.address as string) ?? (h.location as string) ?? null,
      city:                (h.city as string)              ?? null,
      check_in_date:       (h.check_in_date as string)     ?? null,
      check_out_date:      (h.check_out_date as string)    ?? null,
      confirmation_number: (h.confirmation_code as string) ?? null,
      phone:               (h.phone as string)             ?? null,
      notes:               (h.notes as string)             ?? null,
    }));
    const { error } = await supabase.from('hotels').insert(rows);
    if (error) return fail(`hotels: ${error.message}`);
    counts.hotels = rows.length;
  }

  // ── transportation ───────────────────────────────────────────────────────────
  if (result.transportation?.length) {
    const rows = result.transportation.map((t) => ({
      trip_id:            tripId,
      type:               (t.type as string)               ?? null,
      origin:              (t.departure_location as string) ?? null,
      destination:         (t.arrival_location as string)   ?? null,
      departure_time:      (t.departure_time as string)     ?? null,
      arrival_time:        (t.arrival_time as string)       ?? null,
      confirmation_number: (t.confirmation_code as string)  ?? null,
      notes:               (t.description as string)        ?? null,
    }));
    const { error } = await supabase.from('transportation').insert(rows);
    if (error) return fail(`transportation: ${error.message}`);
    counts.transportation = rows.length;
  }

  // ── restaurants ──────────────────────────────────────────────────────────────
  if (result.restaurants?.length) {
    const rows = result.restaurants.map((r) => ({
      trip_id:           tripId,
      name:              (r.name as string)              ?? null,
      address:           (r.address as string) ?? (r.location as string) ?? null,
      city:              (r.city as string)              ?? null,
      reservation_time:  toTimestamp(r.date as string, r.time as string),
      confirmation_number: (r.confirmation_code as string) ?? null,
      type:              (r.type as string)              ?? null,
      notes:             (r.notes as string)             ?? null,
    }));
    const { error } = await supabase.from('restaurants').insert(rows);
    if (error) return fail(`restaurants: ${error.message}`);
    counts.restaurants = rows.length;
  }

  // ── key_info ─────────────────────────────────────────────────────────────────
  if (result.key_info?.length) {
    const rows = result.key_info.map((k) => ({
      trip_id:   tripId,
      category:  (k.category as string)   ?? null,
      label:     (k.label as string)      ?? null,
      value:     (k.value as string)      ?? null,
      url:       (k.url as string)        ?? null,
      flag:      (k.is_urgent as boolean) ?? false,
    }));
    const { error } = await supabase.from('key_info').insert(rows);
    if (error) return fail(`key_info: ${error.message}`);
    counts.key_info = rows.length;
  }

  // ── packing_items ────────────────────────────────────────────────────────────
  if (result.packing_items?.length) {
    const rows = result.packing_items.map((p, i) => ({
      trip_id:    tripId,
      user_id:    userId ?? null,
      category:   (p.category as string) ?? null,
      label:      (p.name as string)     ?? null,
      packed:     false,
      sort_order: i,
    }));
    const { error } = await supabase.from('packing_items').insert(rows);
    if (error) return fail(`packing_items: ${error.message}`);
    counts.packing_items = rows.length;
  }

  // ── checklist_items ──────────────────────────────────────────────────────────
  if (result.checklist_items?.length) {
    const rows = result.checklist_items.map((c, i) => ({
      trip_id:      tripId,
      owner_role:   'advisor',
      label:        (c.title as string)        ?? null,
      time_horizon: (c.time_horizon as string) ?? null,
      completed:    false,
      sort_order:   i,
    }));
    const { error } = await supabase.from('checklist_items').insert(rows);
    if (error) return fail(`checklist_items: ${error.message}`);
    counts.checklist_items = rows.length;
  }

  // ── import_jobs (best-effort — table may not exist yet) ──────────────────────
  try {
    await supabase.from('import_jobs').insert({
      trip_id:          tripId,
      status:           'completed',
      section_counts:   counts,
      flag_resolutions: flagResolutions ?? null,
    });
  } catch {
    // Non-fatal: table may not be provisioned yet.
  }

  const totalSections = Object.keys(counts).length;
  return Response.json({ success: true, counts, totalSections });
}
