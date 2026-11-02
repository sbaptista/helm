'use client'

import { useState, useMemo, useEffect, useContext } from 'react'
import { apiBulk, apiFetch } from '@/lib/offline/api-fetch'
import { snapshotRemove, snapshotUpsert } from '@/lib/offline/store'
import { flushOutbox } from '@/lib/offline/sync'
import type { OfflineRecord } from '@/lib/offline/collections'
import { BusyOverlay } from '@/components/ui/BusyOverlay'
import { useOfflineList } from '@/hooks/useOfflineList'
import { TabNavigationContext } from '@/components/advisor/TripDetailView'
import { Plus } from 'lucide-react'
import { ResponsiveSheet } from '@/components/ui/ResponsiveSheet'
import { Button } from '@/components/ui/Button'
import { FormField, inputStyle } from '@/components/ui/FormField'
import { useToast } from '@/components/ui/Toast'
import { useIsOnline } from '@/hooks/useOnlineStatus'

type Person = 'stan' | 'cathy'
type CopyPeople = Person | 'both'

interface CopyTarget {
  id: string
  title: string
  destination: string | null
  status: string
}

type SelectionState = 'none' | 'some' | 'all'
type MoveMode = 'move' | 'copy'

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// Replaces changed rows, appends new ones and drops removed ones.
function merge<T extends { id: string }>(prev: T[], changed: T[], removed: Set<string>): T[] {
  const byId = new Map(changed.map(r => [r.id, r]))
  const known = new Set(prev.map(r => r.id))
  return [
    ...prev.filter(r => !removed.has(r.id)).map(r => byId.get(r.id) ?? r),
    ...changed.filter(r => !known.has(r.id)),
  ]
}

function textKey(s: string): string {
  return s.trim().toLowerCase()
}

// A 44pt toggle button for the person / Move-Copy choices in sheets.
function choiceStyle(active: boolean): React.CSSProperties {
  return {
    flex: 1,
    minHeight: '44px',
    borderRadius: 'var(--r)',
    border: `1px solid ${active ? 'var(--gold)' : 'var(--border2)'}`,
    background: active ? 'var(--bg2)' : 'transparent',
    color: 'var(--text)',
    fontFamily: "'Lato', sans-serif",
    fontSize: 'var(--fs-sm)',
    fontWeight: active ? 600 : 400,
    cursor: 'pointer',
  }
}

// Multi-select checkbox (docs/packing-multi-select-plan.md): 44pt hit target,
// dash when only some of its items are selected.
// ▾ / ▸ on a category or sub-group heading (docs/packing-collapse-plan.md).
function ShowHideButton({ hidden, name, onToggle }: { hidden: boolean; name: string; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={!hidden}
      aria-label={`${hidden ? 'Show' : 'Hide'} ${name}`}
      style={{
        width: '44px', height: '44px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--text2)', fontSize: '18px', padding: 0,
      }}
    >
      {hidden ? '▸' : '▾'}
    </button>
  )
}

