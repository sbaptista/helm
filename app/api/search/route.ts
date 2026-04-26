import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

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
    { cookies: { getAll: () => cookieStore.getAll() } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export interface SearchResult {
  id: string;
  section: string;
  trip_id: string;
  title: string;
  subtitle: string;
  matched_field: string;
}

const SECTION_PRIORITY: Record<string, number> = {
  itinerary:      1,
  flights:        2,
  hotels:         3,
  restaurants:    4,
  transportation: 5,
  checklist:      6,
  key_info:       7,
  packing:        8,
  logs:           9,
};

function matchedField(record: Record<string, unknown>, q: string, fields: string[], wholeWord: boolean): string | null {
  const lower = q.toLowerCase().trim();
  const regex = wholeWord ? new RegExp(`\\b${lower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i') : null;
  for (const f of fields) {
    const val = record[f];
    if (typeof val !== 'string') continue;
    const hit = regex ? regex.test(val) : val.toLowerCase().includes(lower);
    if (hit) return f;
  }
  return null;
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim() ?? '';
    const section = searchParams.get('section') ?? '';
    const includeLogs = searchParams.get('logs') === 'true';
    const wholeWord = searchParams.get('mode') === 'whole_word';

    if (q.length < 2) return Response.json({ results: [] });

    const userId = await getAuthUserId();
    if (!userId) return Response.json({ results: [] });

    const supabase = serviceClient();

    const { data: memberships } = await supabase
      .from('trip_members')
      .select('trip_id')
      .eq('user_id', userId);

    const tripIds: string[] = (memberships ?? []).map((m: { trip_id: string }) => m.trip_id);
    if (tripIds.length === 0) return Response.json({ results: [] });

    const results: SearchResult[] = [];

    const only = section || null;

    // ── flights ──────────────────────────────────────────────────────────────
    if (!only || only === 'flights') {
      const { data } = await supabase
        .from('flights')
        .select('*')
        .in('trip_id', tripIds)
        .is('deleted_at', null);
      for (const r of data ?? []) {
        const mf = matchedField(r, q, [
          'flight_number', 'airline', 'origin_airport', 'destination_airport',
          'cabin_class', 'confirmation_number', 'notes', 'gcal_event_id',
          'origin_city', 'destination_city', 'departure_timezone', 'arrival_timezone',
          'seat_number', 'departure_terminal', 'departure_gate', 'arrival_terminal', 'arrival_gate',
        ], wholeWord);
        if (mf) {
          results.push({
            id:            r.id,
            section:       'flights',
            trip_id:       r.trip_id,
            title:         `${str(r.airline)} ${str(r.flight_number)}`.trim() || '—',
            subtitle:      `${str(r.origin_city || r.origin_airport)} → ${str(r.destination_city || r.destination_airport)}`,
            matched_field: mf,
          });
        }
      }
    }

    // ── hotels ───────────────────────────────────────────────────────────────
    if (!only || only === 'hotels') {
      const { data } = await supabase
        .from('hotels')
        .select('*')
        .in('trip_id', tripIds)
        .is('deleted_at', null);
      for (const r of data ?? []) {
        const mf = matchedField(r, q, [
          'name', 'address', 'city', 'confirmation_number', 'phone',
          'website_url', 'notes', 'room_type', 'gcal_checkin_event_id',
          'gcal_checkout_event_id', 'province', 'postal_code', 'maps_url', 'action_note',
        ], wholeWord);
        if (mf) {
          results.push({
            id:            r.id,
            section:       'hotels',
            trip_id:       r.trip_id,
            title:         str(r.name) || '—',
            subtitle:      [str(r.city), str(r.province)].filter(Boolean).join(', '),
            matched_field: mf,
          });
        }
      }
    }

    // ── transportation ───────────────────────────────────────────────────────
    if (!only || only === 'transportation') {
      const { data } = await supabase
        .from('transportation')
        .select('*')
        .in('trip_id', tripIds)
        .is('deleted_at', null);
      for (const r of data ?? []) {
        const mf = matchedField(r, q, [
          'type', 'provider', 'origin', 'destination', 'confirmation_number',
          'notes', 'phone', 'website_url', 'cost', 'gcal_event_id',
          'departure_timezone', 'arrival_timezone', 'action_note',
        ], wholeWord);
        if (mf) {
          results.push({
            id:            r.id,
            section:       'transportation',
            trip_id:       r.trip_id,
            title:         str(r.provider || r.type) || '—',
            subtitle:      `${str(r.origin)} → ${str(r.destination)}`,
            matched_field: mf,
          });
        }
      }
    }

    // ── itinerary_rows ───────────────────────────────────────────────────────
    if (!only || only === 'itinerary') {
      const { data } = await supabase
        .from('itinerary_rows')
        .select('*')
        .in('trip_id', tripIds)
        .is('deleted_at', null);
      for (const r of data ?? []) {
        const mf = matchedField(r, q, [
          'title', 'description', 'location', 'category', 'start_timezone', 'action_note', 'end_timezone', 'gcal_event_id',
        ], wholeWord);
        if (mf) {
          results.push({
            id:            r.id,
            section:       'itinerary',
            trip_id:       r.trip_id,
            title:         str(r.title) || '—',
            subtitle:      str(r.category),
            matched_field: mf,
          });
        }
      }
    }

    // ── restaurants ──────────────────────────────────────────────────────────
    if (!only || only === 'restaurants') {
      const { data } = await supabase
        .from('restaurants')
        .select('*')
        .in('trip_id', tripIds)
        .is('deleted_at', null);
      for (const r of data ?? []) {
        const mf = matchedField(r, q, [
          'name', 'type', 'cuisine', 'address', 'city', 'confirmation_number',
          'phone', 'website_url', 'notes', 'booking_url', 'style',
          'gcal_event_id', 'display_label', 'reservation_status',
          'booking_source', 'maps_url', 'action_note', 'state_province', 'postal_code', 'email',
        ], wholeWord);
        if (mf) {
          results.push({
            id:            r.id,
            section:       'restaurants',
            trip_id:       r.trip_id,
            title:         str(r.display_label || r.name) || '—',
            subtitle:      [str(r.city), str(r.cuisine)].filter(Boolean).join(' · '),
            matched_field: mf,
          });
        }
      }
    }

    // ── checklist ────────────────────────────────────────────────────────────
    if (!only || only === 'checklist') {
      const { data } = await supabase
        .from('checklist')
        .select('*')
        .in('trip_id', tripIds)
        .is('deleted_at', null);
      for (const r of data ?? []) {
        const mf = matchedField(r, q, [
          'task', 'group_name', 'ref', 'status', 'resolution', 'notes', 'action_note',
          'gcal_due_event_id', 'gcal_warning_event_id',
        ], wholeWord);
        if (mf) {
          results.push({
            id:            r.id,
            section:       'checklist',
            trip_id:       r.trip_id,
            title:         str(r.task) || '—',
            subtitle:      str(r.group_name),
            matched_field: mf,
          });
        }
      }
    }

    // ── key_info ─────────────────────────────────────────────────────────────
    if (!only || only === 'key_info') {
      const { data } = await supabase
        .from('key_info')
        .select('*')
        .in('trip_id', tripIds)
        .is('deleted_at', null);
      for (const r of data ?? []) {
        const mf = matchedField(r, q, [
          'category', 'label', 'value', 'url', 'url_label', 'action_note',
        ], wholeWord);
        if (mf) {
          results.push({
            id:            r.id,
            section:       'key_info',
            trip_id:       r.trip_id,
            title:         str(r.label) || '—',
            subtitle:      str(r.category),
            matched_field: mf,
          });
        }
      }
    }

    // ── packing ──────────────────────────────────────────────────────────────
    if (!only || only === 'packing') {
      const { data } = await supabase
        .from('packing')
        .select('*, packing_groups(name), packing_subgroups(name)')
        .in('trip_id', tripIds)
        .is('deleted_at', null);
      for (const r of (data ?? []) as Record<string, unknown>[]) {
        const groupName = (r.packing_groups as { name?: string } | null)?.name ?? '';
        const subgroupName = (r.packing_subgroups as { name?: string } | null)?.name ?? '';
        const searchable = { ...r, _group_name: groupName, _subgroup_name: subgroupName };
        const mf = matchedField(searchable, q, ['text', 'person', '_group_name', '_subgroup_name'], wholeWord);
        if (mf) {
          results.push({
            id:            str(r.id),
            section:       'packing',
            trip_id:       str(r.trip_id),
            title:         str(r.text) || '—',
            subtitle:      str(r.person),
            matched_field: mf,
          });
        }
      }
    }

    // ── logs (optional) ──────────────────────────────────────────────────────
    if (includeLogs && (!only || only === 'logs')) {
      const { data } = await supabase
        .from('helm_logs')
        .select('*')
        .or(`trip_id.in.(${tripIds.map(id => `"${id}"`).join(',')}),trip_id.is.null`);
      for (const r of data ?? []) {
        const mf = matchedField(r, q, ['level', 'source', 'message'], wholeWord);
        if (mf) {
          results.push({
            id:            r.id,
            section:       'logs',
            trip_id:       str(r.trip_id) || tripIds[0] || '',
            title:         str(r.source) || '—',
            subtitle:      str(r.level),
            matched_field: mf,
          });
        }
      }
    }

    // ── sort ─────────────────────────────────────────────────────────────────
    results.sort((a, b) => {
      const pa = SECTION_PRIORITY[a.section] ?? 99;
      const pb = SECTION_PRIORITY[b.section] ?? 99;
      if (pa !== pb) return pa - pb;
      return a.title.localeCompare(b.title);
    });

    return Response.json({ results });
  } catch {
    return Response.json({ results: [] });
  }
}
