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

export type Transportation = {
  id: string
  trip_id: string
  type: string | null
  provider: string | null
  origin: string | null
  destination: string | null
  departure_time: string | null
  arrival_time: string | null
  confirmation_number: string | null
  notes: string | null
  sort_order: number
  included: boolean
  action_required: boolean
  action_note?: string | null
  phone: string | null
  website_url: string | null
  cost: string | null
  gcal_include: boolean
  departure_timezone: string | null
  arrival_timezone: string | null
}

type Props = {
  tripId: string
  initialTransportations: Transportation[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TIMEZONE_OPTIONS = [
  { value: 'Pacific/Honolulu',    label: 'Honolulu (HST)' },
  { value: 'America/Los_Angeles', label: 'Seattle / Pacific (PDT/PST)' },
  { value: 'America/Vancouver',   label: 'Vancouver / Kamloops (PDT/PST)' },
  { value: 'America/Edmonton',    label: 'Jasper / Banff (MDT/MST)' },
]

const TRANSPORT_TYPES = [
  'Motorcoach',
  'Taxi',
  'Rideshare',
  'Shuttle',
  'Ferry',
  'Rental Car',
  'Train',
  'Other',
]

const EMPTY_FORM = {
  type: '',
  provider: '',
  origin: '',
  destination: '',
  departure_date: '',
  departure_time_val: '',
  arrival_date: '',
  arrival_time_val: '',
  confirmation_number: '',
  phone: '',
  website_url: '',
  cost: '',
  notes: '',
  included: false,
  action_required: false,
  action_note: '',
  gcal_include: false,
  departure_timezone: '',
  arrival_timezone: '',
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

function recordToForm(r: Transportation) {
  const [depDate, depTime] = splitDatetime(r.departure_time)
  const [arrDate, arrTime] = splitDatetime(r.arrival_time)
  return {
    type: r.type ?? '',
    provider: r.provider ?? '',
    origin: r.origin ?? '',
    destination: r.destination ?? '',
    departure_date: depDate,
    departure_time_val: depTime,
    arrival_date: arrDate,
    arrival_time_val: arrTime,
    confirmation_number: r.confirmation_number ?? '',
    phone: r.phone ?? '',
    website_url: r.website_url ?? '',
    cost: r.cost ?? '',
    notes: r.notes ?? '',
    included: r.included,
    action_required: r.action_required,
    action_note: r.action_note ?? '',
    gcal_include: r.gcal_include ?? false,
    departure_timezone: r.departure_timezone ?? '',
    arrival_timezone: r.arrival_timezone ?? '',
  }
}



// ─── Component ────────────────────────────────────────────────────────────────

export function TransportationClient({ tripId, initialTransportations }: Props) {
  const [records, setRecords] = useState<Transportation[]>(initialTransportations)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<Transportation | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const toast = useToast()
  const { pendingSheetRecordId, clearPendingSheetRecord } = useContext(TabNavigationContext)

  useEffect(() => {
    if (!pendingSheetRecordId) return
    const record = records.find((r) => r.id === pendingSheetRecordId)
    clearPendingSheetRecord()
    if (record) openEdit(record)
  }, [pendingSheetRecordId]) // eslint-disable-line react-hooks/exhaustive-deps

  function getTransportationWarns(record: Transportation): string[] {
    const warns: string[] = [];
    if (record.action_required) warns.push('Action Required');
    return warns;
  }

  const warnCount = records.filter(r => getTransportationWarns(r).length > 0).length;

  const { setWarnCount } = useTabNavigation();
  useEffect(() => {
    setWarnCount('transportation', warnCount);
  }, [warnCount]); // eslint-disable-line react-hooks/exhaustive-deps

  const refetch = useCallback(async () => {
    const res = await fetch(`/api/trips/${tripId}/transportation`)
    if (res.ok) setRecords(await res.json())
  }, [tripId])

  function setField(key: string, value: string | boolean) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function openAdd() {
    setEditingRecord(null)
    setForm(EMPTY_FORM)
    setConfirmDelete(false)
    setSheetOpen(true)
  }

  function openEdit(r: Transportation) {
    setEditingRecord(r)
    setForm(recordToForm(r))
    setConfirmDelete(false)
    setSheetOpen(true)
  }

  function closeSheet() {
    setSheetOpen(false)
    setEditingRecord(null)
    setConfirmDelete(false)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const payload = {
        type: form.type.trim() || null,
        provider: form.provider.trim() || null,
        origin: form.origin.trim() || null,
        destination: form.destination.trim() || null,
        departure_time: joinDatetime(form.departure_date, form.departure_time_val),
        arrival_time: joinDatetime(form.arrival_date, form.arrival_time_val),
        confirmation_number: form.confirmation_number.trim() || null,
        phone: form.phone.trim() || null,
        website_url: form.website_url.trim() || null,
        cost: form.cost.trim() || null,
        notes: form.notes.trim() || null,
        included: form.included,
        action_required: form.action_required,
        action_note: form.action_note.trim() || null,
        gcal_include: form.gcal_include,
        departure_timezone: form.departure_timezone || null,
        arrival_timezone: form.arrival_timezone || null,
      }

      if (editingRecord) {
        const res = await fetch(`/api/transportation/${editingRecord.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error()
        toast.show('Transportation updated', 'success')
      } else {
        const res = await fetch(`/api/trips/${tripId}/transportation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error()
        toast.show('Transportation added', 'success')
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
      const res = await fetch(`/api/transportation/${editingRecord.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error()
      toast.show('Transportation removed', 'success')
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
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
      }}>
        <h2 style={{
          fontSize: 'var(--fs-xl)',
          fontFamily: 'var(--font-display)',
          color: 'var(--navy)',
          fontWeight: 'var(--fw-normal)',
        }}>
          Transportation
        </h2>
        <Button variant="primary" size="sm" onClick={openAdd}>
          <Plus size={16} />
          Add Transportation
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
        <p style={{
          fontFamily: "'Lato', sans-serif",
          fontSize: 'var(--fs-sm)',
          color: 'var(--text3)',
          textAlign: 'center',
          padding: '32px 0',
        }}>
          No transportation added yet.
        </p>
      )}

      {/* Record list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {records.map(r => (
          <button
            key={r.id}
            onClick={() => openEdit(r)}
            className="section-row"
          >
            {/* Row 1: provider + badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{
                fontFamily: "'Lato', sans-serif",
                fontSize: 'var(--fs-base)',
                fontWeight: 'var(--fw-bold)',
                color: 'var(--navy)',
                flex: 1,
                minWidth: 0,
              }}>
                {r.provider || r.type || 'Transportation'}
              </span>
              {r.included
                ? <Badge color={{ bg: 'rgba(45,90,61,0.1)', text: 'var(--green)', border: 'rgba(45,90,61,0.2)' }}>Included</Badge>
                : <Badge color={{ bg: 'rgba(90,109,122,0.1)', text: 'var(--slate)', border: 'rgba(90,109,122,0.2)' }}>Self-Arranged</Badge>
              }
              {getTransportationWarns(r).map(w => (
                <WarnBadge key={w} label={w} />
              ))}
            </div>

            {/* Row 2: type (if provider was shown above) */}
            {r.provider && r.type && (
              <span style={{
                fontFamily: "'Lato', sans-serif",
                fontSize: 'var(--fs-sm)',
                color: 'var(--text3)',
              }}>
                {r.type}
              </span>
            )}

            {/* Row 3: origin → destination */}
            {(r.origin || r.destination) && (
              <span style={{
                fontFamily: "'Lato', sans-serif",
                fontSize: 'var(--fs-sm)',
                color: 'var(--text2)',
              }}>
                {[r.origin, r.destination].filter(Boolean).join(' → ')}
              </span>
            )}

            {/* Row 4: departure time */}
            <span style={{
              fontFamily: "'Lato', sans-serif",
              fontSize: '13px',
              color: 'var(--text3)',
            }}>
              {formatDateTime(r.departure_time)}
              {r.arrival_time && ` – ${formatDateTime(r.arrival_time)}`}
            </span>

            {/* Row 5: cost if self-arranged */}
            {!r.included && r.cost && (
              <span style={{
                fontFamily: "'Lato', sans-serif",
                fontSize: 'var(--fs-sm)',
                color: 'var(--text2)',
              }}>
                {r.cost}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Bottom Sheet */}
      <ResponsiveSheet
        open={sheetOpen}
        onClose={closeSheet}
        title={editingRecord ? 'Edit Transportation' : 'Add Transportation'}
        primaryAction={{
          label: editingRecord ? 'Save' : 'Add',
          onClick: handleSave,
          loading: saving,
          disabled: saving,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '40px' }}>

          {/* Type + Provider */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <FormField label="Type">
              <select
                value={form.type}
                onChange={e => setField('type', e.target.value)}
                style={{ ...inputStyle(), cursor: 'pointer' }}
              >
                <option value="">Select…</option>
                {TRANSPORT_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Provider">
              <input
                type="text"
                value={form.provider}
                onChange={e => setField('provider', e.target.value)}
                placeholder="e.g. Rocky Mountaineer"
                style={inputStyle()}
              />
            </FormField>
          </div>

          {/* Origin + Destination */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <FormField label="From">
              <input
                type="text"
                value={form.origin}
                onChange={e => setField('origin', e.target.value)}
                placeholder="e.g. Vancouver"
                style={inputStyle()}
              />
            </FormField>
            <FormField label="To">
              <input
                type="text"
                value={form.destination}
                onChange={e => setField('destination', e.target.value)}
                placeholder="e.g. Kamloops"
                style={inputStyle()}
              />
            </FormField>
          </div>

          {/* Departure date + time */}
          <FormField label="Departure">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <input
                type="date"
                value={form.departure_date}
                onChange={e => setField('departure_date', e.target.value)}
                style={inputStyle()}
              />
              <input
                type="time"
                value={form.departure_time_val}
                onChange={e => setField('departure_time_val', e.target.value)}
                style={inputStyle()}
              />
            </div>
          </FormField>

          {/* Departure Timezone */}
          <FormField label="Departure Timezone">
            <select
              value={form.departure_timezone}
              onChange={e => setField('departure_timezone', e.target.value)}
              style={{ ...inputStyle(), cursor: 'pointer' }}
            >
              <option value="">Select…</option>
              {TIMEZONE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </FormField>

          {/* Arrival date + time */}
          <FormField label="Arrival">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <input
                type="date"
                value={form.arrival_date}
                onChange={e => setField('arrival_date', e.target.value)}
                style={inputStyle()}
              />
              <input
                type="time"
                value={form.arrival_time_val}
                onChange={e => setField('arrival_time_val', e.target.value)}
                style={inputStyle()}
              />
            </div>
          </FormField>

          {/* Arrival Timezone */}
          <FormField label="Arrival Timezone">
            <select
              value={form.arrival_timezone}
              onChange={e => setField('arrival_timezone', e.target.value)}
              style={{ ...inputStyle(), cursor: 'pointer' }}
            >
              <option value="">Select…</option>
              {TIMEZONE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </FormField>

          {/* Confirmation Number */}
          <FormField label="Confirmation Number">
            <input
              type="text"
              value={form.confirmation_number}
              onChange={e => setField('confirmation_number', e.target.value)}
              placeholder="e.g. RM-123456"
              style={inputStyle()}
            />
          </FormField>

          {/* Phone + Website */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <FormField label="Phone">
              <input
                type="tel"
                value={form.phone}
                onChange={e => setField('phone', e.target.value)}
                placeholder="+1 (800) 000-0000"
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
          </div>

          {/* Cost */}
          <FormField label="Cost">
            <input
              type="text"
              value={form.cost}
              onChange={e => setField('cost', e.target.value)}
              placeholder="e.g. $45 CAD"
              style={inputStyle()}
            />
          </FormField>

          {/* Notes */}
          <FormField label="Notes">
            <textarea
              value={form.notes}
              onChange={e => setField('notes', e.target.value)}
              placeholder="Any additional notes…"
              rows={3}
              style={{ ...inputStyle(), resize: 'vertical' }}
            />
          </FormField>

          {/* Included toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', minHeight: '44px' }}>
            <input
              type="checkbox"
              checked={form.included}
              onChange={e => setField('included', e.target.checked)}
              style={{ width: '20px', height: '20px', accentColor: 'var(--gold)', cursor: 'pointer', flexShrink: 0 }}
            />
            <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text)', fontWeight: 500 }}>Included (provided by operator)</span>
          </label>

          {/* Action Required */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', minHeight: '44px' }}>
              <input
                type="checkbox"
                checked={form.action_required}
                onChange={e => setField('action_required', e.target.checked)}
                style={{ width: '20px', height: '20px', accentColor: 'var(--gold)', cursor: 'pointer', flexShrink: 0 }}
              />
              <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text)', fontWeight: 500 }}>Action Required</span>
            </label>
            {form.action_required && (
              <FormField label="Action Note">
                <input
                  type="text"
                  value={form.action_note}
                  onChange={e => setField('action_note', e.target.value)}
                  placeholder="e.g. Verify pickup location"
                  style={inputStyle()}
                />
              </FormField>
            )}
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

          {/* Delete */}
          {editingRecord && (
            confirmDelete ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--red)', textAlign: 'center', margin: 0 }}>
                  Remove this transportation record?
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
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--red)',
                  fontSize: 'var(--fs-sm)',
                  cursor: 'pointer',
                  padding: '8px',
                  minHeight: '44px',
                }}
              >
                Remove Transportation
              </button>
            )
          )}

        </div>
      </ResponsiveSheet>
    </div>
  )
}
