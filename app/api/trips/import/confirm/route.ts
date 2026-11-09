import { logger } from '@/lib/logger';
import { linkedDayDates, type LinkedItinerarySection } from '@/lib/itinerary/linked-entries';
import { requireTripMember, tripServiceClient } from '@/lib/auth/trip-access';
import {
  acceptedValues,
  importKey,
  prepareInsert,
  proposedValues,
  str,
  toLocalDateTime,
  type Row,
} from '@/lib/import/bookings';
import { BOOKING_SECTIONS, type BookingDecision, type BookingSection } from '@/lib/import/match-types';
import { applyMapLink, type MapTable } from '@/lib/geo/map-link';

// Saves a reviewed import in one transaction (import_trip_document,
// supabase/migrations/202611050002_import_trip_document.sql). Everything is prepared here first
// (timezone lookups, dates and times, accepted changes to bookings already on
// the trip); then either the whole import is saved or nothing is.
// docs/import-fix-plan.md, docs/reimport-updates-plan.md

// ─── Types ────────────────────────────────────────────────────────────────────

interface ImportResult {
  itinerary_days?:  Row[];
  itinerary_rows?:  Row[];
  flights?:         Row[];
  hotels?:          Row[];
  transportation?:  Row[];
  restaurants?:     Row[];
  checklist_items?: Row[];
  packing_items?:   Row[];
  key_info?:        Row[];
}

interface ConfirmBody {
  tripId:            string;
  result:            ImportResult;
  flagResolutions:   unknown[];
  bookingDecisions?: BookingDecision[];
}

const LINKED_SECTION: Record<BookingSection, LinkedItinerarySection> = {
  flights:        'Flights',
  hotels:         'Hotels',
  transportation: 'Transportation',
  restaurants:    'Restaurants',
};

class ImportProblem extends Error {}

// Hotels and restaurants get their automatic map link and map location as a
// form save gives them (docs/import-from-web-page-plan.md, Addendum 2), so
// the map picture shows without opening and saving the record. A failed
// lookup leaves the location empty rather than failing the import.
async function withMapLink(
  supabase: ReturnType<typeof tripServiceClient>,
  section: BookingSection,
  id: string | null,
  fields: Row,
): Promise<void> {
  if (section !== 'hotels' && section !== 'restaurants') return;
  try {
    await applyMapLink(supabase, section as MapTable, id, fields);
  } catch (error) {
    await logger.error('api/import/confirm', 'Map location lookup failed during import', {
      section, error: error instanceof Error ? error.message : String(error),
    });
  }
}

// ─── Payload ──────────────────────────────────────────────────────────────────

