'use client';

import React, { useState } from 'react';
import { ResponsiveSheet } from '@/components/ui/ResponsiveSheet';
import { FormField, inputStyle, inputFocusStyle } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';
import { AIRPORT_LOOKUP } from '@/lib/gcal/timezones';
import { useToast } from '@/components/ui/Toast';
import WarnBadge from '@/components/ui/WarnBadge';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Flight {
  id: string;
  flight_number: string | null;
  airline: string | null;
  origin_airport: string | null;
  destination_airport: string | null;
  origin_city: string | null;
  destination_city: string | null;
  departure_time: string | null;
  arrival_time: string | null;
  departure_timezone: string | null;
  arrival_timezone: string | null;
  cabin_class: string | null;
  seat_number: string | null;
  confirmation_number: string | null;
  departure_terminal: string | null;
  departure_gate: string | null;
  arrival_terminal: string | null;
  arrival_gate: string | null;
  notes: string | null;
  gcal_include: boolean;
  action_required: boolean;
}

interface FlightForm {
  flight_number: string;
  airline: string;
  origin_airport: string;
  destination_airport: string;
  origin_city: string;
  destination_city: string;
  departure_date: string;
  departure_time_val: string;
  arrival_date: string;
  arrival_time_val: string;
  departure_timezone: string;
  arrival_timezone: string;
  cabin_class: string;
  seat_number: string;
  confirmation_number: string;
  departure_terminal: string;
  departure_gate: string;
  arrival_terminal: string;
  arrival_gate: string;
  notes: string;
  gcal_include: boolean;
  action_required: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TIMEZONE_OPTIONS = [
  { value: 'Pacific/Honolulu',    label: 'Honolulu (HST)' },
  { value: 'America/Los_Angeles', label: 'Seattle / Pacific (PDT/PST)' },
  { value: 'America/Vancouver',   label: 'Vancouver / Kamloops (PDT/PST)' },
  { value: 'America/Edmonton',    label: 'Jasper / Banff (MDT/MST)' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EMPTY_FORM: FlightForm = {
  flight_number: '',
  airline: '',
  origin_airport: '',
  destination_airport: '',
  origin_city: '',
  destination_city: '',
  departure_date: '',
  departure_time_val: '',
  arrival_date: '',
  arrival_time_val: '',
  departure_timezone: '',
  arrival_timezone: '',
  cabin_class: '',
  seat_number: '',
  confirmation_number: '',
  departure_terminal: '',
  departure_gate: '',
  arrival_terminal: '',
  arrival_gate: '',
  notes: '',
  gcal_include: false,
  action_required: false,
};

function splitDatetime(iso: string | null): [string, string] {
  if (!iso) return ['', ''];
  const tIdx = iso.indexOf('T');
  if (tIdx === -1) return [iso, ''];
  const date = iso.slice(0, tIdx);
  const time = iso.slice(tIdx + 1, tIdx + 6); // HH:MM
  return [date, time];
}

function joinDatetime(date: string, time: string): string | null {
  if (!date) return null;
  return `${date}T${time || '00:00'}:00`;
}

function flightToForm(f: Flight): FlightForm {
  const [depDate, depTime] = splitDatetime(f.departure_time);
  const [arrDate, arrTime] = splitDatetime(f.arrival_time);
  return {
    flight_number:       f.flight_number       ?? '',
    airline:             f.airline             ?? '',
    origin_airport:      f.origin_airport      ?? '',
    destination_airport: f.destination_airport ?? '',
    origin_city:         f.origin_city         ?? '',
    destination_city:    f.destination_city    ?? '',
    departure_date:      depDate,
    departure_time_val:  depTime,
    arrival_date:        arrDate,
    arrival_time_val:    arrTime,
    departure_timezone:  f.departure_timezone  ?? '',
    arrival_timezone:    f.arrival_timezone    ?? '',
    cabin_class:         f.cabin_class         ?? '',
    seat_number:         f.seat_number         ?? '',
    confirmation_number: f.confirmation_number ?? '',
    departure_terminal:  f.departure_terminal  ?? '',
    departure_gate:      f.departure_gate      ?? '',
    arrival_terminal:    f.arrival_terminal    ?? '',
    arrival_gate:        f.arrival_gate        ?? '',
    notes:               f.notes               ?? '',
    gcal_include:        f.gcal_include        ?? false,
    action_required:     f.action_required     ?? false,
  };
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  const [datePart, rest] = iso.split('T');
  if (!datePart || !rest) return iso;
  const [year, month, day] = datePart.split('-').map(Number);
  const timeStr = rest.split(/[+Z]/)[0];
  const [h, m] = timeStr.split(':').map(Number);
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const weekday = weekdays[new Date(year, month - 1, day).getDay()];
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${weekday}, ${months[month - 1]} ${day} · ${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

function formatTimezoneAbbrev(tz: string | null): string {
  if (!tz) return '';
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' })
      .formatToParts(new Date())
      .find(p => p.type === 'timeZoneName')?.value ?? '';
  } catch {
    return '';
  }
}

function applyAirportLookup(
  code: string,
  side: 'origin' | 'destination',
  setForm: React.Dispatch<React.SetStateAction<FlightForm>>,
) {
  const entry = AIRPORT_LOOKUP[code.toUpperCase()];
  if (!entry) return;
  setForm(prev => ({
    ...prev,
    [side === 'origin' ? 'origin_city' : 'destination_city']: entry.city,
    [side === 'origin' ? 'departure_timezone' : 'arrival_timezone']: entry.timezone,
  }));
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FlightsClient({
  tripId,
  initialFlights,
}: {
  tripId: string;
  initialFlights: Flight[];
}) {
  const [flights, setFlights] = useState<Flight[]>(initialFlights);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editFlight, setEditFlight] = useState<Flight | null>(null);
  const [form, setForm] = useState<FlightForm>(EMPTY_FORM);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isAdd = editFlight === null;

  function getFlightWarns(flight: Flight): string[] {
    const warns: string[] = [];
    if (flight.action_required) warns.push('Action Required');
    if (!flight.departure_time) warns.push('Missing Departure Time');
    if (!flight.arrival_time) warns.push('Missing Arrival Time');
    return warns;
  }

  const warnCount = flights.filter(f => getFlightWarns(f).length > 0).length;

  function fieldStyle(name: string): React.CSSProperties {
    return focusedField === name ? inputFocusStyle() : inputStyle();
  }

  function setField<K extends keyof FlightForm>(key: K, value: FlightForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const openAdd = () => {
    setEditFlight(null);
    setForm(EMPTY_FORM);
    setDeleteConfirm(false);
    setSheetOpen(true);
  };

  const openEdit = (f: Flight) => {
    setEditFlight(f);
    setForm(flightToForm(f));
    setDeleteConfirm(false);
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setDeleteConfirm(false);
  };

  const refetch = async () => {
    try {
      const res = await fetch(`/api/trips/${tripId}/flights`);
      if (res.ok) {
        const json = await res.json();
        setFlights(json.flights ?? []);
      }
    } catch {}
  };

  const handleSave = async () => {
    if (!form.flight_number?.trim()) {
      toast.error('Flight number is required.');
      return;
    }
    if (!form.airline?.trim()) {
      toast.error('Airline name is required.');
      return;
    }
    if (form.departure_time_val && !form.departure_date) {
      toast.error('A departure date is required when departure time is set.');
      return;
    }
    if (form.arrival_time_val && !form.arrival_date) {
      toast.error('An arrival date is required when arrival time is set.');
      return;
    }
    if (
      form.departure_date && form.departure_time_val &&
      form.arrival_date && form.arrival_time_val
    ) {
      const dep = new Date(`${form.departure_date}T${form.departure_time_val}`);
      const arr = new Date(`${form.arrival_date}T${form.arrival_time_val}`);
      if (arr <= dep) {
        toast.error('Arrival must be after departure.');
        return;
      }
    }
    setSaving(true);
    try {
      const body = {
        flight_number:       form.flight_number       || null,
        airline:             form.airline             || null,
        origin_airport:      form.origin_airport      || null,
        destination_airport: form.destination_airport || null,
        origin_city:         form.origin_city         || null,
        destination_city:    form.destination_city    || null,
        departure_time:      joinDatetime(form.departure_date, form.departure_time_val),
        arrival_time:        joinDatetime(form.arrival_date,   form.arrival_time_val),
        departure_timezone:  form.departure_timezone  || null,
        arrival_timezone:    form.arrival_timezone    || null,
        cabin_class:         form.cabin_class         || null,
        seat_number:         form.seat_number         || null,
        confirmation_number: form.confirmation_number || null,
        departure_terminal:  form.departure_terminal  || null,
        departure_gate:      form.departure_gate      || null,
        arrival_terminal:    form.arrival_terminal    || null,
        arrival_gate:        form.arrival_gate        || null,
        notes:               form.notes               || null,
        gcal_include:        form.gcal_include,
        action_required:     form.action_required,
      };

      const res = isAdd
        ? await fetch(`/api/trips/${tripId}/flights`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
        : await fetch(`/api/flights/${editFlight!.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Something went wrong.');
      window.dispatchEvent(new CustomEvent('gcal:dirty'));
      await refetch();
      closeSheet();
    } catch {
      toast.show('Something went wrong. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editFlight) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/flights/${editFlight.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Something went wrong.');
      await refetch();
      closeSheet();
    } catch {
      toast.show('Something went wrong. Please try again.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const toggleActionRequired = async (f: Flight, e: React.MouseEvent) => {
    e.stopPropagation();
    const newVal = !f.action_required;
    setFlights(prev => prev.map(fl => fl.id === f.id ? { ...fl, action_required: newVal } : fl));
    try {
      await fetch(`/api/flights/${f.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action_required: newVal }),
      });
    } catch {
      setFlights(prev => prev.map(fl => fl.id === f.id ? { ...fl, action_required: f.action_required } : fl));
      toast.show('Could not update. Please try again.', 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Add button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="secondary" size="sm" onClick={openAdd}>
          Add Flight
        </Button>
      </div>

      {/* Warn banner */}
      {warnCount > 0 && (
        <div style={{
          backgroundColor: 'var(--action)',
          color: 'var(--action-text)',
          fontSize: 'var(--fs-sm)',
          fontWeight: 'var(--fw-medium)',
          padding: '8px 16px',
          borderRadius: '6px',
          marginBottom: '12px',
        }}>
          ⚠ {warnCount} {warnCount === 1 ? 'item needs' : 'items need'} attention
        </div>
      )}

      {/* Flight list */}
      {flights.length === 0 ? (
        <p style={{
          fontFamily: "'Lato', sans-serif",
          fontSize: 'var(--fs-sm)',
          color: 'var(--text3)',
          padding: '48px 0',
          textAlign: 'center',
        }}>
          No flights yet.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {flights.map((f) => (
            <div
              key={f.id}
              role="button"
              tabIndex={0}
              onClick={() => openEdit(f)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openEdit(f); } }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg3)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg2)'; }}
              style={{
                background: 'var(--bg2)',
                border: '1px solid var(--border2)',
                borderRadius: 'var(--r-lg)',
                padding: '20px 24px',
                boxShadow: 'var(--shadow)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                cursor: 'pointer',
                transition: 'background var(--transition)',
                minHeight: '44px',
              }}
            >
              {/* Airline + flight number + cabin + flag */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {f.airline && (
                  <span style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-bold)', color: 'var(--text)' }}>
                    {f.airline}
                  </span>
                )}
                {f.flight_number && (
                  <span style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)', color: 'var(--text3)' }}>
                    {f.flight_number}
                  </span>
                )}
                {f.cabin_class && (
                  <span style={{
                    fontFamily: "'Lato', sans-serif",
                    fontSize: 'var(--fs-xs)',
                    fontWeight: 'var(--fw-bold)',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    color: 'var(--gold-text)',
                    background: 'var(--bg3)',
                    border: '1px solid var(--border)',
                    borderRadius: '20px',
                    padding: '3px 10px',
                  }}>
                    {f.cabin_class}
                  </span>
                )}
                <button
                  type="button"
                  onClick={(e) => toggleActionRequired(f, e)}
                  aria-label={f.action_required ? 'Clear action required' : 'Mark action required'}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '15px',
                    opacity: f.action_required ? 1 : 0.22,
                    marginLeft: 'auto',
                    padding: '4px',
                    lineHeight: 1,
                    minHeight: '44px',
                  }}
                >
                  🚩
                </button>
              </div>

              {/* Warn badges */}
              {getFlightWarns(f).length > 0 && (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {getFlightWarns(f).map(w => (
                    <WarnBadge key={w} label={w} />
                  ))}
                </div>
              )}

              {/* Route */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'var(--fs-2xl)', fontWeight: 'var(--fw-medium)', color: 'var(--navy)', letterSpacing: '0.02em', lineHeight: 1 }}>
                    {f.origin_airport ?? '—'}
                  </span>
                  {f.origin_city && (
                    <span style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-xs)', color: 'var(--text3)', marginTop: '2px' }}>
                      {f.origin_city}
                    </span>
                  )}
                </div>
                <svg width="24" height="12" viewBox="0 0 24 12" fill="none" aria-hidden="true" style={{ color: 'var(--text3)', flexShrink: 0, marginTop: '6px' }}>
                  <path d="M2 6h20M16 2l6 4-6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'var(--fs-2xl)', fontWeight: 'var(--fw-medium)', color: 'var(--navy)', letterSpacing: '0.02em', lineHeight: 1 }}>
                    {f.destination_airport ?? '—'}
                  </span>
                  {f.destination_city && (
                    <span style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-xs)', color: 'var(--text3)', marginTop: '2px' }}>
                      {f.destination_city}
                    </span>
                  )}
                </div>
              </div>

              {/* Departs */}
              <div style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)', color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: 'var(--text2)', fontWeight: 'var(--fw-bold)', minWidth: '56px' }}>Departs</span>
                <span>{formatDateTime(f.departure_time)}</span>
                {f.departure_timezone && (
                  <span style={{ opacity: 0.6 }}>{formatTimezoneAbbrev(f.departure_timezone)}</span>
                )}
              </div>

              {/* Arrives */}
              <div style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)', color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: 'var(--text2)', fontWeight: 'var(--fw-bold)', minWidth: '56px' }}>Arrives</span>
                <span>{formatDateTime(f.arrival_time)}</span>
                {f.arrival_timezone && (
                  <span style={{ opacity: 0.6 }}>{formatTimezoneAbbrev(f.arrival_timezone)}</span>
                )}
              </div>

              {/* Seat */}
              {f.seat_number && (
                <div style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)', color: 'var(--text3)' }}>
                  <span style={{ fontWeight: 'var(--fw-bold)', color: 'var(--text2)' }}>Seat: </span>
                  {f.seat_number}
                </div>
              )}

