import { createClient } from '@supabase/supabase-js';
import { requireTripMember } from '@/lib/auth/trip-access';
import { logger } from '@/lib/logger';
import { calendarUnreachableResponse, clearTripCalendar } from '@/lib/trips/clear-trip';
import { TRIP_STATUSES } from '@/types/trips';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('Supabase credentials not configured.');
  return createClient(url, key);
}

// ─── GET /api/trips/[id] ──────────────────────────────────────────────────────

// One trip, as PATCH returns it. Offline sync reads it before sending a
// title or destination edited offline, to merge field by field
// (docs/edit-trip-in-trip-plan.md).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const access = await requireTripMember(id);
  if ('response' in access) return access.response;

  let supabase;
  try {
    supabase = getSupabase();
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }

  const { data, error } = await supabase.from('trips').select('*').eq('id', id).maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data) return Response.json({ error: 'Trip not found.' }, { status: 404 });
  return Response.json({ trip: data });
}

// ─── PATCH /api/trips/[id] ────────────────────────────────────────────────────

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const access = await requireTripMember(id, { role: 'advisor' });
  if ('response' in access) return access.response;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  // Trip dates are not editable: they are derived from the itinerary.
  const allowed = ['title', 'destination', 'status'];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0) {
    return Response.json({ error: 'No valid fields to update.' }, { status: 400 });
  }

  if ('status' in updates && !(TRIP_STATUSES as readonly unknown[]).includes(updates.status)) {
    return Response.json({ error: `status must be one of: ${TRIP_STATUSES.join(', ')}.` }, { status: 400 });
  }

  let supabase;
  try {
    supabase = getSupabase();
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }

  // A trip archived before Archive was removed has no data left: it can only
  // be deleted, not edited or given another status.
  const { data: current, error: currentError } = await supabase
    .from('trips').select('status').eq('id', id).maybeSingle();
  if (currentError) return Response.json({ error: currentError.message }, { status: 500 });
  if (!current) return Response.json({ error: 'Trip not found.' }, { status: 404 });
  if (current.status === 'archived') {
    return Response.json({ error: 'This trip was archived and has no data left. It can only be deleted.' }, { status: 409 });
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
//
// Removes the trip's Google Calendar events, then deletes the trip in one
// transaction (clear_trip_data 'delete'; its rows cascade from trips).
// ?skipCalendar=1 goes ahead when Google can't be reached.
// docs/archive-route-plan.md

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const access = await requireTripMember(id, { role: 'advisor' });
  if ('response' in access) return access.response;

  try {
    const supabase = getSupabase();
    const skipCalendar = new URL(request.url).searchParams.get('skipCalendar') === '1';
    if (!skipCalendar) {
      const calendar = await clearTripCalendar(supabase, id, access.userId);
      if (calendar === 'failed') return calendarUnreachableResponse();
    }

    const { error } = await supabase.rpc('clear_trip_data', {
      p_trip_id: id,
      p_user_id: access.userId,
      p_mode: 'delete',
    });
    if (error) throw new Error(error.message);
    return Response.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await logger.error('api/trips', 'Trip could not be deleted', { error: message }, id);
    return Response.json({ error: `The trip wasn't deleted: ${message}` }, { status: 500 });
  }
}
