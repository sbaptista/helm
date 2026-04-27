import { NextRequest, NextResponse } from 'next/server';
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
  if (process.env.BYPASS_AUTH_USER_ID) return process.env.BYPASS_AUTH_USER_ID;
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
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tripId } = await params;
    const userId = await getAuthUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = serviceClient();

    const { data, error } = await supabase
      .from('helm_logs')
      .select('*')
      .or(`trip_id.eq.${tripId},trip_id.is.null`)
      .order('created_at', { ascending: false });

    if (error) {
      await logger.error('logs', 'Failed to fetch logs', { error: error.message });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    await logger.critical('logs', 'Unhandled exception in GET /logs', { error: String(err) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tripId } = await params;
    const userId = await getAuthUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const supabase = serviceClient();

    if (searchParams.get('all') === 'true') {
      const { error } = await supabase
        .from('helm_logs')
        .delete()
        .or(`trip_id.eq.${tripId},trip_id.is.null`);

      if (error) {
        await logger.error('logs', 'Failed to clear all logs', { error: error.message });
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    const days = parseInt(searchParams.get('days') ?? '30', 10);
    if (![7, 30, 90].includes(days)) {
      return NextResponse.json({ error: 'Invalid days value' }, { status: 400 });
    }

    const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supabase
      .from('helm_logs')
      .delete()
      .or(`trip_id.eq.${tripId},trip_id.is.null`)
      .lt('created_at', threshold);

    if (error) {
      await logger.error('logs', 'Failed to clear logs', { error: error.message });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    await logger.critical('logs', 'Unhandled exception in DELETE /logs', { error: String(err) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
