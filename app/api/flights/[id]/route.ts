import { createClient } from '@supabase/supabase-js';
import { createClient as createAuthClient } from '@/lib/supabase/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

function getServiceClient() {
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

// ─── PATCH /api/flights/[id] ─────────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;

  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const allowed = [
    'flight_number', 'airline', 'origin_airport', 'destination_airport',
    'departure_time', 'arrival_time', 'cabin_class', 'confirmation_number', 'notes',
  ];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }
  if (Object.keys(updates).length === 0) {
    return Response.json({ error: 'No valid fields to update.' }, { status: 400 });
  }
  updates.gcal_dirty = true;

  let supabase;
  try { supabase = getServiceClient(); } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }

  // Fetch flight to get trip_id
  const { data: flight } = await supabase
    .from('flights').select('trip_id').eq('id', id).is('deleted_at', null).maybeSingle();
  if (!flight) return Response.json({ error: 'Flight not found.' }, { status: 404 });

  // Validate trip access
  const { data: member } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', flight.trip_id)
    .eq('user_id', userId)
    .maybeSingle();
  if (!member) return Response.json({ error: 'Access denied.' }, { status: 403 });

  const { data, error } = await supabase
    .from('flights').update(updates).eq('id', id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ flight: data });
}

// ─── DELETE /api/flights/[id] ────────────────────────────────────────────────

export async function DELETE(
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

  // Fetch flight to get trip_id
  const { data: flight } = await supabase
    .from('flights').select('trip_id').eq('id', id).is('deleted_at', null).maybeSingle();
  if (!flight) return Response.json({ error: 'Flight not found.' }, { status: 404 });

  // Validate trip access
  const { data: member } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', flight.trip_id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!member) return Response.json({ error: 'Access denied.' }, { status: 403 });

  const { error } = await supabase
    .from('flights')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ success: true });
}
