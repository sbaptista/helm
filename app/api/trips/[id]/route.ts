import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('Supabase credentials not configured.');
  return createClient(url, key);
}

// ─── PATCH /api/trips/[id] ────────────────────────────────────────────────────

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const allowed = ['title', 'destination', 'departure_date', 'return_date'];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0) {
    return Response.json({ error: 'No valid fields to update.' }, { status: 400 });
  }

  let supabase;
  try {
    supabase = getSupabase();
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('trips')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ trip: data });
}

// ─── DELETE /api/trips/[id] ───────────────────────────────────────────────────

const CHILD_TABLES = [
  'itinerary_rows',
  'itinerary_days',
  'flights',
  'hotels',
  'transportation',
  'restaurants',
  'checklist_items',
  'packing_items',
  'key_info',
  'import_jobs',
];

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;

  let supabase;
  try {
    supabase = getSupabase();
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }

  // Delete child rows first (FK order), then the trip itself.
  for (const table of CHILD_TABLES) {
    const { error } = await supabase.from(table).delete().eq('trip_id', id);
    if (error && error.code !== 'PGRST116') {
      // PGRST116 = table not found — ignore if table doesn't exist yet
      console.warn(`[delete trip] ${table}: ${error.message}`);
    }
  }

  const { error } = await supabase.from('trips').delete().eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ success: true });
}
