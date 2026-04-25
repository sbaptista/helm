import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('Supabase credentials not configured.');
  return createClient(url, key);
}

async function getAuthUserId(): Promise<string | null> {
  if (process.env.BYPASS_AUTH_USER_ID) return process.env.BYPASS_AUTH_USER_ID;
  const cookieStore = await cookies();
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { cookies: { getAll: () => cookieStore.getAll() } });
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  try {
    const userId = await getAuthUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    let body: Record<string, unknown>;
    try { body = await request.json(); } catch { return Response.json({ error: 'Invalid request body.' }, { status: 400 }); }
    const allowed = ['flight_number', 'airline', 'origin_airport', 'destination_airport', 'origin_city', 'destination_city', 'departure_time', 'arrival_time', 'departure_timezone', 'arrival_timezone', 'cabin_class', 'seat_number', 'confirmation_number', 'notes', 'departure_terminal', 'departure_gate', 'arrival_terminal', 'arrival_gate', 'action_required', 'gcal_include'];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) { if (key in body) updates[key] = body[key]; }
    if (Object.keys(updates).length === 0) return Response.json({ error: 'No valid fields to update.' }, { status: 400 });
    updates.gcal_dirty = updates.gcal_include === true ? true : false;
    let supabase;
    try { supabase = serviceClient(); } catch (e) { return Response.json({ error: (e as Error).message }, { status: 500 }); }
    const { data: flight } = await supabase.from('flights').select('trip_id').eq('id', id).is('deleted_at', null).maybeSingle();
    if (!flight) return Response.json({ error: 'Flight not found.' }, { status: 404 });
    const { data: member } = await supabase.from('trip_members').select('id').eq('trip_id', flight.trip_id).eq('user_id', userId).maybeSingle();
    if (!member) return Response.json({ error: 'Access denied.' }, { status: 403 });
    const { data, error } = await supabase.from('flights').update(updates).eq('id', id).select().single();
    if (error) {
      logger.error('api/flights', 'Supabase error on PATCH', { error: error.message, recordId: id });
      return Response.json({ error: error.message }, { status: 500 });
    }
    if (data) {
      const record = Array.isArray(data) ? data[0] : data;
      if (record.action_required) {
        await logger.warn('flights', `Flight ${record.id} has action_required set`, { id: record.id });
      }
      if (!record.departure_time) {
        await logger.warn('flights', `Flight ${record.id} missing departure_time`, { id: record.id });
      }
      if (!record.arrival_time) {
        await logger.warn('flights', `Flight ${record.id} missing arrival_time`, { id: record.id });
      }
    }
    return Response.json({ flight: data });
  } catch (err) {
    logger.critical('api/flights', 'Unhandled exception in PATCH handler', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  try {
    const userId = await getAuthUserId();
    if (!userId) return Response.json({ error: 'Unauthorized.' }, { status: 401 });
    let supabase;
    try { supabase = serviceClient(); } catch (e) { return Response.json({ error: (e as Error).message }, { status: 500 }); }
    const { data: flight } = await supabase.from('flights').select('trip_id').eq('id', id).is('deleted_at', null).maybeSingle();
    if (!flight) return Response.json({ error: 'Flight not found.' }, { status: 404 });
    const { data: member } = await supabase.from('trip_members').select('id').eq('trip_id', flight.trip_id).eq('user_id', userId).maybeSingle();
    if (!member) return Response.json({ error: 'Access denied.' }, { status: 403 });
    const { error } = await supabase.from('flights').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    if (error) {
      logger.error('api/flights', 'Supabase error on DELETE', { error: error.message, recordId: id });
      return Response.json({ error: error.message }, { status: 500 });
    }
    return Response.json({ success: true });
  } catch (err) {
    logger.critical('api/flights', 'Unhandled exception in DELETE handler', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 });
  }
}
