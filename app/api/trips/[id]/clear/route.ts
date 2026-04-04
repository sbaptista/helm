import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('Supabase credentials not configured.');
  return createClient(url, key);
}

const IMPORT_TABLES = [
  'itinerary_rows',
  'itinerary_days',
  'flights',
  'hotels',
  'transportation',
  'restaurants',
  'checklist_items',
  'packing_items',
  'key_info',
];

// ─── POST /api/trips/[id]/clear ───────────────────────────────────────────────
//
// body: { action: 'archive' | 'download_clear' | 'discard' }
//
// archive        — set trips.status = 'archived', leave data intact
// download_clear — return the latest import_jobs row, then delete all import data
// discard        — delete all import data, no download

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;

  let body: { action?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { action } = body;
  if (!action || !['archive', 'download_clear', 'discard'].includes(action)) {
    return Response.json({ error: 'action must be archive, download_clear, or discard.' }, { status: 400 });
  }

  let supabase;
  try {
    supabase = getSupabase();
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }

  // ── archive ────────────────────────────────────────────────────────────────
  if (action === 'archive') {
    const { error } = await supabase
      .from('trips')
      .update({ status: 'archived' })
      .eq('id', id);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ success: true });
  }

  // ── download_clear: fetch latest import_jobs row first ─────────────────────
  let importJob: Record<string, unknown> | null = null;
  if (action === 'download_clear') {
    const { data } = await supabase
      .from('import_jobs')
      .select('*')
      .eq('trip_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    importJob = data ?? null;
  }

  // ── discard / download_clear: delete all import data ──────────────────────
  for (const table of IMPORT_TABLES) {
    const { error } = await supabase.from(table).delete().eq('trip_id', id);
    if (error && error.code !== 'PGRST116') {
      console.warn(`[clear trip] ${table}: ${error.message}`);
    }
  }

  // Also delete import_jobs rows
  await supabase.from('import_jobs').delete().eq('trip_id', id);

  return Response.json({ success: true, importJob });
}
