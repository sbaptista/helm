// Imported bookings (flights, hotels, transfers, restaurants): rows to insert,
// matching against bookings already on the trip, and field-by-field changes.
// Server-only (timezone lookups). docs/reimport-updates-plan.md

import { airportQuery, fillMissingTimezones, placeQuery } from '@/lib/geo/timezone-lookup';
import { formatZonedDateTime, instantToZonedInput, normalizeZonedDateTime } from '@/lib/zoned-time';
import type { BookingMatch, BookingSection, FieldChange, MatchCandidate } from '@/lib/import/match-types';
import { IMPORT_KEY } from '@/lib/import/match-types';

export type Row = Record<string, unknown>;

// ─── Value helpers ────────────────────────────────────────────────────────────

export function str(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() || null;
  if (typeof value === 'number') return String(value);
  return null;
}

export function importKey(row: Row): string | null {
  return str(row[IMPORT_KEY]);
}

// "8:00 AM", "08:00", "08:00:00" on a date → "YYYY-MM-DDTHH:MM:SS" (local).
export function toLocalDateTime(date: string | null | undefined, time: string | null | undefined): string | null {
  if (!date || !time) return null;
  let t = time.trim();
  const ampm = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (ampm) {
    let hours = parseInt(ampm[1], 10);
    const period = ampm[4].toUpperCase();
    if (period === 'AM' && hours === 12) hours = 0;
    if (period === 'PM' && hours !== 12) hours += 12;
    t = `${String(hours).padStart(2, '0')}:${ampm[2]}:${ampm[3] ?? '00'}`;
  } else {
    const parts = t.split(':');
    if (parts.length === 2) t = `${parts[0].padStart(2, '0')}:${parts[1]}:00`;
    else if (parts.length === 3) t = `${parts[0].padStart(2, '0')}:${parts[1]}:${parts[2]}`;
  }
  return `${date}T${t}`;
}

// A local date-time from the document, read in the place's timezone. Without a
// timezone it's left as written.
function instant(value: unknown, timezone: unknown): string | null {
  const s = str(value);
  if (!s) return null;
  return (normalizeZonedDateTime(s, timezone) as string | null) ?? null;
}

async function timezoneFor(query: string): Promise<string | null> {
  if (!query) return null;
  const zones = await fillMissingTimezones({}, [{ timezone: 'tz', query }]);
  return (zones.tz as string | undefined) ?? null;
}

