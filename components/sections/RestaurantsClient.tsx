'use client'

import { useState, useCallback, useContext, useEffect } from 'react'
import { TabNavigationContext, useTabNavigation } from '@/components/advisor/TripDetailView'
import { Plus } from 'lucide-react'
import { ResponsiveSheet } from '@/components/ui/ResponsiveSheet'
import { Button } from '@/components/ui/Button'
import { FormField, inputStyle } from '@/components/ui/FormField'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'
import WarnBadge from '@/components/ui/WarnBadge'

// ─── Types ────────────────────────────────────────────────────────────────────

export type Restaurant = {
  id: string
  trip_id: string
  name: string | null
  display_label: string | null
  cuisine: string | null
  city: string | null
  address: string | null
  reservation_time: string | null
  party_size: number | null
  style: string | null
  confirmation_number: string | null
  phone: string | null
  email: string | null
  website_url: string | null
  booking_url: string | null
  maps_url: string | null
  notes: string | null
  included: boolean
  action_required: boolean
  action_note: string | null
  gcal_include: boolean
  reservation_status: string
  confirmed: boolean
  booking_source: string | null
  state_province: string | null
  postal_code: string | null
}

type Props = {
  tripId: string
  initialRestaurants: Restaurant[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const RESERVATION_STATUS_OPTIONS = [
  { value: 'Yes – Priority', label: 'Yes – Priority' },
  { value: 'Yes',            label: 'Yes' },
  { value: 'Recommended',    label: 'Recommended' },
  { value: 'No',             label: 'No' },
  { value: 'TBD',            label: 'TBD' },
]

const EMPTY_FORM = {
  name: '',
  display_label: '',
  cuisine: '',
  city: '',
  address: '',
  reservation_date: '',
  reservation_time_val: '',
  party_size: '',
  style: '',
  confirmation_number: '',
  phone: '',
  email: '',
  website_url: '',
  booking_url: '',
  maps_url: '',
  notes: '',
  included: false,
  action_required: false,
  action_note: '',
  gcal_include: false,
  reservation_status: 'TBD',
  confirmed: false,
  booking_source: '',
  state_province: '',
  postal_code: '',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function splitDatetime(iso: string | null): [string, string] {
  if (!iso) return ['', '']
  const tIdx = iso.indexOf('T')
  if (tIdx === -1) return [iso, '']
  return [iso.slice(0, tIdx), iso.slice(tIdx + 1, tIdx + 6)]
}

function joinDatetime(date: string, time: string): string | null {
  if (!date) return null
  return `${date}T${time || '00:00'}:00`
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  const [datePart, rest] = iso.split('T')
  if (!datePart || !rest) return iso
  const [year, month, day] = datePart.split('-').map(Number)
  const timeStr = rest.split(/[+Z]/)[0]
  const [h, m] = timeStr.split(':').map(Number)
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const weekday = weekdays[new Date(year, month - 1, day).getDay()]
  const suffix = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${weekday}, ${months[month - 1]} ${day} · ${h12}:${String(m).padStart(2, '0')} ${suffix}`
}

function recordToForm(r: Restaurant) {
  const [resDate, resTime] = splitDatetime(r.reservation_time)
  return {
    name:                 r.name                 ?? '',
    display_label:        r.display_label        ?? '',
    cuisine:              r.cuisine              ?? '',
    city:                 r.city                 ?? '',
    address:              r.address              ?? '',
    reservation_date:     resDate,
    reservation_time_val: resTime,
    party_size:           r.party_size != null ? String(r.party_size) : '',
    style:                r.style                ?? '',
    confirmation_number:  r.confirmation_number  ?? '',
    phone:                r.phone                ?? '',
    email:                r.email                ?? '',
    website_url:          r.website_url          ?? '',
    booking_url:          r.booking_url          ?? '',
    maps_url:             r.maps_url             ?? '',
    notes:                r.notes                ?? '',
    included:             r.included,
    action_required:      r.action_required,
    action_note:          r.action_note          ?? '',
    gcal_include:         r.gcal_include         ?? false,
    reservation_status:   r.reservation_status   ?? 'TBD',
    confirmed:            r.confirmed            ?? false,
    booking_source:       r.booking_source       ?? '',
    state_province:       r.state_province       ?? '',
    postal_code:          r.postal_code          ?? '',
  }
}

// ─── Group Header ─────────────────────────────────────────────────────────────

function GroupHeader({ label, first }: { label: string; first?: boolean }) {
  return (
    <div style={{
      fontFamily: "'Lato', sans-serif",
      fontSize: 'var(--fs-xs)',
      fontWeight: 'var(--fw-bold)',
      letterSpacing: '0.08em',
      textTransform: 'uppercase' as const,
      color: 'var(--gold)',
      paddingBottom: '6px',
      borderBottom: '2px solid var(--border2)',
      marginTop: first ? '0' : '28px',
    }}>
      {label}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RestaurantsClient({ tripId, initialRestaurants }: Props) {
  const [records, setRecords] = useState<Restaurant[]>(initialRestaurants)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<Restaurant | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [touched, setTouched] = useState<Set<string>>(new Set())
  const toast = useToast()
  const { pendingSheetRecordId, clearPendingSheetRecord } = useContext(TabNavigationContext)

  useEffect(() => {
    if (!pendingSheetRecordId) return
    const record = records.find((r) => r.id === pendingSheetRecordId)
    clearPendingSheetRecord()
    if (record) openEdit(record)
  }, [pendingSheetRecordId]) // eslint-disable-line react-hooks/exhaustive-deps

  function getRestaurantWarns(record: Restaurant): string[] {
    const warns: string[] = [];
    if (record.action_required) warns.push('Action Required');
    return warns;
  }

  const warnCount = records.filter(r => getRestaurantWarns(r).length > 0).length;

  const { setWarnCount } = useTabNavigation();
  useEffect(() => {
    setWarnCount('restaurants', warnCount);
  }, [warnCount]); // eslint-disable-line react-hooks/exhaustive-deps

  const refetch = useCallback(async () => {
    const res = await fetch(`/api/trips/${tripId}/restaurants`)
    if (res.ok) setRecords(await res.json())
  }, [tripId])

  function setField(key: string, value: string | boolean) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function touchField(name: string) { setTouched(prev => new Set(prev).add(name)) }
  const nameError = touched.has('name') && !form.name.trim()

  function openAdd() {
    setEditingRecord(null)
    setForm(EMPTY_FORM)
    setConfirmDelete(false)
    setTouched(new Set())
    setSheetOpen(true)
  }

  function openEdit(r: Restaurant) {
    setEditingRecord(r)
    setForm(recordToForm(r))
    setConfirmDelete(false)
    setTouched(new Set())
    setSheetOpen(true)
  }

  function closeSheet() {
    setSheetOpen(false)
    setEditingRecord(null)
    setConfirmDelete(false)
  }

  async function handleSave() {
    setTouched(prev => new Set([...prev, 'name']))
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const payload = {
        name:                form.name.trim() || null,
        display_label:       form.display_label.trim() || null,
        cuisine:             form.cuisine.trim() || null,
        city:                form.city.trim() || null,
        address:             form.address.trim() || null,
        reservation_time:    joinDatetime(form.reservation_date, form.reservation_time_val),
        party_size:          form.party_size.trim() ? parseInt(form.party_size, 10) : null,
        style:               form.style.trim() || null,
        confirmation_number: form.confirmation_number.trim() || null,
        phone:               form.phone.trim() || null,
        email:               form.email.trim() || null,
        website_url:         form.website_url.trim() || null,
        booking_url:         form.booking_url.trim() || null,
        maps_url:            form.maps_url.trim() || null,
        notes:               form.notes.trim() || null,
        included:            form.included,
        action_required:     form.action_required,
        action_note:         form.action_note.trim() || null,
        gcal_include:        form.gcal_include,
        reservation_status:  form.reservation_status,
        confirmed:           form.confirmed,
        booking_source:      form.booking_source.trim() || null,
        state_province:      form.state_province.trim() || null,
        postal_code:         form.postal_code.trim() || null,
      }

      if (editingRecord) {
        const res = await fetch(`/api/restaurants/${editingRecord.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error()
        toast.show('Restaurant updated', 'success')
      } else {
        const res = await fetch(`/api/trips/${tripId}/restaurants`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error()
        toast.show('Restaurant added', 'success')
      }
      window.dispatchEvent(new CustomEvent('gcal:dirty'))
      await refetch()
      closeSheet()
    } catch {
      toast.show('Something went wrong. Please try again.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!editingRecord) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/restaurants/${editingRecord.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.show('Restaurant removed', 'success')
      await refetch()
      closeSheet()
    } catch {
      toast.show('Something went wrong. Please try again.', 'error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Section header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: 'var(--fs-xl)', fontFamily: 'var(--font-display)', color: 'var(--navy)', fontWeight: 'var(--fw-normal)' }}>
          Restaurants
        </h2>
        <Button variant="primary" size="sm" onClick={openAdd}>
          <Plus size={16} />
          Add Restaurant
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

      {/* Empty state */}
      {records.length === 0 && (
        <p style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)', color: 'var(--text3)', textAlign: 'center', padding: '32px 0' }}>
          No restaurants added yet.
        </p>
      )}

      {/* Record list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {records.map(r => (
          <button key={r.id} onClick={() => openEdit(r)} className="section-row">

            {/* Header: name + status badge */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-base)', fontWeight: 'var(--fw-bold)', color: 'var(--navy)', flex: 1, minWidth: 0 }}>
                {r.name || 'Restaurant'}
              </span>
              {r.confirmed
                ? '✅ CONFIRMED'
                : `Reservation: ${r.reservation_status}`
              }
            </div>

            {/* Subtitle: display_label */}
            {r.display_label && (
              <span style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)', color: 'var(--text3)' }}>
                {r.display_label}
              </span>
            )}

            {/* Style (2-line clamp) */}
            {r.style && (
              <p style={{
                fontFamily: "'Lato', sans-serif",
                fontSize: 'var(--fs-sm)',
                color: 'var(--text3)',
                lineHeight: 1.5,
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                margin: 0,
              }}>
                {r.style}
              </p>
            )}

            {/* City + State/Province */}
            {(r.city || r.state_province) && (
              <span style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)', color: 'var(--text3)' }}>
                {[r.city, r.state_province].filter(Boolean).join(', ')}
              </span>
            )}

            {/* Address + Postal Code */}
            {(r.address || r.postal_code) && (
              <span style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)', color: 'var(--text3)' }}>
                {[r.address, r.postal_code].filter(Boolean).join(' ')}
              </span>
            )}

            {/* Phone */}
            {r.phone && (
              <span style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)', color: 'var(--text3)' }}>
                📞 {r.phone}
              </span>
            )}

            {/* Email */}
            {r.email && (
              <span style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)', color: 'var(--text3)' }}>
                ✉️ {r.email}
              </span>
            )}

            {/* Reservation details — only when confirmed */}
            {r.confirmed && (
              <span style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)', color: 'var(--text3)' }}>
                {[
                  r.reservation_time ? formatDateTime(r.reservation_time) : null,
                  r.party_size != null ? `Party of ${r.party_size}` : null,
                  r.confirmation_number ? `Conf #${r.confirmation_number}` : null,
                  r.booking_source ?? null,
                ].filter(Boolean).join(' · ')}
              </span>
            )}

            {/* Website link */}
            {r.website_url && (
              <a
                href={r.website_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-xs)', color: 'var(--gold-text)', display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}
              >
                🔗 Website ↗
              </a>
            )}

            {/* Maps link */}
            {r.maps_url && (
              <a
                href={r.maps_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-xs)', color: 'var(--gold-text)', display: 'inline-block' }}
              >
                📍 Map ↗
              </a>
            )}

            {/* Booking link */}
            {r.booking_url && (
              <a
                href={r.booking_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-xs)', color: 'var(--gold-text)', display: 'inline-block' }}
              >
                📋 View Booking ↗
              </a>
            )}

            {/* Notes (3-line clamp) */}
            {r.notes && (
              <p className="line-clamp-3" style={{
                fontFamily: "'Lato', sans-serif",
                fontSize: 'var(--fs-sm)',
                color: 'var(--text3)',
                lineHeight: 1.5,
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                margin: 0,
              }}>
                {r.notes}
              </p>
            )}

            {/* Warn badges */}
            {getRestaurantWarns(r).length > 0 && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                {getRestaurantWarns(r).map(w => (
                  <WarnBadge key={w} label={w} />
                ))}
              </div>
            )}

            {/* Action note (shown separately when present) */}
            {r.action_required && r.action_note && (
              <div style={{
                padding: '8px 10px',
                background: 'rgba(184,137,42,0.08)',
                border: '1px solid rgba(184,137,42,0.2)',
                borderRadius: '6px',
                marginTop: '4px',
              }}>
                {r.action_note && (
                  <p style={{
                    fontFamily: "'Lato', sans-serif",
                    fontSize: 'var(--fs-xs)',
                    color: 'var(--text3)',
                    margin: '4px 0 0',
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}>
                    {r.action_note}
                  </p>
                )}
              </div>
            )}

          </button>
        ))}
      </div>

      {/* Bottom Sheet */}
      <ResponsiveSheet
        open={sheetOpen}
        onClose={closeSheet}
        title={editingRecord ? 'Edit Restaurant' : 'Add Restaurant'}
        primaryAction={{
          label: editingRecord ? 'Save' : 'Add',
          onClick: handleSave,
          loading: saving,
          disabled: saving || nameError,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '40px' }}>

          {/* ── Group: Restaurant ── */}
          <GroupHeader label="Restaurant" first />

          <FormField label="Name" required error={nameError ? 'Required' : undefined}>
            <input
              type="text"
              value={form.name}
              onChange={e => setField('name', e.target.value)}
              onBlur={() => touchField('name')}
              placeholder="e.g. The Keg"
              title="Full restaurant name"
              style={inputStyle(nameError)}
            />
          </FormField>

          <FormField label="Display Label">
            <input
              type="text"
              value={form.display_label}
              title="Short label shown on the card, e.g. Oct 5 – Dinner (choice A)"
              onChange={e => setField('display_label', e.target.value)}
              placeholder="e.g. Oct 5 – Dinner (choice A)"
              style={inputStyle()}
            />
          </FormField>

          <FormField label="Cuisine">
            <input
              type="text"
              value={form.cuisine}
              onChange={e => setField('cuisine', e.target.value)}
              placeholder="e.g. Steakhouse"
              style={inputStyle()}
            />
          </FormField>

          <FormField label="Style">
            <textarea
              value={form.style}
              onChange={e => setField('style', e.target.value)}
              placeholder="e.g. Classic seafood & oyster bar. Vancouver landmark."
              title="Brief description of the vibe or cuisine style"
              rows={2}
              style={{ ...inputStyle(), resize: 'vertical' }}
            />
          </FormField>

          {/* ── Group: Location ── */}
          <GroupHeader label="Location" />

          <FormField label="City">
            <input
              type="text"
              value={form.city}
              onChange={e => setField('city', e.target.value)}
              placeholder="e.g. Banff"
              style={inputStyle()}
            />
          </FormField>

          <FormField label="Address">
            <input
              type="text"
              value={form.address}
              onChange={e => setField('address', e.target.value)}
              placeholder="e.g. 123 Banff Ave"
              style={inputStyle()}
            />
          </FormField>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <FormField label="State / Province">
              <input
                type="text"
                value={form.state_province}
                onChange={e => setField('state_province', e.target.value)}
                placeholder="e.g. BC or WA"
                style={inputStyle()}
              />
            </FormField>
            <FormField label="Postal Code">
              <input
                type="text"
                value={form.postal_code}
                onChange={e => setField('postal_code', e.target.value)}
                placeholder="e.g. V0E 1E0"
                style={inputStyle()}
              />
            </FormField>
          </div>

          <FormField label="Phone">
            <input
              type="tel"
              value={form.phone}
              onChange={e => setField('phone', e.target.value)}
              placeholder="+1 (800) 000-0000"
              style={inputStyle()}
            />
          </FormField>

          <FormField label="Email">
            <input
              type="email"
              value={form.email}
              onChange={e => setField('email', e.target.value)}
              placeholder="reservations@example.com"
              style={inputStyle()}
            />
          </FormField>

          <FormField label="Website">
            <input
              type="url"
              value={form.website_url}
              onChange={e => setField('website_url', e.target.value)}
              placeholder="https://..."
              style={inputStyle()}
            />
          </FormField>

          <FormField label="Maps URL">
            <input
              type="url"
              value={form.maps_url}
              onChange={e => setField('maps_url', e.target.value)}
              placeholder="e.g. https://maps.google.com/..."
              style={inputStyle()}
            />
          </FormField>

          {/* ── Group: Reservation ── */}
          <GroupHeader label="Reservation" />

          <FormField label="Reservation Status">
            <select
              value={form.reservation_status}
              onChange={e => setField('reservation_status', e.target.value)}
              style={{ ...inputStyle(), cursor: 'pointer' }}
              title="Whether a reservation is needed or has been made"
            >
              {RESERVATION_STATUS_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </FormField>

          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', minHeight: '44px' }}>
            <input
              type="checkbox"
              checked={form.confirmed}
              onChange={e => setField('confirmed', e.target.checked)}
              style={{ width: '16px', height: '16px', cursor: 'pointer', flexShrink: 0 }}
            />
            <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text)', fontWeight: 500 }}>Confirmed</span>
          </label>

          <FormField label="Reservation Time">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <input
                type="date"
                value={form.reservation_date}
                onChange={e => setField('reservation_date', e.target.value)}
                style={inputStyle()}
              />
              <input
                type="time"
                value={form.reservation_time_val}
                onChange={e => setField('reservation_time_val', e.target.value)}
                style={inputStyle()}
              />
            </div>
          </FormField>

          <FormField label="Party Size">
            <input
              type="number"
              min="1"
              value={form.party_size}
              onChange={e => setField('party_size', e.target.value)}
              placeholder="e.g. 2"
              title="Number of guests including yourself"
              style={inputStyle()}
            />
          </FormField>

          <div style={{ opacity: form.confirmed ? 1 : 0.4, pointerEvents: form.confirmed ? 'auto' : 'none' }}>
            <FormField label="Confirmation Number">
              <input
                type="text"
                value={form.confirmation_number}
                onChange={e => setField('confirmation_number', e.target.value)}
                placeholder="e.g. RES-123456"
                title="Booking reference from the restaurant or booking platform"
                style={inputStyle()}
              />
            </FormField>
          </div>

          <div style={{ opacity: form.confirmed ? 1 : 0.4, pointerEvents: form.confirmed ? 'auto' : 'none' }}>
            <FormField label="Booking Source">
              <input
                type="text"
                value={form.booking_source}
                onChange={e => setField('booking_source', e.target.value)}
                placeholder="e.g. OpenTable"
                title="Where the reservation was made, e.g. OpenTable"
                style={inputStyle()}
              />
            </FormField>
          </div>

          <FormField label="Booking URL">
            <input
              type="url"
              value={form.booking_url}
              onChange={e => setField('booking_url', e.target.value)}
              placeholder="https://..."
              style={inputStyle()}
            />
          </FormField>

          {/* ── Group: Notes ── */}
          <GroupHeader label="Notes" />

          <FormField label="Notes">
            <textarea
              value={form.notes}
              onChange={e => setField('notes', e.target.value)}
              placeholder="Any additional notes…"
              rows={3}
              style={{ ...inputStyle(), resize: 'vertical' }}
            />
          </FormField>

          {/* ── Group: Flags ── */}
          <GroupHeader label="Flags" />

          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', minHeight: '44px' }}>
            <input
              type="checkbox"
              checked={form.action_required}
              onChange={e => setField('action_required', e.target.checked)}
              style={{ width: '16px', height: '16px', cursor: 'pointer', flexShrink: 0 }}
            />
            <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text)', fontWeight: 500 }}>Action Required</span>
          </label>

          {form.action_required && (
            <FormField label="Action Note">
              <input
                type="text"
                value={form.action_note}
                onChange={e => setField('action_note', e.target.value)}
                placeholder="e.g. Call to confirm by Sep 1"
                style={inputStyle()}
              />
            </FormField>
          )}

          <div style={{ marginBottom: 'var(--sp-md)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-sm)', opacity: form.reservation_date ? 1 : 0.4 }}>
              <input
                type="checkbox"
                checked={form.gcal_include ?? false}
                disabled={!form.reservation_date}
                onChange={e => setField('gcal_include', e.target.checked)}
                style={{ width: '20px', height: '20px', accentColor: 'var(--gold)', cursor: 'pointer', flexShrink: 0 }}
              />
              <span style={{ fontSize: 'var(--fs-sm)' }}>Add to Google Calendar</span>
            </label>
            {!form.reservation_date && (
              <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text3)', marginTop: 'var(--sp-xs)', marginLeft: 'calc(var(--sp-sm) + 16px)' }}>
                Set a reservation date to enable calendar sync
              </p>
            )}
          </div>

          {/* ── Delete ── */}
          {editingRecord && (
            confirmDelete ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--red)', textAlign: 'center', margin: 0 }}>
                  Remove this restaurant?
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(false)} style={{ flex: 1 }}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleDelete}
                    disabled={deleting}
                    loading={deleting}
                    style={{ flex: 1, background: 'var(--red)', borderTopColor: 'var(--red)', borderRightColor: 'var(--red)', borderBottomColor: 'var(--red)', borderLeftColor: 'var(--red)' }}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                style={{ background: 'none', border: 'none', color: 'var(--red)', fontSize: 'var(--fs-sm)', cursor: 'pointer', padding: '8px', minHeight: '44px' }}
              >
                Remove Restaurant
              </button>
            )
          )}

        </div>
      </ResponsiveSheet>
    </div>
  )
}
