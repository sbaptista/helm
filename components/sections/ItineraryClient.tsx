'use client'

import { useState, useCallback, useMemo, useEffect, useContext } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { ResponsiveSheet } from '@/components/ui/ResponsiveSheet'
import { Button } from '@/components/ui/Button'
import { FormField, inputStyle } from '@/components/ui/FormField'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'
import { TabNavigationContext } from '@/components/advisor/TripDetailView'

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
  type: 'flight' | 'train' | 'free' | 'transit' | 'sightseeing'
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
  start_timezone: string | null
  end_timezone: string | null
  is_all_day: boolean
  is_approx: boolean
  is_provided: boolean
  action_required: boolean
  action_note: string | null
}

type Props = {
  tripId: string
  initialDays: ItineraryDay[]
  initialRows: ItineraryRow[]
  tripStartDate: string   // YYYY-MM-DD from trips.departure_date
  tripEndDate: string     // YYYY-MM-DD from trips.return_date
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DAY_TYPE_ICONS: Record<string, string> = {
  flight: '✈️',
  train: '🚂',
  free: '🌄',
  transit: '🚌',
  sightseeing: '🗺️',
}

const DAY_TYPE_BORDER: Record<string, string> = {
  flight:      'var(--gold)',
  train:       'var(--navy)',
  free:        'var(--green)',
  transit:     'var(--slate)',
  sightseeing: 'var(--red)',
}

const TRIP_CITIES = [
  { city: 'Honolulu',    tzid: 'Pacific/Honolulu' },
  { city: 'Vancouver',   tzid: 'America/Vancouver' },
  { city: 'Kamloops',    tzid: 'America/Vancouver' },
  { city: 'Jasper',      tzid: 'America/Edmonton' },
  { city: 'Lake Louise', tzid: 'America/Edmonton' },
  { city: 'Banff',       tzid: 'America/Edmonton' },
]

const HST_TZ = 'Pacific/Honolulu'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDayDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

// Display a UTC ISO timestamp in a given IANA timezone, returns "h:mm AM/PM TZ"
function formatLocalTime(iso: string | null, tzid: string | null): string {
  if (!iso || !tzid) return ''
  try {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric', minute: '2-digit', hour12: true,
      timeZone: tzid,
    }).format(new Date(iso))
  } catch { return '' }
}

// Display the abbreviated timezone name (e.g. "PDT", "HST")
function formatTzAbbr(iso: string | null, tzid: string | null): string {
  if (!iso || !tzid) return ''
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZoneName: 'short', timeZone: tzid,
    }).formatToParts(new Date(iso)).find(p => p.type === 'timeZoneName')?.value ?? ''
  } catch { return '' }
}

// Build a UTC ISO string from a local date, time, and IANA timezone
// e.g. ('2026-10-04', '08:30', 'America/Vancouver') -> '2026-10-04T15:30:00.000Z'
function localToUtc(date: string, time: string, tzid: string): string | null {
  if (!date || !time || !tzid) return null
  try {
    const assumed = new Date(`${date}T${time}:00`)
    const inTz = new Date(assumed.toLocaleString('en-US', { timeZone: tzid }))
    const diff = assumed.getTime() - inTz.getTime()
    return new Date(assumed.getTime() + diff).toISOString()
  } catch { return null }
}

