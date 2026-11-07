// Who may use a trip's API routes. Server-only.
//
// proxy.ts protects pages, not /api, and these routes use the service-role
// key (which bypasses row-level security), so every trip route checks the
// caller here: signed in, and a member of the trip (an advisor where the
// route changes or deletes the trip as a whole). docs/archive-route-plan.md

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { logger } from '@/lib/logger';

export function tripServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('Supabase credentials not configured.');
  return createClient(url, key);
}

export async function getAuthUserId(): Promise<string | null> {
  if (process.env.BYPASS_AUTH_USER_ID) return process.env.BYPASS_AUTH_USER_ID;
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export type TripAccess = { userId: string } | { response: Response };

// The signed-in user must be a member of the trip (with `role`, that role).
// Never throws: a failed check is a 500 response.
export async function requireTripMember(
  tripId: string | null | undefined,
  options: { role?: 'advisor'; supabase?: SupabaseClient } = {},
): Promise<TripAccess> {
  try {
    const userId = await getAuthUserId();
    if (!userId) return { response: Response.json({ error: 'Unauthorized.' }, { status: 401 }) };
    if (!tripId) return { response: Response.json({ error: 'Access denied.' }, { status: 403 }) };

    const supabase = options.supabase ?? tripServiceClient();
    let query = supabase.from('trip_members').select('id').eq('trip_id', tripId).eq('user_id', userId);
    if (options.role) query = query.eq('role', options.role);
    const { data: member, error } = await query.maybeSingle();
    if (error) throw new Error(error.message);
    if (!member) return { response: Response.json({ error: 'Access denied.' }, { status: 403 }) };
    return { userId };
  } catch (error) {
    await logger.error('auth/trip-access', 'Membership check failed', {
      error: error instanceof Error ? error.message : String(error),
    }, tripId ?? undefined);
    return { response: Response.json({ error: 'Unable to check access to this trip.' }, { status: 500 }) };
  }
}

// For routes addressed by a record id (e.g. /api/hotels/[id]): the record's
// trip decides access. A missing or deleted record is a 404.
export async function requireRecordMember(
  table: string,
  id: string,
  options: { role?: 'advisor'; supabase?: SupabaseClient } = {},
): Promise<{ userId: string; tripId: string } | { response: Response }> {
  try {
    const supabase = options.supabase ?? tripServiceClient();
    const userId = await getAuthUserId();
    if (!userId) return { response: Response.json({ error: 'Unauthorized.' }, { status: 401 }) };
    const { data, error } = await supabase.from(table).select('trip_id').eq('id', id).is('deleted_at', null).maybeSingle();
    if (error) throw new Error(error.message);
    const tripId = (data as { trip_id?: string } | null)?.trip_id;
    if (!tripId) return { response: Response.json({ error: 'Not found.' }, { status: 404 }) };
    const access = await requireTripMember(tripId, { ...options, supabase });
    return 'response' in access ? access : { userId: access.userId, tripId };
  } catch (error) {
    await logger.error('auth/trip-access', 'Record access check failed', {
      error: error instanceof Error ? error.message : String(error), table,
    });
    return { response: Response.json({ error: 'Unable to check access.' }, { status: 500 }) };
  }
}
