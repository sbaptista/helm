import { logger } from '@/lib/logger';
import { requireTripMember, tripServiceClient } from '@/lib/auth/trip-access';
import { matchBookings, type Row } from '@/lib/import/bookings';
import { BOOKING_SECTIONS, type BookingSection } from '@/lib/import/match-types';

// POST /api/trips/[id]/import/matches — read-only. For an import preview,
// which bookings are already on the trip and what the document would change.
// docs/reimport-updates-plan.md

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id: tripId } = await params;

  let body: { result?: Partial<Record<BookingSection, Row[]>> };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  if (!body.result || typeof body.result !== 'object') {
    return Response.json({ error: 'result is required.' }, { status: 400 });
  }

  try {
    const supabase = tripServiceClient();
    const access = await requireTripMember(tripId, { role: 'advisor', supabase });
    if ('response' in access) return access.response;

    // Only sections the preview has bookings in.
    const sections = BOOKING_SECTIONS.filter((s) => Array.isArray(body.result![s]) && body.result![s]!.length > 0);
    const existing = Object.fromEntries(BOOKING_SECTIONS.map((s) => [s, [] as Row[]])) as Record<BookingSection, Row[]>;
    await Promise.all(sections.map(async (section) => {
      const { data, error } = await supabase
        .from(section).select('*')
        .eq('trip_id', tripId).is('deleted_at', null);
      if (error) throw new Error(`${section}: ${error.message}`);
      existing[section] = (data ?? []) as Row[];
    }));

    const matches = await matchBookings(body.result, existing);
    return Response.json({ matches });
  } catch (error) {
    await logger.error('api/import/matches', 'Unable to check bookings already on the trip', {
      error: error instanceof Error ? error.message : String(error),
    }, tripId);
    return Response.json({ error: 'Unable to check bookings already on this trip.' }, { status: 500 });
  }
}
