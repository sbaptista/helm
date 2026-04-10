'use client'

import { useState, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { FormField, inputStyle } from '@/components/ui/FormField'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'

// ─── Types ────────────────────────────────────────────────────────────────────

export type Restaurant = {
  id: string
  trip_id: string
  name: string | null
  cuisine: string | null
  city: string | null
  address: string | null
  reservation_time: string | null
  party_size: number | null
  style: string | null
  confirmation_number: string | null
  phone: string | null
  website_url: string | null
  notes: string | null
  included: boolean
  action_required: boolean
}

type Props = {
  tripId: string
  initialRestaurants: Restaurant[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  name: '',
  cuisine: '',
  city: '',
  address: '',
  reservation_date: '',
  reservation_time_val: '',
  party_size: '',
  style: '',
  confirmation_number: '',
  phone: '',
  website_url: '',
  notes: '',
  included: false,
  action_required: false,
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
    name: r.name ?? '',
    cuisine: r.cuisine ?? '',
    city: r.city ?? '',
    address: r.address ?? '',
    reservation_date: resDate,
    reservation_time_val: resTime,
    party_size: r.party_size != null ? String(r.party_size) : '',
    style: r.style ?? '',
    confirmation_number: r.confirmation_number ?? '',
    phone: r.phone ?? '',
    website_url: r.website_url ?? '',
    notes: r.notes ?? '',
    included: r.included,
    action_required: r.action_required,
  }
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
  const toast = useToast()

  const refetch = useCallback(async () => {
    const res = await fetch(`/api/trips/${tripId}/restaurants`)
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

  function openEdit(r: Restaurant) {
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
        name: form.name.trim() || null,
        cuisine: form.cuisine.trim() || null,
        city: form.city.trim() || null,
        address: form.address.trim() || null,
        reservation_time: joinDatetime(form.reservation_date, form.reservation_time_val),
        party_size: form.party_size.trim() ? parseInt(form.party_size, 10) : null,
        style: form.style.trim() || null,
        confirmation_number: form.confirmation_number.trim() || null,
        phone: form.phone.trim() || null,
        website_url: form.website_url.trim() || null,
        notes: form.notes.trim() || null,
        included: form.included,
        action_required: form.action_required,
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
      const res = await fetch(`/api/restaurants/${editingRecord.id}`, {
        method: 'DELETE',
      })
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
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
      }}>
        <h2 style={{
          fontSize: '22px',
          fontFamily: 'var(--font-display)',
          color: 'var(--navy)',
          fontWeight: 400,
        }}>
          Restaurants
        </h2>
        <Button variant="primary" size="sm" onClick={openAdd}>
          <Plus size={16} />
          Add Restaurant
        </Button>
      </div>

      {/* Empty state */}
      {records.length === 0 && (
        <p style={{
          fontFamily: "'Lato', sans-serif",
          fontSize: '14px',
          color: 'var(--text3)',
          textAlign: 'center',
          padding: '32px 0',
        }}>
          No restaurants added yet.
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
            {/* Row 1: name + badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{
                fontFamily: "'Lato', sans-serif",
                fontSize: '15px',
                fontWeight: 700,
                color: 'var(--navy)',
                flex: 1,
                minWidth: 0,
              }}>
                {r.name || 'Restaurant'}
              </span>
              {r.included
                ? <Badge color={{ bg: 'rgba(45,90,61,0.1)', text: 'var(--green)', border: 'rgba(45,90,61,0.2)' }}>Included</Badge>
                : <Badge color={{ bg: 'rgba(90,109,122,0.1)', text: 'var(--slate)', border: 'rgba(90,109,122,0.2)' }}>Self-Arranged</Badge>
              }
              {r.action_required && (
                <Badge color={{ bg: 'rgba(184,137,42,0.1)', text: 'var(--gold-text)', border: 'rgba(184,137,42,0.2)' }}>Action Required</Badge>
              )}
            </div>

            {/* Row 2: cuisine + style */}
            {(r.cuisine || r.style) && (
              <span style={{
                fontFamily: "'Lato', sans-serif",
                fontSize: '13px',
                color: 'var(--text3)',
              }}>
                {[r.cuisine, r.style].filter(Boolean).join(' · ')}
              </span>
            )}

            {/* Row 3: city */}
            {r.city && (
              <span style={{
                fontFamily: "'Lato', sans-serif",
                fontSize: '13px',
                color: 'var(--text3)',
              }}>
                {r.city}
              </span>
            )}

            {/* Row 4: reservation time + party size */}
            <span style={{
              fontFamily: "'Lato', sans-serif",
              fontSize: '13px',
              color: 'var(--text3)',
            }}>
              {formatDateTime(r.reservation_time)}
              {r.party_size != null && ` · Party of ${r.party_size}`}
            </span>
          </button>
        ))}
      </div>

      {/* Bottom Sheet */}
      <BottomSheet
        open={sheetOpen}
        onClose={closeSheet}
        title={editingRecord ? 'Edit Restaurant' : 'Add Restaurant'}
        primaryAction={{
          label: editingRecord ? 'Save' : 'Add',
          onClick: handleSave,
          loading: saving,
          disabled: saving,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '40px' }}>

          {/* Name + Cuisine */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <FormField label="Name">
              <input
                type="text"
                value={form.name}
                onChange={e => setField('name', e.target.value)}
                placeholder="e.g. The Keg"
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
          </div>

          {/* City + Address */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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
          </div>

          {/* Reservation date + time */}
          <FormField label="Reservation">
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

          {/* Party Size + Style */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <FormField label="Party Size">
              <input
                type="number"
                min="1"
                value={form.party_size}
                onChange={e => setField('party_size', e.target.value)}
                placeholder="e.g. 2"
                style={inputStyle()}
              />
            </FormField>
            <FormField label="Style">
              <input
                type="text"
                value={form.style}
                onChange={e => setField('style', e.target.value)}
                placeholder="e.g. Fine Dining"
                style={inputStyle()}
              />
            </FormField>
          </div>

          {/* Confirmation Number */}
          <FormField label="Confirmation Number">
            <input
              type="text"
              value={form.confirmation_number}
              onChange={e => setField('confirmation_number', e.target.value)}
              placeholder="e.g. RES-123456"
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
            <span style={{ fontSize: '14px', color: 'var(--text)', fontWeight: 500 }}>Included (provided by operator)</span>
          </label>

          {/* Action Required toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', minHeight: '44px' }}>
            <input
              type="checkbox"
              checked={form.action_required}
              onChange={e => setField('action_required', e.target.checked)}
              style={{ width: '20px', height: '20px', accentColor: 'var(--gold)', cursor: 'pointer', flexShrink: 0 }}
            />
            <span style={{ fontSize: '14px', color: 'var(--text)', fontWeight: 500 }}>Action Required</span>
          </label>

          {/* Delete */}
          {editingRecord && (
            confirmDelete ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ fontSize: '14px', color: 'var(--red)', textAlign: 'center', margin: 0 }}>
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
                    style={{ flex: 1, background: 'var(--red)', borderColor: 'var(--red)' }}
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
                  fontSize: '14px',
                  cursor: 'pointer',
                  padding: '8px',
                  minHeight: '44px',
                }}
              >
                Remove Restaurant
              </button>
            )
          )}

        </div>
      </BottomSheet>
    </div>
  )
}