// Extract local date and time strings from a UTC ISO for display in a form
function utcToLocalParts(iso: string | null, tzid: string | null): [string, string] {
  if (!iso || !tzid) return ['', '']
  try {
    const d = new Date(iso)
    const datePart = new Intl.DateTimeFormat('en-CA', {
      timeZone: tzid, year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(d) // returns YYYY-MM-DD
    const timePart = new Intl.DateTimeFormat('en-US', {
      timeZone: tzid, hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(d) // returns HH:MM
    return [datePart, timePart]
  } catch { return ['', ''] }
}

function dayToForm(d: ItineraryDay) {
  return {
    day_date: d.day_date ?? '',
    title: d.title ?? '',
    location: d.location ?? '',
    notes: d.notes ?? '',
    type: d.type ?? 'free',
  }
}

function rowToForm(r: ItineraryRow) {
  const startTz = r.start_timezone ?? null
  const endTz = r.end_timezone ?? r.start_timezone ?? null
  const [startDate, startTime] = utcToLocalParts(r.start_time, startTz)
  const [endDate, endTime] = utcToLocalParts(r.end_time, endTz)
  return {
    day_id: r.day_id ?? '',
    start_timezone: r.start_timezone ?? '',
    end_timezone: r.end_timezone ?? '',
    start_date: startDate,
    start_time_val: startTime,
    end_date: endDate,
    end_time_val: endTime,
    title: r.title ?? '',
    description: r.description ?? '',
    location: r.location ?? '',
    category: r.category ?? '',
    sort_order: r.sort_order,
    is_all_day: r.is_all_day ?? false,
    is_approx: r.is_approx ?? false,
    is_provided: r.is_provided ?? false,
    action_required: r.action_required ?? false,
    action_note: r.action_note ?? '',
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

export default function ItineraryClient({ tripId, initialDays, initialRows, tripStartDate, tripEndDate }: Props) {
  const [days, setDays] = useState<ItineraryDay[]>(initialDays)
  const [rows, setRows] = useState<ItineraryRow[]>(initialRows)

  const [daySheetOpen, setDaySheetOpen] = useState(false)
  const [rowSheetOpen, setRowSheetOpen] = useState(false)

  const [editingDay, setEditingDay] = useState<ItineraryDay | null>(null)
  const [editingRow, setEditingRow] = useState<ItineraryRow | null>(null)

  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set())

  const router = useRouter()
  const { pendingItemId, clearPendingItem } = useContext(TabNavigationContext)
  const [highlightedId, setHighlightedId] = useState<string | null>(null)

  useEffect(() => {
    if (!pendingItemId) return

    // Check if it's a row
    const row = rows.find(r => r.id === pendingItemId)
    if (row) {
      clearPendingItem()
      setHighlightedId(pendingItemId)
      setExpandedDays(prev => new Set([...prev, row.day_id]))
      setTimeout(() => {
        const el = document.getElementById(`item-${pendingItemId}`)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 80)
      setTimeout(() => setHighlightedId(null), 1500)
      return
    }

    // Check if it's a day
    const day = days.find(d => d.id === pendingItemId)
    if (day) {
      clearPendingItem()
      setHighlightedId(pendingItemId)
      setTimeout(() => {
        const el = document.getElementById(`item-${pendingItemId}`)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 80)
      setTimeout(() => setHighlightedId(null), 1500)
    }
  }, [pendingItemId]) // eslint-disable-line react-hooks/exhaustive-deps

  function toggleDay(dayId: string) {
    setExpandedDays(prev => {
      const next = new Set(prev)
      next.has(dayId) ? next.delete(dayId) : next.add(dayId)
      return next
    })
  }

  const EMPTY_DAY_FORM = {
    day_date: '',
    title: '',
    location: '',
    notes: '',
    type: 'free',
  }

  const EMPTY_ROW_FORM = {
    day_id: '',
    start_timezone: '',
    end_timezone: '',
    start_date: '',
    start_time_val: '',
    end_date: '',
    end_time_val: '',
    title: '',
    description: '',
    location: '',
    category: 'Activity',
    sort_order: 0,
    is_all_day: false,
    is_approx: false,
    is_provided: false,
    action_required: false,
    action_note: '',
  }

  const [dayForm, setDayForm] = useState(EMPTY_DAY_FORM)
  const [rowForm, setRowForm] = useState(EMPTY_ROW_FORM)

  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDeleteDay, setConfirmDeleteDay] = useState(false)
  const [confirmDeleteRow, setConfirmDeleteRow] = useState(false)

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
    setDayForm({ ...EMPTY_DAY_FORM })
    setConfirmDeleteDay(false)
    setDaySheetOpen(true)
  }

  function openEditDay(d: ItineraryDay) {
    setEditingDay(d)
    setDayForm(dayToForm(d))
    setConfirmDeleteDay(false)
    setDaySheetOpen(true)
  }

  async function handleSaveDay() {
    setSaving(true)
    try {
      const payload = {
        day_date: dayForm.day_date,
        title: dayForm.title.trim(),
        location: dayForm.location.trim() || null,
        notes: dayForm.notes.trim() || null,
        type: dayForm.type,
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
    setConfirmDeleteRow(false)
    setRowSheetOpen(true)
  }

  function openEditRow(r: ItineraryRow) {
    setEditingRow(r)
    setRowForm(rowToForm(r))
    setConfirmDeleteRow(false)
    setRowSheetOpen(true)
  }

  async function handleSaveRow() {
    setSaving(true)

    // ── Validation ────────────────────────────────────────────────
    if (!rowForm.title.trim()) {
      toast.show('Title is required', 'error')
      setSaving(false)
      return
    }

    if (!rowForm.is_all_day) {
      // Start fields: all three required together or none
      const hasStartDate = !!rowForm.start_date
      const hasStartTime = !!rowForm.start_time_val
      const hasStartTz   = !!rowForm.start_timezone

      if (hasStartDate || hasStartTime || hasStartTz) {
        if (!hasStartDate) { toast.show('Start date is required when start time is set', 'error'); setSaving(false); return }
        if (!hasStartTime) { toast.show('Start time is required when start date is set', 'error'); setSaving(false); return }
        if (!hasStartTz)   { toast.show('Start timezone is required when start time is set', 'error'); setSaving(false); return }
      }

      // End fields: all three required together or none
      const hasEndDate = !!rowForm.end_date
      const hasEndTime = !!rowForm.end_time_val

      if (hasEndDate || hasEndTime) {
        if (!hasEndDate) { toast.show('End date is required when end time is set', 'error'); setSaving(false); return }
        if (!hasEndTime) { toast.show('End time is required when end date is set', 'error'); setSaving(false); return }

        // End must be after start
        if (hasStartDate && hasStartTime && hasStartTz) {
          const startUtc = localToUtc(rowForm.start_date, rowForm.start_time_val, rowForm.start_timezone)
          const endUtc   = localToUtc(rowForm.end_date, rowForm.end_time_val, rowForm.end_timezone || rowForm.start_timezone)
          if (startUtc && endUtc && endUtc <= startUtc) {
            toast.show('End time must be after start time', 'error')
            setSaving(false)
            return
          }
        }

        // End without any start is not allowed
        if (!hasStartDate && !hasStartTime) {
          toast.show('Start time is required when end time is set', 'error')
          setSaving(false)
          return
        }
      }
    }
    // ── End Validation ────────────────────────────────────────────

    try {
      const payload = {
        day_id: rowForm.day_id,
        title: rowForm.title.trim(),
        description: rowForm.description.trim() || null,
        location: rowForm.location.trim() || null,
        category: rowForm.category.trim() || null,
        start_timezone: rowForm.is_all_day ? null : rowForm.start_timezone || null,
        end_timezone: rowForm.is_all_day ? null : rowForm.end_timezone || null,
        is_all_day: rowForm.is_all_day,
        start_time: rowForm.is_all_day ? null : localToUtc(rowForm.start_date, rowForm.start_time_val, rowForm.start_timezone),
        end_time: rowForm.is_all_day ? null : (rowForm.end_date && rowForm.end_time_val ? localToUtc(rowForm.end_date, rowForm.end_time_val, rowForm.end_timezone || rowForm.start_timezone) : null),
        sort_order: rowForm.sort_order,
        is_approx: rowForm.is_approx,
        is_provided: rowForm.is_provided,
        action_required: rowForm.action_required,
        action_note: rowForm.action_required ? (rowForm.action_note.trim() || null) : null,
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
      router.refresh()
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

  const sortedDays = useMemo(
    () => [...days].sort((a, b) => a.day_date.localeCompare(b.day_date)),
    [days]
  )
  const rowsByDay = useMemo(() => {
    const map = new Map<string, ItineraryRow[]>()
    rows.forEach(r => {
      const arr = map.get(r.day_id) ?? []
      arr.push(r)
      map.set(r.day_id, arr)
    })
    map.forEach(arr => arr.sort((a, b) => {
      if (a.is_all_day && !b.is_all_day) return -1
      if (!a.is_all_day && b.is_all_day) return 1
      if (a.start_time && b.start_time) return a.start_time.localeCompare(b.start_time)
      return a.sort_order - b.sort_order
    }))
    return map
  }, [rows])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

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
          <div key={day.id} id={`item-${day.id}`} style={{ marginBottom: '0' }}>
            <div
              suppressHydrationWarning
              onClick={() => toggleDay(day.id)}
              className={`day-card${highlightedId === day.id ? ' item-highlight' : ''}`}
              style={{
                cursor: 'pointer',
                padding: '20px 20px',
                borderRadius: 'var(--r-lg)',
                boxShadow: 'var(--shadow)',
                borderLeft: `4px solid ${DAY_TYPE_BORDER[day.type] ?? 'var(--border2)'}`,
                borderTop: '1px solid var(--border2)',
                borderRight: '1px solid var(--border2)',
                borderBottom: '1px solid var(--border2)',
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: '16px',
                width: '100%',
                textAlign: 'left',
              }}
            >
              {/* Day number — large, muted, fixed width */}
              <div style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: '36px',
                fontWeight: 700,
                color: 'rgba(13,30,53,0.15)',
                minWidth: '52px',
                textAlign: 'center',
                lineHeight: 1,
                flexShrink: 0,
              }}>
                {day.day_number === 0 ? (
                  <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'rgba(13,30,53,0.25)' }}>PRE<br/>TRIP</span>
                ) : (
                  day.day_number
                )}
              </div>

              {/* Main content — left aligned, fills space */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '18px' }}>{DAY_TYPE_ICONS[day.type] ?? '📅'}</span>
                  <div suppressHydrationWarning style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '22px', fontWeight: 600, color: 'var(--navy)', lineHeight: 1.2 }}>
                    {formatDayDate(day.day_date)}
                  </div>
                </div>
                <div style={{ fontSize: '15px', fontWeight: 400, color: 'var(--text2)', lineHeight: 1.4, marginTop: '2px' }}>
                  {day.title}
                </div>
                {day.location && (
                  <div style={{ fontFamily: "'Lato', sans-serif", fontSize: '13px', color: 'var(--text3)', marginTop: '4px' }}>
                    📍 {day.location}
                  </div>
                )}
              </div>

              {/* Right controls — Edit button + chevron */}
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}
                onClick={e => e.stopPropagation()}
              >
                <button
                  onClick={() => openEditDay(day)}
                  style={{
                    fontFamily: "'Lato', sans-serif",
                    fontSize: '13px',
                    fontWeight: 700,
                    color: 'var(--navy)',
                    background: 'var(--bg3)',
                    border: '1px solid var(--border2)',
                    borderRadius: 'var(--r)',
                    padding: '8px 16px',
                    cursor: 'pointer',
                    minHeight: '44px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Edit
                </button>
                <span
                  suppressHydrationWarning
                  onClick={() => toggleDay(day.id)}
                  style={{
                    fontSize: '18px',
                    color: 'var(--slate)',
                    transition: 'transform 0.25s',
                    transform: expandedDays.has(day.id) ? 'rotate(90deg)' : 'rotate(0deg)',
                    display: 'inline-block',
                    padding: '8px',
                    minWidth: '44px',
                    textAlign: 'center',
                    cursor: 'pointer',
                  }}
                >▶</span>
              </div>
            </div>

            {expandedDays.has(day.id) && (
              <div style={{ marginTop: '2px', borderLeft: '2px solid var(--border2)', marginLeft: '24px', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '10px' }}>
                {dayRows.map(row => (
                  <button
                    key={row.id}
                    id={`item-${row.id}`}
                    onClick={() => openEditRow(row)}
                    className={`section-row${highlightedId === row.id ? ' item-highlight' : ''}`}
                    style={{ padding: '18px 16px', borderRadius: 'var(--r)', minHeight: '44px', width: '100%', textAlign: 'left' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      {row.is_all_day ? (
                        <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--slate)', letterSpacing: '0.04em' }}>All Day</span>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: '80px' }}>
                          <span suppressHydrationWarning style={{ fontSize: '14px', fontWeight: 700, color: 'var(--gold-text)' }}>
                            {row.is_approx ? '≈ ' : ''}{formatLocalTime(row.start_time, row.start_timezone)}
                            {row.end_time ? ` – ${formatLocalTime(row.end_time, row.end_timezone ?? row.start_timezone)}` : ''}
                            {' '}{formatTzAbbr(row.start_time, row.start_timezone)}
                          </span>
                          {row.start_timezone !== HST_TZ && (
                            <span suppressHydrationWarning style={{ fontSize: '12px', color: 'var(--text3)' }}>
                              {formatLocalTime(row.start_time, HST_TZ)} HST
                            </span>
                          )}
                        </div>
                      )}
                      <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', flex: 1 }}>
                        {row.title}
                        {row.is_provided && (
                          <span style={{
                            display: 'inline-block', fontSize: '11px', fontWeight: 700,
                            color: 'var(--green)', background: 'rgba(45,90,61,0.08)',
                            border: '1px solid rgba(45,90,61,0.15)',
                            borderRadius: '10px', padding: '1px 8px',
                            whiteSpace: 'nowrap', verticalAlign: 'middle', marginLeft: '6px'
                          }}>✓ Included</span>
                        )}
                      </span>
                      {row.category && <Badge color={categoryColor(row.category)}>{row.category}</Badge>}
                    </div>
                    {row.action_required && (
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '5px',
                        borderLeft: '3px solid #B85900', padding: '2px 8px',
                        marginTop: '5px', fontSize: '12px', color: '#B85900',
                        fontWeight: 600, background: 'rgba(184,89,0,0.08)',
                        borderRadius: '0 3px 3px 0'
                      }}>🚩{row.action_note ? ` ${row.action_note}` : ''}</div>
                    )}
                    {row.description && (
                      <p className="line-clamp-3" style={{ fontSize: '14px', color: 'var(--text2)', lineHeight: 1.5, marginTop: '6px' }}>
                        {row.description}
                      </p>
                    )}
                    {row.location && (
                      <p style={{ fontSize: '13px', color: 'var(--text3)', fontStyle: 'italic', marginTop: '4px' }}>
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
            )}
          </div>
        )
      })}

      {/* Day Sheet */}
      <ResponsiveSheet
        open={daySheetOpen}
        onClose={() => setDaySheetOpen(false)}
        title={editingDay ? 'Edit Day' : 'Add Day'}
        primaryAction={{ label: editingDay ? 'Save' : 'Add', onClick: handleSaveDay, loading: saving, disabled: saving }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '40px' }}>

          {/* Date + Type — 2-column grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <FormField label="Date">
              <input
                type="date"
                value={dayForm.day_date}
                min={tripStartDate}
                max={tripEndDate}
                onChange={e => setDayForm(f => ({ ...f, day_date: e.target.value }))}
                style={inputStyle()}
              />
            </FormField>
            <FormField label="Day Type">
              <select value={dayForm.type} onChange={e => setDayForm(f => ({ ...f, type: e.target.value }))} style={inputStyle()}>
                <option value="free">🌄 Free Day</option>
                <option value="flight">✈️ Flight Day</option>
                <option value="train">🚂 Train Day</option>
                <option value="transit">🚌 Transit Day</option>
                <option value="sightseeing">🗺️ Sightseeing</option>
              </select>
            </FormField>
          </div>

          {/* Title */}
          <FormField label="Title">
            <input
              type="text"
              value={dayForm.title}
              onChange={e => setDayForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Arrive Vancouver"
              style={inputStyle()}
            />
            <span style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '4px', display: 'block' }}>
              Shown as the day header
            </span>
          </FormField>

          {/* Location */}
          <FormField label="Location">
            <input
              type="text"
              value={dayForm.location}
              onChange={e => setDayForm(f => ({ ...f, location: e.target.value }))}
              placeholder="e.g. Vancouver"
              style={inputStyle()}
            />
            <span style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '4px', display: 'block' }}>
              City where you spend the night
            </span>
          </FormField>

          {/* Notes */}
          <FormField label="Notes">
            <textarea
              value={dayForm.notes}
              onChange={e => setDayForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Private notes for this day..."
              rows={3}
              style={{ ...inputStyle(), resize: 'vertical' }}
            />
          </FormField>

          {/* Delete */}
          {editingDay && (
            confirmDeleteDay ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ fontSize: '14px', color: 'var(--red)', textAlign: 'center' }}>Remove this day and all its rows?</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button variant="secondary" size="sm" onClick={() => setConfirmDeleteDay(false)} style={{ flex: 1 }}>Cancel</Button>
                  <Button variant="primary" size="sm" onClick={handleDeleteDay} disabled={deleting} loading={deleting} style={{ flex: 1, background: 'var(--red)', borderTop: '1px solid var(--red)', borderRight: '1px solid var(--red)', borderBottom: '1px solid var(--red)', borderLeft: '1px solid var(--red)' }}>Remove</Button>
                </div>
              </div>
            ) : (
              <button onClick={() => setConfirmDeleteDay(true)} style={{ background: 'none', border: 'none', color: 'var(--red)', fontSize: '14px', cursor: 'pointer', padding: '8px' }}>Remove Day</button>
            )
          )}
        </div>
      </ResponsiveSheet>

      {/* Row Sheet */}
      <ResponsiveSheet
        open={rowSheetOpen}
        onClose={() => setRowSheetOpen(false)}
        title={editingRow ? 'Edit Item' : 'Add Item'}
        primaryAction={{ label: editingRow ? 'Save' : 'Add', onClick: handleSaveRow, loading: saving, disabled: saving }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '40px' }}>

          {/* Day selector */}
          <FormField label="Day">
            <select
              value={rowForm.day_id}
              onChange={e => setRowForm(f => ({ ...f, day_id: e.target.value }))}
              style={inputStyle()}
            >
              {days.map(d => (
                <option key={d.id} value={d.id}>
                  {DAY_TYPE_ICONS[d.type] ?? '📅'} {d.day_date} — {d.title}
                </option>
              ))}
            </select>
          </FormField>

          {/* Title — required */}
          <FormField label="Title *">
            <input
              type="text"
              value={rowForm.title}
              onChange={e => setRowForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. 🚂 Depart Vancouver"
              style={inputStyle()}
            />
          </FormField>

          {/* Category */}
          <FormField label="Category">
            <select
              value={rowForm.category}
              onChange={e => setRowForm(f => ({ ...f, category: e.target.value }))}
              style={inputStyle()}
            >
              <option value="Activity">Activity</option>
              <option value="Meal">Meal</option>
              <option value="Transport">Transport</option>
              <option value="Flight">Flight</option>
              <option value="Hotel">Hotel</option>
              <option value="Tour">Tour</option>
              <option value="Other">Other</option>
            </select>
          </FormField>

          {/* ── Timing fieldset ── */}
          <fieldset style={{ border: '1px solid var(--border)', borderRadius: '6px', padding: '10px 12px', margin: 0 }}>
            <legend style={{ fontSize: '11px', color: 'var(--slate)', padding: '0 4px' }}>
              Timing <span style={{ fontWeight: 400 }}>(stored as UTC, displayed in local timezone)</span>
            </legend>

            {/* Start row: Date | Start Time | Start TZ */}
            <div className="timing-grid">
              <FormField label="Start Date">
                <input
                  type="date"
                  value={rowForm.start_date}
                  min={tripStartDate}
                  max={tripEndDate}
                  onChange={e => setRowForm(f => ({ ...f, start_date: e.target.value }))}
                  disabled={rowForm.is_all_day}
                  style={inputStyle()}
                />
              </FormField>
              <FormField label="Start Time">
                <input
                  type="time"
                  value={rowForm.start_time_val}
                  onChange={e => setRowForm(f => ({ ...f, start_time_val: e.target.value }))}
                  disabled={rowForm.is_all_day}
                  style={inputStyle()}
                />
              </FormField>
              <FormField label="Start Timezone">
                <select
                  value={rowForm.start_timezone}
                  onChange={e => setRowForm(f => ({ ...f, start_timezone: e.target.value }))}
                  disabled={rowForm.is_all_day}
                  style={inputStyle()}
                >
                  <option value="">— Select —</option>
                  {TRIP_CITIES.map(c => (
                    <option key={c.tzid + c.city} value={c.tzid}>{c.city}</option>
                  ))}
                </select>
              </FormField>
            </div>

            {/* End row: End Date | End Time | End TZ */}
            <div className="timing-grid">
              <FormField label="End Date">
                <input
                  type="date"
                  value={rowForm.end_date}
                  min={tripStartDate}
                  max={tripEndDate}
                  onChange={e => setRowForm(f => ({ ...f, end_date: e.target.value }))}
                  disabled={rowForm.is_all_day}
                  style={inputStyle()}
                />
              </FormField>
              <FormField label="End Time">
                <input
                  type="time"
                  value={rowForm.end_time_val}
                  onChange={e => setRowForm(f => ({ ...f, end_time_val: e.target.value }))}
                  disabled={rowForm.is_all_day}
                  style={inputStyle()}
                />
              </FormField>
              <FormField label="End Timezone">
                <select
                  value={rowForm.end_timezone}
                  onChange={e => setRowForm(f => ({ ...f, end_timezone: e.target.value }))}
                  disabled={rowForm.is_all_day}
                  style={inputStyle()}
                >
                  <option value="">— Same as start —</option>
                  {TRIP_CITIES.map(c => (
                    <option key={c.tzid + c.city} value={c.tzid}>{c.city}</option>
                  ))}
                </select>
              </FormField>
            </div>

            {/* Checkboxes inside fieldset */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '6px' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={rowForm.is_all_day}
                  onChange={e => {
                    const checked = e.target.checked
                    setRowForm(f => ({
                      ...f,
                      is_all_day: checked,
                      ...(checked ? { start_date: '', start_time_val: '', end_date: '', end_time_val: '', start_timezone: '', end_timezone: '' } : {}),
                    }))
                  }}
                  style={{ marginTop: '2px' }}
                />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>All Day</div>
                  <div style={{ fontSize: '11px', color: 'var(--text3)' }}>No specific time — sorts to top of day</div>
                </div>
              </label>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={rowForm.is_approx}
                  onChange={e => setRowForm(f => ({ ...f, is_approx: e.target.checked }))}
                  style={{ marginTop: '2px' }}
                />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>≈ Estimated Time</div>
                  <div style={{ fontSize: '11px', color: 'var(--text3)' }}>Time is approximate — displays with ≈ prefix</div>
                </div>
              </label>
            </div>
          </fieldset>

          {/* Location */}
          <FormField label="Location">
            <input
              type="text"
              value={rowForm.location}
              onChange={e => setRowForm(f => ({ ...f, location: e.target.value }))}
              placeholder="e.g. Vancouver Airport"
              style={inputStyle()}
            />
            <span style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '4px', display: 'block' }}>
              Optional — shown below the item title
            </span>
          </FormField>

          {/* Description */}
          <FormField label="Description">
            <textarea
              value={rowForm.description}
              onChange={e => setRowForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Additional details about this item..."
              rows={3}
              style={{ ...inputStyle(), resize: 'vertical' }}
            />
          </FormField>

          {/* Included / Provided */}
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={rowForm.is_provided}
              onChange={e => setRowForm(f => ({ ...f, is_provided: e.target.checked }))}
              style={{ marginTop: '2px' }}
            />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600 }}>✓ Included / Provided</div>
              <div style={{ fontSize: '11px', color: 'var(--text3)' }}>Meal or activity is included — shows green ✓ Included badge</div>
            </div>
          </label>

          {/* Action Required */}
          <div style={{ borderLeft: '3px solid #B85900', paddingLeft: '10px' }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={rowForm.action_required}
                onChange={e => {
                  const checked = e.target.checked
                  setRowForm(f => ({
                    ...f,
                    action_required: checked,
                    ...(checked ? {} : { action_note: '' }),
                  }))
                }}
                style={{ marginTop: '2px' }}
              />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#B85900' }}>🚩 Action Required</div>
                <div style={{ fontSize: '11px', color: 'var(--text3)' }}>Flags this item — shown in the Action Required section</div>
              </div>
            </label>
            {rowForm.action_required && (
              <textarea
                value={rowForm.action_note}
                onChange={e => setRowForm(f => ({ ...f, action_note: e.target.value }))}
                placeholder="e.g. Confirm reservation before departure"
                rows={2}
                style={{ ...inputStyle(), resize: 'vertical', marginTop: '8px' }}
              />
            )}
          </div>

          {/* Delete */}
          {editingRow && (
            confirmDeleteRow ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ fontSize: '14px', color: 'var(--red)', textAlign: 'center' }}>Remove this item?</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button variant="secondary" size="sm" onClick={() => setConfirmDeleteRow(false)} style={{ flex: 1 }}>Cancel</Button>
                  <Button variant="primary" size="sm" onClick={handleDeleteRow} disabled={deleting} loading={deleting} style={{ flex: 1, background: 'var(--red)', borderTop: '1px solid var(--red)', borderRight: '1px solid var(--red)', borderBottom: '1px solid var(--red)', borderLeft: '1px solid var(--red)' }}>Remove</Button>
                </div>
              </div>
            ) : (
              <button onClick={() => setConfirmDeleteRow(true)} style={{ background: 'none', border: 'none', color: 'var(--red)', fontSize: '14px', cursor: 'pointer', padding: '8px' }}>Remove Item</button>
            )
          )}
        </div>
      </ResponsiveSheet>

    </div>
  )
}