async function buildPayload(
  supabase: ReturnType<typeof tripServiceClient>,
  result: ImportResult,
  tripId: string,
  flagResolutions: unknown[],
  decisions: BookingDecision[],
) {
  // Days: day_number only links rows to their day within this import.
  const dayDateByKey: Record<string, string | null> = {};
  const days = (result.itinerary_days ?? []).map((day, i) => {
    const key = str(day.day_number) ?? String(i + 1);
    const dayDate = str(day.date);
    dayDateByKey[key] = dayDate;
    return { key, day_date: dayDate, title: str(day.title) };
  });

  const rows = (result.itinerary_rows ?? []).map((row) => {
    const key = str(row.day_number);
    const dayDate = key ? dayDateByKey[key] ?? null : null;
    return {
      day_key:     key,
      title:       str(row.title),
      start_time:  toLocalDateTime(dayDate, str(row.time)),
      end_time:    toLocalDateTime(dayDate, str(row.end_time)),
      description: str(row.description),
      category:    str(row.type),
    };
  });

  // Bookings: decisions from the review page say which ones are already on
  // the trip (skip, update, or add as new); everything else is inserted.
  const decisionByKey = new Map(decisions.map((d) => [d.key, d]));
  const updateIds = decisions.filter((d) => d.action === 'update' && d.id).map((d) => d.id as string);
  const existingById = new Map<string, Row>();
  if (updateIds.length > 0) {
    await Promise.all(BOOKING_SECTIONS.map(async (section) => {
      const ids = decisions.filter((d) => d.action === 'update' && d.section === section && d.id).map((d) => d.id as string);
      if (ids.length === 0) return;
      const { data, error } = await supabase
        .from(section).select('*')
        .eq('trip_id', tripId).is('deleted_at', null).in('id', ids);
      if (error) throw new Error(`${section}: ${error.message}`);
      for (const row of (data ?? []) as Row[]) existingById.set(`${section}:${row.id}`, row);
    }));
  }

  const inserts: Record<BookingSection, Row[]> = { flights: [], hotels: [], transportation: [], restaurants: [] };
  const updates: Array<{ section: BookingSection; id: string; fields: Row }> = [];
  const linkedDates = new Set<string>();

  for (const section of BOOKING_SECTIONS) {
    for (const row of result[section] ?? []) {
      const key = importKey(row);
      const decision = key ? decisionByKey.get(key) : undefined;
      if (decision?.section === section && decision.action === 'skip') continue;

      if (decision?.section === section && decision.action === 'update' && decision.id) {
        const existing = existingById.get(`${section}:${decision.id}`);
        if (!existing) throw new ImportProblem('a booking chosen for an update is no longer on this trip.');
        const proposed = await proposedValues(section, row, existing);
        const fields = acceptedValues(section, existing, proposed, decision.fields ?? []);
        if (Object.keys(fields).length === 0) continue;
        await withMapLink(supabase, section, decision.id, fields);
        updates.push({ section, id: decision.id, fields });
        for (const date of linkedDayDates(LINKED_SECTION[section], { ...existing, ...fields })) linkedDates.add(date);
        continue;
      }

      const insert = await prepareInsert(section, row, tripId);
      await withMapLink(supabase, section, null, insert);
      inserts[section].push(insert);
      for (const date of linkedDayDates(LINKED_SECTION[section], insert)) linkedDates.add(date);
    }
  }

  const keyInfo = (result.key_info ?? []).map((k) => ({
    category:        str(k.category),
    label:           str(k.label),
    value:           str(k.value),
    url:             str(k.url),
    action_required: k.is_urgent === true,
  }));

  // Older previews (before 00.04.0032) used name / title / category.
  const packing = (result.packing_items ?? []).map((p) => ({
    text:      str(p.item) ?? str(p.name),
    category:  str(p.category),
    sub_group: str(p.sub_group),
  })).filter((p) => p.text);

  const checklist = (result.checklist_items ?? []).map((c) => {
    const dueDate = str(c.due_date);
    return {
      task:       str(c.task) ?? str(c.title),
      group_name: str(c.group) ?? str(c.category),
      due_date:   dueDate && /^\d{4}-\d{2}-\d{2}$/.test(dueDate) ? dueDate : null,
      notes:      str(c.notes),
    };
  }).filter((c) => c.task);

  return {
    days, rows,
    ...inserts,
    updates,
    linked_dates: [...linkedDates],
    key_info: keyInfo,
    packing,
    checklist,
    flag_resolutions: flagResolutions ?? null,
  };
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  let body: ConfirmBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { tripId, result, flagResolutions } = body;
  if (!tripId || typeof tripId !== 'string') {
    return Response.json({ error: 'tripId is required.' }, { status: 400 });
  }
  if (!result || typeof result !== 'object') {
    return Response.json({ error: 'result is required.' }, { status: 400 });
  }
  const decisions = Array.isArray(body.bookingDecisions)
    ? body.bookingDecisions.filter((d) =>
      d && typeof d.key === 'string' && BOOKING_SECTIONS.includes(d.section)
      && ['update', 'skip', 'add'].includes(d.action))
    : [];

  let supabase;
  try { supabase = tripServiceClient(); } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }

  const access = await requireTripMember(tripId, { role: 'advisor', supabase });
  if ('response' in access) return access.response;
  const userId = access.userId;

  try {
    const payload = await buildPayload(
      supabase, result, tripId, Array.isArray(flagResolutions) ? flagResolutions : [], decisions,
    );
    const { data, error } = await supabase.rpc('import_trip_document', {
      p_trip_id: tripId,
      p_user_id: userId,
      p_payload: payload,
    });
    if (error) throw new Error(error.message);

    const saved = (data ?? {}) as {
      counts?: Record<string, number>;
      updated?: Record<string, number>;
      skipped?: Record<string, number>;
      job_error?: string | null;
    };
    const counts = saved.counts ?? {};
    const updated = saved.updated ?? {};
    const skipped = saved.skipped ?? {};
    // The import saved; only its import_jobs record didn't.
    if (saved.job_error) {
      await logger.error('api/import/confirm', 'Import saved but its import_jobs record could not be written', {
        error: saved.job_error, counts, updated,
      }, tripId);
    }
    return Response.json({
      success: true, counts, updated, skipped,
      totalSections: new Set([...Object.keys(counts), ...Object.keys(updated)]).size,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!(error instanceof ImportProblem)) {
      await logger.error('api/import/confirm', 'Import could not be saved', { error: message }, tripId);
    }
    return Response.json(
      { error: `Nothing was imported: ${message}` },
      { status: error instanceof ImportProblem ? 409 : 500 },
    );
  }
}
