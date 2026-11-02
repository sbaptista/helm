'use client'

import { useState, useCallback, useMemo, useEffect, useContext } from 'react'
import { apiBulk, apiFetch } from '@/lib/offline/api-fetch'
import { snapshotRemove, snapshotUpsert } from '@/lib/offline/store'
import { flushOutbox } from '@/lib/offline/sync'
import type { OfflineRecord } from '@/lib/offline/collections'
import { BusyOverlay } from '@/components/ui/BusyOverlay'
import { SelectBox, ShowHideButton, plural, type SelectionState } from '@/components/ui/SelectionControls'
import { useIsOnline } from '@/hooks/useOnlineStatus'
import { useOfflineList } from '@/hooks/useOfflineList'
import { useRouter } from '@/lib/offline/router'
import { Plus } from 'lucide-react'
import { ResponsiveSheet } from '@/components/ui/ResponsiveSheet'
import { Button } from '@/components/ui/Button'
import { FormField, inputStyle } from '@/components/ui/FormField'
import { useToast } from '@/components/ui/Toast'
import WarnBadge from '@/components/ui/WarnBadge'
import { scrollToFirstError } from '@/lib/form-utils'
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

interface CopyTarget {
  id: string
  title: string
  destination: string | null
  status: string
}

type BulkFields = Partial<Pick<ChecklistItem, 'status' | 'action_required' | 'group_name'>>

