'use client'

import { useState, useCallback, useMemo, useEffect, useContext } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { ResponsiveSheet } from '@/components/ui/ResponsiveSheet'
import { Button } from '@/components/ui/Button'
import { FormField, inputStyle } from '@/components/ui/FormField'
import { useToast } from '@/components/ui/Toast'
import WarnBadge from '@/components/ui/WarnBadge'
import { TabNavigationContext, useTabNavigation } from '@/components/advisor/TripDetailView'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ChecklistItem = {
  id: string
  trip_id: string
  item_number: number
  task: string
  group_name: string | null
  ref: string | null
  due_date: string | null
  action_required: boolean
  action_note: string | null
  status: string
  resolution: string | null
  notes: string | null
  sort_order: number
  gcal_include: boolean
}

export type ChecklistGroup = {
  id: string
  trip_id: string
  name: string
  sort_order: number
}

type Props = {
  tripId: string
  initialItems: ChecklistItem[]
  initialGroups: ChecklistGroup[]
}

type FilterKey = 'open' | 'action_required' | 'completed'

const FILTER_LABELS: Record<FilterKey, string> = {
  open: 'Open',
  action_required: 'Attention Required',
  completed: 'Completed',
}

const EMPTY_FORM = {
  task: '',
  group_name: '',
  ref: '',
  due_date: '',
  action_required: false,
  action_note: '',
  status: 'open',
  resolution: '',
  notes: '',
  gcal_include: false,
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
    action_required: r.action_required,
    action_note: r.action_note ?? '',
    status: r.status,
    resolution: r.resolution ?? '',
    notes: r.notes ?? '',
    gcal_include: r.gcal_include ?? false,
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ChecklistClient({ tripId, initialItems, initialGroups }: Props) {
  const [records, setRecords] = useState<ChecklistItem[]>(initialItems)
  const [groups, setGroups] = useState<ChecklistGroup[]>(initialGroups)

  // Item sheet
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<ChecklistItem | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Manage groups sheet
  const [manageGroupsOpen, setManageGroupsOpen] = useState(false)

  // Inline new group
  const [showNewGroupInput, setShowNewGroupInput] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [creatingGroup, setCreatingGroup] = useState(false)

  // List
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [activeFilters, setActiveFilters] = useState<Set<FilterKey>>(new Set())

  const toast = useToast()
  const router = useRouter()
  const { pendingItemId, clearPendingItem, pendingSheetRecordId, clearPendingSheetRecord } = useContext(TabNavigationContext)
  const [highlightedId, setHighlightedId] = useState<string | null>(null)

  useEffect(() => {
    if (!pendingItemId) return
    const hasItem = records.some(r => r.id === pendingItemId)
    if (!hasItem) return
    clearPendingItem()
    setHighlightedId(pendingItemId)
    setTimeout(() => {
      const el = document.getElementById(`item-${pendingItemId}`)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 80)
    setTimeout(() => setHighlightedId(null), 1500)
  }, [pendingItemId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!pendingSheetRecordId) return
    const record = records.find((r) => r.id === pendingSheetRecordId)
    clearPendingSheetRecord()
    if (record) openEdit(record)
  }, [pendingSheetRecordId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Fetch ────────────────────────────────────────────────────────────────

  const refetchItems = useCallback(async () => {
    const res = await fetch(`/api/trips/${tripId}/checklist`)
    if (res.ok) setRecords(await res.json())
  }, [tripId])

  // ─── Form ─────────────────────────────────────────────────────────────────

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

  // ─── Sheet open/close ─────────────────────────────────────────────────────

  function openAdd() {
    setEditingRecord(null)
    setForm(EMPTY_FORM)
    setConfirmDelete(false)
    setShowNewGroupInput(false)
    setNewGroupName('')
    setSheetOpen(true)
  }

  function openEdit(r: ChecklistItem) {
    setEditingRecord(r)
    setForm(recordToForm(r))
    setConfirmDelete(false)
    setShowNewGroupInput(false)
    setNewGroupName('')
    setSheetOpen(true)
  }

  function closeSheet() {
    setSheetOpen(false)
    setEditingRecord(null)
    setConfirmDelete(false)
    setShowNewGroupInput(false)
    setNewGroupName('')
  }

  // ─── Group actions ────────────────────────────────────────────────────────

  async function handleCreateGroup() {
    const name = newGroupName.trim()
    if (!name) return
    setCreatingGroup(true)
    try {
      const res = await fetch(`/api/trips/${tripId}/checklist-groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) throw new Error()
      const created: ChecklistGroup = await res.json()
      setGroups(prev => [...prev, created])
      setField('group_name', created.name)
      setShowNewGroupInput(false)
      setNewGroupName('')
      toast.show('Group created', 'success')
    } catch {
      toast.show('Could not create group.', 'error')
    } finally {
      setCreatingGroup(false)
    }
  }

  async function handleMoveGroup(g: ChecklistGroup, direction: 'up' | 'down') {
    const sorted = [...groups].sort((a, b) => a.sort_order - b.sort_order)
    const idx = sorted.findIndex(x => x.id === g.id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sorted.length) return
    const other = sorted[swapIdx]
    const updated = sorted.map(x => {
      if (x.id === g.id) return { ...x, sort_order: other.sort_order }
      if (x.id === other.id) return { ...x, sort_order: g.sort_order }
      return x
    }).sort((a, b) => a.sort_order - b.sort_order)
    setGroups(updated)
    try {
      await Promise.all([
        fetch(`/api/checklist-groups/${g.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sort_order: other.sort_order }),
        }),
        fetch(`/api/checklist-groups/${other.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sort_order: g.sort_order }),
        }),
      ])
    } catch {
      setGroups(groups)
      toast.show('Could not reorder groups.', 'error')
    }
  }

  async function handleDeleteGroup(g: ChecklistGroup) {
    const inUse = records.some(r => r.group_name === g.name)
    if (inUse) {
      toast.show('Move or remove all items in this group before deleting.', 'error')
      return
    }
    try {
      const res = await fetch(`/api/checklist-groups/${g.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setGroups(prev => prev.filter(x => x.id !== g.id))
      toast.show('Group deleted', 'success')
    } catch {
      toast.show('Something went wrong.', 'error')
    }
  }

  // ─── Item actions ─────────────────────────────────────────────────────────

  async function handleToggleStatus(r: ChecklistItem, e: React.MouseEvent) {
    e.stopPropagation()
    if (togglingId) return
    const newStatus = r.status === 'completed' ? 'open' : 'completed'
    setTogglingId(r.id)
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
      setRecords(prev => prev.map(item =>
        item.id === r.id ? { ...item, status: r.status } : item
      ))
      toast.show('Could not update. Please try again.', 'error')
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
        action_required: form.action_required,
        action_note: form.action_note.trim() || null,
        status: form.status,
        resolution: form.resolution.trim() || null,
        notes: form.notes.trim() || null,
        gcal_include: form.gcal_include,
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
      window.dispatchEvent(new CustomEvent('gcal:dirty'))
      await refetchItems()
      router.refresh()
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
      const res = await fetch(`/api/checklist/${editingRecord.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.show('Item removed', 'success')
      await refetchItems()
      closeSheet()
    } catch {
      toast.show('Something went wrong. Please try again.', 'error')
    } finally {
      setDeleting(false)
    }
  }

  // ─── Filtering + grouping ─────────────────────────────────────────────────

  const filtered = useMemo(() => {
    if (activeFilters.size === 0) return records
    return records.filter(r => {
      if (activeFilters.has('open') && r.status !== 'open') return false
      if (activeFilters.has('completed') && r.status !== 'completed') return false
      if (activeFilters.has('action_required') && !r.action_required) return false
      return true
    })
  }, [records, activeFilters])

  const sortedGroups = useMemo(() =>
    [...groups].sort((a, b) => a.sort_order - b.sort_order),
    [groups]
  )

  const grouped = useMemo(() => {
    const map = new Map<string, ChecklistItem[]>()
    for (const r of filtered) {
      const key = r.group_name ?? '(No Group)'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(r)
    }
    const result = new Map<string, ChecklistItem[]>()
    for (const g of sortedGroups) {
      if (map.has(g.name)) result.set(g.name, map.get(g.name)!)
    }
    if (map.has('(No Group)')) result.set('(No Group)', map.get('(No Group)')!)
    return result
  }, [filtered, sortedGroups])

  function getChecklistWarns(item: ChecklistItem): string[] {
    const warns: string[] = [];
    if (item.action_required) warns.push('Action Required');
    if (item.status !== 'completed' && item.due_date && new Date(item.due_date) < new Date()) {
      warns.push('Past Due');
    }
    return warns;
  }

  const warnCount = records.filter(r => getChecklistWarns(r).length > 0).length;

  const { setWarnCount } = useTabNavigation();
  useEffect(() => {
    setWarnCount('checklist', warnCount);
  }, [warnCount]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalCompleted = records.filter(r => r.status === 'completed').length

  const iconBtnStyle: React.CSSProperties = {
    background: 'none',
    borderTop: '1px solid var(--border2)',
    borderRight: '1px solid var(--border2)',
    borderBottom: '1px solid var(--border2)',
    borderLeft: '1px solid var(--border2)',
    borderRadius: 'var(--r)',
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: 'var(--text2)',
    fontSize: 'var(--fs-base)',
    flexShrink: 0,
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Section header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <div>
          <h2 style={{ fontSize: 'var(--fs-xl)', fontFamily: 'var(--font-display)', color: 'var(--navy)', fontWeight: 'var(--fw-normal)' }}>
            Checklist
          </h2>
          {records.length > 0 && (
            <p style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)', color: 'var(--text3)', marginTop: '2px' }}>
              {totalCompleted} of {records.length} complete
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Button variant="ghost" size="sm" onClick={() => setManageGroupsOpen(true)}>
            Manage Groups
          </Button>
          <Button variant="primary" size="sm" onClick={openAdd}>
            <Plus size={16} />
            Add Item
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      {records.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(['open', 'action_required', 'completed'] as FilterKey[]).map(key => {
            const active = activeFilters.has(key)
            return (
              <button
                key={key}
                onClick={() => toggleFilter(key)}
                style={{
                  fontFamily: "'Lato', sans-serif",
                  fontSize: 'var(--fs-xs)',
                  fontWeight: 'var(--fw-bold)',
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
                {FILTER_LABELS[key]}
              </button>
            )
          })}
        </div>
      )}

      {/* Empty states */}
      {records.length === 0 && (
        <p style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)', color: 'var(--text3)', textAlign: 'center', padding: '32px 0' }}>
          No checklist items yet.
        </p>
      )}
      {records.length > 0 && filtered.length === 0 && (
        <p style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)', color: 'var(--text3)', textAlign: 'center', padding: '32px 0' }}>
          No items match the current filters.
        </p>
      )}

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

      {/* Grouped list */}
      {Array.from(grouped.entries()).map(([groupName, items]) => {
        const groupCompleted = items.filter(r => r.status === 'completed').length
        return (
          <div key={groupName} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: '4px', borderBottom: '1px solid var(--border2)' }}>
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'var(--fs-lg)', fontWeight: 'var(--fw-medium)', color: 'var(--navy)' }}>
                {groupName}
              </span>
              <span style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-xs)', color: 'var(--text3)' }}>
                {groupCompleted}/{items.length}
              </span>
            </div>
            {items.map(r => {
              const isCompleted = r.status === 'completed'
              const isToggling = togglingId === r.id
              return (
                <button
                  key={r.id}
                  id={`item-${r.id}`}
                  onClick={() => openEdit(r)}
                  className={highlightedId === r.id ? 'item-highlight' : undefined}
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
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-xs)', color: 'var(--text3)', fontWeight: 'var(--fw-bold)', letterSpacing: '0.03em' }}>
                        #{r.item_number}
                      </span>
                      {getChecklistWarns(r).map(w => (
                        <WarnBadge key={w} label={w} />
                      ))}
                    </div>
                    <span style={{
                      fontFamily: "'Lato', sans-serif",
                      fontSize: 'var(--fs-sm)',
                      fontWeight: 500,
                      color: 'var(--text)',
                      textDecoration: isCompleted ? 'line-through' : 'none',
                      lineHeight: 1.4,
                    }}>
                      {r.task}
                    </span>
                    {r.ref && (
                      <span style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-xs)', color: 'var(--text3)', lineHeight: 1.4 }}>
                        {r.ref}
                      </span>
                    )}
                    {r.due_date && (
                      <span style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-xs)', color: 'var(--text3)' }}>
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

      {/* ── Edit / Add Item BottomSheet ── */}
      <ResponsiveSheet
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

          <FormField label="Task" required>
            <input
              type="text"
              value={form.task}
              onChange={e => setField('task', e.target.value)}
              placeholder="e.g. Check in online"
              style={inputStyle()}
            />
          </FormField>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <FormField label="Group">
              <select
                value={showNewGroupInput ? '__new__' : form.group_name}
                onChange={e => {
                  if (e.target.value === '__new__') {
                    setShowNewGroupInput(true)
                    setNewGroupName('')
                  } else {
                    setShowNewGroupInput(false)
                    setField('group_name', e.target.value)
                  }
                }}
                style={{ ...inputStyle(), cursor: 'pointer' }}
              >
                <option value="">No Group</option>
                {sortedGroups.map(g => (
                  <option key={g.id} value={g.name}>{g.name}</option>
                ))}
                <option value="__new__">+ New Group…</option>
              </select>
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

          {/* Inline new group */}
          {showNewGroupInput && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <FormField label="New Group Name">
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={e => setNewGroupName(e.target.value)}
                    placeholder="e.g. 🏨 Hotels"
                    style={inputStyle()}
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') handleCreateGroup() }}
                  />
                </FormField>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={handleCreateGroup}
                loading={creatingGroup}
                disabled={!newGroupName.trim() || creatingGroup}
                style={{ marginBottom: '1px' }}
              >
                Create
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setShowNewGroupInput(false); setNewGroupName('') }}
                style={{ marginBottom: '1px' }}
              >
                Cancel
              </Button>
            </div>
          )}



          <FormField label="Reference">
            <input
              type="text"
              value={form.ref}
              onChange={e => setField('ref', e.target.value)}
              placeholder="e.g. Booking #DIR1117775"
              style={inputStyle()}
            />
          </FormField>

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

          <FormField label="Resolution">
            <input
              type="text"
              value={form.resolution}
              onChange={e => setField('resolution', e.target.value)}
              placeholder="e.g. Done — confirmed via email"
              style={inputStyle()}
            />
          </FormField>

          <FormField label="Notes">
            <textarea
              value={form.notes}
              onChange={e => setField('notes', e.target.value)}
              placeholder="Any additional notes…"
              rows={3}
              style={{ ...inputStyle(), resize: 'vertical' }}
            />
          </FormField>

          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', minHeight: '44px' }}>
            <input
              type="checkbox"
              checked={form.action_required}
              onChange={e => setField('action_required', e.target.checked)}
              style={{ width: '20px', height: '20px', accentColor: 'var(--gold)', cursor: 'pointer', flexShrink: 0 }}
            />
            <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text)', fontWeight: 500 }}>Attention Required</span>
          </label>

          {form.action_required && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-bold)', color: 'var(--text2)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Attention Note
              </span>
              <textarea
                value={form.action_note}
                onChange={e => setField('action_note', e.target.value)}
                placeholder="Describe what needs attention and by when…"
                rows={3}
                style={{ ...inputStyle(), resize: 'vertical' }}
              />
            </div>
          )}

          {/* Google Calendar */}
          <div style={{ marginBottom: 'var(--sp-md)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-sm)', opacity: form.due_date ? 1 : 0.4 }}>
              <input
                type="checkbox"
                checked={form.gcal_include ?? false}
                disabled={!form.due_date}
                onChange={e => setField('gcal_include', e.target.checked)}
                style={{ width: '16px', height: '16px' }}
              />
              <span style={{ fontSize: 'var(--fs-sm)' }}>Add to Google Calendar</span>
            </label>
            {!form.due_date && (
              <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text3)', marginTop: 'var(--sp-xs)', marginLeft: 'calc(var(--sp-sm) + 16px)' }}>
                Set a due date to enable calendar sync
              </p>
            )}
          </div>

          {editingRecord && (
            confirmDelete ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--red)', textAlign: 'center', margin: 0 }}>Remove this item?</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(false)} style={{ flex: 1 }}>Cancel</Button>
                  <Button variant="primary" size="sm" onClick={handleDelete} disabled={deleting} loading={deleting}
                    style={{ flex: 1, background: 'var(--red)', borderTopColor: 'var(--red)', borderRightColor: 'var(--red)', borderBottomColor: 'var(--red)', borderLeftColor: 'var(--red)' }}>Remove</Button>
                </div>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)}
                style={{ background: 'none', border: 'none', color: 'var(--red)', fontSize: 'var(--fs-sm)', cursor: 'pointer', padding: '8px', minHeight: '44px' }}>
                Remove Item
              </button>
            )
          )}
        </div>
      </ResponsiveSheet>

      {/* ── Manage Groups BottomSheet (nested) ── */}
      <ResponsiveSheet
        open={manageGroupsOpen}
        onClose={() => setManageGroupsOpen(false)}
        title="Manage Groups"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '40px' }}>
          {sortedGroups.length === 0 && (
            <p style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)', color: 'var(--text3)', textAlign: 'center', padding: '24px 0' }}>
              No groups yet.
            </p>
          )}
          {sortedGroups.map((g, i) => {
            const itemCount = records.filter(r => r.group_name === g.name).length
            return (
              <div key={g.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: 'var(--bg2)',
                border: '1px solid var(--border2)',
                borderRadius: 'var(--r)',
                padding: '10px 14px',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)', color: 'var(--text)', fontWeight: 500 }}>
                    {g.name}
                  </span>
                  {itemCount > 0 && (
                    <span style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-xs)', color: 'var(--text3)', marginLeft: '8px' }}>
                      {itemCount} item{itemCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <button onClick={() => handleMoveGroup(g, 'up')} disabled={i === 0}
                  style={{ ...iconBtnStyle, opacity: i === 0 ? 0.3 : 1 }} aria-label="Move up">↑</button>
                <button onClick={() => handleMoveGroup(g, 'down')} disabled={i === sortedGroups.length - 1}
                  style={{ ...iconBtnStyle, opacity: i === sortedGroups.length - 1 ? 0.3 : 1 }} aria-label="Move down">↓</button>
                <button onClick={() => handleDeleteGroup(g)}
                  style={{ ...iconBtnStyle, color: 'var(--red)', borderColor: 'rgba(139,32,32,0.2)' }}
                  aria-label={`Delete ${g.name}`}>×</button>
              </div>
            )
          })}

          {/* Divider */}
          <div style={{ borderTop: '1px solid var(--border2)', marginTop: '8px', paddingTop: '16px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <FormField label="New Group">
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={e => setNewGroupName(e.target.value)}
                    placeholder="e.g. 🏨 Hotels"
                    style={inputStyle()}
                    onKeyDown={e => { if (e.key === 'Enter') handleCreateGroup() }}
                  />
                </FormField>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={handleCreateGroup}
                loading={creatingGroup}
                disabled={!newGroupName.trim() || creatingGroup}
                style={{ marginBottom: '1px' }}
              >
                Create
              </Button>
            </div>
          </div>

        </div>
      </ResponsiveSheet>
    </div>
  )
}