              {/* Confirmation */}
              {f.confirmation_number && (
                <div style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)', color: 'var(--text3)' }}>
                  <span style={{ fontWeight: 'var(--fw-bold)', color: 'var(--text2)' }}>Conf: </span>
                  {f.confirmation_number}
                </div>
              )}

              {/* Departure terminal / gate */}
              {(f.departure_terminal || f.departure_gate) && (
                <div style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)', color: 'var(--text3)' }}>
                  <span style={{ fontWeight: 'var(--fw-bold)', color: 'var(--text2)' }}>Dep: </span>
                  {[f.departure_terminal, f.departure_gate].filter(Boolean).join(' · ')}
                </div>
              )}

              {/* Arrival terminal / gate */}
              {(f.arrival_terminal || f.arrival_gate) && (
                <div style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)', color: 'var(--text3)' }}>
                  <span style={{ fontWeight: 'var(--fw-bold)', color: 'var(--text2)' }}>Arr: </span>
                  {[f.arrival_terminal, f.arrival_gate].filter(Boolean).join(' · ')}
                </div>
              )}

              {/* Notes */}
              {f.notes && (
                <p className="line-clamp-3" style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)', color: 'var(--text3)', lineHeight: 1.5, marginTop: '2px' }}>
                  {f.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Bottom sheet */}
      <ResponsiveSheet
        open={sheetOpen}
        onClose={closeSheet}
        title={isAdd ? 'Add Flight' : 'Edit Flight'}
        primaryAction={{
          label:    isAdd ? 'Add Flight' : 'Save Changes',
          onClick:  handleSave,
          loading:  saving,
          disabled: saving || deleting,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Flight Number */}
          <FormField label="Flight Number" htmlFor="fl-flight-number">
            <input
              id="fl-flight-number"
              type="text"
              value={form.flight_number}
              onChange={(e) => setField('flight_number', e.target.value)}
              onFocus={() => setFocusedField('flight_number')}
              onBlur={() => setFocusedField(null)}
              style={fieldStyle('flight_number')}
              placeholder="e.g. UA 1234"
              autoComplete="off"
            />
          </FormField>

          {/* Airline */}
          <FormField label="Airline" htmlFor="fl-airline">
            <input
              id="fl-airline"
              type="text"
              value={form.airline}
              onChange={(e) => setField('airline', e.target.value)}
              onFocus={() => setFocusedField('airline')}
              onBlur={() => setFocusedField(null)}
              style={fieldStyle('airline')}
              placeholder="e.g. United Airlines"
              autoComplete="off"
            />
          </FormField>

          {/* Route — airport codes side by side */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1 }}>
              <FormField label="From (Airport Code)" htmlFor="fl-origin">
                <input
                  id="fl-origin"
                  type="text"
                  value={form.origin_airport}
                  onChange={(e) => setField('origin_airport', e.target.value.toUpperCase())}
                  onFocus={() => setFocusedField('origin_airport')}
                  onBlur={() => {
                    setFocusedField(null);
                    applyAirportLookup(form.origin_airport, 'origin', setForm);
                  }}
                  style={{ ...fieldStyle('origin_airport'), textTransform: 'uppercase' }}
                  placeholder="JFK"
                  maxLength={4}
                  autoComplete="off"
                />
              </FormField>
            </div>
            <div style={{ flex: 1 }}>
              <FormField label="To (Airport Code)" htmlFor="fl-destination">
                <input
                  id="fl-destination"
                  type="text"
                  value={form.destination_airport}
                  onChange={(e) => setField('destination_airport', e.target.value.toUpperCase())}
                  onFocus={() => setFocusedField('destination_airport')}
                  onBlur={() => {
                    setFocusedField(null);
                    applyAirportLookup(form.destination_airport, 'destination', setForm);
                  }}
                  style={{ ...fieldStyle('destination_airport'), textTransform: 'uppercase' }}
                  placeholder="LHR"
                  maxLength={4}
                  autoComplete="off"
                />
              </FormField>
            </div>
          </div>

          {/* City names side by side */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1 }}>
              <FormField label="Origin City" htmlFor="fl-origin-city">
                <input
                  id="fl-origin-city"
                  type="text"
                  value={form.origin_city}
                  onChange={(e) => setField('origin_city', e.target.value)}
                  onFocus={() => setFocusedField('origin_city')}
                  onBlur={() => setFocusedField(null)}
                  style={fieldStyle('origin_city')}
                  placeholder="e.g. Honolulu, HI"
                  autoComplete="off"
                />
              </FormField>
            </div>
            <div style={{ flex: 1 }}>
              <FormField label="Destination City" htmlFor="fl-dest-city">
                <input
                  id="fl-dest-city"
                  type="text"
                  value={form.destination_city}
                  onChange={(e) => setField('destination_city', e.target.value)}
                  onFocus={() => setFocusedField('destination_city')}
                  onBlur={() => setFocusedField(null)}
                  style={fieldStyle('destination_city')}
                  placeholder="e.g. Vancouver, BC"
                  autoComplete="off"
                />
              </FormField>
            </div>
          </div>

          {/* Departure — date + time */}
          <FormField label="Departure">
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="date"
                value={form.departure_date}
                onChange={(e) => setField('departure_date', e.target.value)}
                onFocus={() => setFocusedField('departure_date')}
                onBlur={() => setFocusedField(null)}
                style={{ ...fieldStyle('departure_date'), flex: 1 }}
              />
              <input
                type="time"
                value={form.departure_time_val}
                onChange={(e) => setField('departure_time_val', e.target.value)}
                onFocus={() => setFocusedField('departure_time')}
                onBlur={() => setFocusedField(null)}
                style={{ ...fieldStyle('departure_time'), flex: 1 }}
              />
            </div>
          </FormField>

          {/* Departure Timezone */}
          <FormField label="Departure Timezone" htmlFor="fl-dep-tz">
            <select
              id="fl-dep-tz"
              value={form.departure_timezone}
              onChange={(e) => setField('departure_timezone', e.target.value)}
              onFocus={() => setFocusedField('departure_timezone')}
              onBlur={() => setFocusedField(null)}
              style={{ ...fieldStyle('departure_timezone'), cursor: 'pointer' }}
            >
              <option value="">Select…</option>
              {TIMEZONE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </FormField>

          {/* Arrival — date + time */}
          <FormField label="Arrival">
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="date"
                value={form.arrival_date}
                onChange={(e) => setField('arrival_date', e.target.value)}
                onFocus={() => setFocusedField('arrival_date')}
                onBlur={() => setFocusedField(null)}
                style={{ ...fieldStyle('arrival_date'), flex: 1 }}
              />
              <input
                type="time"
                value={form.arrival_time_val}
                onChange={(e) => setField('arrival_time_val', e.target.value)}
                onFocus={() => setFocusedField('arrival_time')}
                onBlur={() => setFocusedField(null)}
                style={{ ...fieldStyle('arrival_time'), flex: 1 }}
              />
            </div>
          </FormField>

          {/* Arrival Timezone */}
          <FormField label="Arrival Timezone" htmlFor="fl-arr-tz">
            <select
              id="fl-arr-tz"
              value={form.arrival_timezone}
              onChange={(e) => setField('arrival_timezone', e.target.value)}
              onFocus={() => setFocusedField('arrival_timezone')}
              onBlur={() => setFocusedField(null)}
              style={{ ...fieldStyle('arrival_timezone'), cursor: 'pointer' }}
            >
              <option value="">Select…</option>
              {TIMEZONE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </FormField>

          {/* Cabin Class */}
          <FormField label="Cabin Class" htmlFor="fl-cabin">
            <select
              id="fl-cabin"
              value={form.cabin_class}
              onChange={(e) => setField('cabin_class', e.target.value)}
              onFocus={() => setFocusedField('cabin_class')}
              onBlur={() => setFocusedField(null)}
              style={{ ...fieldStyle('cabin_class'), cursor: 'pointer' }}
            >
              <option value="">Select…</option>
              <option value="Economy">Economy</option>
              <option value="Premium Economy">Premium Economy</option>
              <option value="Business">Business</option>
              <option value="First">First</option>
            </select>
          </FormField>

          {/* Seat Number */}
          <FormField label="Seat Number" htmlFor="fl-seat">
            <input
              id="fl-seat"
              type="text"
              value={form.seat_number}
              onChange={(e) => setField('seat_number', e.target.value)}
              onFocus={() => setFocusedField('seat_number')}
              onBlur={() => setFocusedField(null)}
              style={fieldStyle('seat_number')}
              placeholder="e.g. 3A Cathleen / 3B Stanley"
              autoComplete="off"
            />
          </FormField>

          {/* Confirmation Code */}
          <FormField label="Confirmation Code" htmlFor="fl-conf">
            <input
              id="fl-conf"
              type="text"
              value={form.confirmation_number}
              onChange={(e) => setField('confirmation_number', e.target.value)}
              onFocus={() => setFocusedField('confirmation_number')}
              onBlur={() => setFocusedField(null)}
              style={fieldStyle('confirmation_number')}
              placeholder="e.g. ABC123"
              autoComplete="off"
            />
          </FormField>

          {/* Terminal & Gate — Departure */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1 }}>
              <FormField label="Dep. Terminal" htmlFor="fl-dep-terminal">
                <input
                  id="fl-dep-terminal"
                  type="text"
                  value={form.departure_terminal}
                  onChange={(e) => setField('departure_terminal', e.target.value)}
                  onFocus={() => setFocusedField('departure_terminal')}
                  onBlur={() => setFocusedField(null)}
                  style={fieldStyle('departure_terminal')}
                  placeholder="e.g. Terminal 2"
                  autoComplete="off"
                />
              </FormField>
            </div>
            <div style={{ flex: 1 }}>
              <FormField label="Dep. Gate" htmlFor="fl-dep-gate">
                <input
                  id="fl-dep-gate"
                  type="text"
                  value={form.departure_gate}
                  onChange={(e) => setField('departure_gate', e.target.value)}
                  onFocus={() => setFocusedField('departure_gate')}
                  onBlur={() => setFocusedField(null)}
                  style={fieldStyle('departure_gate')}
                  placeholder="e.g. Gate B14"
                  autoComplete="off"
                />
              </FormField>
            </div>
          </div>

          {/* Terminal & Gate — Arrival */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1 }}>
              <FormField label="Arr. Terminal" htmlFor="fl-arr-terminal">
                <input
                  id="fl-arr-terminal"
                  type="text"
                  value={form.arrival_terminal}
                  onChange={(e) => setField('arrival_terminal', e.target.value)}
                  onFocus={() => setFocusedField('arrival_terminal')}
                  onBlur={() => setFocusedField(null)}
                  style={fieldStyle('arrival_terminal')}
                  placeholder="e.g. Terminal 2"
                  autoComplete="off"
                />
              </FormField>
            </div>
            <div style={{ flex: 1 }}>
              <FormField label="Arr. Gate" htmlFor="fl-arr-gate">
                <input
                  id="fl-arr-gate"
                  type="text"
                  value={form.arrival_gate}
                  onChange={(e) => setField('arrival_gate', e.target.value)}
                  onFocus={() => setFocusedField('arrival_gate')}
                  onBlur={() => setFocusedField(null)}
                  style={fieldStyle('arrival_gate')}
                  placeholder="e.g. Gate B14"
                  autoComplete="off"
                />
              </FormField>
            </div>
          </div>

          {/* Action Required */}
          <div style={{ marginBottom: 'var(--sp-sm)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-sm)' }}>
              <input
                type="checkbox"
                checked={form.action_required}
                onChange={e => setField('action_required', e.target.checked)}
                style={{ width: '16px', height: '16px' }}
              />
              <span style={{ fontSize: 'var(--fs-sm)' }}>Action Required</span>
            </label>
          </div>

          {/* Google Calendar */}
          <div style={{ marginBottom: 'var(--sp-md)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-sm)', opacity: form.departure_date ? 1 : 0.4 }}>
              <input
                type="checkbox"
                checked={form.gcal_include ?? false}
                disabled={!form.departure_date}
                onChange={e => setField('gcal_include', e.target.checked)}
                style={{ width: '16px', height: '16px' }}
              />
              <span style={{ fontSize: 'var(--fs-sm)' }}>Add to Google Calendar</span>
            </label>
            {!form.departure_date && (
              <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text3)', marginTop: 'var(--sp-xs)', marginLeft: 'calc(var(--sp-sm) + 16px)' }}>
                Set a departure date to enable calendar sync
              </p>
            )}
          </div>

          {/* Notes */}
          <FormField label="Notes" htmlFor="fl-notes">
            <textarea
              id="fl-notes"
              value={form.notes}
              onChange={(e) => setField('notes', e.target.value)}
              onFocus={() => setFocusedField('notes')}
              onBlur={() => setFocusedField(null)}
              style={{ ...fieldStyle('notes'), minHeight: '80px', resize: 'vertical' }}
              placeholder="Optional notes…"
            />
          </FormField>

          {/* Delete — edit mode only */}
          {!isAdd && (
            <div style={{ marginTop: '4px', paddingTop: '16px', borderTop: '1px solid var(--border2)' }}>
              {!deleteConfirm ? (
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: "'Lato', sans-serif",
                    fontSize: 'var(--fs-sm)',
                    color: 'var(--red)',
                    textDecoration: 'underline',
                    textUnderlineOffset: '2px',
                    padding: '4px 0',
                    minHeight: '44px',
                  }}
                >
                  Delete Flight
                </button>
              ) : (
                <div style={{
                  padding: '14px 16px',
                  background: 'rgba(139,32,32,0.05)',
                  border: '1px solid rgba(139,32,32,0.2)',
                  borderRadius: 'var(--r)',
                }}>
                  <p style={{
                    fontFamily: "'Lato', sans-serif",
                    fontSize: 'var(--fs-sm)',
                    color: 'var(--red)',
                    marginBottom: '12px',
                    lineHeight: 1.5,
                  }}>
                    Delete this flight? This cannot be undone.
                  </p>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={deleting}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: deleting ? 'not-allowed' : 'pointer',
                        fontFamily: "'Lato', sans-serif",
                        fontSize: 'var(--fs-sm)',
                        fontWeight: 'var(--fw-bold)',
                        color: 'var(--red)',
                        textDecoration: 'underline',
                        textUnderlineOffset: '2px',
                        opacity: deleting ? 0.5 : 1,
                        padding: '4px 0',
                        minHeight: '44px',
                      }}
                    >
                      {deleting ? 'Deleting…' : 'Confirm Delete'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirm(false)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontFamily: "'Lato', sans-serif",
                        fontSize: 'var(--fs-sm)',
                        color: 'var(--text3)',
                        textDecoration: 'underline',
                        textUnderlineOffset: '2px',
                        padding: '4px 0',
                        minHeight: '44px',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bottom breathing room */}
          <div style={{ height: '8px' }} />
        </div>
      </ResponsiveSheet>
    </div>
  );
}