// Show / hide key for items with no group; real groups use their id.
const NO_GROUP_KEY = 'no-group'
// Move sheet value for "No Group".
const NO_GROUP_VALUE = '__none__'

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

  // Device copy for offline editing (docs/offline-editing-plan.md).
  useOfflineList(`/api/trips/${tripId}/checklist`, initialItems, setRecords)
  useOfflineList(`/api/trips/${tripId}/checklist-groups`, initialGroups, setGroups)
  // Item sheet
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<ChecklistItem | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [touched, setTouched] = useState<Set<string>>(new Set())

  // Manage groups sheet
  const [manageGroupsOpen, setManageGroupsOpen] = useState(false)

  // Inline new group
  const [showNewGroupInput, setShowNewGroupInput] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [creatingGroup, setCreatingGroup] = useState(false)

  // List
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [activeFilters, setActiveFilters] = useState<Set<FilterKey>>(new Set())

  // Packing improvements brought to Checklist (docs/checklist-packing-parity-plan.md)
  const isOnline = useIsOnline()
  // Multi-select
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  // In-progress dialog for bulk actions, group rename / delete and Copy to Trip.
  const [busy, setBusy] = useState<{ message: string; detail?: string } | null>(null)
  const bulkBusy = busy !== null
  // iPhone "More" menu in the pinned controls
  const [moreOpen, setMoreOpen] = useState(false)
  // Move selected items to another group ('' = not chosen yet)
  const [moveOpen, setMoveOpen] = useState(false)
  const [moveGroup, setMoveGroup] = useState('')
  // Rename / delete in Manage Groups
  const [renaming, setRenaming] = useState<{ id: string; value: string; touched: boolean } | null>(null)
  const [confirmDeleteGroupId, setConfirmDeleteGroupId] = useState<string | null>(null)
  // Copy to Trip (online only)
  const [copySheetOpen, setCopySheetOpen] = useState(false)
  const [copyTargets, setCopyTargets] = useState<CopyTarget[] | null>(null)
  const [copyTargetId, setCopyTargetId] = useState('')

  // Hidden groups, remembered on this device. Read in useEffect, never in the
  // useState initializer, to avoid a hydration mismatch.
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set())
  const hiddenKey = `helm-checklist-hidden-${tripId}`
  useEffect(() => {
    try {
      const raw = localStorage.getItem(hiddenKey)
      if (raw) setHiddenIds(new Set(JSON.parse(raw) as string[]))
    } catch {
      // Storage unavailable: everything stays shown.
    }
  }, [hiddenKey])

  const toast = useToast()
  const router = useRouter()
  const { pendingItemId, clearPendingItem, pendingSheetRecordId, clearPendingSheetRecord } = useContext(TabNavigationContext)
  const [highlightedId, setHighlightedId] = useState<string | null>(null)

  useEffect(() => {
    if (!pendingItemId) return
    const hasItem = records.some(r => r.id === pendingItemId)
    if (!hasItem) return
    clearPendingItem()
    revealGroup(records.find(r => r.id === pendingItemId)?.group_name ?? null)
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
    const res = await apiFetch(`/api/trips/${tripId}/checklist`)
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

  function touchField(name: string) { setTouched(prev => new Set(prev).add(name)) }
  const taskError = touched.has('task') && !form.task.trim()

  function openAdd() {
    setEditingRecord(null)
    setForm(EMPTY_FORM)
    setConfirmDelete(false)
    setShowNewGroupInput(false)
    setNewGroupName('')
    setTouched(new Set())
    setSheetOpen(true)
  }

  function openEdit(r: ChecklistItem) {
    setEditingRecord(r)
    setForm(recordToForm(r))
    setConfirmDelete(false)
    setShowNewGroupInput(false)
    setNewGroupName('')
    setTouched(new Set())
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
      const res = await apiFetch(`/api/trips/${tripId}/checklist-groups`, {
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
    setConfirmDeleteGroupId(null)
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
        apiFetch(`/api/checklist-groups/${g.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sort_order: other.sort_order }),
        }),
        apiFetch(`/api/checklist-groups/${other.id}`, {
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
      const res = await apiFetch(`/api/checklist/${r.id}`, {
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
    setTouched(prev => new Set([...prev, 'task']))
    if (!form.task.trim()) {
      toast.show('Please fix the highlighted fields.', 'error')
      scrollToFirstError()
      return
    }
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
        const res = await apiFetch(`/api/checklist/${editingRecord.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error()
        toast.show('Item updated', 'success')
      } else {
        const res = await apiFetch(`/api/trips/${tripId}/checklist`, {
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
      // Show where the item went, in case that group was hidden.
      revealGroup(form.group_name.trim() || null)
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
      const res = await apiFetch(`/api/checklist/${editingRecord.id}`, { method: 'DELETE' })
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
    // Without a filter every group is listed, including empty ones (e.g. after
    // its last item is moved out). A filter lists only groups with matches.
    for (const g of sortedGroups) {
      if (map.has(g.name)) result.set(g.name, map.get(g.name)!)
      else if (activeFilters.size === 0) result.set(g.name, [])
    }
    if (map.has('(No Group)')) result.set('(No Group)', map.get('(No Group)')!)
    return result
  }, [filtered, sortedGroups, activeFilters])

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

  // ─── Show / hide groups ───────────────────────────────────────────────────

  const groupByName = useMemo(() => new Map(groups.map(g => [g.name, g])), [groups])

  function groupKey(groupName: string | null): string {
    return (groupName && groupByName.get(groupName)?.id) || NO_GROUP_KEY
  }

  // Applies a change to the hidden set, drops ids of deleted groups, and saves it.
  function updateHidden(change: (prev: Set<string>) => Set<string>) {
    setHiddenIds(prev => {
      const known = new Set([...groups.map(g => g.id), NO_GROUP_KEY])
      const next = new Set([...change(prev)].filter(id => known.has(id)))
      try {
        localStorage.setItem(hiddenKey, JSON.stringify([...next]))
      } catch {
        // Not remembered; still applies until reload.
      }
      return next
    })
  }

  function toggleHidden(key: string) {
    updateHidden(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  function revealGroup(groupName: string | null) {
    const key = groupKey(groupName)
    updateHidden(prev => {
      const next = new Set(prev)
      next.delete(key)
      return next
    })
  }

  const shownGroupKeys = Array.from(grouped.keys()).map(name => groupKey(name === '(No Group)' ? null : name))
  // Show All when every listed group is hidden, otherwise Hide All.
  const allHidden = shownGroupKeys.length > 0 && shownGroupKeys.every(k => hiddenIds.has(k))

  function setAllHidden(hide: boolean) {
    updateHidden(() => hide ? new Set([...groups.map(g => g.id), NO_GROUP_KEY]) : new Set())
  }

  // ─── Multi-select ─────────────────────────────────────────────────────────

  const selectedItems = useMemo(() => records.filter(r => selectedIds.has(r.id)), [records, selectedIds])

  // Selected items a filter or a hidden group keeps off screen, so nothing changes unseen.
  const notShownCount = selectedItems.filter(r =>
    !filtered.includes(r) || hiddenIds.has(groupKey(r.group_name))
  ).length

  function clearSelection() {
    setSelectedIds(new Set())
    setConfirmBulkDelete(false)
  }

  function enterSelectMode() {
    clearSelection()
    setSelectMode(true)
  }

  function exitSelectMode() {
    clearSelection()
    setSelectMode(false)
  }

  function selectionStateOf(list: ChecklistItem[]): SelectionState {
    const count = list.filter(r => selectedIds.has(r.id)).length
    if (count === 0) return 'none'
    return count === list.length ? 'all' : 'some'
  }

  // Selects all of list, or deselects all of it when it is already fully selected.
  function toggleSelection(list: ChecklistItem[]) {
    const select = selectionStateOf(list) !== 'all'
    setConfirmBulkDelete(false)
    setSelectedIds(prev => {
      const next = new Set(prev)
      list.forEach(r => { if (select) next.add(r.id); else next.delete(r.id) })
      return next
    })
  }

  // One change to every selected item that isn't already in that state.
  async function bulkUpdate(fields: BulkFields, done: string) {
    const differs = (r: ChecklistItem) =>
      (Object.keys(fields) as (keyof BulkFields)[]).some(k => (r[k] ?? null) !== (fields[k] ?? null))
    const targets = selectedItems.filter(differs)
    if (targets.length === 0) {
      toast.show(`${selectedItems.length === 1 ? 'That item is' : 'All selected items are'} already ${done}`, 'neutral')
      return false
    }
    const before = new Map(targets.map(r => [r.id, r]))
    const message = `Updating ${plural(targets.length, 'item')}…`
    setBusy({ message })
    setRecords(prev => prev.map(r => before.has(r.id) ? { ...r, ...fields } : r))
    const failed = await apiBulk({
      collection: 'checklist',
      tripId,
      bulkUrl: `/api/trips/${tripId}/checklist-bulk`,
      itemUrl: id => `/api/checklist/${id}`,
      ids: [...before.keys()],
      action: 'update',
      fields,
      onProgress: (n, total) => setBusy({ message, detail: `${n} of ${total}` }),
    })
    setBusy(null)
    window.dispatchEvent(new CustomEvent('gcal:dirty'))
    if (failed.length) {
      const failedIds = new Set(failed)
      setRecords(prev => prev.map(r => failedIds.has(r.id) ? before.get(r.id) ?? r : r))
      toast.show(`${failed.length} of ${plural(targets.length, 'item')} couldn't be saved`, 'error')
    } else {
      toast.show(`${plural(targets.length, 'item')} ${done}`, 'success')
    }
    return true
  }

  async function bulkDelete() {
    const targets = selectedItems
    if (targets.length === 0) return
    const message = `Deleting ${plural(targets.length, 'item')}…`
    setBusy({ message })
    const failed = await apiBulk({
      collection: 'checklist',
      tripId,
      bulkUrl: `/api/trips/${tripId}/checklist-bulk`,
      itemUrl: id => `/api/checklist/${id}`,
      ids: targets.map(r => r.id),
      action: 'delete',
      onProgress: (n, total) => setBusy({ message, detail: `${n} of ${total}` }),
    })
    setBusy(null)
    setConfirmBulkDelete(false)
    window.dispatchEvent(new CustomEvent('gcal:dirty'))
    const failedIds = new Set(failed)
    const deletedIds = new Set(targets.filter(r => !failedIds.has(r.id)).map(r => r.id))
    setRecords(prev => prev.filter(r => !deletedIds.has(r.id)))
    setSelectedIds(prev => new Set([...prev].filter(id => !deletedIds.has(id))))
    if (failed.length) {
      toast.show(`${failed.length} of ${plural(targets.length, 'item')} couldn't be deleted`, 'error')
    } else {
      toast.show(`${plural(targets.length, 'item')} deleted`, 'success')
    }
  }

  // ─── Move to another group ────────────────────────────────────────────────

  function openMove() {
    setMoveGroup('')
    setConfirmBulkDelete(false)
    setMoveOpen(true)
  }

  const moveDest = moveGroup === NO_GROUP_VALUE ? null : moveGroup || undefined
  const moveCount = moveDest === undefined ? null : selectedItems.filter(r => (r.group_name ?? null) !== moveDest).length

  // The sheet closes before the save starts, so its scroll lock is released
  // before BusyOverlay takes its own (Knowledge b70fda2f).
  async function handleMove() {
    if (moveDest === undefined) return
    setMoveOpen(false)
    const saved = await bulkUpdate({ group_name: moveDest }, `moved to ${moveDest ?? 'No Group'}`)
    if (saved) revealGroup(moveDest)
  }

  // ─── Rename / delete groups ───────────────────────────────────────────────

  function startRename(g: ChecklistGroup) {
    setConfirmDeleteGroupId(null)
    setRenaming({ id: g.id, value: g.name, touched: false })
  }

  // Items find their group by name, so two groups can't share one.
  function renameError(r: NonNullable<typeof renaming>): string | null {
    const key = r.value.trim().toLowerCase()
    if (!key) return 'Name is required.'
    if (groups.some(g => g.id !== r.id && g.name.trim().toLowerCase() === key)) {
      return 'Another group already has this name.'
    }
    return null
  }

  // Online only: the server renames the group and its items together.
  async function saveRename() {
    if (!renaming) return
    if (renameError(renaming)) {
      setRenaming({ ...renaming, touched: true })
      return
    }
    const group = groups.find(g => g.id === renaming.id)
    const name = renaming.value.trim()
    if (!group || group.name === name) {
      setRenaming(null)
      return
    }
    setBusy({ message: `Renaming ${group.name}…` })
    try {
      // Item changes still in the outbox must land first, or they'd keep the old name.
      if (!(await flushOutbox())) {
        toast.show('Some changes are still waiting to sync. Try again in a moment.', 'error')
        return
      }
      const res = await fetch(`/api/checklist-groups/${group.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const result = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.show(result.error ?? 'Could not rename the group. Please try again.', 'error')
        return
      }
      const renamedItems = records
        .filter(r => r.group_name === group.name)
        .map(r => ({ ...r, group_name: name }))
      snapshotUpsert('checklist-groups', tripId, result as OfflineRecord)
      renamedItems.forEach(r => snapshotUpsert('checklist', tripId, r as unknown as OfflineRecord))
      const byId = new Map(renamedItems.map(r => [r.id, r]))
      setRecords(prev => prev.map(r => byId.get(r.id) ?? r))
      setGroups(prev => prev.map(g => g.id === group.id ? { ...g, name } : g))
      setRenaming(null)
      toast.show('Group renamed', 'success')
    } catch {
      toast.show('Could not rename the group. Please try again.', 'error')
    } finally {
      setBusy(null)
    }
  }

  function renderRenameEditor() {
    if (!renaming) return null
    const error = renaming.touched ? renameError(renaming) : null
    return (
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <FormField label="Group name" error={error ?? undefined} required>
          <input
            type="text"
            value={renaming.value}
            autoFocus
            placeholder="e.g. 🏨 Hotels"
            aria-invalid={!!error}
            onChange={e => setRenaming({ ...renaming, value: e.target.value })}
            onBlur={() => setRenaming(r => r ? { ...r, touched: true } : r)}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); saveRename() }
              if (e.key === 'Escape') { e.preventDefault(); setRenaming(null) }
            }}
            style={inputStyle(!!error)}
          />
        </FormField>
        {!isOnline && (
          <span style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)', color: 'var(--text3)' }}>
            Renaming needs a connection.
          </span>
        )}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          {/* onMouseDown keeps the field's blur from flagging an error before Cancel runs */}
          <Button variant="secondary" size="sm" onMouseDown={e => e.preventDefault()} onClick={() => setRenaming(null)}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={saveRename} disabled={!isOnline || bulkBusy}>Save</Button>
        </div>
      </div>
    )
  }

  // Deletes the group with its items. An empty group goes through apiFetch so
  // it still works offline; one with items needs the server.
  async function handleDeleteGroup(g: ChecklistGroup) {
    const itemCount = records.filter(r => r.group_name === g.name).length
    setBusy({ message: `Deleting ${g.name}…` })
    try {
      let removed: string[] = []
      let calendarChanged = false
      if (itemCount > 0) {
        // Changes still in the outbox must reach the server first, or they could land in a deleted group.
        if (!(await flushOutbox())) {
          toast.show('Some changes are still waiting to sync. Try again in a moment.', 'error')
          return
        }
        const res = await fetch(`/api/checklist-groups/${g.id}`, { method: 'DELETE' })
        const result = await res.json().catch(() => ({}))
        if (!res.ok) {
          toast.show(result.error ?? 'Could not delete the group.', 'error')
          return
        }
        removed = result.itemIds ?? []
        calendarChanged = !!result.calendarChanged
        removed.forEach(id => snapshotRemove('checklist', tripId, id))
        snapshotRemove('checklist-groups', tripId, g.id)
      } else {
        const res = await apiFetch(`/api/checklist-groups/${g.id}`, { method: 'DELETE' })
        if (!res.ok) {
          toast.show('Could not delete the group.', 'error')
          return
        }
      }
      const removedSet = new Set(removed)
      setRecords(prev => prev.filter(r => !removedSet.has(r.id)))
      setGroups(prev => prev.filter(x => x.id !== g.id))
      setSelectedIds(prev => new Set([...prev].filter(id => !removedSet.has(id))))
      setConfirmDeleteGroupId(null)
      if (calendarChanged) window.dispatchEvent(new CustomEvent('gcal:dirty'))
      toast.show(`${g.name} deleted${removed.length ? ` (${plural(removed.length, 'item')})` : ''}`, 'success')
    } catch {
      toast.show('Could not delete the group.', 'error')
    } finally {
      setBusy(null)
    }
  }

  function closeManageGroups() {
    setManageGroupsOpen(false)
    setRenaming(null)
    setConfirmDeleteGroupId(null)
  }

  // ─── Copy to Trip ─────────────────────────────────────────────────────────

  async function openCopySheet() {
    setCopyTargetId('')
    setCopyTargets(null)
    setCopySheetOpen(true)
    try {
      const res = await fetch(`/api/trips/${tripId}/copy-targets`)
      if (!res.ok) throw new Error()
      setCopyTargets(await res.json())
    } catch {
      setCopyTargets([])
      toast.show('Could not load your trips.', 'error')
    }
  }

  // The sheet closes before the copy starts (see handleMove).
  async function handleCopyToTrip() {
    const target = copyTargets?.find(t => t.id === copyTargetId)
    if (!target) return
    setCopySheetOpen(false)
    setBusy({ message: `Copying to ${target.title}…` })
    try {
      // This trip's own waiting changes go first, so the copy includes them.
      if (!(await flushOutbox())) {
        toast.show('Some changes are still waiting to sync. Try again in a moment.', 'error')
        return
      }
      const res = await fetch(`/api/trips/${tripId}/checklist-copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetTripId: target.id }),
      })
      const result = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.show(result.error ?? 'Copy failed.', 'error')
        return
      }
      const skipped = result.skipped ? ` (${result.skipped} already there)` : ''
      toast.show(`Copied ${plural(result.items ?? 0, 'item')}${skipped} to ${target.title}`, 'success')
    } catch {
      toast.show('Copy failed.', 'error')
    } finally {
      setBusy(null)
    }
  }


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

  // Rename and delete get the full 44pt target (Apple HIG).
  const bigIconBtnStyle: React.CSSProperties = { ...iconBtnStyle, width: '44px', height: '44px' }

  const rowStyle: React.CSSProperties = {
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
    transition: 'opacity var(--transition)',
  }

  function renderRowText(r: ChecklistItem) {
    const isCompleted = r.status === 'completed'
    return (
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-xs)', color: 'var(--text3)', fontWeight: 'var(--fw-bold)', letterSpacing: '0.03em' }}>
            #{r.item_number}
          </span>
          {isCompleted && selectMode && (
            <span style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-xs)', color: 'var(--green)', fontWeight: 'var(--fw-bold)' }}>
              ✓ Completed
            </span>
          )}
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
    )
  }

  function renderRow(r: ChecklistItem) {
    const isCompleted = r.status === 'completed'
    // Select mode: tapping the row selects it, and the complete circle is hidden
    // so a stray tap can't complete an item.
    if (selectMode) {
      const selected = selectedIds.has(r.id)
      return (
        <div
          key={r.id}
          id={`item-${r.id}`}
          onClick={() => toggleSelection([r])}
          style={{ ...rowStyle, padding: '4px 14px 4px 4px', alignItems: 'center', background: selected ? 'var(--bg3)' : 'var(--bg2)', opacity: isCompleted ? 0.75 : 1 }}
        >
          <SelectBox state={selected ? 'all' : 'none'} onToggle={() => toggleSelection([r])} label={`Select ${r.task}`} />
          {renderRowText(r)}
        </div>
      )
    }
    const isToggling = togglingId === r.id
    return (
      <button
        key={r.id}
        id={`item-${r.id}`}
        onClick={() => openEdit(r)}
        className={highlightedId === r.id ? 'item-highlight' : undefined}
        style={{ ...rowStyle, opacity: isCompleted ? 0.6 : 1 }}
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
        {renderRowText(r)}
      </button>
    )
  }

  // Shared by the wide and narrow toolbars.
  const selectButton = (
    <Button
      variant={selectMode ? 'secondary' : 'ghost'}
      size="sm"
      onClick={selectMode ? exitSelectMode : enterSelectMode}
      disabled={bulkBusy || records.length === 0}
    >
      {selectMode ? 'Done' : 'Select'}
    </Button>
  )
  const addButton = (
    <Button variant="primary" size="sm" onClick={openAdd}>
      <Plus size={16} />
      Add Item
    </Button>
  )
  const noSelection = bulkBusy || selectedItems.length === 0

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Section header */}
      <div style={{ marginBottom: '-8px' }}>
        <h2 style={{ fontSize: 'var(--fs-xl)', fontFamily: 'var(--font-display)', color: 'var(--navy)', fontWeight: 'var(--fw-normal)' }}>
          Checklist
        </h2>
        {records.length > 0 && (
          <p style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)', color: 'var(--text3)', marginTop: '2px' }}>
            {totalCompleted} of {records.length} complete
          </p>
        )}
      </div>

      {/* Pinned controls: sticky below the trip top bar so items scroll beneath
          (not a fixed footer: iOS). Same classes as Packing's. */}
      <div className="pack-controls" style={{ marginBottom: 0 }}>
        {/* Mac and iPad: every button visible */}
        <div className="pack-toolbar pack-toolbar-wide">
          <Button variant="ghost" size="sm" onClick={() => setAllHidden(!allHidden)} disabled={grouped.size === 0}>
            {allHidden ? 'Show All' : 'Hide All'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setManageGroupsOpen(true)}>
            Manage Groups
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={openCopySheet}
            disabled={!isOnline || records.length === 0}
            title={isOnline ? undefined : 'Copying needs a connection'}
          >
            Copy to Trip…
          </Button>
          {selectButton}
          {addButton}
        </div>

        {/* iPhone: one row, the less-used actions under More */}
        <div className="pack-toolbar pack-toolbar-narrow">
          {selectButton}
          <div style={{ position: 'relative' }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMoreOpen(o => !o)}
              aria-haspopup="menu"
              aria-expanded={moreOpen}
            >
              More ⋯
            </Button>
            {moreOpen && (
              <>
                <div className="pack-more-backdrop" onClick={() => setMoreOpen(false)} />
                <div role="menu" className="pack-more-menu">
                  <button
                    role="menuitem"
                    className="pack-more-item"
                    disabled={grouped.size === 0}
                    onClick={() => { setMoreOpen(false); setAllHidden(!allHidden) }}
                  >
                    {allHidden ? 'Show All' : 'Hide All'}
                  </button>
                  <button role="menuitem" className="pack-more-item" onClick={() => { setMoreOpen(false); setManageGroupsOpen(true) }}>
                    Manage Groups
                  </button>
                  <button
                    role="menuitem"
                    className="pack-more-item"
                    disabled={!isOnline || records.length === 0}
                    onClick={() => { setMoreOpen(false); openCopySheet() }}
                  >
                    {isOnline ? 'Copy to Trip…' : 'Copy to Trip… (needs a connection)'}
                  </button>
                </div>
              </>
            )}
          </div>
          <span style={{ flex: 1 }} />
          {addButton}
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

        {/* Multi-select action bar, inside the pinned controls */}
        {selectMode && (
          <div
            role="toolbar"
            aria-label="Selected items"
            style={{ borderTop: '1px solid var(--border2)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleSelection(filtered)}
                disabled={bulkBusy || filtered.length === 0}
              >
                {selectionStateOf(filtered) === 'all' && filtered.length > 0 ? 'Deselect All' : 'Select All'}
              </Button>
              <span aria-live="polite" style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)', color: 'var(--text2)' }}>
                {selectedItems.length} selected{notShownCount > 0 ? ` (${notShownCount} not shown)` : ''}
              </span>
            </div>
            {confirmBulkDelete ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)', color: 'var(--text)', fontWeight: 600 }}>
                  Delete {plural(selectedItems.length, 'item')}?
                </span>
                <Button variant="secondary" size="sm" onClick={() => setConfirmBulkDelete(false)} disabled={bulkBusy}>Cancel</Button>
                <Button variant="danger" size="sm" onClick={bulkDelete} loading={bulkBusy} disabled={bulkBusy}>Delete</Button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <Button variant="secondary" size="sm" onClick={() => bulkUpdate({ status: 'completed' }, 'marked complete')} disabled={noSelection}>Complete</Button>
                <Button variant="secondary" size="sm" onClick={() => bulkUpdate({ status: 'open' }, 'reopened')} disabled={noSelection}>Reopen</Button>
                <Button variant="secondary" size="sm" onClick={() => bulkUpdate({ action_required: true }, 'marked Attention Required')} disabled={noSelection}>Attention ✓</Button>
                <Button variant="secondary" size="sm" onClick={() => bulkUpdate({ action_required: false }, 'cleared of Attention Required')} disabled={noSelection}>Attention ✗</Button>
                <Button variant="secondary" size="sm" onClick={openMove} disabled={noSelection}>Move…</Button>
                <Button variant="danger" size="sm" onClick={() => setConfirmBulkDelete(true)} disabled={noSelection}>Delete…</Button>
              </div>
            )}
          </div>
        )}
      </div>

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

      {/* Warn banner (scrolls with the list, so the pinned area stays short) */}
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
        const key = groupKey(groupName === '(No Group)' ? null : groupName)
        const hidden = hiddenIds.has(key)
        return (
          <div key={groupName} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderBottom: '1px solid var(--border2)' }}>
              <ShowHideButton hidden={hidden} name={groupName} onToggle={() => toggleHidden(key)} />
              {selectMode && items.length > 0 && (
                <SelectBox
                  state={selectionStateOf(items)}
                  onToggle={() => toggleSelection(items)}
                  label={`Select all in ${groupName}`}
                />
              )}
              <span
                onClick={() => toggleHidden(key)}
                style={{ flex: 1, cursor: 'pointer', fontFamily: "'Cormorant Garamond', serif", fontSize: 'var(--fs-lg)', fontWeight: 'var(--fw-medium)', color: 'var(--navy)' }}
              >
                {groupName}
              </span>
              <span style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-xs)', color: 'var(--text3)' }}>
                {items.length === 0 ? '0 items' : `${groupCompleted}/${items.length}`}
              </span>
            </div>
            {!hidden && items.map(r => renderRow(r))}
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
          disabled: saving || taskError,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '40px' }}>

          <FormField label="Task" required error={taskError ? 'Required' : undefined}>
            <input
              type="text"
              value={form.task}
              onChange={e => setField('task', e.target.value)}
              onBlur={() => touchField('task')}
              placeholder="e.g. Check in online"
              title="Brief description of the action item"
              style={inputStyle(taskError)}
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
              title="Booking number, document, or related reference"
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
              title="How this item was completed, e.g. Done — confirmed via email"
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
                style={{ width: '20px', height: '20px', accentColor: 'var(--gold)', cursor: 'pointer', flexShrink: 0 }}
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
        onClose={closeManageGroups}
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
                {confirmDeleteGroupId === g.id ? (
                  <div role="alert" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)', color: 'var(--text)', lineHeight: 1.5 }}>
                      Delete <strong>{g.name}</strong>{itemCount ? ` with ${plural(itemCount, 'item')}` : ''}? This can&apos;t be undone.
                    </span>
                    {itemCount > 0 && !isOnline && (
                      <span style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)', color: 'var(--text3)' }}>
                        Deleting a group with items needs a connection.
                      </span>
                    )}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <Button variant="secondary" size="sm" onClick={() => setConfirmDeleteGroupId(null)} disabled={bulkBusy}>Cancel</Button>
                      <Button variant="danger" size="sm" onClick={() => handleDeleteGroup(g)} disabled={bulkBusy || (itemCount > 0 && !isOnline)}>Delete</Button>
                    </div>
                  </div>
                ) : renaming?.id === g.id ? renderRenameEditor() : (<>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)', color: 'var(--text)', fontWeight: 500 }}>
                      {g.name}
                    </span>
                    {itemCount > 0 && (
                      <span style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-xs)', color: 'var(--text3)', marginLeft: '8px' }}>
                        {plural(itemCount, 'item')}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => startRename(g)}
                    disabled={!isOnline}
                    aria-label={`Rename ${g.name}`}
                    title={isOnline ? 'Rename' : 'Renaming needs a connection'}
                    style={{ ...bigIconBtnStyle, opacity: isOnline ? 1 : 0.3 }}
                  >✎</button>
                  <button onClick={() => handleMoveGroup(g, 'up')} disabled={i === 0}
                    style={{ ...iconBtnStyle, opacity: i === 0 ? 0.3 : 1 }} aria-label="Move up">↑</button>
                  <button onClick={() => handleMoveGroup(g, 'down')} disabled={i === sortedGroups.length - 1}
                    style={{ ...iconBtnStyle, opacity: i === sortedGroups.length - 1 ? 0.3 : 1 }} aria-label="Move down">↓</button>
                  <button
                    onClick={() => { setRenaming(null); setConfirmDeleteGroupId(g.id) }}
                    style={{ ...bigIconBtnStyle, color: 'var(--red)', borderColor: 'rgba(139,32,32,0.2)' }}
                    aria-label={`Delete ${g.name}`}
                    title="Delete"
                  >×</button>
                </>)}
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

      {/* ── Move selected items. Kept mounted (open toggles): unmounting a sheet in the
          same render that closes BusyOverlay leaves the page stuck (Knowledge b70fda2f). ── */}
      <ResponsiveSheet
        open={moveOpen}
        onClose={() => setMoveOpen(false)}
        title={`Move ${plural(selectedItems.length, 'item')}`}
        primaryAction={{
          label: 'Move',
          onClick: handleMove,
          disabled: !moveCount || bulkBusy,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '40px' }}>
          <FormField label="To group" htmlFor="checklist-move-group">
            <select
              id="checklist-move-group"
              value={moveGroup}
              onChange={e => setMoveGroup(e.target.value)}
              style={{ ...inputStyle(), cursor: 'pointer' }}
            >
              <option value="" disabled>Choose a group…</option>
              {sortedGroups.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
              <option value={NO_GROUP_VALUE}>No Group</option>
            </select>
          </FormField>
          {moveCount === 0 && (
            <p role="status" style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)', color: 'var(--red)' }}>
              {selectedItems.length === 1 ? 'That item is' : 'All selected items are'} already there.
            </p>
          )}
        </div>
      </ResponsiveSheet>

      {/* ── Copy to Trip ── */}
      <ResponsiveSheet
        open={copySheetOpen}
        onClose={() => setCopySheetOpen(false)}
        title="Copy Checklist to Trip"
        primaryAction={{
          label: 'Copy',
          onClick: handleCopyToTrip,
          disabled: !copyTargetId || bulkBusy || !isOnline,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '40px' }}>
          <FormField label="Copy to" htmlFor="checklist-copy-target">
            {copyTargets === null ? (
              <p style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)', color: 'var(--text3)' }}>Loading your trips…</p>
            ) : copyTargets.length === 0 ? (
              <p style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)', color: 'var(--text3)' }}>No other trips to copy to.</p>
            ) : (
              <select
                id="checklist-copy-target"
                value={copyTargetId}
                onChange={e => setCopyTargetId(e.target.value)}
                style={inputStyle()}
              >
                <option value="" disabled>Choose a trip…</option>
                {copyTargets.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.title}{t.destination ? ` — ${t.destination}` : ''} ({t.status.charAt(0).toUpperCase() + t.status.slice(1)})
                  </option>
                ))}
              </select>
            )}
          </FormField>

          <p style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)', color: 'var(--text2)', lineHeight: 1.5 }}>
            Groups and items are added to the chosen trip&apos;s checklist as Open. Due dates, references, resolutions and Calendar settings aren&apos;t copied. Groups with the same name are combined, items already there are skipped, and nothing on that trip is changed or removed.
          </p>
          {!isOnline && (
            <p style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)', color: 'var(--text3)' }}>
              Copying needs a connection.
            </p>
          )}
        </div>
      </ResponsiveSheet>

      <BusyOverlay open={busy !== null} message={busy?.message ?? ''} detail={busy?.detail} />
    </div>
  )
}
