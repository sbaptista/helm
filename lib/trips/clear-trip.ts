// Archive, Clear Data and Delete: Calendar cleanup and the backup download.
// Server-only. docs/archive-route-plan.md (Part 2).

import type { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { getValidAccessToken } from '@/lib/gcal/token';
import { clearGoogleCalendarEvents } from '@/lib/gcal/sync-state';

import { CALENDAR_UNREACHABLE } from '@/lib/trips/clear-codes';

export { CALENDAR_UNREACHABLE };

// Remove the trip's events from its Google calendar before its rows (and their
// event ids) are deleted (D3). 'none' when the trip has no calendar.
export async function clearTripCalendar(
  supabase: SupabaseClient,
  tripId: string,
  userId: string,
): Promise<'cleared' | 'none' | 'failed'> {
  const { data: trip, error } = await supabase
    .from('trips').select('gcal_calendar_id').eq('id', tripId).maybeSingle();
  if (error) throw new Error(error.message);
  const calendarId = (trip as { gcal_calendar_id?: string | null } | null)?.gcal_calendar_id;
  if (!calendarId) return 'none';
  try {
    const accessToken = await getValidAccessToken(supabase, userId);
    await clearGoogleCalendarEvents(accessToken, calendarId);
    return 'cleared';
  } catch (err) {
    await logger.error('trips/clear', 'Could not remove the trip\'s Google Calendar events', {
      error: err instanceof Error ? err.message : String(err),
    }, tripId);
    return 'failed';
  }
}

export function calendarUnreachableResponse(): Response {
  return Response.json({
    error: 'Couldn’t remove this trip’s events from Google Calendar.',
    code: CALENDAR_UNREACHABLE,
  }, { status: 409 });
}

// Everything the trip holds, for Download & discard (D2).
const BACKUP_TABLES = [
  'itinerary_days', 'itinerary_rows', 'flights', 'hotels', 'transportation', 'restaurants',
  'nearby_dining', 'key_info_groups', 'key_info', 'packing_groups', 'packing_subgroups', 'packing',
  'checklist_groups', 'checklist',
] as const;

export async function tripBackup(supabase: SupabaseClient, tripId: string): Promise<Record<string, unknown>> {
  const { data: trip, error } = await supabase.from('trips').select('*').eq('id', tripId).maybeSingle();
  if (error) throw new Error(`trips: ${error.message}`);
  const sections: Record<string, unknown[]> = {};
  await Promise.all(BACKUP_TABLES.map(async (table) => {
    const { data, error: tableError } = await supabase.from(table).select('*').eq('trip_id', tripId);
    if (tableError) throw new Error(`${table}: ${tableError.message}`);
    sections[table] = data ?? [];
  }));
  return { exported_at: new Date().toISOString(), trip, ...sections };
}
