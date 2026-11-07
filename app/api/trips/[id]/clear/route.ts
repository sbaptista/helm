import { logger } from '@/lib/logger';
import { requireTripMember, tripServiceClient } from '@/lib/auth/trip-access';
import { calendarUnreachableResponse, clearTripCalendar, tripBackup } from '@/lib/trips/clear-trip';

// ─── POST /api/trips/[id]/clear ───────────────────────────────────────────────
//
// body: { action: 'discard' | 'download_discard', skipCalendar?: boolean }
//
// discard          — delete every section's data, keep the trip
// download_discard — return a backup of every section, then discard
//
// The trip's Google Calendar events are removed first; if Google can't be
// reached the response is 409 calendar_unreachable, and the dashboard offers
// to go ahead anyway (skipCalendar). The data is deleted in one transaction by
// clear_trip_data. docs/archive-route-plan.md

// Archive was removed 2026-11-06 (it was Delete under another name).
const ACTIONS = ['discard', 'download_discard'] as const;
type Action = (typeof ACTIONS)[number];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const access = await requireTripMember(id, { role: 'advisor' });
  if ('response' in access) return access.response;

  let body: { action?: string; skipCalendar?: boolean };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  // 'download_clear' is the dialog's old name for download_discard.
  const action = (body.action === 'download_clear' ? 'download_discard' : body.action) as Action;
  if (!ACTIONS.includes(action)) {
    return Response.json({ error: 'action must be discard or download_discard.' }, { status: 400 });
  }

  try {
    const supabase = tripServiceClient();

    const backup = action === 'download_discard' ? await tripBackup(supabase, id) : null;

    if (body.skipCalendar !== true) {
      const calendar = await clearTripCalendar(supabase, id, access.userId);
      if (calendar === 'failed') return calendarUnreachableResponse();
    }

    const { data, error } = await supabase.rpc('clear_trip_data', {
      p_trip_id: id,
      p_user_id: access.userId,
      p_mode: 'discard',
    });
    if (error) throw new Error(error.message);

    return Response.json({
      success: true,
      counts: (data as { counts?: Record<string, number> } | null)?.counts ?? {},
      ...(backup ? { backup } : {}),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await logger.error('api/trips/clear', 'Trip data could not be cleared', { error: message, action }, id);
    return Response.json({ error: `Nothing was deleted: ${message}` }, { status: 500 });
  }
}
