// components/sections/HotelsClient.tsx
'use client'

import { useState, useCallback } from 'react'
import { ChevronDown, ChevronUp, ExternalLink, Plus } from 'lucide-react'
import { ResponsiveSheet } from '@/components/ui/ResponsiveSheet'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'

// ─── Types ────────────────────────────────────────────────────────────────────

type Hotel = {
  id: string
  trip_id: string
  name: string
  address: string | null
  city: string | null
  check_in_date: string | null
  check_out_date: string | null
  check_in_time: string | null
  check_out_time: string | null
  confirmation_number: string | null
  phone: string | null
  website_url: string | null
  notes: string | null
  sort_order: number
  action_required: boolean
  room_type: string | null
}

type NearbyDining = {
  id: string
  hotel_id: string
  name: string
  url: string | null
  walk: string | null
  meals: string[] | null
  note: string | null
  sort_order: number | null
}

type Props = {
  tripId: string
  initialHotels: Hotel[]
  nearbyDining: NearbyDining[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  name: '',
  address: '',
  city: '',
  check_in_date: '',
  check_in_time: '',
  check_out_date: '',
  check_out_time: '',
  room_type: '',
  confirmation_number: '',
  phone: '',
  website_url: '',
  notes: '',
  action_required: false,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(date: string | null): string {
  if (!date) return '—'
  return new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function formatTime(time: string | null): string {
  if (!time) return ''
  const [h, m] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  fontSize: 'var(--fs-base)',
  border: '1px solid var(--bg3)',
  borderRadius: '8px',
  background: 'var(--bg2)',
  color: 'var(--text)',
  outline: 'none',
  boxSizing: 'border-box',
}

// ─── Nearby Dining Row ────────────────────────────────────────────────────────

function DiningRow({ d }: { d: NearbyDining }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-medium)', color: 'var(--text)' }}>{d.name}</span>
          {d.meals?.map(m => (
            <span
              key={m}
              style={{
                fontSize: 'var(--fs-xs)',
                fontWeight: 'var(--fw-bold)',
                padding: '2px 6px',
                borderRadius: '4px',
                background: 'var(--navy)',
                color: 'var(--bg2)',
              }}
            >
              {m}
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '2px', flexWrap: 'wrap' }}>
          {d.walk && (
            <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--slate)' }}>{d.walk}</span>
          )}
          {d.note && (
            <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text2)' }}>{d.note}</span>
          )}
        </div>
      </div>
      {d.url && (
        <a
          href={d.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          style={{ color: 'var(--gold-text)', flexShrink: 0, marginTop: '2px' }}
          aria-label={`Visit ${d.name} website`}
        >
          <ExternalLink size={16} />
        </a>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function HotelsClient({ tripId, initialHotels, nearbyDining }: Props) {
  const [hotels, setHotels] = useState<Hotel[]>(initialHotels)
  const [expandedHotelId, setExpandedHotelId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingHotel, setEditingHotel] = useState<Hotel | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const toast = useToast()

  // Group nearby dining by hotel_id
  const diningByHotel = nearbyDining.reduce<Record<string, NearbyDining[]>>((acc, row) => {
    if (!acc[row.hotel_id]) acc[row.hotel_id] = []
    acc[row.hotel_id].push(row)
    return acc
  }, {})

  const refetch = useCallback(async () => {
    const res = await fetch(`/api/trips/${tripId}/hotels`)
    if (res.ok) setHotels(await res.json())
  }, [tripId])

  function setField(key: string, value: string | boolean) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function openAdd() {
    setEditingHotel(null)
    setForm(EMPTY_FORM)
    setConfirmDelete(false)
    setSheetOpen(true)
  }

  function openEdit(hotel: Hotel) {
    setEditingHotel(hotel)
    setForm({
      name: hotel.name,
      address: hotel.address ?? '',
      city: hotel.city ?? '',
      check_in_date: hotel.check_in_date ?? '',
      check_in_time: hotel.check_in_time ?? '',
      check_out_date: hotel.check_out_date ?? '',
      check_out_time: hotel.check_out_time ?? '',
      room_type: hotel.room_type ?? '',
      confirmation_number: hotel.confirmation_number ?? '',
      phone: hotel.phone ?? '',
      website_url: hotel.website_url ?? '',
      notes: hotel.notes ?? '',
      action_required: hotel.action_required,
    })
    setConfirmDelete(false)
    setSheetOpen(true)
  }

  function closeSheet() {
    setSheetOpen(false)
    setEditingHotel(null)
    setConfirmDelete(false)
  }

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        check_in_date: form.check_in_date || null,
        check_in_time: form.check_in_time || null,
        check_out_date: form.check_out_date || null,
        check_out_time: form.check_out_time || null,
        room_type: form.room_type.trim() || null,
        confirmation_number: form.confirmation_number.trim() || null,
        phone: form.phone.trim() || null,
        website_url: form.website_url.trim() || null,
        notes: form.notes.trim() || null,
        action_required: form.action_required,
      }

      if (editingHotel) {
        const res = await fetch(`/api/hotels/${editingHotel.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error()
        toast.show('Hotel updated', 'success')
      } else {
        const res = await fetch(`/api/trips/${tripId}/hotels`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error()
        toast.show('Hotel added', 'success')
      }

      await refetch()
      closeSheet()
    } catch {
      toast.show('Something went wrong', 'neutral')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!editingHotel) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/hotels/${editingHotel.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.show('Hotel removed', 'neutral')
      await refetch()
      closeSheet()
    } catch {
      toast.show('Something went wrong', 'neutral')
    } finally {
      setDeleting(false)
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
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
          Hotels
        </h2>
        <Button variant="primary" size="sm" onClick={openAdd}>
          <Plus size={16} />
          Add Hotel
        </Button>
      </div>

      {/* Empty state */}
      {hotels.length === 0 && (
        <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text3)' }}>No hotels added yet.</p>
      )}

      {/* Hotel list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {hotels.map(hotel => {
          const dining = diningByHotel[hotel.id] ?? []
          const isExpanded = expandedHotelId === hotel.id

          return (
            <div
              key={hotel.id}
              style={{
                overflow: 'hidden',
              }}
            >
              {/* Hotel card — tap to edit */}
              <div
                onClick={() => openEdit(hotel)}
                className="section-row"
              >
                {/* Name + badges */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 'var(--fs-base)', fontWeight: 'var(--fw-medium)', color: 'var(--text)' }}>
                        {hotel.name}
                      </span>
                      {hotel.action_required && (
                        <Badge color={{ bg: 'rgba(139,32,32,0.08)', text: 'var(--red)', border: 'rgba(139,32,32,0.2)' }}>Action Required</Badge>
                      )}
                      {hotel.room_type && (
                        <Badge color={{ bg: 'var(--bg3)', text: 'var(--text2)' }}>{hotel.room_type}</Badge>
                      )}
                    </div>

                    {/* Address / city */}
                    {(hotel.address || hotel.city) && (
                      <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text3)', marginTop: '3px' }}>
                        {[hotel.address, hotel.city].filter(Boolean).join(', ')}
                      </p>
                    )}

                    {/* Check-in / Check-out */}
                    <div style={{ display: 'flex', gap: '20px', marginTop: '10px', flexWrap: 'wrap' }}>
                      <div>
                        <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text3)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Check-in
                        </span>
                        <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text)' }}>
                          {formatDate(hotel.check_in_date)}
                          {hotel.check_in_time && (
                            <span style={{ color: 'var(--text3)' }}> · {formatTime(hotel.check_in_time)}</span>
                          )}
                        </span>
                      </div>
                      <div>
                        <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text3)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Check-out
                        </span>
                        <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text)' }}>
                          {formatDate(hotel.check_out_date)}
                          {hotel.check_out_time && (
                            <span style={{ color: 'var(--text3)' }}> · {formatTime(hotel.check_out_time)}</span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Confirmation number */}
                    {hotel.confirmation_number && (
                      <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text3)', marginTop: '8px' }}>
                        Conf: {hotel.confirmation_number}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Nearby dining toggle */}
              {dining.length > 0 && (
                <>
                  <button
                    onClick={() => setExpandedHotelId(isExpanded ? null : hotel.id)}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      background: 'var(--bg3)',
                      borderTop: '1px solid rgba(0,0,0,0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      border: 'none',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-medium)', color: 'var(--navy)' }}>
                      Nearby Dining ({dining.length})
                    </span>
                    {isExpanded
                      ? <ChevronUp size={16} color="var(--navy)" />
                      : <ChevronDown size={16} color="var(--navy)" />
                    }
                  </button>

                  {isExpanded && (
                    <div style={{
                      padding: '12px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      borderTop: '1px solid rgba(0,0,0,0.04)',
                    }}>
                      {dining.map(d => <DiningRow key={d.id} d={d} />)}
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Add / Edit Bottom Sheet */}
      <ResponsiveSheet open={sheetOpen} onClose={closeSheet} title={editingHotel ? 'Edit Hotel' : 'Add Hotel'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '40px' }}>

          <FormField label="Hotel Name *">
            <input
              type="text"
              value={form.name}
              onChange={e => setField('name', e.target.value)}
              placeholder="e.g. Fairmont Banff Springs"
              style={inputStyle}
            />
          </FormField>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <FormField label="City">
              <input
                type="text"
                value={form.city}
                onChange={e => setField('city', e.target.value)}
                placeholder="Banff"
                style={inputStyle}
              />
            </FormField>
            <FormField label="Room Type">
              <input
                type="text"
                value={form.room_type}
                onChange={e => setField('room_type', e.target.value)}
                placeholder="Deluxe King"
                style={inputStyle}
              />
            </FormField>
          </div>

          <FormField label="Address">
            <input
              type="text"
              value={form.address}
              onChange={e => setField('address', e.target.value)}
              placeholder="405 Spray Ave"
              style={inputStyle}
            />
          </FormField>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <FormField label="Check-in Date">
              <input
                type="date"
                value={form.check_in_date}
                onChange={e => setField('check_in_date', e.target.value)}
                style={inputStyle}
              />
            </FormField>
            <FormField label="Check-in Time">
              <input
                type="time"
                value={form.check_in_time}
                onChange={e => setField('check_in_time', e.target.value)}
                style={inputStyle}
              />
            </FormField>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <FormField label="Check-out Date">
              <input
                type="date"
                value={form.check_out_date}
                onChange={e => setField('check_out_date', e.target.value)}
                style={inputStyle}
              />
            </FormField>
            <FormField label="Check-out Time">
              <input
                type="time"
                value={form.check_out_time}
                onChange={e => setField('check_out_time', e.target.value)}
                style={inputStyle}
              />
            </FormField>
          </div>

          <FormField label="Confirmation Number">
            <input
              type="text"
              value={form.confirmation_number}
              onChange={e => setField('confirmation_number', e.target.value)}
              placeholder="ABC123"
              style={inputStyle}
            />
          </FormField>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <FormField label="Phone">
              <input
                type="tel"
                value={form.phone}
                onChange={e => setField('phone', e.target.value)}
                placeholder="+1 (403) 762-2211"
                style={inputStyle}
              />
            </FormField>
            <FormField label="Website">
              <input
                type="url"
                value={form.website_url}
                onChange={e => setField('website_url', e.target.value)}
                placeholder="https://..."
                style={inputStyle}
              />
            </FormField>
          </div>

          <FormField label="Notes">
            <textarea
              value={form.notes}
              onChange={e => setField('notes', e.target.value)}
              placeholder="Any additional notes…"
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </FormField>

          {/* Action Required toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', minHeight: '44px' }}>
            <input
              type="checkbox"
              checked={form.action_required}
              onChange={e => setField('action_required', e.target.checked)}
              style={{ width: '20px', height: '20px', accentColor: 'var(--gold)', cursor: 'pointer', flexShrink: 0, appearance: 'auto', WebkitAppearance: 'auto' as any }}
            />
            <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text)', fontWeight: 500 }}>Action Required</span>
          </label>

          {/* Save */}
          <Button
            variant="primary"
            size="default"
            onClick={handleSave}
            disabled={saving || !form.name.trim()}
            loading={saving}
          >
            {editingHotel ? 'Save Changes' : 'Add Hotel'}
          </Button>

          {/* Delete */}
          {editingHotel && (
            confirmDelete ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--red)', textAlign: 'center', margin: 0 }}>
                  Remove this hotel?
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
                  fontSize: 'var(--fs-sm)',
                  cursor: 'pointer',
                  padding: '8px',
                  minHeight: '44px',
                }}
              >
                Remove Hotel
              </button>
            )
          )}

        </div>
      </ResponsiveSheet>
    </div>
  )
}
