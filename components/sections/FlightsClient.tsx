'use client';

import React, { useState } from 'react';
import { ResponsiveSheet } from '@/components/ui/ResponsiveSheet';
import { FormField, inputStyle, inputFocusStyle } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Flight {
  id: string;
  flight_number: string | null;
  airline: string | null;
  origin_airport: string | null;
  destination_airport: string | null;
  departure_time: string | null;
  arrival_time: string | null;
  cabin_class: string | null;
  confirmation_number: string | null;
  notes: string | null;
}

interface FlightForm {
  flight_number: string;
  airline: string;
  origin_airport: string;
  destination_airport: string;
  departure_date: string;
  departure_time_val: string;
  arrival_date: string;
  arrival_time_val: string;
  cabin_class: string;
  confirmation_number: string;
  notes: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EMPTY_FORM: FlightForm = {
  flight_number: '',
  airline: '',
  origin_airport: '',
  destination_airport: '',
  departure_date: '',
  departure_time_val: '',
  arrival_date: '',
  arrival_time_val: '',
  cabin_class: '',
  confirmation_number: '',
  notes: '',
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
    flight_number: f.flight_number ?? '',
    airline: f.airline ?? '',
    origin_airport: f.origin_airport ?? '',
    destination_airport: f.destination_airport ?? '',
    departure_date: depDate,
    departure_time_val: depTime,
    arrival_date: arrDate,
    arrival_time_val: arrTime,
    cabin_class: f.cabin_class ?? '',
    confirmation_number: f.confirmation_number ?? '',
    notes: f.notes ?? '',
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
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isAdd = editFlight === null;

  function fieldStyle(name: string): React.CSSProperties {
    return focusedField === name ? inputFocusStyle() : inputStyle();
  }

  function setField<K extends keyof FlightForm>(key: K, value: FlightForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const openAdd = () => {
    setEditFlight(null);
    setForm(EMPTY_FORM);
    setSaveError(null);
    setDeleteConfirm(false);
    setSheetOpen(true);
  };

  const openEdit = (f: Flight) => {
    setEditFlight(f);
    setForm(flightToForm(f));
    setSaveError(null);
    setDeleteConfirm(false);
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setDeleteConfirm(false);
    setSaveError(null);
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
    setSaving(true);
    setSaveError(null);
    try {
      const body = {
        flight_number:       form.flight_number       || null,
        airline:             form.airline             || null,
        origin_airport:      form.origin_airport      || null,
        destination_airport: form.destination_airport || null,
        departure_time:      joinDatetime(form.departure_date, form.departure_time_val),
        arrival_time:        joinDatetime(form.arrival_date,   form.arrival_time_val),
        cabin_class:         form.cabin_class         || null,
        confirmation_number: form.confirmation_number || null,
        notes:               form.notes               || null,
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
      await refetch();
      closeSheet();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editFlight) return;
    setDeleting(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/flights/${editFlight.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Something went wrong.');
      await refetch();
      closeSheet();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setDeleting(false);
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
              {/* Airline + flight number + cabin */}
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
                    marginLeft: 'auto',
                  }}>
                    {f.cabin_class}
                  </span>
                )}
              </div>

              {/* Route */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'var(--fs-2xl)', fontWeight: 'var(--fw-medium)', color: 'var(--navy)', letterSpacing: '0.02em' }}>
                  {f.origin_airport ?? '—'}
                </span>
                <svg width="24" height="12" viewBox="0 0 24 12" fill="none" aria-hidden="true" style={{ color: 'var(--text3)', flexShrink: 0 }}>
                  <path d="M2 6h20M16 2l6 4-6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'var(--fs-2xl)', fontWeight: 'var(--fw-medium)', color: 'var(--navy)', letterSpacing: '0.02em' }}>
                  {f.destination_airport ?? '—'}
                </span>
              </div>

              {/* Times */}
              <div style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)', color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span>{formatDateTime(f.departure_time)}</span>
                <span aria-hidden="true">→</span>
                <span>{formatDateTime(f.arrival_time)}</span>
              </div>

              {/* Confirmation */}
              {f.confirmation_number && (
                <div style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)', color: 'var(--text3)' }}>
                  <span style={{ fontWeight: 'var(--fw-bold)', color: 'var(--text2)' }}>Conf: </span>
                  {f.confirmation_number}
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

          {/* Route — From / To side by side */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1 }}>
              <FormField label="From" htmlFor="fl-origin">
                <input
                  id="fl-origin"
                  type="text"
                  value={form.origin_airport}
                  onChange={(e) => setField('origin_airport', e.target.value.toUpperCase())}
                  onFocus={() => setFocusedField('origin_airport')}
                  onBlur={() => setFocusedField(null)}
                  style={{ ...fieldStyle('origin_airport'), textTransform: 'uppercase' }}
                  placeholder="JFK"
                  maxLength={4}
                  autoComplete="off"
                />
              </FormField>
            </div>
            <div style={{ flex: 1 }}>
              <FormField label="To" htmlFor="fl-destination">
                <input
                  id="fl-destination"
                  type="text"
                  value={form.destination_airport}
                  onChange={(e) => setField('destination_airport', e.target.value.toUpperCase())}
                  onFocus={() => setFocusedField('destination_airport')}
                  onBlur={() => setFocusedField(null)}
                  style={{ ...fieldStyle('destination_airport'), textTransform: 'uppercase' }}
                  placeholder="LHR"
                  maxLength={4}
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

          {/* Error */}
          {saveError && (
            <p style={{
              fontFamily: "'Lato', sans-serif",
              fontSize: 'var(--fs-sm)',
              color: 'var(--red)',
              lineHeight: 1.5,
            }}>
              {saveError}
            </p>
          )}

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
