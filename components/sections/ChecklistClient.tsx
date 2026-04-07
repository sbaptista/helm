'use client'

import { useState, useCallback, useMemo } from 'react'
import { Plus } from 'lucide-react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { FormField, inputStyle } from '@/components/ui/FormField'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ChecklistItem = {
  id: string
  trip_id: string
  item_number: number
  task: string
  group_name: string | null
  ref: string | null
  due_date: string | null
  urgent: boolean
  status: string
  resolution: string | null
  notes: string | null
  sort_order: number
}

type Props = {
  tripId: string
  initialItems: ChecklistItem[]
}

type FilterKey = 'open' | 'urgent' | 'completed'

const EMPTY_FORM = {
  task: '',
  group_name: '',
  ref: '',
  due_date: '',
  urgent: false,
  status: 'open',
  resolution: '',
  notes: '',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return ''
  const [year, month, day] = iso.split('-').map(Number)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[month - 1]} ${day}, ${year}`
}

function recordToForm(r: ChecklistItem) {
  return {
    task: r.task,
    group_name: r.group_name ?? '',
    ref: r.ref ?? '',
    due_date: r.due_date ?? '',
    urgent: r.urgent,
    status: r.status,
    resolution: r.resolution ?? '',
    notes: r.notes ?? '',
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ChecklistClient({ tripId, initialItems }: Props) {
  const [records, setRecords] = useState<ChecklistItem[]>(initialItems)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<ChecklistItem | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [activeFilters, setActiveFilters] = useState<Set<FilterKey>>(new Set())
  const toast = useToast()

  const refetch = useCallback(async () => {
    const res = await fetch(`/api/trips/${tripId}/checklist`)
    if (res.ok) setRecords(await res.json())
  }, [tripId])

  function setField(key: string, value: string | boolean) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function toggleFilter(key: FilterKey) {
    setActiveFilters(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function openAdd() {
    setEditingRecord(null)
    setForm(EMPTY_FORM)
    setConfirmDelete(false)
    setSheetOpen(true)
  }

  function openEdit(r: ChecklistItem) {
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

  // One-tap status toggle on list row
  async function handleToggleStatus(r: ChecklistItem, e: React.MouseEvent) {
    e.stopPropagation()
    if (togglingId) return
    const newStatus = r.status === 'completed' ? 'open' : 'completed'
    setTogglingId(r.id)
    // Optimistic update
    setRecords(prev => prev.map(item =>
      item.id === r.id ? { ...item, status: newStatus } : item
    ))
    try {
      const res = await fetch(`/api/checklist/${r.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error()
    } catch {
      // Revert on failure
      setRecords(prev => prev.map(item =>
        item.id === r.id ? { ...item, status: r.status } : item
      ))
      toast.show('Could not update status. Please try again.', 'error')
    } finally {
      setTogglingId(null)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const payload = {
        task: form.task.trim() || null,
        group_name: form.group_name.trim() || null,
        ref: form.ref.trim() || null,
        due_date: form.due_date || null,
        urgent: form.urgent,
        status: form.status,
        resolution: form.resolution.trim() || null,
        notes: form.notes.trim() || null,
      }

      if (editingRecord) {
        const res = await fetch(`/api/checklist/${editingRecord.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error()
        toast.show('Item updated', 'success')
      } else {
        const res = await fetch(`/api/trips/${tripId}/checklist`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error()
        toast.show('Item added', 'success')
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
      const res = await fetch(`/api/checklist/${editingRecord.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error()
      toast.show('Item removed', 'success')
      await refetch()
      closeSheet()
    } catch {
      toast.show('Something went wrong. Please try again.', 'error')
    } finally {
      setDeleting(false)
    }
  }

  // ─── Filtering + grouping ────────────────────────────────────────────────

  const filtered = useMemo(() => {
    if (activeFilters.size === 0) return records
    return records.filter(r => {
      if (activeFilters.has('open') && r.status !== 'open') return false
      if (activeFilters.has('completed') && r.status !== 'completed') return false
      if (activeFilters.has('urgent') && !r.urgent) return false
      return true
    })
  }, [records, activeFilters])

  const grouped = useMemo(() => {
    const map = new Map<string, ChecklistItem[]>()
    for (const r of filtered) {
      const key = r.group_name ?? '(No Group)'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(r)
    }
    return map
  }, [filtered])

  const totalOpen = records.filter(r => r.status === 'open').length
  const totalCompleted = records.filter(r => r.status === 'completed').length

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Section header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '4px',
      }}>
        <div>
          <h2 style={{
            fontSize: '22px',
            fontFamily: 'var(--font-display)',
            color: 'var(--navy)',
            fontWeight: 400,
          }}>
            Checklist
          </h2>
          {records.length > 0 && (
            <p style={{
              fontFamily: "'Lato', sans-serif",
              fontSize: '13px',
              color: 'var(--text3)',
              marginTop: '2px',
            }}>
              {totalCompleted} of {records.length} complete
            </p>
          )}
        </div>
        <Button variant="primary" size="sm" onClick={openAdd}>
          <Plus size={16} />
          Add Item
        </Button>
      </div>

      {/* Filter bar */}
      {records.length > 0 && (
        <div style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
        }}>
          {(['open', 'urgent', 'completed'] as FilterKey[]).map(key => {
            const active = activeFilters.has(key)
            const label = key.charAt(0).toUpperCase() + key.slice(1)
            return (
              <button
                key={key}
                onClick={() => toggleFilter(key)}
                style={{
                  fontFamily: "'Lato', sans-serif",
                  fontSize: '12px',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  padding: '4px 12px',
                  minHeight: '32px',
                  borderRadius: '20px',
                  border: `1px solid ${active ? 'var(--navy)' : 'var(--border2)'}`,
                  background: active ? 'var(--navy)' : 'transparent',
                  color: active ? 'var(--cream)' : 'var(--text3)',
                  cursor: 'pointer',
                  transition: 'all var(--transition)',
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
      )}

      {/* Empty state */}
      {records.length === 0 && (
        <p style={{
          fontFamily: "'Lato', sans-serif",
          fontSize: '14px',
          color: 'var(--text3)',
          textAlign: 'center',
          padding: '32px 0',
        }}>
          No checklist items yet.
        </p>
      )}

      {/* Filtered empty state */}
      {records.length > 0 && filtered.length === 0 && (
        <p style={{
          fontFamily: "'Lato', sans-serif",
          fontSize: '14px',
          color: 'var(--text3)',
          textAlign: 'center',
          padding: '32px 0',
        }}>
          No items match the current filters.
        </p>
      )}

      {/* Grouped list */}
      {Array.from(grouped.entries()).map(([groupName, items]) => {
        const groupCompleted = items.filter(r => r.status === 'completed').length
        return (
          <div key={groupName} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

            {/* Group header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              paddingBottom: '4px',
              borderBottom: '1px solid var(--border2)',
            }}>
              <span style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: '18px',
                fontWeight: 600,
                color: 'var(--navy)',
              }}>
                {groupName}
              </span>
              <span style={{
                fontFamily: "'Lato', sans-serif",
                fontSize: '12px',
                color: 'var(--text3)',
              }}>
                {groupCompleted}/{items.length}
              </span>
            </div>

            {/* Items in group */}
            {items.map(r => {
              const isCompleted = r.status === 'completed'
              const isToggling = togglingId === r.id
              return (
                <button
                  key={r.id}
                  onClick={() => openEdit(r)}
                  style={{
                    width: '100%',
                    background: 'var(--bg2)',
                    border: '1px solid var(--border2)',
                    borderRadius: 'var(--r)',
                    padding: '12px 14px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    opacity: isCompleted ? 0.6 : 1,
                    transition: 'opacity var(--transition)',
                  }}
                >
                  {/* Toggle button */}
                  <div
                    role="checkbox"
                    aria-checked={isCompleted}
                    aria-label={isCompleted ? 'Mark open' : 'Mark complete'}
                    onClick={(e) => handleToggleStatus(r, e)}
                    style={{
                      width: '22px',
                      height: '22px',
                      minWidth: '22px',
                      borderRadius: '50%',
                      border: `2px solid ${isCompleted ? 'var(--green)' : 'var(--border2)'}`,
                      background: isCompleted ? 'var(--green)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: '1px',
                      cursor: 'pointer',
                      transition: 'all var(--transition)',
                      opacity: isToggling ? 0.5 : 1,
                      flexShrink: 0,
                    }}
                  >
                    {isCompleted && (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                        <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>

                    {/* Top row: category + number + badges */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{
                        fontFamily: "'Lato', sans-serif",
                        fontSize: '11px',
                        color: 'var(--text3)',
                        fontWeight: 700,
                        letterSpacing: '0.03em',
                      }}>
                        #{r.item_number}
                      </span>
                      {r.urgent && (
                        <Badge color={{ bg: 'rgba(184,137,42,0.1)', text: 'var(--gold-text)', border: 'rgba(184,137,42,0.2)' }}>
                          Urgent
                        </Badge>
                      )}
                    </div>

                    {/* Task */}
                    <span style={{
                      fontFamily: "'Lato', sans-serif",
                      fontSize: '14px',
                      fontWeight: 500,
                      color: 'var(--text)',
                      textDecoration: isCompleted ? 'line-through' : 'none',
                      lineHeight: 1.4,
                    }}>
                      {r.task}
                    </span>

                    {/* Ref */}
                    {r.ref && (
                      <span style={{
                        fontFamily: "'Lato', sans-serif",
                        fontSize: '12px',
                        color: 'var(--text3)',
                        lineHeight: 1.4,
                      }}>
                        {r.ref}
                      </span>
                    )}

                    {/* Due date */}
                    {r.due_date && (
                      <span style={{
                        fontFamily: "'Lato', sans-serif",
                        fontSize: '12px',
                        color: 'var(--text3)',
                      }}>
                        Due {formatDate(r.due_date)}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )
      })}

      {/* Bottom Sheet */}
      <BottomSheet
        open={sheetOpen}
        onClose={closeSheet}
        title={editingRecord ? 'Edit Item' : 'Add Item'}
        primaryAction={{
          label: editingRecord ? 'Save' : 'Add',
          onClick: handleSave,
          loading: saving,
          disabled: saving,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '40px' }}>

          {/* Task */}
          <FormField label="Task" required>
            <input
              type="text"
              value={form.task}
              onChange={e => setField('task', e.target.value)}
              placeholder="e.g. Check in online"
              style={inputStyle()}
            />
          </FormField>

          {/* Group + Due Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <FormField label="Group">
              <input
                type="text"
                value={form.group_name}
                onChange={e => setField('group_name', e.target.value)}
                placeholder="e.g. Rocky Mountaineer"
                style={inputStyle()}
              />
            </FormField>
            <FormField label="Due Date">
              <input
                type="date"
                value={form.due_date}
                onChange={e => setField('due_date', e.target.value)}
                style={inputStyle()}
              />
            </FormField>
          </div>

          {/* Ref */}
          <FormField label="Reference">
            <input
              type="text"
              value={form.ref}
              onChange={e => setField('ref', e.target.value)}
              placeholder="e.g. Booking #DIR1117775"
              style={inputStyle()}
            />
          </FormField>

          {/* Status */}
          <FormField label="Status">
            <select
              value={form.status}
              onChange={e => setField('status', e.target.value)}
              style={{ ...inputStyle(), cursor: 'pointer' }}
            >
              <option value="open">Open</option>
              <option value="completed">Completed</option>
            </select>
          </FormField>

          {/* Resolution */}
          <FormField label="Resolution">
            <input
              type="text"
              value={form.resolution}
              onChange={e => setField('resolution', e.target.value)}
              placeholder="e.g. Done — confirmed via email"
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

          {/* Urgent toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', minHeight: '44px' }}>
            <input
              type="checkbox"
              checked={form.urgent}
              onChange={e => setField('urgent', e.target.checked)}
              style={{ width: '20px', height: '20px', accentColor: 'var(--gold)', cursor: 'pointer', flexShrink: 0 }}
            />
            <span style={{ fontSize: '14px', color: 'var(--text)', fontWeight: 500 }}>Urgent</span>
          </label>

          {/* Delete */}
          {editingRecord && (
            confirmDelete ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ fontSize: '14px', color: 'var(--red)', textAlign: 'center', margin: 0 }}>
                  Remove this item?
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
                Remove Item
              </button>
            )
          )}

        </div>
      </BottomSheet>
    </div>
  )
}
