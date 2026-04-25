'use client'

import { useState, useMemo, useEffect, useContext } from 'react'
import { TabNavigationContext } from '@/components/advisor/TripDetailView'
import { Plus } from 'lucide-react'
import { ResponsiveSheet } from '@/components/ui/ResponsiveSheet'
import { Button } from '@/components/ui/Button'
import { FormField, inputStyle } from '@/components/ui/FormField'
import { useToast } from '@/components/ui/Toast'

type Person = 'stan' | 'cathy'

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
        const res = await fetch(`/api/packing/${editingItem.id}`, {
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
        const res = await fetch(`/api/trips/${tripId}/packing`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, sort_order: nextSort }),
        })
        if (!res.ok) throw new Error()
        const created = await res.json()
        setItems(prev => [...prev, created])
        toast.show('Item added', 'success')
      }
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
      const res = await fetch(`/api/packing/${editingItem.id}`, { method: 'DELETE' })
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
      const res = await fetch(`/api/packing/${item.id}`, {
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
      const res = await fetch(`/api/packing/${item.id}`, {
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
    try {
      const res = await fetch(`/api/trips/${tripId}/packing-reset`, {
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
    }
  }

  // Manage Categories
  async function handleCreateCategory() {
    if (!newCatName.trim()) return
    setCreatingGroup(true)
    try {
      const nextSort = personGroups.length ? Math.max(...personGroups.map(g => g.sort_order)) + 1 : 1
      const res = await fetch(`/api/trips/${tripId}/packing-groups`, {
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

  async function moveCategory(group: PackingGroup, direction: 'up' | 'down') {
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
        fetch(`/api/packing-groups/${group.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sort_order: other.sort_order }),
        }),
        fetch(`/api/packing-groups/${other.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sort_order: group.sort_order }),
        }),
      ])
    } catch {
      toast.show('Failed to reorder categories', 'error')
    }
  }

  async function handleDeleteCategory(group: PackingGroup) {
    const res = await fetch(`/api/packing-groups/${group.id}`, { method: 'DELETE' })
    if (res.status === 409) {
      toast.show('Cannot delete a category that has items.', 'error')
      return
    }
    if (res.ok) {
      setGroups(prev => prev.filter(g => g.id !== group.id))
      toast.show('Category deleted', 'success')
    } else {
      toast.show('Failed to delete', 'error')
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
      const res = await fetch(`/api/trips/${tripId}/packing-subgroups`, {
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
        fetch(`/api/packing-subgroups/${sub.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sort_order: other.sort_order }),
        }),
        fetch(`/api/packing-subgroups/${other.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sort_order: sub.sort_order }),
        }),
      ])
    } catch {
      toast.show('Failed to reorder sub-groups', 'error')
    }
  }

  async function handleDeleteSubgroup(sub: PackingSubgroup) {
    const res = await fetch(`/api/packing-subgroups/${sub.id}`, { method: 'DELETE' })
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

  function renderItem(item: PackingItem) {
    const fullyDone = item.owned && item.packed
    return (
      <div
        key={item.id}
        className="pack-item"
        style={{ opacity: fullyDone ? 0.4 : item.packed ? 0.45 : 1 }}
        onClick={() => openEditItem(item)}
      >
        <button
          className={`pack-cb${item.owned ? ' owned' : ''}`}
          onClick={e => { e.stopPropagation(); toggleOwned(item) }}
          title="Toggle Owned"
          aria-label="Toggle owned"
        />
        <span className="pack-item-text">{item.text}</span>
        <button
          className={`pack-cb packed-cb${item.packed ? ' checked' : ''}`}
          onClick={e => { e.stopPropagation(); togglePacked(item) }}
          title="Toggle Packed"
          aria-label="Toggle packed"
        />
      </div>
    )
  }

  return (
    <div>
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: 'var(--fs-xl)', fontFamily: 'var(--font-display)', color: 'var(--navy)', fontWeight: 'var(--fw-normal)' }}>
          Packing List
        </h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Button variant="ghost" size="sm" onClick={handleResetPacked}>
            ↺ Reset Packed
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCatSheetOpen(true)}>
            Manage Categories
          </Button>
          <Button variant="primary" size="sm" onClick={openAddItem}>
            <Plus size={16} /> Add Item
          </Button>
        </div>
      </div>

      <div className="pack-tabs">
        {(['stan', 'cathy'] as Person[]).map(p => (
          <button
            key={p}
            className={`pack-tab${activePerson === p ? ' active' : ''}`}
            onClick={() => setActivePerson(p)}
          >
            🎒 {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
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

          return (
            <div key={group.id} className="pack-group">
              <div className="pack-group-header">
                <span className="pack-group-name" style={{ flex: 1 }}>{group.name}</span>
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

              {groupItems
                .filter(i => !i.subgroup_id)
                .sort((a, b) => a.sort_order - b.sort_order)
                .map(item => renderItem(item))}

              {groupSubs.map(sub => {
                const subItems = groupItems
                  .filter(i => i.subgroup_id === sub.id)
                  .sort((a, b) => a.sort_order - b.sort_order)
                return (
                  <div key={sub.id} className="pack-subgroup">
                    <div className="pack-subgroup-header">{sub.name}</div>
                    {subItems.map(item => renderItem(item))}
                  </div>
                )
              })}
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
        onClose={() => setCatSheetOpen(false)}
        title="Manage Categories"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '40px' }}>
          {personGroups.length === 0 && (
            <p style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)', color: 'var(--text3)', textAlign: 'center', padding: '24px 0' }}>
              No categories yet.
            </p>
          )}
          {personGroups.map((g, i) => {
            const hasItems = personItems.some(item => item.group_id === g.id && !item.subgroup_id)
            return (
              <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 'var(--r)', padding: '10px 14px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)', color: 'var(--text)', fontWeight: 500 }}>{g.name}</span>
                </div>
                <button onClick={() => moveCategory(g, 'up')} disabled={i === 0} style={{ ...iconBtnStyle, opacity: i === 0 ? 0.3 : 1 }}>↑</button>
                <button onClick={() => moveCategory(g, 'down')} disabled={i === personGroups.length - 1} style={{ ...iconBtnStyle, opacity: i === personGroups.length - 1 ? 0.3 : 1 }}>↓</button>
                <button 
                  onClick={() => hasItems ? toast.show('Cannot delete a category with items', 'error') : handleDeleteCategory(g)}
                  style={{ ...iconBtnStyle, color: 'var(--red)', borderColor: 'rgba(139,32,32,0.2)', opacity: hasItems ? 0.3 : 1 }}>×</button>
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
        onClose={() => setSubSheetOpen(false)}
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
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)', color: 'var(--text)', fontWeight: 500 }}>{s.name}</span>
                      </div>
                      <button onClick={() => moveSubgroup(s, 'up')} disabled={i === 0} style={{ ...iconBtnStyle, opacity: i === 0 ? 0.3 : 1 }}>↑</button>
                      <button onClick={() => moveSubgroup(s, 'down')} disabled={i === groupSubs.length - 1} style={{ ...iconBtnStyle, opacity: i === groupSubs.length - 1 ? 0.3 : 1 }}>↓</button>
                      <button onClick={() => hasItems ? toast.show('Cannot delete sub-group with items', 'error') : handleDeleteSubgroup(s)} style={{ ...iconBtnStyle, color: 'var(--red)', borderColor: 'rgba(139,32,32,0.2)', opacity: hasItems ? 0.3 : 1 }}>×</button>
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
    </div>
  )
}
