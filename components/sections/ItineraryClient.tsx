'use client'

import { useState, useCallback, useMemo } from 'react'
import { Plus } from 'lucide-react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { FormField, inputStyle } from '@/components/ui/FormField'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ItineraryDay = {
  id: string
  trip_id: string
  day_number: number
  day_date: string
  title: string
  location: string | null
  notes: string | null
  sort_order: number
}

export type ItineraryRow = {
  id: string
  trip_id: string
  day_id: string
  start_time: string | null
  end_time: string | null
  title: string
  description: string | null
  location: string | null
  category: string
  sort_order: number
}

type Props = {
  tripId: string
  initialDays: ItineraryDay[]
  initialRows: ItineraryRow[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDayDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

function formatTime(iso: string | null): string {
  if (!iso) return ''
  const raw = iso.split('T')[1]?.split(/[+Z]/)[0] ?? ''
  const [h, m] = raw.split(':').map(Number)
  if (isNaN(h) || isNaN(m)) return ''
  const suffix = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`
}

function splitDatetime(iso: string | null): [string, string] {
  if (!iso) return ['', '']
  const tIdx = iso.indexOf('T')
  if (tIdx === -1) return [iso, '']
  return [iso.slice(0, tIdx), iso.slice(tIdx + 1, tIdx + 16)] // YYYY-MM-DD and HH:MM:SS
}

function joinDatetime(date: string, time: string): string | null {
  if (!date) return null
  return `${date}T${time || '00:00'}:00`
}

function dayToForm(d: ItineraryDay) {
  return {
    day_number: d.day_number,
    day_date: d.day_date ?? '',
    title: d.title ?? '',
    location: d.location ?? '',
    notes: d.notes ?? '',
    sort_order: d.sort_order,
  }
}

function rowToForm(r: ItineraryRow) {
  const [startDate, startTime] = splitDatetime(r.start_time)
  const [endDate, endTime] = splitDatetime(r.end_time)
  return {
    day_id: r.day_id ?? '',
    start_date: startDate,
    start_time_val: startTime,
    end_date: endDate,
    end_time_val: endTime,
    title: r.title ?? '',
    description: r.description ?? '',
    location: r.location ?? '',
    category: r.category ?? '',
    sort_order: r.sort_order,
  }
}

function categoryColor(cat: string): { bg: string; text: string; border: string } {
  const c = (cat ?? '').toLowerCase();
  if (c === 'flight' || c.includes('air'))
    return { bg: 'var(--bg3)', text: 'var(--navy)', border: 'var(--border2)' };
  if (c === 'hotel' || c.includes('accommodation') || c.includes('lodge') || c.includes('resort'))
    return { bg: 'var(--bg3)', text: 'var(--gold-text)', border: 'var(--border)' };
  if (c === 'transportation' || c.includes('transfer') || c.includes('car') || c.includes('train') || c.includes('ferry'))
    return { bg: 'var(--bg3)', text: 'var(--slate)', border: 'var(--border2)' };
  if (c === 'restaurant' || c.includes('dining') || c.includes('food') || c.includes('meal'))
    return { bg: 'var(--bg3)', text: 'var(--green)', border: 'var(--border2)' };
  return { bg: 'var(--bg3)', text: 'var(--text3)', border: 'var(--border2)' };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ItineraryClient({ tripId, initialDays, initialRows }: Props) {
  const [days, setDays] = useState<ItineraryDay[]>(initialDays)
  const [rows, setRows] = useState<ItineraryRow[]>(initialRows)

  const [daySheetOpen, setDaySheetOpen] = useState(false)
  const [rowSheetOpen, setRowSheetOpen] = useState(false)
  
  const [editingDay, setEditingDay] = useState<ItineraryDay | null>(null)
  const [editingRow, setEditingRow] = useState<ItineraryRow | null>(null)

  const EMPTY_DAY_FORM = {
    day_number: days.length + 1,
    day_date: '',
    title: '',
    location: '',
    notes: '',
    sort_order: days.length,
  }

  const EMPTY_ROW_FORM = {
    day_id: '',
    start_date: '',
    start_time_val: '',
    end_date: '',
    end_time_val: '',
    title: '',
    description: '',
    location: '',
    category: 'Activity',
    sort_order: 0,
  }

  const [dayForm, setDayForm] = useState(EMPTY_DAY_FORM)
  const [rowForm, setRowForm] = useState(EMPTY_ROW_FORM)
  
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  
  const toast = useToast()

  const refetch = useCallback(async () => {
    const [daysRes, rowsRes] = await Promise.all([
      fetch(`/api/trips/${tripId}/itinerary/days`),
      fetch(`/api/trips/${tripId}/itinerary/rows`),
    ])
    if (daysRes.ok) setDays(await daysRes.json())
    if (rowsRes.ok) setRows(await rowsRes.json())
  }, [tripId])

  // ── Actions: Days ─────────────────────────────────────────────────────────

  function openAddDay() {
    setEditingDay(null)
    setDayForm({ ...EMPTY_DAY_FORM, day_number: days.length + 1, sort_order: days.length })
    setConfirmDelete(false)
    setDaySheetOpen(true)
  }

  function openEditDay(d: ItineraryDay) {
    setEditingDay(d)
    setDayForm(dayToForm(d))
    setConfirmDelete(false)
    setDaySheetOpen(true)
  }

  async function handleSaveDay() {
    setSaving(true)
    try {
      const payload = {
        day_number: dayForm.day_number,
        day_date: dayForm.day_date,
        title: dayForm.title.trim(),
        location: dayForm.location.trim() || null,
        notes: dayForm.notes.trim() || null,
        sort_order: dayForm.sort_order,
      }
      const res = editingDay 
        ? await fetch(`/api/itinerary/days/${editingDay.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          })
        : await fetch(`/api/trips/${tripId}/itinerary/days`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          })
      if (!res.ok) throw new Error()
      toast.show(editingDay ? 'Day updated' : 'Day added', 'success')
      await refetch()
      setDaySheetOpen(false)
    } catch {
      toast.show('Something went wrong', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteDay() {
    if (!editingDay) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/itinerary/days/${editingDay.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.show('Day removed', 'success')
      await refetch()
      setDaySheetOpen(false)
    } catch {
      toast.show('Something went wrong', 'error')
    } finally {
      setDeleting(false)
    }
  }

  // ── Actions: Rows ─────────────────────────────────────────────────────────

  function openAddRow(dayId: string) {
    setEditingRow(null)
    const day = days.find(d => d.id === dayId)
    const dayRows = rows.filter(r => r.day_id === dayId)
    setRowForm({ 
      ...EMPTY_ROW_FORM, 
      day_id: dayId, 
      start_date: day?.day_date ?? '',
      end_date: day?.day_date ?? '',
      sort_order: dayRows.length 
    })
    setConfirmDelete(false)
    setRowSheetOpen(true)
  }

  function openEditRow(r: ItineraryRow) {
    setEditingRow(r)
    setRowForm(rowToForm(r))
    setConfirmDelete(false)
    setRowSheetOpen(true)
  }

  async function handleSaveRow() {
    setSaving(true)
    try {
      const payload = {
        day_id: rowForm.day_id,
        title: rowForm.title.trim(),
        description: rowForm.description.trim() || null,
        location: rowForm.location.trim() || null,
        category: rowForm.category.trim() || null,
        start_time: joinDatetime(rowForm.start_date, rowForm.start_time_val),
        end_time: joinDatetime(rowForm.end_date, rowForm.end_time_val) || null,
        sort_order: rowForm.sort_order,
      }
      const res = editingRow
        ? await fetch(`/api/itinerary/rows/${editingRow.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          })
        : await fetch(`/api/trips/${tripId}/itinerary/rows`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          })
      if (!res.ok) throw new Error()
      toast.show(editingRow ? 'Item updated' : 'Item added', 'success')
      await refetch()
      setRowSheetOpen(false)
    } catch {
      toast.show('Something went wrong', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteRow() {
    if (!editingRow) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/itinerary/rows/${editingRow.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.show('Item removed', 'success')
      await refetch()
      setRowSheetOpen(false)
    } catch {
      toast.show('Something went wrong', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const sortedDays = useMemo(() => [...days].sort((a, b) => a.sort_order - b.sort_order), [days])
  const rowsByDay = useMemo(() => {
    const map = new Map<string, ItineraryRow[]>()
    rows.forEach(r => {
      const arr = map.get(r.day_id) ?? []
      arr.push(r)
      map.set(r.day_id, arr)
    })
    map.forEach(arr => arr.sort((a, b) => a.sort_order - b.sort_order))
    return map
  }, [rows])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '22px', fontFamily: 'var(--font-display)', color: 'var(--navy)', fontWeight: 400 }}>
          Itinerary
        </h2>
        <Button variant="primary" size="sm" onClick={openAddDay}>
          <Plus size={16} /> Add Day
        </Button>
      </div>

      {sortedDays.length === 0 && (
        <p style={{ fontFamily: "'Lato', sans-serif", fontSize: '14px', color: 'var(--text3)', textAlign: 'center', padding: '32px 0' }}>
          No itinerary data yet.
        </p>
      )}

      {sortedDays.map(day => {
        const dayRows = rowsByDay.get(day.id) ?? []
        return (
          <div key={day.id}>
            {/* Day card */}
            <button
              onClick={() => openEditDay(day)}
              className="section-row"
              style={{ padding: '20px 24px', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow)' }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '4px' }}>
                <span style={{ fontFamily: "'Lato', sans-serif", fontSize: '12px', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--gold-text)' }}>
                  DAY {day.day_number}
                </span>
                <span style={{ fontFamily: "'Lato', sans-serif", fontSize: '13px', color: 'var(--text3)' }}>
                  {formatDayDate(day.day_date)}
                </span>
              </div>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '22px', fontWeight: 600, color: 'var(--navy)', lineHeight: 1.25, marginBottom: day.location ? '6px' : '0' }}>
                {day.title}
              </h2>
              {day.location && (
                <p style={{ fontFamily: "'Lato', sans-serif", fontSize: '13px', color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span aria-hidden="true">📍</span> {day.location}
                </p>
              )}
            </button>

            {/* Rows container */}
            <div style={{ marginTop: '2px', borderLeft: '2px solid var(--border2)', marginLeft: '24px', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {dayRows.map(row => (
                <button
                  key={row.id}
                  onClick={() => openEditRow(row)}
                  className="section-row"
                  style={{ padding: '14px 16px', borderRadius: 'var(--r)', minHeight: '44px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: "'Lato', sans-serif", fontSize: '12px', fontWeight: 700, color: 'var(--gold-text)', letterSpacing: '0.04em' }}>
                      {formatTime(row.start_time)}{row.end_time ? ` – ${formatTime(row.end_time)}` : ''}
                    </span>
                    <span style={{ fontFamily: "'Lato', sans-serif", fontSize: '14px', fontWeight: 700, color: 'var(--text)', flex: 1 }}>
                      {row.title}
                    </span>
                    <Badge color={categoryColor(row.category)}>{row.category}</Badge>
                  </div>
                  {row.description && (
                    <p style={{ fontFamily: "'Lato', sans-serif", fontSize: '13px', color: 'var(--text3)', lineHeight: 1.5 }}>
                      {row.description}
                    </p>
                  )}
                  {row.location && (
                    <p style={{ fontFamily: "'Lato', sans-serif", fontSize: '13px', color: 'var(--text3)', fontStyle: 'italic' }}>
                      📍 {row.location}
                    </p>
                  )}
                </button>
              ))}
              
              <div style={{ marginTop: '8px' }}>
                <Button variant="secondary" size="sm" onClick={() => openAddRow(day.id)}>
                  <Plus size={14} /> Add Row
                </Button>
              </div>
            </div>
          </div>
        )
      })}

      {/* Day Sheet */}
      <BottomSheet
        open={daySheetOpen}
        onClose={() => setDaySheetOpen(false)}
        title={editingDay ? 'Edit Day' : 'Add Day'}
        primaryAction={{ label: editingDay ? 'Save' : 'Add', onClick: handleSaveDay, loading: saving, disabled: saving }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '40px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <FormField label="Day Number">
              <input type="number" value={dayForm.day_number} onChange={e => setDayForm(f => ({ ...f, day_number: parseInt(e.target.value) }))} style={inputStyle()} />
            </FormField>
            <FormField label="Date">
              <input type="date" value={dayForm.day_date} onChange={e => setDayForm(f => ({ ...f, day_date: e.target.value }))} style={inputStyle()} />
            </FormField>
          </div>
          <FormField label="Title">
            <input type="text" value={dayForm.title} onChange={e => setDayForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Arrival in London" style={inputStyle()} />
          </FormField>
          <FormField label="Location">
            <input type="text" value={dayForm.location} onChange={e => setDayForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. London, UK" style={inputStyle()} />
          </FormField>
          <FormField label="Notes">
            <textarea value={dayForm.notes} onChange={e => setDayForm(f => ({ ...f, notes: e.target.value }))} placeholder="Private notes for this day..." rows={3} style={{ ...inputStyle(), resize: 'vertical' }} />
          </FormField>

          {editingDay && (
            confirmDelete ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ fontSize: '14px', color: 'var(--red)', textAlign: 'center' }}>Remove this day and all its rows?</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(false)} style={{ flex: 1 }}>Cancel</Button>
                  <Button variant="primary" size="sm" onClick={handleDeleteDay} disabled={deleting} loading={deleting} style={{ flex: 1, background: 'var(--red)', borderColor: 'var(--red)' }}>Remove</Button>
                </div>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} style={{ background: 'none', border: 'none', color: 'var(--red)', fontSize: '14px', cursor: 'pointer', padding: '8px' }}>Remove Day</button>
            )
          )}
        </div>
      </BottomSheet>

      {/* Row Sheet */}
      <BottomSheet
        open={rowSheetOpen}
        onClose={() => setRowSheetOpen(false)}
        title={editingRow ? 'Edit Item' : 'Add Item'}
        primaryAction={{ label: editingRow ? 'Save' : 'Add', onClick: handleSaveRow, loading: saving, disabled: saving }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '40px' }}>
          <FormField label="Day">
            <div style={{ ...inputStyle(), background: 'var(--bg3)', color: 'var(--text3)' }}>
              {days.find(d => d.id === rowForm.day_id)?.title || 'Selected Day'}
            </div>
          </FormField>
          <FormField label="Category">
            <input type="text" value={rowForm.category} onChange={e => setRowForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. activity, meal, transport..." style={inputStyle()} />
          </FormField>
          <FormField label="Title">
            <input type="text" value={rowForm.title} onChange={e => setRowForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Dinner at The Ritz" style={inputStyle()} />
          </FormField>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <FormField label="Start Date">
              <input type="date" value={rowForm.start_date} onChange={e => setRowForm(f => ({ ...f, start_date: e.target.value }))} style={inputStyle()} />
            </FormField>
            <FormField label="Start Time">
              <input type="time" value={rowForm.start_time_val} onChange={e => setRowForm(f => ({ ...f, start_time_val: e.target.value }))} style={inputStyle()} />
            </FormField>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <FormField label="End Date">
              <input type="date" value={rowForm.end_date} onChange={e => setRowForm(f => ({ ...f, end_date: e.target.value }))} style={inputStyle()} />
            </FormField>
            <FormField label="End Time">
              <input type="time" value={rowForm.end_time_val} onChange={e => setRowForm(f => ({ ...f, end_time_val: e.target.value }))} style={inputStyle()} />
            </FormField>
          </div>

          <FormField label="Location">
            <input type="text" value={rowForm.location} onChange={e => setRowForm(f => ({ ...f, location: e.target.value }))} placeholder="Optional location..." style={inputStyle()} />
          </FormField>
          <FormField label="Description">
            <textarea value={rowForm.description} onChange={e => setRowForm(f => ({ ...f, description: e.target.value }))} placeholder="Details about this item..." rows={3} style={{ ...inputStyle(), resize: 'vertical' }} />
          </FormField>

          {editingRow && (
            confirmDelete ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ fontSize: '14px', color: 'var(--red)', textAlign: 'center' }}>Remove this item?</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(false)} style={{ flex: 1 }}>Cancel</Button>
                  <Button variant="primary" size="sm" onClick={handleDeleteRow} disabled={deleting} loading={deleting} style={{ flex: 1, background: 'var(--red)', borderColor: 'var(--red)' }}>Remove</Button>
                </div>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} style={{ background: 'none', border: 'none', color: 'var(--red)', fontSize: '14px', cursor: 'pointer', padding: '8px' }}>Remove Item</button>
            )
          )}
        </div>
      </BottomSheet>

    </div>
  )
}