// Comparison keys: case, spaces and punctuation ignored.
function textKey(value: unknown): string {
  return (str(value) ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function codeKey(value: unknown): string {
  return (str(value) ?? '').toUpperCase().replace(/[\s-]/g, '');
}

// "AC 123", "ac0123" and "AC123" are the same flight.
function flightKey(value: unknown): string {
  const code = codeKey(value);
  const match = code.match(/^([A-Z0-9]{2})(\d{1,5})([A-Z]?)$/);
  return match ? `${match[1]}${parseInt(match[2], 10)}${match[3]}` : code;
}

function localDate(iso: unknown, timezone: unknown): string | null {
  const s = str(iso);
  if (!s) return null;
  return instantToZonedInput(s, str(timezone)).date || null;
}

function formatDate(date: string | null): string {
  if (!date) return '';
  const d = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return date;
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(d);
}

function joinTitle(...parts: Array<string | null | undefined>): string {
  return parts.filter(Boolean).join(' · ');
}

// ─── Rows to insert ───────────────────────────────────────────────────────────

export async function prepareInsert(section: BookingSection, row: Row, tripId: string): Promise<Row> {
  switch (section) {
    case 'flights': {
      const origin = str(row.departure_airport)?.toUpperCase() ?? null;
      const destination = str(row.arrival_airport)?.toUpperCase() ?? null;
      const departureTimezone = await timezoneFor(airportQuery(origin));
      const arrivalTimezone = await timezoneFor(airportQuery(destination));
      return {
        trip_id:             tripId,
        flight_number:       str(row.flight_number),
        airline:             str(row.airline),
        origin_airport:      origin,
        destination_airport: destination,
        departure_time:      instant(row.departure_time, departureTimezone),
        arrival_time:        instant(row.arrival_time, arrivalTimezone),
        departure_timezone:  departureTimezone,
        arrival_timezone:    arrivalTimezone,
        confirmation_number: str(row.confirmation_code),
        notes:               str(row.notes),
        show_in_itinerary:   true,
      };
    }
    case 'hotels': {
      const address = str(row.address) ?? str(row.location);
      const city = str(row.city);
      return {
        trip_id:             tripId,
        name:                str(row.name),
        address,
        city,
        check_in_date:       str(row.check_in_date),
        check_out_date:      str(row.check_out_date),
        confirmation_number: str(row.confirmation_code),
        phone:               str(row.phone),
        notes:               str(row.notes),
        timezone:            await timezoneFor(placeQuery({ address, city })),
        show_in_itinerary:   true,
      };
    }
    case 'transportation': {
      const origin = str(row.departure_location);
      const destination = str(row.arrival_location);
      const departureTimezone = await timezoneFor(origin ?? '');
      const arrivalTimezone = await timezoneFor(destination ?? '');
      return {
        trip_id:             tripId,
        type:                str(row.type),
        origin,
        destination,
        departure_time:      instant(row.departure_time, departureTimezone),
        arrival_time:        instant(row.arrival_time, arrivalTimezone ?? departureTimezone),
        departure_timezone:  departureTimezone,
        arrival_timezone:    arrivalTimezone,
        confirmation_number: str(row.confirmation_code),
        notes:               [str(row.description), str(row.notes)].filter(Boolean).join('\n') || null,
        show_in_itinerary:   true,
      };
    }
    case 'restaurants': {
      const address = str(row.address) ?? str(row.location);
      const city = str(row.city);
      const timezone = await timezoneFor(placeQuery({ address, city }));
      return {
        trip_id:             tripId,
        name:                str(row.name),
        address,
        city,
        reservation_time:    instant(toLocalDateTime(str(row.date), str(row.time)), timezone),
        confirmation_number: str(row.confirmation_code),
        type:                restaurantType(row.type),
        notes:               str(row.notes),
        timezone,
        show_in_itinerary:   true,
      };
    }
  }
}

// restaurants_type_check allows only these two; anything else is independent.
function restaurantType(value: unknown): string | null {
  const t = str(value);
  return t === null ? null : t === 'included' ? 'included' : 'independent';
}

// ─── Matching (D1) ────────────────────────────────────────────────────────────

export function findCandidates(section: BookingSection, imported: Row, existing: Row[]): Row[] {
  const conf = codeKey(imported.confirmation_code);
  const sameConf = (r: Row) => conf !== '' && codeKey(r.confirmation_number) === conf;

  switch (section) {
    case 'flights': {
      const flight = flightKey(imported.flight_number);
      if (!flight) return [];
      const date = str(imported.departure_time)?.slice(0, 10) ?? null;
      return existing.filter((r) =>
        flightKey(r.flight_number) === flight
        && (sameConf(r) || (date !== null && localDate(r.departure_time, r.departure_timezone) === date)));
    }
    case 'hotels': {
      const name = textKey(imported.name);
      const checkIn = str(imported.check_in_date);
      return existing.filter((r) =>
        sameConf(r) || (name !== '' && checkIn !== null && textKey(r.name) === name && str(r.check_in_date) === checkIn));
    }
    case 'transportation': {
      const type = textKey(imported.type);
      const origin = textKey(imported.departure_location);
      const destination = textKey(imported.arrival_location);
      const date = str(imported.departure_time)?.slice(0, 10) ?? null;
      return existing.filter((r) =>
        (sameConf(r) && (type === '' || textKey(r.type) === '' || textKey(r.type) === type))
        || (origin !== '' && destination !== '' && date !== null
          && textKey(r.origin) === origin && textKey(r.destination) === destination
          && localDate(r.departure_time, r.departure_timezone) === date));
    }
    case 'restaurants': {
      const name = textKey(imported.name);
      const date = str(imported.date);
      return existing.filter((r) =>
        sameConf(r) || (name !== '' && date !== null && textKey(r.name) === name && localDate(r.reservation_time, r.timezone) === date));
    }
  }
}

// ─── Proposed values for an existing booking ─────────────────────────────────

type Kind = 'text' | 'code' | 'flight' | 'instant' | 'date';

interface FieldSpec {
  field:       string;
  label:       string;
  kind:        Kind;
  tz?:         string;    // for instants: the timezone column they're shown in
  companions?: string[];  // saved with this field when it's accepted
}

const FIELDS: Record<BookingSection, FieldSpec[]> = {
  flights: [
    { field: 'flight_number',       label: 'Flight number', kind: 'flight' },
    { field: 'airline',             label: 'Airline',       kind: 'text' },
    { field: 'origin_airport',      label: 'From',          kind: 'code', companions: ['departure_timezone'] },
    { field: 'destination_airport', label: 'To',            kind: 'code', companions: ['arrival_timezone'] },
    { field: 'departure_time',      label: 'Departs',       kind: 'instant', tz: 'departure_timezone' },
    { field: 'arrival_time',        label: 'Arrives',       kind: 'instant', tz: 'arrival_timezone' },
    { field: 'confirmation_number', label: 'Confirmation',  kind: 'code' },
  ],
  hotels: [
    { field: 'name',                label: 'Hotel',         kind: 'text' },
    { field: 'address',             label: 'Address',       kind: 'text', companions: ['timezone'] },
    { field: 'city',                label: 'City',          kind: 'text', companions: ['timezone'] },
    { field: 'check_in_date',       label: 'Check-in',      kind: 'date' },
    { field: 'check_out_date',      label: 'Check-out',     kind: 'date' },
    { field: 'confirmation_number', label: 'Confirmation',  kind: 'code' },
    { field: 'phone',               label: 'Phone',         kind: 'text' },
  ],
  transportation: [
    { field: 'type',                label: 'Type',          kind: 'text' },
    { field: 'origin',              label: 'From',          kind: 'text', companions: ['departure_timezone'] },
    { field: 'destination',         label: 'To',            kind: 'text', companions: ['arrival_timezone'] },
    { field: 'departure_time',      label: 'Departs',       kind: 'instant', tz: 'departure_timezone' },
    { field: 'arrival_time',        label: 'Arrives',       kind: 'instant', tz: 'arrival_timezone' },
    { field: 'confirmation_number', label: 'Confirmation',  kind: 'code' },
  ],
  restaurants: [
    { field: 'name',                label: 'Restaurant',    kind: 'text' },
    { field: 'address',             label: 'Address',       kind: 'text', companions: ['timezone'] },
    { field: 'city',                label: 'City',          kind: 'text', companions: ['timezone'] },
    { field: 'reservation_time',    label: 'Reservation',   kind: 'instant', tz: 'timezone' },
    { field: 'type',                label: 'Type',          kind: 'text' },
    { field: 'confirmation_number', label: 'Confirmation',  kind: 'code' },
  ],
};

// The values the document would give an existing booking. Places that haven't
// changed keep the booking's own timezone (no lookup); empty values from the
// document are left out, so an import never clears a field (D3).
export async function proposedValues(section: BookingSection, imported: Row, existing: Row): Promise<Row> {
  const values: Row = {};
  const set = (field: string, value: unknown) => {
    if (value !== null && value !== undefined && value !== '') values[field] = value;
  };

  switch (section) {
    case 'flights': {
      const origin = str(imported.departure_airport)?.toUpperCase() ?? null;
      const destination = str(imported.arrival_airport)?.toUpperCase() ?? null;
      const departureTz = origin && codeKey(origin) !== codeKey(existing.origin_airport)
        ? (await timezoneFor(airportQuery(origin))) ?? str(existing.departure_timezone)
        : str(existing.departure_timezone);
      const arrivalTz = destination && codeKey(destination) !== codeKey(existing.destination_airport)
        ? (await timezoneFor(airportQuery(destination))) ?? str(existing.arrival_timezone)
        : str(existing.arrival_timezone);
      set('flight_number', str(imported.flight_number));
      set('airline', str(imported.airline));
      set('origin_airport', origin);
      set('destination_airport', destination);
      set('departure_time', instant(imported.departure_time, departureTz));
      set('arrival_time', instant(imported.arrival_time, arrivalTz));
      set('confirmation_number', str(imported.confirmation_code));
      set('departure_timezone', departureTz);
      set('arrival_timezone', arrivalTz);
      break;
    }
    case 'hotels': {
      const address = str(imported.address) ?? str(imported.location);
      const city = str(imported.city);
      const moved = (address !== null && textKey(address) !== textKey(existing.address))
        || (city !== null && textKey(city) !== textKey(existing.city));
      const timezone = moved
        ? (await timezoneFor(placeQuery({ address: address ?? str(existing.address), city: city ?? str(existing.city) }))) ?? str(existing.timezone)
        : str(existing.timezone);
      set('name', str(imported.name));
      set('address', address);
      set('city', city);
      set('check_in_date', str(imported.check_in_date));
      set('check_out_date', str(imported.check_out_date));
      set('confirmation_number', str(imported.confirmation_code));
      set('phone', str(imported.phone));
      set('timezone', timezone);
      break;
    }
    case 'transportation': {
      const origin = str(imported.departure_location);
      const destination = str(imported.arrival_location);
      const departureTz = origin && textKey(origin) !== textKey(existing.origin)
        ? (await timezoneFor(origin)) ?? str(existing.departure_timezone)
        : str(existing.departure_timezone);
      const arrivalTz = destination && textKey(destination) !== textKey(existing.destination)
        ? (await timezoneFor(destination)) ?? str(existing.arrival_timezone)
        : str(existing.arrival_timezone);
      set('type', str(imported.type));
      set('origin', origin);
      set('destination', destination);
      set('departure_time', instant(imported.departure_time, departureTz));
      set('arrival_time', instant(imported.arrival_time, arrivalTz ?? departureTz));
      set('confirmation_number', str(imported.confirmation_code));
      set('departure_timezone', departureTz);
      set('arrival_timezone', arrivalTz);
      break;
    }
    case 'restaurants': {
      const address = str(imported.address) ?? str(imported.location);
      const city = str(imported.city);
      const moved = (address !== null && textKey(address) !== textKey(existing.address))
        || (city !== null && textKey(city) !== textKey(existing.city));
      const timezone = moved
        ? (await timezoneFor(placeQuery({ address: address ?? str(existing.address), city: city ?? str(existing.city) }))) ?? str(existing.timezone)
        : str(existing.timezone);
      set('name', str(imported.name));
      set('address', address);
      set('city', city);
      set('reservation_time', instant(toLocalDateTime(str(imported.date), str(imported.time)), timezone));
      set('type', restaurantType(imported.type));
      set('confirmation_number', str(imported.confirmation_code));
      set('timezone', timezone);
      break;
    }
  }
  return values;
}

function sameValue(kind: Kind, a: unknown, b: unknown): boolean {
  switch (kind) {
    case 'text':    return textKey(a) === textKey(b);
    case 'code':    return codeKey(a) === codeKey(b);
    case 'flight':  return flightKey(a) === flightKey(b);
    case 'date':    return (str(a) ?? '').slice(0, 10) === (str(b) ?? '').slice(0, 10);
    case 'instant': {
      const ta = Date.parse(str(a) ?? '');
      const tb = Date.parse(str(b) ?? '');
      return Number.isNaN(ta) || Number.isNaN(tb) ? str(a) === str(b) : ta === tb;
    }
  }
}

function display(spec: FieldSpec, value: unknown, timezone: unknown): string {
  const s = str(value);
  if (!s) return '—';
  if (spec.kind === 'instant') return formatZonedDateTime(s, str(timezone));
  if (spec.kind === 'date') return formatDate(s.slice(0, 10));
  return s;
}

// Fields the document would change, as old → new.
export function changesFor(section: BookingSection, existing: Row, proposed: Row): FieldChange[] {
  const changes: FieldChange[] = [];
  for (const spec of FIELDS[section]) {
    if (!(spec.field in proposed)) continue;
    if (sameValue(spec.kind, existing[spec.field], proposed[spec.field])) continue;
    changes.push({
      field:   spec.field,
      label:   spec.label,
      oldText: display(spec, existing[spec.field], spec.tz ? existing[spec.tz] : null),
      newText: display(spec, proposed[spec.field], spec.tz ? (proposed[spec.tz] ?? existing[spec.tz]) : null),
    });
  }
  return changes;
}

// The columns to save for the changes Stan accepted (with their timezones).
export function acceptedValues(section: BookingSection, existing: Row, proposed: Row, accepted: string[]): Row {
  const changed = new Set(changesFor(section, existing, proposed).map((c) => c.field));
  const fields: Row = {};
  for (const spec of FIELDS[section]) {
    if (!accepted.includes(spec.field) || !changed.has(spec.field)) continue;
    fields[spec.field] = proposed[spec.field];
    for (const companion of spec.companions ?? []) {
      if (companion in proposed) fields[companion] = proposed[companion];
    }
  }
  return fields;
}

// ─── Titles ───────────────────────────────────────────────────────────────────

export function importedTitle(section: BookingSection, row: Row): string {
  switch (section) {
    case 'flights':
      return joinTitle(`Flight ${str(row.flight_number) ?? ''}`.trim(), formatDate(str(row.departure_time)?.slice(0, 10) ?? null));
    case 'hotels':
      return joinTitle(str(row.name) ?? 'Hotel', formatDate(str(row.check_in_date)));
    case 'transportation':
      return joinTitle(
        str(row.type) ?? 'Transfer',
        [str(row.departure_location), str(row.arrival_location)].filter(Boolean).join(' → ') || null,
        formatDate(str(row.departure_time)?.slice(0, 10) ?? null),
      );
    case 'restaurants':
      return joinTitle(str(row.name) ?? 'Restaurant', formatDate(str(row.date)));
  }
}

function existingLabel(section: BookingSection, row: Row): string {
  const conf = str(row.confirmation_number);
  const confText = conf ? `Confirmation ${conf}` : null;
  switch (section) {
    case 'flights':
      return joinTitle(str(row.flight_number), formatZonedDateTime(str(row.departure_time), str(row.departure_timezone)), confText);
    case 'hotels':
      return joinTitle(str(row.name), formatDate(str(row.check_in_date)), confText);
    case 'transportation':
      return joinTitle(str(row.type), formatZonedDateTime(str(row.departure_time), str(row.departure_timezone)), confText);
    case 'restaurants':
      return joinTitle(str(row.name), formatZonedDateTime(str(row.reservation_time), str(row.timezone)), confText);
  }
}

// ─── Matches for a preview ───────────────────────────────────────────────────

export async function matchBookings(
  imported: Partial<Record<BookingSection, Row[]>>,
  existing: Record<BookingSection, Row[]>,
): Promise<BookingMatch[]> {
  const matches: BookingMatch[] = [];
  for (const section of Object.keys(existing) as BookingSection[]) {
    for (const row of imported[section] ?? []) {
      const key = importKey(row);
      if (!key) continue;
      const found = findCandidates(section, row, existing[section]);
      if (found.length === 0) continue;
      const candidates: MatchCandidate[] = [];
      for (const candidate of found) {
        const proposed = await proposedValues(section, row, candidate);
        candidates.push({
          id:      String(candidate.id),
          label:   existingLabel(section, candidate),
          changes: changesFor(section, candidate, proposed),
        });
      }
      matches.push({
        key,
        section,
        title: importedTitle(section, row),
        status: candidates.length > 1 ? 'ambiguous' : candidates[0].changes.length > 0 ? 'changes' : 'same',
        candidates,
      });
    }
  }
  return matches;
}