function SelectBox({ state, onToggle, label }: { state: SelectionState; onToggle: () => void; label: string }) {
  return (
    <label
      onClick={e => e.stopPropagation()}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px', flexShrink: 0, cursor: 'pointer' }}
    >
      <input
        type="checkbox"
        checked={state === 'all'}
        ref={el => { if (el) el.indeterminate = state === 'some' }}
        onChange={onToggle}
        aria-label={label}
        style={{ width: '24px', height: '24px', cursor: 'pointer', accentColor: 'var(--gold)' }}
      />
    </label>
  )
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

export interface PackingGroup {
  id: string
  trip_id: string
  person: Person
  name: string
  sort_order: number
}

export interface PackingSubgroup {
  id: string
  trip_id: string
  group_id: string
  person: Person
  name: string
  sort_order: number
}

export interface PackingItem {
  id: string
  trip_id: string
  person: Person
  group_id: string
  subgroup_id: string | null
  text: string
  owned: boolean
  packed: boolean
  sort_order: number
}

interface Props {
  initialItems: PackingItem[]
  initialGroups: PackingGroup[]
  initialSubgroups: PackingSubgroup[]
  tripId: string
}

export default function PackingClient({ initialItems, initialGroups, initialSubgroups, tripId }: Props) {
  const [items, setItems] = useState<PackingItem[]>(initialItems)
  const [groups, setGroups] = useState<PackingGroup[]>(initialGroups)
  const [subgroups, setSubgroups] = useState<PackingSubgroup[]>(initialSubgroups)
  // Device copy for offline editing (docs/offline-editing-plan.md).
  useOfflineList(`/api/trips/${tripId}/packing`, initialItems, setItems)
  useOfflineList(`/api/trips/${tripId}/packing-groups`, initialGroups, setGroups)
  useOfflineList(`/api/trips/${tripId}/packing-subgroups`, initialSubgroups, setSubgroups)
  const [activePerson, setActivePerson] = useState<Person>('stan')

  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const toast = useToast()
  const { pendingSheetRecordId, clearPendingSheetRecord } = useContext(TabNavigationContext)

  useEffect(() => {
    if (!pendingSheetRecordId) return
    const item = items.find((i) => i.id === pendingSheetRecordId)
    clearPendingSheetRecord()
    if (item) openEditItem(item)
  }, [pendingSheetRecordId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Item BottomSheet
  const [itemSheetOpen, setItemSheetOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<PackingItem | null>(null)
  
  const [itemText, setItemText] = useState('')
  const [itemGroupId, setItemGroupId] = useState('')
  const [itemSubgroupId, setItemSubgroupId] = useState('') // empty = none
  const [itemOwned, setItemOwned] = useState(false)
  const [itemPacked, setItemPacked] = useState(false)

  // Manage Categories BottomSheet
  const [catSheetOpen, setCatSheetOpen] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [creatingGroup, setCreatingGroup] = useState(false)

  // Manage Subgroups BottomSheet
  const [subSheetOpen, setSubSheetOpen] = useState(false)
  const [managingGroup, setManagingGroup] = useState<PackingGroup | null>(null)
  const [newSubName, setNewSubName] = useState('')
  const [creatingSubgroup, setCreatingSubgroup] = useState(false)

  // Copy to Trip Sheet (online only; docs/copy-packing-list-plan.md)
  const isOnline = useIsOnline()
  const [copySheetOpen, setCopySheetOpen] = useState(false)
  const [copyTargets, setCopyTargets] = useState<CopyTarget[] | null>(null)
  const [copyTargetId, setCopyTargetId] = useState('')
  const [copyPeople, setCopyPeople] = useState<CopyPeople>('stan')
  const [copying, setCopying] = useState(false)

  // Multi-select (docs/packing-multi-select-plan.md)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  // In-progress dialog for bulk actions, Reset Packed and Copy to Trip.
  const [busy, setBusy] = useState<{ message: string; detail?: string } | null>(null)
  const bulkBusy = busy !== null
  // iPhone "More" menu in the pinned controls
  const [moreOpen, setMoreOpen] = useState(false)

  // Rename a category or sub-group (docs/packing-rename-groups-plan.md)
  const [renaming, setRenaming] = useState<{ kind: 'group' | 'subgroup'; id: string; value: string; touched: boolean } | null>(null)

  // Move / Copy selected items or a sub-group (docs/packing-move-copy-plan.md)
  const [moveSheet, setMoveSheet] = useState<{ kind: 'items' } | { kind: 'subgroup'; subgroup: PackingSubgroup } | null>(null)
  const [moveMode, setMoveMode] = useState<MoveMode>('move')
  const [movePerson, setMovePerson] = useState<Person>('stan')
  const [moveGroupId, setMoveGroupId] = useState('')
  const [moveSubgroupId, setMoveSubgroupId] = useState('') // empty = none

  // Hidden categories / sub-groups, remembered on this device (docs/packing-collapse-plan.md).
  // Read in useEffect, never in the useState initializer, to avoid a hydration mismatch.
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set())
  const hiddenKey = `helm-packing-hidden-${tripId}`
  useEffect(() => {
    try {
      const raw = localStorage.getItem(hiddenKey)
      if (raw) setHiddenIds(new Set(JSON.parse(raw) as string[]))
    } catch {
      // Storage unavailable: everything stays shown.
    }
  }, [hiddenKey])

  // Category awaiting delete confirmation in Manage Categories (docs/packing-delete-category-plan.md)
  const [confirmDeleteGroupId, setConfirmDeleteGroupId] = useState<string | null>(null)

  // Derived
  const personGroups = useMemo(() => {
    return groups
      .filter(g => g.person === activePerson)
      .sort((a, b) => a.sort_order - b.sort_order)
  }, [groups, activePerson])

  const personSubgroups = useMemo(() => {
    return subgroups.filter(s => s.person === activePerson)
  }, [subgroups, activePerson])

  const personItems = useMemo(() => {
    return items.filter(i => i.person === activePerson)
  }, [items, activePerson])

  // Only the open tab's items that still exist count as selected.
  const selectedItems = useMemo(() => {
    return personItems.filter(i => selectedIds.has(i.id))
  }, [personItems, selectedIds])

  const availableSubgroupsToSelect = useMemo(() => {
    return personSubgroups.filter(s => s.group_id === itemGroupId).sort((a, b) => a.sort_order - b.sort_order)
  }, [personSubgroups, itemGroupId])

  // Fix subgroup selection if group changes
  useEffect(() => {
    if (itemGroupId && itemSubgroupId) {
      const match = personSubgroups.find(s => s.id === itemSubgroupId)
      if (!match || match.group_id !== itemGroupId) {
        setItemSubgroupId('')
      }
    }
  }, [itemGroupId, personSubgroups, itemSubgroupId])

  function openAddItem() {
    if (personGroups.length === 0) {
      toast.show('Please create a category first', 'error')
      setCatSheetOpen(true)
      return
    }
    setEditingItem(null)
    setConfirmDelete(false)
    setItemText('')
    setItemGroupId(personGroups[0]?.id ?? '')
    setItemSubgroupId('')
    setItemOwned(false)
    setItemPacked(false)
    setItemSheetOpen(true)
  }

  function openEditItem(item: PackingItem) {
    setEditingItem(item)
    setConfirmDelete(false)
    setItemText(item.text)
    setItemGroupId(item.group_id)
    setItemSubgroupId(item.subgroup_id ?? '')
    setItemOwned(item.owned)
    setItemPacked(item.packed)
    setItemSheetOpen(true)
  }

  function closeItemSheet() {
    setItemSheetOpen(false)
    setEditingItem(null)
    setConfirmDelete(false)
  }

  async function handleSaveItem() {
    if (!itemText.trim() || !itemGroupId) {
      toast.show('Please provide text and select a category.', 'error')
      return
    }
    
    setSaving(true)
    try {
      const payload = {
        person: activePerson,
        group_id: itemGroupId,
        subgroup_id: itemSubgroupId || null,
        text: itemText.trim(),
        owned: itemOwned,
        packed: itemPacked,
      }
      
      if (editingItem) {
        const res = await apiFetch(`/api/packing/${editingItem.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error()
        const updated = await res.json()
        setItems(prev => prev.map(i => i.id === updated.id ? updated : i))
        toast.show('Item updated', 'success')
      } else {
        const bucket = items.filter(
          i => i.person === activePerson &&
               i.group_id === itemGroupId &&
               (i.subgroup_id ?? '') === (itemSubgroupId || '')
        )
        const nextSort = bucket.length ? Math.max(...bucket.map(i => i.sort_order)) + 1 : 1
        const res = await apiFetch(`/api/trips/${tripId}/packing`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, sort_order: nextSort }),
        })
        if (!res.ok) throw new Error()
        const created = await res.json()
        setItems(prev => [...prev, created])
        toast.show('Item added', 'success')
      }
      // Show where the item went, in case that category or sub-group was hidden.
      updateHidden(prev => {
        const next = new Set(prev)
        next.delete(itemGroupId)
        if (itemSubgroupId) next.delete(itemSubgroupId)
        return next
      })
      closeItemSheet()
    } catch {
      toast.show('Something went wrong. Please try again.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteItem() {
    if (!editingItem) return
    setDeleting(true)
    try {
      const res = await apiFetch(`/api/packing/${editingItem.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setItems(prev => prev.filter(i => i.id !== editingItem.id))
      toast.show('Item removed', 'success')
      closeItemSheet()
    } catch {
      toast.show('Something went wrong. Please try again.', 'error')
    } finally {
      setDeleting(false)
    }
  }

  // Toggle checks
  async function toggleOwned(item: PackingItem) {
    const newVal = !item.owned
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, owned: newVal } : i))
    try {
      const res = await apiFetch(`/api/packing/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owned: newVal }),
      })
      if (!res.ok) throw new Error()
    } catch {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, owned: item.owned } : i))
      toast.show('Could not update. Please try again.', 'error')
    }
  }

  async function togglePacked(item: PackingItem) {
    const newVal = !item.packed
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, packed: newVal } : i))
    try {
      const res = await apiFetch(`/api/packing/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packed: newVal }),
      })
      if (!res.ok) throw new Error()
    } catch {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, packed: item.packed } : i))
      toast.show('Could not update. Please try again.', 'error')
    }
  }

  async function handleResetPacked() {
    setBusy({ message: 'Resetting packed items…' })
    try {
      const res = await apiFetch(`/api/trips/${tripId}/packing-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ person: activePerson }),
      })
      if (res.ok) {
        setItems(prev => prev.map(i => i.person === activePerson ? { ...i, packed: false } : i))
        toast.show('Packed status reset', 'success')
      } else throw new Error()
    } catch {
      toast.show('Reset failed.', 'error')
    } finally {
      setBusy(null)
    }
  }

  // Multi-select
  // Applies a change to the hidden set, drops ids of deleted categories / sub-groups, and saves it.
  function updateHidden(change: (prev: Set<string>) => Set<string>) {
    setHiddenIds(prev => {
      const known = new Set([...groups.map(g => g.id), ...subgroups.map(s => s.id)])
      const next = new Set([...change(prev)].filter(id => known.has(id)))
      try {
        localStorage.setItem(hiddenKey, JSON.stringify([...next]))
      } catch {
        // Not remembered; still applies until reload.
      }
      return next
    })
  }

  function toggleHidden(id: string) {
    updateHidden(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  // Show All when everything of this person's is hidden, otherwise Hide All.
  const allHidden = personGroups.length > 0 && personGroups.every(g => hiddenIds.has(g.id))

  function setAllHidden(hide: boolean) {
    const ids = [...personGroups.map(g => g.id), ...personSubgroups.map(s => s.id)]
    updateHidden(prev => {
      const next = new Set(prev)
      ids.forEach(id => { if (hide) next.add(id); else next.delete(id) })
      return next
    })
  }

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

  function switchPerson(person: Person) {
    setActivePerson(person)
    clearSelection()
  }

  function selectionStateOf(list: PackingItem[]): SelectionState {
    const count = list.filter(i => selectedIds.has(i.id)).length
    if (count === 0) return 'none'
    return count === list.length ? 'all' : 'some'
  }

  // Selects all of list, or deselects all of it when it is already fully selected.
  function toggleSelection(list: PackingItem[]) {
    const select = selectionStateOf(list) !== 'all'
    setConfirmBulkDelete(false)
    setSelectedIds(prev => {
      const next = new Set(prev)
      list.forEach(i => { if (select) next.add(i.id); else next.delete(i.id) })
      return next
    })
  }

  async function bulkSet(field: 'owned' | 'packed', value: boolean) {
    const targets = selectedItems.filter(i => i[field] !== value)
    const label = field === 'owned' ? (value ? 'owned' : 'not owned') : (value ? 'packed' : 'unpacked')
    if (targets.length === 0) {
      toast.show(`Already marked ${label}`, 'neutral')
      return
    }
    const targetIds = new Set(targets.map(i => i.id))
    const message = `Updating ${plural(targets.length, 'item')}…`
    setBusy({ message })
    setItems(prev => prev.map(i => targetIds.has(i.id) ? { ...i, [field]: value } : i))
    const failed = await apiBulk({
      collection: 'packing',
      tripId,
      bulkUrl: `/api/trips/${tripId}/packing-bulk`,
      itemUrl: id => `/api/packing/${id}`,
      ids: [...targetIds],
      action: 'update',
      fields: { [field]: value },
      onProgress: (done, total) => setBusy({ message, detail: `${done} of ${total}` }),
    })
    setBusy(null)
    if (failed.length) {
      const failedIds = new Set(failed)
      setItems(prev => prev.map(i => failedIds.has(i.id) ? { ...i, [field]: !value } : i))
      toast.show(`${failed.length} of ${plural(targets.length, 'item')} couldn't be saved`, 'error')
    } else {
      toast.show(`${plural(targets.length, 'item')} marked ${label}`, 'success')
    }
  }

  async function bulkDelete() {
    const targets = selectedItems
    if (targets.length === 0) return
    const message = `Deleting ${plural(targets.length, 'item')}…`
    setBusy({ message })
    const failed = await apiBulk({
      collection: 'packing',
      tripId,
      bulkUrl: `/api/trips/${tripId}/packing-bulk`,
      itemUrl: id => `/api/packing/${id}`,
      ids: targets.map(i => i.id),
      action: 'delete',
      onProgress: (done, total) => setBusy({ message, detail: `${done} of ${total}` }),
    })
    setBusy(null)
    setConfirmBulkDelete(false)
    const failedIds = new Set(failed)
    const deletedIds = new Set(targets.filter(i => !failedIds.has(i.id)).map(i => i.id))
    setItems(prev => prev.filter(i => !deletedIds.has(i.id)))
    setSelectedIds(prev => new Set([...prev].filter(id => !deletedIds.has(id))))
    if (failed.length) {
      toast.show(`${failed.length} of ${plural(targets.length, 'item')} couldn't be deleted`, 'error')
    } else {
      toast.show(`${plural(targets.length, 'item')} deleted`, 'success')
    }
  }

  // Move / Copy
  function openMoveItems(mode: MoveMode) {
    setMoveMode(mode)
    setMovePerson(activePerson)
    setMoveGroupId('')
    setMoveSubgroupId('')
    setConfirmBulkDelete(false)
    setMoveSheet({ kind: 'items' })
  }

  function openMoveSubgroup(sub: PackingSubgroup) {
    setSubSheetOpen(false)
    setRenaming(null)
    setMoveMode('move')
    setMovePerson(activePerson)
    setMoveGroupId('')
    setMoveSubgroupId('')
    setMoveSheet({ kind: 'subgroup', subgroup: sub })
  }

  function chooseMovePerson(person: Person) {
    setMovePerson(person)
    setMoveGroupId('')
    setMoveSubgroupId('')
  }

  // Categories offered as the destination; a sub-group can't go to its own category.
  const moveGroups = useMemo(() => {
    return groups
      .filter(g => g.person === movePerson)
      .filter(g => moveSheet?.kind !== 'subgroup' || g.id !== moveSheet.subgroup.group_id)
      .sort((a, b) => a.sort_order - b.sort_order)
  }, [groups, movePerson, moveSheet])

  const moveSubgroups = useMemo(() => {
    return subgroups
      .filter(s => s.group_id === moveGroupId)
      .sort((a, b) => a.sort_order - b.sort_order)
  }, [subgroups, moveGroupId])

  // How many selected items would actually change, so a no-op can be blocked.
  function moveItemCount(): number {
    const inDest = (i: PackingItem) =>
      i.person === movePerson && i.group_id === moveGroupId && (i.subgroup_id ?? '') === moveSubgroupId
    if (moveMode === 'move') return selectedItems.filter(i => !inDest(i)).length
    const there = new Set(items.filter(inDest).map(i => textKey(i.text)))
    return selectedItems.filter(i => !there.has(textKey(i.text))).length
  }

  function applyMoveResult(result: {
    items?: OfflineRecord[]
    subgroups?: OfflineRecord[]
    removedItemIds?: string[]
    removedSubgroupIds?: string[]
  }) {
    const changedItems = result.items ?? []
    const changedSubs = result.subgroups ?? []
    const removedItems = new Set(result.removedItemIds ?? [])
    const removedSubs = new Set(result.removedSubgroupIds ?? [])
    changedItems.forEach(r => snapshotUpsert('packing', tripId, r))
    changedSubs.forEach(r => snapshotUpsert('packing-subgroups', tripId, r))
    removedItems.forEach(id => snapshotRemove('packing', tripId, id))
    removedSubs.forEach(id => snapshotRemove('packing-subgroups', tripId, id))
    setItems(prev => merge(prev, changedItems as unknown as PackingItem[], removedItems))
    setSubgroups(prev => merge(prev, changedSubs as unknown as PackingSubgroup[], removedSubs))
  }

  async function handleMoveCopy() {
    if (!moveSheet || !moveGroupId) return
    const destGroup = groups.find(g => g.id === moveGroupId)
    const destSub = moveSheet.kind === 'items' ? subgroups.find(s => s.id === moveSubgroupId) : undefined
    const where = [cap(movePerson), destGroup?.name, destSub?.name].filter(Boolean).join(' › ')
    const what = moveSheet.kind === 'items'
      ? plural(selectedItems.length, 'item')
      : moveSheet.subgroup.name
    setBusy({ message: `${moveMode === 'move' ? 'Moving' : 'Copying'} ${what}…` })
    try {
      // Changes still in the outbox must reach the server first, or the move would act on stale rows.
      if (!(await flushOutbox())) {
        toast.show('Some changes are still waiting to sync. Try again in a moment.', 'error')
        return
      }
      const res = await fetch(`/api/trips/${tripId}/packing-move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: moveMode,
          person: movePerson,
          groupId: moveGroupId,
          ...(moveSheet.kind === 'items'
            ? { itemIds: selectedItems.map(i => i.id), destSubgroupId: moveSubgroupId || null }
            : { subgroupId: moveSheet.subgroup.id }),
        }),
      })
      const result = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.show(result.error ?? 'Could not save changes.', 'error')
        return
      }
      applyMoveResult(result)
      const verb = moveMode === 'move' ? 'moved' : 'copied'
      const subject = moveSheet.kind === 'items' ? plural(result.done ?? 0, 'item') : moveSheet.subgroup.name
      const skipped = result.skipped ? ` (${result.skipped} already there)` : ''
      toast.show(`${subject} ${verb} to ${where}${skipped}`, 'success')
      if (moveSheet.kind === 'items' && moveMode === 'move') clearSelection()
      setMoveSheet(null)
    } catch {
      toast.show('Could not save changes.', 'error')
    } finally {
      setBusy(null)
    }
  }

  // Copy to Trip
  async function openCopySheet() {
    setCopyPeople(activePerson)
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

  async function handleCopyToTrip() {
    const target = copyTargets?.find(t => t.id === copyTargetId)
    if (!target) return
    setCopying(true)
    setBusy({ message: `Copying to ${target.title}…` })
    try {
      const res = await fetch(`/api/trips/${tripId}/packing-copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetTripId: target.id,
          people: copyPeople === 'both' ? ['stan', 'cathy'] : [copyPeople],
        }),
      })
      const result = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.show(result.error ?? 'Copy failed.', 'error')
        return
      }
      const skipped = result.skipped ? ` (${result.skipped} already there)` : ''
      toast.show(`Copied ${result.items} item${result.items === 1 ? '' : 's'}${skipped} to ${target.title}`, 'success')
      setCopySheetOpen(false)
    } catch {
      toast.show('Copy failed.', 'error')
    } finally {
      setCopying(false)
      setBusy(null)
    }
  }

  // Manage Categories
  async function handleCreateCategory() {
    if (!newCatName.trim()) return
    setCreatingGroup(true)
    try {
      const nextSort = personGroups.length ? Math.max(...personGroups.map(g => g.sort_order)) + 1 : 1
      const res = await apiFetch(`/api/trips/${tripId}/packing-groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ person: activePerson, name: newCatName.trim(), sort_order: nextSort }),
      })
      if (!res.ok) throw new Error()
      const created = await res.json()
      setGroups(prev => [...prev, created])
      setNewCatName('')
      toast.show('Category created', 'success')
    } catch {
      toast.show('Failed to create category', 'error')
    } finally {
      setCreatingGroup(false)
    }
  }

  // Rename
  function startRename(kind: 'group' | 'subgroup', record: { id: string; name: string }) {
    setConfirmDeleteGroupId(null)
    setRenaming({ kind, id: record.id, value: record.name, touched: false })
  }

  // Same-name categories (per person) or sub-groups (per category) would merge in Copy to Trip.
  function renameError(r: NonNullable<typeof renaming>): string | null {
    const key = r.value.trim().toLowerCase()
    if (!key) return 'Name is required.'
    if (r.kind === 'group') {
      if (personGroups.some(g => g.id !== r.id && g.name.trim().toLowerCase() === key)) {
        return 'Another category already has this name.'
      }
    } else {
      const sub = subgroups.find(s => s.id === r.id)
      if (sub && personSubgroups.some(s => s.id !== r.id && s.group_id === sub.group_id && s.name.trim().toLowerCase() === key)) {
        return 'Another sub-group in this category already has this name.'
      }
    }
    return null
  }

  function applyName(kind: 'group' | 'subgroup', id: string, name: string) {
    if (kind === 'group') setGroups(prev => prev.map(g => g.id === id ? { ...g, name } : g))
    else setSubgroups(prev => prev.map(s => s.id === id ? { ...s, name } : s))
  }

  async function saveRename() {
    if (!renaming) return
    if (renameError(renaming)) {
      setRenaming({ ...renaming, touched: true })
      return
    }
    const { kind, id } = renaming
    const name = renaming.value.trim()
    const current = kind === 'group' ? groups.find(g => g.id === id) : subgroups.find(s => s.id === id)
    setRenaming(null)
    if (!current || current.name === name) return

    const label = kind === 'group' ? 'Category' : 'Sub-group'
    applyName(kind, id, name)
    if (kind === 'group' && managingGroup?.id === id) setManagingGroup({ ...managingGroup, name })
    try {
      const res = await apiFetch(`/api/${kind === 'group' ? 'packing-groups' : 'packing-subgroups'}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) throw new Error()
      toast.show(`${label} renamed`, 'success')
    } catch {
      applyName(kind, id, current.name)
      toast.show(`Could not rename the ${label.toLowerCase()}. Please try again.`, 'error')
    }
  }

  // The row's edit mode, shared by both Manage sheets.
  function renderRenameEditor(fieldLabel: string) {
    if (!renaming) return null
    const error = renaming.touched ? renameError(renaming) : null
    return (
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <FormField label={fieldLabel} error={error ?? undefined} required>
          <input
            type="text"
            value={renaming.value}
            autoFocus
            placeholder="e.g. Toiletries"
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
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          {/* onMouseDown keeps the field's blur from flagging an error before Cancel runs */}
          <Button variant="secondary" size="sm" onMouseDown={e => e.preventDefault()} onClick={() => setRenaming(null)}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={saveRename}>Save</Button>
        </div>
      </div>
    )
  }

  async function moveCategory(group: PackingGroup, direction: 'up' | 'down') {
    setConfirmDeleteGroupId(null)
    const sorted = [...personGroups]
    const idx = sorted.findIndex(g => g.id === group.id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sorted.length) return
    const other = sorted[swapIdx]
    
    setGroups(prev => prev.map(g => {
      if (g.id === group.id) return { ...g, sort_order: other.sort_order }
      if (g.id === other.id) return { ...g, sort_order: group.sort_order }
      return g
    }))
    
    try {
      await Promise.all([
        apiFetch(`/api/packing-groups/${group.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sort_order: other.sort_order }),
        }),
        apiFetch(`/api/packing-groups/${other.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sort_order: group.sort_order }),
        }),
      ])
    } catch {
      toast.show('Failed to reorder categories', 'error')
    }
  }

  function categoryContents(group: PackingGroup) {
    return {
      items: items.filter(i => i.group_id === group.id).length,
      subgroups: subgroups.filter(s => s.group_id === group.id).length,
    }
  }

  // Deletes the category with its sub-groups and items. An empty category goes
  // through apiFetch so it still works offline; one with contents needs the server.
  async function handleDeleteCategory(group: PackingGroup) {
    const contents = categoryContents(group)
    const hasContents = contents.items > 0 || contents.subgroups > 0
    setBusy({ message: `Deleting ${group.name}…` })
    try {
      let removedItems: string[] = []
      let removedSubs: string[] = []
      if (hasContents) {
        // Changes still in the outbox must reach the server first, or they could land in a deleted category.
        if (!(await flushOutbox())) {
          toast.show('Some changes are still waiting to sync. Try again in a moment.', 'error')
          return
        }
        const res = await fetch(`/api/packing-groups/${group.id}`, { method: 'DELETE' })
        const result = await res.json().catch(() => ({}))
        if (!res.ok) {
          toast.show(result.error ?? 'Failed to delete', 'error')
          return
        }
        removedItems = result.itemIds ?? []
        removedSubs = result.subgroupIds ?? []
        removedItems.forEach(id => snapshotRemove('packing', tripId, id))
        removedSubs.forEach(id => snapshotRemove('packing-subgroups', tripId, id))
        snapshotRemove('packing-groups', tripId, group.id)
      } else {
        const res = await apiFetch(`/api/packing-groups/${group.id}`, { method: 'DELETE' })
        if (!res.ok) {
          toast.show('Failed to delete', 'error')
          return
        }
      }
      const itemSet = new Set(removedItems)
      const subSet = new Set(removedSubs)
      setItems(prev => prev.filter(i => !itemSet.has(i.id)))
      setSubgroups(prev => prev.filter(s => !subSet.has(s.id)))
      setGroups(prev => prev.filter(g => g.id !== group.id))
      setSelectedIds(prev => new Set([...prev].filter(id => !itemSet.has(id))))
      setConfirmDeleteGroupId(null)
      const parts = [
        removedSubs.length ? plural(removedSubs.length, 'sub-group') : '',
        removedItems.length ? plural(removedItems.length, 'item') : '',
      ].filter(Boolean).join(', ')
      toast.show(`${group.name} deleted${parts ? ` (${parts})` : ''}`, 'success')
    } catch {
      toast.show('Failed to delete', 'error')
    } finally {
      setBusy(null)
    }
  }

  // Manage Subgroups
  async function handleCreateSubgroup() {
    if (!newSubName.trim() || !managingGroup) return
    setCreatingSubgroup(true)
    try {
      const groupSubs = personSubgroups
        .filter(s => s.group_id === managingGroup.id)
        .sort((a, b) => a.sort_order - b.sort_order)
      const nextSort = groupSubs.length ? Math.max(...groupSubs.map(s => s.sort_order)) + 1 : 1
      const res = await apiFetch(`/api/trips/${tripId}/packing-subgroups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_id: managingGroup.id,
          person: activePerson,
          name: newSubName.trim(),
          sort_order: nextSort,
        }),
      })
      if (!res.ok) throw new Error()
      const created = await res.json()
      setSubgroups(prev => [...prev, created])
      setNewSubName('')
      toast.show('Sub-group created', 'success')
    } catch {
      toast.show('Failed to create sub-group', 'error')
    } finally {
      setCreatingSubgroup(false)
    }
  }

  async function moveSubgroup(sub: PackingSubgroup, direction: 'up' | 'down') {
    const groupSubs = personSubgroups
      .filter(s => s.group_id === sub.group_id)
      .sort((a, b) => a.sort_order - b.sort_order)
      
    const idx = groupSubs.findIndex(s => s.id === sub.id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= groupSubs.length) return
    const other = groupSubs[swapIdx]
    
    setSubgroups(prev => prev.map(s => {
      if (s.id === sub.id) return { ...s, sort_order: other.sort_order }
      if (s.id === other.id) return { ...s, sort_order: sub.sort_order }
      return s
    }))

    try {
      await Promise.all([
        apiFetch(`/api/packing-subgroups/${sub.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sort_order: other.sort_order }),
        }),
        apiFetch(`/api/packing-subgroups/${other.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sort_order: sub.sort_order }),
        }),
      ])
    } catch {
      toast.show('Failed to reorder sub-groups', 'error')
    }
  }

  async function handleDeleteSubgroup(sub: PackingSubgroup) {
    const res = await apiFetch(`/api/packing-subgroups/${sub.id}`, { method: 'DELETE' })
    if (res.status === 409) {
      toast.show('Cannot delete a sub-group that has items.', 'error')
      return
    }
    if (res.ok) {
      setSubgroups(prev => prev.filter(s => s.id !== sub.id))
      toast.show('Sub-group deleted', 'success')
    } else {
      toast.show('Failed to delete', 'error')
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
  // Rename gets the full 44pt target (Apple HIG).
  const renameBtnStyle: React.CSSProperties = { ...iconBtnStyle, width: '44px', height: '44px' }

  function renderItem(item: PackingItem) {
    const fullyDone = item.owned && item.packed
    if (selectMode) {
      const selected = selectedIds.has(item.id)
      const statusStyle = { minWidth: '48px', flexShrink: 0, textAlign: 'center' as const, fontSize: 'var(--fs-base)', color: 'var(--text2)' }
      return (
        <div
          key={item.id}
          className="pack-item"
          style={{ background: selected ? 'var(--bg3)' : undefined, cursor: 'pointer' }}
          onClick={() => toggleSelection([item])}
        >
          <SelectBox state={selected ? 'all' : 'none'} onToggle={() => toggleSelection([item])} label={`Select ${item.text}`} />
          <div style={{ width: '4px', alignSelf: 'stretch', background: 'var(--gold)', borderRadius: '2px', flexShrink: 0 }} />
          <span className="pack-item-text" style={{ opacity: item.packed ? 0.6 : 1 }}>{item.text}</span>
          <div style={statusStyle} aria-label={item.owned ? 'Owned' : 'Not owned'}>{item.owned ? '✓' : ''}</div>
          <div style={statusStyle} aria-label={item.packed ? 'Packed' : 'Not packed'}>{item.packed ? '✓' : ''}</div>
        </div>
      )
    }
    return (
      <div
        key={item.id}
        className="pack-item"
        style={{ opacity: fullyDone ? 0.4 : item.packed ? 0.45 : 1 }}
        onClick={() => openEditItem(item)}
      >
        <div style={{ width: '4px', alignSelf: 'stretch', background: 'var(--gold)', borderRadius: '2px', flexShrink: 0 }} />
        <span className="pack-item-text">{item.text}</span>
        <div
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '48px', flexShrink: 0 }}
          onClick={e => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={item.owned}
            onChange={() => toggleOwned(item)}
            title="Toggle Owned"
            aria-label="Toggle owned"
            style={{ width: '24px', height: '24px', minWidth: '24px', minHeight: '24px', cursor: 'pointer', accentColor: 'var(--gold)', flexShrink: 0 }}
          />
        </div>
        <div
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '48px', flexShrink: 0 }}
          onClick={e => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={item.packed}
            onChange={() => togglePacked(item)}
            title="Toggle Packed"
            aria-label="Toggle packed"
            style={{ width: '24px', height: '24px', minWidth: '24px', minHeight: '24px', cursor: 'pointer', accentColor: 'var(--navy)', flexShrink: 0 }}
          />
        </div>
      </div>
    )
  }

  // Shared by the wide and narrow toolbars.
  const selectButton = (
    <Button
      variant={selectMode ? 'secondary' : 'ghost'}
      size="sm"
      onClick={selectMode ? exitSelectMode : enterSelectMode}
      disabled={bulkBusy}
    >
      {selectMode ? 'Done' : 'Select'}
    </Button>
  )
  const addButton = (
    <Button variant="primary" size="sm" onClick={openAddItem}>
      <Plus size={16} /> Add Item
    </Button>
  )

  return (
    <div>
      <div className="section-header" style={{ marginBottom: '8px' }}>
        <h2 style={{ fontSize: 'var(--fs-xl)', fontFamily: 'var(--font-display)', color: 'var(--navy)', fontWeight: 'var(--fw-normal)', width: '100%' }}>
          Packing List
        </h2>
      </div>

      {/* Pinned controls: sticky below the trip top bar so items scroll beneath
          (not a fixed footer: iOS). docs/packing-multi-select-plan.md, Revision 2 */}
      <div className="pack-controls">
        {/* Mac and iPad: every button visible */}
        <div className="pack-toolbar pack-toolbar-wide">
          <Button variant="ghost" size="sm" onClick={handleResetPacked}>
            ↺ Reset Packed
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setAllHidden(!allHidden)} disabled={personGroups.length === 0}>
            {allHidden ? 'Show All' : 'Hide All'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCatSheetOpen(true)}>
            Manage Categories
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={openCopySheet}
            disabled={!isOnline}
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
                  <button role="menuitem" className="pack-more-item" onClick={() => { setMoreOpen(false); handleResetPacked() }}>
                    ↺ Reset Packed
                  </button>
                  <button
                    role="menuitem"
                    className="pack-more-item"
                    disabled={personGroups.length === 0}
                    onClick={() => { setMoreOpen(false); setAllHidden(!allHidden) }}
                  >
                    {allHidden ? 'Show All' : 'Hide All'}
                  </button>
                  <button role="menuitem" className="pack-more-item" onClick={() => { setMoreOpen(false); setCatSheetOpen(true) }}>
                    Manage Categories
                  </button>
                  <button
                    role="menuitem"
                    className="pack-more-item"
                    disabled={!isOnline}
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

        <div className="pack-tabs">
          {(['stan', 'cathy'] as Person[]).map(p => (
            <button
              key={p}
              className={`pack-tab${activePerson === p ? ' active' : ''}`}
              onClick={() => switchPerson(p)}
              disabled={bulkBusy}
            >
              🎒 {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>

        {/* Multi-select action bar, inside the pinned controls */}
        {selectMode && (
          <div
            role="toolbar"
            aria-label="Selected items"
            style={{
              borderTop: '1px solid var(--border2)',
              paddingTop: '10px',
              display: 'flex', flexDirection: 'column', gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleSelection(personItems)}
                disabled={bulkBusy || personItems.length === 0}
              >
                {selectionStateOf(personItems) === 'all' && personItems.length > 0 ? 'Deselect All' : 'Select All'}
              </Button>
              <span aria-live="polite" style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)', color: 'var(--text2)' }}>
                {selectedItems.length} selected
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
                <Button variant="secondary" size="sm" onClick={() => bulkSet('owned', true)} disabled={bulkBusy || selectedItems.length === 0}>Owned ✓</Button>
                <Button variant="secondary" size="sm" onClick={() => bulkSet('owned', false)} disabled={bulkBusy || selectedItems.length === 0}>Owned ✗</Button>
                <Button variant="secondary" size="sm" onClick={() => bulkSet('packed', true)} disabled={bulkBusy || selectedItems.length === 0}>Packed ✓</Button>
                <Button variant="secondary" size="sm" onClick={() => bulkSet('packed', false)} disabled={bulkBusy || selectedItems.length === 0}>Packed ✗</Button>
                <Button variant="secondary" size="sm" onClick={() => openMoveItems('move')} disabled={bulkBusy || selectedItems.length === 0 || !isOnline}>Move…</Button>
                <Button variant="secondary" size="sm" onClick={() => openMoveItems('copy')} disabled={bulkBusy || selectedItems.length === 0 || !isOnline}>Copy…</Button>
                <Button variant="danger" size="sm" onClick={() => setConfirmBulkDelete(true)} disabled={bulkBusy || selectedItems.length === 0}>Delete…</Button>
              </div>
            )}
            {!isOnline && (
              <span style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)', color: 'var(--text3)' }}>
                Move and Copy need a connection.
              </span>
            )}
          </div>
        )}
      </div>

      <div className="pack-list">
        {personGroups.length === 0 && (
          <p style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)', color: 'var(--text3)', textAlign: 'center', padding: '32px 0' }}>
            No categories yet. Add one via Manage Categories.
          </p>
        )}
        {personGroups.map(group => {
          const groupItems = personItems.filter(i => i.group_id === group.id)
          const groupSubs = personSubgroups
            .filter(s => s.group_id === group.id)
            .sort((a, b) => a.sort_order - b.sort_order)
          const packedCount = groupItems.filter(i => i.packed).length
          const ownedCount = groupItems.filter(i => i.owned).length
          const groupHidden = hiddenIds.has(group.id)

          return (
            <div key={group.id} className="pack-group">
              <div className="pack-group-header">
                <ShowHideButton hidden={groupHidden} name={group.name} onToggle={() => toggleHidden(group.id)} />
                {selectMode && groupItems.length > 0 && (
                  <SelectBox
                    state={selectionStateOf(groupItems)}
                    onToggle={() => toggleSelection(groupItems)}
                    label={`Select all in ${group.name}`}
                  />
                )}
                <span className="pack-group-name" onClick={() => toggleHidden(group.id)} style={{ flex: 1, cursor: 'pointer' }}>{group.name}</span>
                <span className="pack-group-progress">
                  {packedCount}/{groupItems.length} packed · {ownedCount} owned
                </span>
                <Button
                  variant="ghost" 
                  size="sm"
                  onClick={() => { setManagingGroup(group); setSubSheetOpen(true) }}
                  style={{ marginLeft: '12px' }}
                >
                  Manage Sub-groups
                </Button>
              </div>

              {!groupHidden && (<>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                <div style={{ width: '4px', flexShrink: 0 }} />
                <span style={{ flex: 1 }} />
                <div style={{ minWidth: '48px', flexShrink: 0, textAlign: 'center', fontSize: 'var(--fs-xs)', color: 'var(--text-secondary, var(--text3))' }}>Owned</div>
                <div style={{ minWidth: '48px', flexShrink: 0, textAlign: 'center', fontSize: 'var(--fs-xs)', color: 'var(--text-secondary, var(--text3))' }}>Packed</div>
              </div>

              {groupItems
                .filter(i => !i.subgroup_id)
                .sort((a, b) => a.sort_order - b.sort_order)
                .map(item => renderItem(item))}

              {groupSubs.map(sub => {
                const subItems = groupItems
                  .filter(i => i.subgroup_id === sub.id)
                  .sort((a, b) => a.sort_order - b.sort_order)
                const subHidden = hiddenIds.has(sub.id)
                return (
                  <div key={sub.id} className="pack-subgroup">
                    <div
                      className="pack-subgroup-header"
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}
                    >
                      <ShowHideButton hidden={subHidden} name={sub.name} onToggle={() => toggleHidden(sub.id)} />
                      {selectMode && subItems.length > 0 && (
                        <SelectBox
                          state={selectionStateOf(subItems)}
                          onToggle={() => toggleSelection(subItems)}
                          label={`Select all in ${sub.name}`}
                        />
                      )}
                      <span onClick={() => toggleHidden(sub.id)} style={{ flex: 1, cursor: 'pointer' }}>
                        {sub.name}
                        {subHidden && (
                          <span style={{ textTransform: 'none', fontWeight: 400, letterSpacing: 0 }}> · {plural(subItems.length, 'item')}</span>
                        )}
                      </span>
                    </div>
                    {!subHidden && subItems.map(item => renderItem(item))}
                  </div>
                )
              })}
              </>)}
            </div>
          )
        })}
      </div>

      {/* Item Sheet */}
      <ResponsiveSheet
        open={itemSheetOpen}
        onClose={closeItemSheet}
        title={editingItem ? 'Edit Item' : 'Add Item'}
        primaryAction={{
          label: editingItem ? 'Save' : 'Add',
          onClick: handleSaveItem,
          loading: saving,
          disabled: saving,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '40px' }}>
          <FormField label="Text" required>
            <input
              type="text"
              value={itemText}
              onChange={e => setItemText(e.target.value)}
              placeholder="e.g. Passport"
              style={inputStyle()}
            />
          </FormField>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <FormField label="Category" required>
              <select
                value={itemGroupId}
                onChange={e => setItemGroupId(e.target.value)}
                style={{ ...inputStyle(), cursor: 'pointer' }}
              >
                {personGroups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Sub-group">
              <select
                value={itemSubgroupId}
                onChange={e => setItemSubgroupId(e.target.value)}
                style={{ ...inputStyle(), cursor: 'pointer' }}
              >
                <option value="">None</option>
                {availableSubgroupsToSelect.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </FormField>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', minHeight: '44px' }}>
            <input
              type="checkbox"
              checked={itemOwned}
              onChange={e => setItemOwned(e.target.checked)}
              style={{ width: '20px', height: '20px', accentColor: 'var(--gold)', cursor: 'pointer', flexShrink: 0 }}
            />
            <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text)', fontWeight: 500 }}>Owned</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', minHeight: '44px' }}>
            <input
              type="checkbox"
              checked={itemPacked}
              onChange={e => setItemPacked(e.target.checked)}
              style={{ width: '20px', height: '20px', accentColor: 'var(--gold)', cursor: 'pointer', flexShrink: 0 }}
            />
            <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text)', fontWeight: 500 }}>Packed</span>
          </label>

          {editingItem && (
            confirmDelete ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--red)', textAlign: 'center', margin: 0 }}>Remove this item?</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(false)} style={{ flex: 1 }}>Cancel</Button>
                  <Button variant="primary" size="sm" onClick={handleDeleteItem} disabled={deleting} loading={deleting}
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

      {/* Manage Categories Sheet */}
      <ResponsiveSheet
        open={catSheetOpen}
        onClose={() => { setCatSheetOpen(false); setRenaming(null); setConfirmDeleteGroupId(null) }}
        title="Manage Categories"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '40px' }}>
          {personGroups.length === 0 && (
            <p style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)', color: 'var(--text3)', textAlign: 'center', padding: '24px 0' }}>
              No categories yet.
            </p>
          )}
          {personGroups.map((g, i) => {
            const contents = categoryContents(g)
            const hasContents = contents.items > 0 || contents.subgroups > 0
            const contentsText = [
              contents.subgroups ? plural(contents.subgroups, 'sub-group') : '',
              contents.items ? plural(contents.items, 'item') : '',
            ].filter(Boolean).join(' and ')
            return (
              <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 'var(--r)', padding: '10px 14px' }}>
                {confirmDeleteGroupId === g.id ? (
                  <div role="alert" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)', color: 'var(--text)', lineHeight: 1.5 }}>
                      Delete <strong>{g.name}</strong>{contentsText ? ` with ${contentsText}` : ''}? This can&apos;t be undone.
                    </span>
                    {hasContents && !isOnline && (
                      <span style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)', color: 'var(--text3)' }}>
                        Deleting a category with items needs a connection.
                      </span>
                    )}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <Button variant="secondary" size="sm" onClick={() => setConfirmDeleteGroupId(null)} disabled={bulkBusy}>Cancel</Button>
                      <Button variant="danger" size="sm" onClick={() => handleDeleteCategory(g)} disabled={bulkBusy || (hasContents && !isOnline)}>Delete</Button>
                    </div>
                  </div>
                ) : renaming?.kind === 'group' && renaming.id === g.id ? renderRenameEditor('Category name') : (<>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)', color: 'var(--text)', fontWeight: 500 }}>{g.name}</span>
                </div>
                <button onClick={() => startRename('group', g)} aria-label={`Rename ${g.name}`} title="Rename" style={renameBtnStyle}>✎</button>
                <button onClick={() => moveCategory(g, 'up')} disabled={i === 0} style={{ ...iconBtnStyle, opacity: i === 0 ? 0.3 : 1 }}>↑</button>
                <button onClick={() => moveCategory(g, 'down')} disabled={i === personGroups.length - 1} style={{ ...iconBtnStyle, opacity: i === personGroups.length - 1 ? 0.3 : 1 }}>↓</button>
                <button
                  onClick={() => { setRenaming(null); setConfirmDeleteGroupId(g.id) }}
                  aria-label={`Delete ${g.name}`}
                  title="Delete"
                  style={{ ...renameBtnStyle, color: 'var(--red)', borderColor: 'rgba(139,32,32,0.2)' }}>×</button>
                </>)}
              </div>
            )
          })}
          <div style={{ borderTop: '1px solid var(--border2)', marginTop: '8px', paddingTop: '16px', display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <FormField label="New Category">
                <input type="text" value={newCatName} onChange={e => setNewCatName(e.target.value)} style={inputStyle()} onKeyDown={e => { if (e.key === 'Enter') handleCreateCategory() }} />
              </FormField>
            </div>
            <Button variant="primary" size="sm" onClick={handleCreateCategory} loading={creatingGroup} disabled={!newCatName.trim() || creatingGroup} style={{ marginBottom: '1px' }}>Create</Button>
          </div>
        </div>
      </ResponsiveSheet>

      {/* Manage Sub-groups Sheet */}
      <ResponsiveSheet
        open={subSheetOpen}
        onClose={() => { setSubSheetOpen(false); setRenaming(null) }}
        title={managingGroup ? `Sub-groups: ${managingGroup.name}` : 'Manage Sub-groups'}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '40px' }}>
          {managingGroup && (() => {
            const groupSubs = personSubgroups.filter(s => s.group_id === managingGroup.id).sort((a, b) => a.sort_order - b.sort_order)
            return (
              <>
                {groupSubs.length === 0 && (
                  <p style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)', color: 'var(--text3)', textAlign: 'center', padding: '24px 0' }}>No sub-groups yet.</p>
                )}
                {groupSubs.map((s, i) => {
                  const hasItems = personItems.some(item => item.subgroup_id === s.id)
                  return (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 'var(--r)', padding: '10px 14px' }}>
                      {renaming?.kind === 'subgroup' && renaming.id === s.id ? renderRenameEditor('Sub-group name') : (<>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)', color: 'var(--text)', fontWeight: 500 }}>{s.name}</span>
                      </div>
                      <button onClick={() => startRename('subgroup', s)} aria-label={`Rename ${s.name}`} title="Rename" style={renameBtnStyle}>✎</button>
                      <button
                        onClick={() => openMoveSubgroup(s)}
                        disabled={!isOnline}
                        aria-label={`Move or copy ${s.name}`}
                        title={isOnline ? 'Move or copy' : 'Move and Copy need a connection'}
                        style={{ ...renameBtnStyle, opacity: isOnline ? 1 : 0.3 }}
                      >⇄</button>
                      <button onClick={() => moveSubgroup(s, 'up')} disabled={i === 0} style={{ ...iconBtnStyle, opacity: i === 0 ? 0.3 : 1 }}>↑</button>
                      <button onClick={() => moveSubgroup(s, 'down')} disabled={i === groupSubs.length - 1} style={{ ...iconBtnStyle, opacity: i === groupSubs.length - 1 ? 0.3 : 1 }}>↓</button>
                      <button onClick={() => hasItems ? toast.show('Cannot delete sub-group with items', 'error') : handleDeleteSubgroup(s)} style={{ ...iconBtnStyle, color: 'var(--red)', borderColor: 'rgba(139,32,32,0.2)', opacity: hasItems ? 0.3 : 1 }}>×</button>
                      </>)}
                    </div>
                  )
                })}
              </>
            )
          })()}
          <div style={{ borderTop: '1px solid var(--border2)', marginTop: '8px', paddingTop: '16px', display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <FormField label="New Sub-group">
                <input type="text" value={newSubName} onChange={e => setNewSubName(e.target.value)} style={inputStyle()} onKeyDown={e => { if (e.key === 'Enter') handleCreateSubgroup() }} />
              </FormField>
            </div>
            <Button variant="primary" size="sm" onClick={handleCreateSubgroup} loading={creatingSubgroup} disabled={!newSubName.trim() || creatingSubgroup || !managingGroup} style={{ marginBottom: '1px' }}>Create</Button>
          </div>
        </div>
      </ResponsiveSheet>

      <BusyOverlay open={busy !== null} message={busy?.message ?? ''} detail={busy?.detail} />

      {/* Copy to Trip Sheet */}
      <ResponsiveSheet
        open={copySheetOpen}
        onClose={() => setCopySheetOpen(false)}
        title="Copy Packing List to Trip"
        primaryAction={{
          label: 'Copy',
          onClick: handleCopyToTrip,
          loading: copying,
          disabled: !copyTargetId || copying || !isOnline,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '40px' }}>
          <FormField label="Whose list">
            <div role="group" aria-label="Whose list" style={{ display: 'flex', gap: '8px' }}>
              {(['stan', 'cathy', 'both'] as CopyPeople[]).map(p => (
                <button
                  key={p}
                  type="button"
                  aria-pressed={copyPeople === p}
                  onClick={() => setCopyPeople(p)}
                  style={{
                    flex: 1,
                    minHeight: '44px',
                    borderRadius: 'var(--r)',
                    border: `1px solid ${copyPeople === p ? 'var(--gold)' : 'var(--border2)'}`,
                    background: copyPeople === p ? 'var(--bg2)' : 'transparent',
                    color: 'var(--text)',
                    fontFamily: "'Lato', sans-serif",
                    fontSize: 'var(--fs-sm)',
                    fontWeight: copyPeople === p ? 600 : 400,
                    cursor: 'pointer',
                  }}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </FormField>

          <FormField label="Copy to" htmlFor="packing-copy-target">
            {copyTargets === null ? (
              <p style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)', color: 'var(--text3)' }}>Loading your trips…</p>
            ) : copyTargets.length === 0 ? (
              <p style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)', color: 'var(--text3)' }}>No other trips to copy to.</p>
            ) : (
              <select
                id="packing-copy-target"
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
            Categories and items are added to the chosen trip&apos;s packing list, unpacked. Categories with the same name are combined, items already there are skipped, and nothing on that trip is changed or removed.
          </p>
        </div>
      </ResponsiveSheet>

      {/* Move / Copy Sheet. Kept mounted (open toggles) like the other sheets: unmounting
          it in the same render that closes BusyOverlay runs the two scroll-lock cleanups
          out of order and leaves the page stuck at overflow: hidden. */}
      {(() => {
        if (!moveSheet) return <ResponsiveSheet open={false} onClose={() => setMoveSheet(null)} title="">{null}</ResponsiveSheet>
        const isItems = moveSheet.kind === 'items'
        const changeCount = isItems && moveGroupId ? moveItemCount() : null
        const nothingToDo = changeCount === 0
        const subject = isItems ? plural(selectedItems.length, 'item') : moveSheet.subgroup.name
        const subItemCount = isItems ? 0 : items.filter(i => i.subgroup_id === moveSheet.subgroup.id).length
        const destGroupName = groups.find(g => g.id === moveGroupId)?.name
        return (
          <ResponsiveSheet
            open
            onClose={() => setMoveSheet(null)}
            title={`${moveMode === 'move' ? 'Move' : 'Copy'} ${subject}`}
            primaryAction={{
              label: moveMode === 'move' ? 'Move' : 'Copy',
              onClick: handleMoveCopy,
              loading: bulkBusy,
              disabled: !moveGroupId || nothingToDo || bulkBusy || !isOnline,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '40px' }}>
              <FormField label="Action">
                <div role="group" aria-label="Action" style={{ display: 'flex', gap: '8px' }}>
                  {(['move', 'copy'] as MoveMode[]).map(m => (
                    <button key={m} type="button" aria-pressed={moveMode === m} onClick={() => setMoveMode(m)} style={choiceStyle(moveMode === m)}>
                      {cap(m)}
                    </button>
                  ))}
                </div>
              </FormField>

              <FormField label="To whose list">
                <div role="group" aria-label="To whose list" style={{ display: 'flex', gap: '8px' }}>
                  {(['stan', 'cathy'] as Person[]).map(p => (
                    <button key={p} type="button" aria-pressed={movePerson === p} onClick={() => chooseMovePerson(p)} style={choiceStyle(movePerson === p)}>
                      {cap(p)}
                    </button>
                  ))}
                </div>
              </FormField>

              <FormField label="Category" htmlFor="packing-move-group">
                {moveGroups.length === 0 ? (
                  <p style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)', color: 'var(--text3)' }}>
                    {cap(movePerson)} has no {isItems ? '' : 'other '}categories yet.
                  </p>
                ) : (
                  <select
                    id="packing-move-group"
                    value={moveGroupId}
                    onChange={e => { setMoveGroupId(e.target.value); setMoveSubgroupId('') }}
                    style={inputStyle()}
                  >
                    <option value="" disabled>Choose a category…</option>
                    {moveGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                )}
              </FormField>

              {isItems && moveGroupId && (
                <FormField label="Sub-group" htmlFor="packing-move-subgroup">
                  <select
                    id="packing-move-subgroup"
                    value={moveSubgroupId}
                    onChange={e => setMoveSubgroupId(e.target.value)}
                    style={inputStyle()}
                  >
                    <option value="">None (directly in the category)</option>
                    {moveSubgroups.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </FormField>
              )}

              {nothingToDo && (
                <p role="status" style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)', color: 'var(--red)' }}>
                  {selectedItems.length === 1 ? 'That item is' : 'All selected items are'} already there.
                </p>
              )}

              <p style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)', color: 'var(--text2)', lineHeight: 1.5 }}>
                {isItems
                  ? moveMode === 'move'
                    ? 'Items go to the end of the chosen place, in their current order.'
                    : 'Copies keep Owned and start unpacked. Items already there are skipped.'
                  : `Its ${plural(subItemCount, 'item')} go${subItemCount === 1 ? 'es' : ''} with it. If ${destGroupName ?? 'the category'} already has a sub-group named ${moveSheet.subgroup.name}, the two are combined and items already there are skipped${moveMode === 'copy' ? '. Copies keep Owned and start unpacked.' : '.'}`}
              </p>
              {!isOnline && (
                <p style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)', color: 'var(--text3)' }}>
                  Move and Copy need a connection.
                </p>
              )}
            </div>
          </ResponsiveSheet>
        )
      })()}
    </div>
  )
}
