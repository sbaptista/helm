import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { logger } from '@/lib/logger';

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('Supabase credentials not configured.');
  return createClient(url, key);
}

async function getAuthUserId(): Promise<string | null> {
  if (process.env.BYPASS_AUTH_USER_ID) {
    return process.env.BYPASS_AUTH_USER_ID;
  }
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  try {
    let supabase;
    try { supabase = serviceClient(); } catch (e) {
      return Response.json({ error: (e as Error).message }, { status: 500 });
    }

    const { data: flights, error } = await supabase
      .from('flights')
      .select('id, flight_number, airline, origin_airport, destination_airport, origin_city, destination_city, departure_time, arrival_time, departure_timezone, arrival_timezone, cabin_class, seat_number, confirmation_number, departure_terminal, departure_gate, arrival_terminal, arrival_gate, notes, gcal_include, action_required')
      .eq('trip_id', id)
      .is('deleted_at', null)
      .order('departure_time');

    if (error) {
      logger.error('api/flights', 'Supabase error on GET', { error: error.message, recordId: id });
      return Response.json({ error: error.message }, { status: 500 });
    }
    return Response.json({ flights: flights ?? [] });
  } catch (err) {
    logger.critical('api/flights', 'Unhandled exception in GET handler', { error: err instanceof Error ? err.message : String(err) });
    return Response.json({ error: 'Unexpected server error' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  try {
    const userId = await getAuthUserId();
    if (!userId) return Response.json({ error: 'Unauthorized.' }, { status: 401 });

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    let supabase;
    try { supabase = serviceClient(); } catch (e) {
      return Response.json({ error: (e as Error).message }, { status: 500 });
    }

    const { data: member } = await supabase
      .from('trip_members')
      .select('id')
      .eq('trip_id', id)
      .eq('user_id', userId)
      .maybeSingle();
    if (!member) return Response.json({ error: 'Access denied.' }, { status: 403 });

    const allowed = [
      'flight_number', 'airline', 'origin_airport', 'destination_airport',
      'origin_city', 'destination_city',
      'departure_time', 'arrival_time',
      'departure_timezone', 'arrival_timezone',
      'cabin_class', 'seat_number', 'confirmation_number', 'notes',
      'departure_terminal', 'departure_gate',
      'arrival_terminal', 'arrival_gate',
      'action_required',
    ];
    const record: Record<string, unknown> = { trip_id: id };
    for (const key of allowed) {
      if (key in body) record[key] = body[key];
    }

    const { data: flight, error } = await supabase
      .from('flights').insert(record).select().single();
    if (error) {
      logger.error('api/flights', 'Supabase error on POST', { error: error.message, recordId: id });
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ flight }, { status: 201 });
  } catch (err) {
    logger.critical('api/flights', 'Unhandled exception in POST handler', { error: err instanceof Error ? err.message : String(err) });
    return Response.json({ error: 'Unexpected server error' }, { status: 500 });
  }
}
