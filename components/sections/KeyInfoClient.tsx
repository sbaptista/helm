'use client'

import { useState, useMemo, useCallback, useEffect, useContext } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { ResponsiveSheet } from '@/components/ui/ResponsiveSheet'
import { Button } from '@/components/ui/Button'
import { FormField, inputStyle } from '@/components/ui/FormField'
import { useToast } from '@/components/ui/Toast'
import { TabNavigationContext } from '@/components/advisor/TripDetailView'

export interface KeyInfoGroup {
  id: string
  trip_id: string
  name: string
  sort_order: number
}

export interface KeyInfoItem {
  id: string
  trip_id: string
  group_id: string | null
  label: string
  value: string
  url: string | null
  url_label: string | null
  show_in_overview: boolean
  action_required: boolean
  action_note: string | null
  sort_order: number
}

interface Props {
  initialItems: KeyInfoItem[]
  initialGroups: KeyInfoGroup[]
  tripId: string
}

export function KeyInfoClient({ initialItems, initialGroups, tripId }: Props) {
  const [items, setItems] = useState<KeyInfoItem[]>(initialItems)
  const [groups, setGroups] = useState<KeyInfoGroup[]>(initialGroups)

  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const toast = useToast()
  const router = useRouter()
  const { pendingItemId, clearPendingItem } = useContext(TabNavigationContext)
  const [highlightedId, setHighlightedId] = useState<string | null>(null)

  useEffect(() => {
    if (!pendingItemId) return
    const hasItem = items.some(i => i.id === pendingItemId)
    if (!hasItem) return
    clearPendingItem()
    setHighlightedId(pendingItemId)
    setTimeout(() => {
      const el = document.getElementById(`item-${pendingItemId}`)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 80)
    setTimeout(() => setHighlightedId(null), 1500)
  }, [pendingItemId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Item BottomSheet
  const [itemSheetOpen, setItemSheetOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<KeyInfoItem | null>(null)
  
  const [itemLabel, setItemLabel] = useState('')
  const [itemGroupId, setItemGroupId] = useState('')
  const [itemValue, setItemValue] = useState('')
  const [itemUrl, setItemUrl] = useState('')
  const [itemUrlLabel, setItemUrlLabel] = useState('')
  const [itemShowInOverview, setItemShowInOverview] = useState(false)
  const [itemActionRequired, setItemActionRequired] = useState(false)
  const [itemActionNote, setItemActionNote] = useState('')

  // Manage Groups BottomSheet
  const [groupSheetOpen, setGroupSheetOpen] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [creatingGroup, setCreatingGroup] = useState(false)

  const sortedGroups = useMemo(() => 
    [...groups].sort((a, b) => a.sort_order - b.sort_order),
    [groups]
  )

  const groupedItems = useMemo(() => {
    const map = new Map<string | null, KeyInfoItem[]>()
    for (const item of items) {
      const gid = item.group_id
      if (!map.has(gid)) map.set(gid, [])
      map.get(gid)!.push(item)
    }
    return map
  }, [items])

  const refetchAll = useCallback(async () => {
    const [iRes, gRes] = await Promise.all([
      fetch(`/api/trips/${tripId}/key-info`),
      fetch(`/api/trips/${tripId}/key-info-groups`)
    ])
    if (iRes.ok) setItems(await iRes.json())
    if (gRes.ok) setGroups(await gRes.json())
  }, [tripId])

  function openAddItem() {
    setEditingItem(null)
    setConfirmDelete(false)
    setItemLabel('')
    setItemGroupId(sortedGroups[0]?.id ?? '')
    setItemValue('')
    setItemUrl('')
    setItemUrlLabel('')
    setItemShowInOverview(false)
    setItemActionRequired(false)
    setItemActionNote('')
    setItemSheetOpen(true)
  }

  function openEditItem(item: KeyInfoItem) {
    setEditingItem(item)
    setConfirmDelete(false)
    setItemLabel(item.label)
    setItemGroupId(item.group_id ?? '')
    setItemValue(item.value ?? '')
    setItemUrl(item.url ?? '')
    setItemUrlLabel(item.url_label ?? '')
    setItemShowInOverview(item.show_in_overview)
    setItemActionRequired(item.action_required)
    setItemActionNote(item.action_note ?? '')
    setItemSheetOpen(true)
  }

  function closeItemSheet() {
    setItemSheetOpen(false)
    setEditingItem(null)
    setConfirmDelete(false)
  }

  async function handleSaveItem() {
    if (!itemLabel.trim()) {
      toast.show('Label is required.', 'error')
      return
    }
    setSaving(true)
    try {
      const payload = {
        label: itemLabel.trim(),
        group_id: itemGroupId || null,
        value: itemValue.trim() || null,
        url: itemUrl.trim() || null,
        url_label: itemUrlLabel.trim() || null,
        show_in_overview: itemShowInOverview,
        action_required: itemActionRequired,
        action_note: itemActionNote.trim() || null,
      }
      
      if (editingItem) {
        const res = await fetch(`/api/key-info/${editingItem.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error()
        toast.show('Item updated', 'success')
      } else {
        // Calculate next sort_order for the group
        const groupItems = groupedItems.get(itemGroupId || null) ?? []
        const nextSort = groupItems.length ? Math.max(...groupItems.map(i => i.sort_order)) + 1 : 1
        const res = await fetch(`/api/trips/${tripId}/key-info`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, sort_order: nextSort }),
        })
        if (!res.ok) throw new Error()
        toast.show('Item added', 'success')
      }
      await refetchAll()
      router.refresh()
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
      const res = await fetch(`/api/key-info/${editingItem.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.show('Item removed', 'success')
      await refetchAll()
      closeItemSheet()
    } catch {
      toast.show('Something went wrong. Please try again.', 'error')
    } finally {
      setDeleting(false)
    }
  }

  // Manage Groups
  async function handleCreateGroup() {
    if (!newGroupName.trim()) return
    setCreatingGroup(true)
    try {
      const nextSort = groups.length ? Math.max(...groups.map(g => g.sort_order)) + 1 : 1
      const res = await fetch(`/api/trips/${tripId}/key-info-groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newGroupName.trim(), sort_order: nextSort }),
      })
      if (!res.ok) throw new Error()
      setNewGroupName('')
      toast.show('Group created', 'success')
      await refetchAll()
    } catch {
      toast.show('Failed to create group', 'error')
    } finally {
      setCreatingGroup(false)
    }
  }

  async function moveGroup(group: KeyInfoGroup, direction: 'up' | 'down') {
    const idx = sortedGroups.findIndex(g => g.id === group.id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sortedGroups.length) return
    const other = sortedGroups[swapIdx]
    
    try {
      await Promise.all([
        fetch(`/api/key-info-groups/${group.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sort_order: other.sort_order }),
        }),
        fetch(`/api/key-info-groups/${other.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sort_order: group.sort_order }),
        }),
      ])
      await refetchAll()
    } catch {
      toast.show('Failed to reorder groups', 'error')
    }
  }

  async function handleDeleteGroup(group: KeyInfoGroup) {
    const res = await fetch(`/api/key-info-groups/${group.id}`, { method: 'DELETE' })
    if (res.status === 409) {
      toast.show('Cannot delete a group that has items.', 'error')
      return
    }
    if (res.ok) {
      toast.show('Group deleted', 'success')
      await refetchAll()
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

  function renderItem(item: KeyInfoItem) {
    return (
      <div
        key={item.id}
        id={`item-${item.id}`}
        className={`key-info-item${highlightedId === item.id ? ' item-highlight' : ''}`}
        onClick={() => openEditItem(item)}
      >
        <div className="key-info-item-header">
          <span className="key-info-label">{item.label}</span>
          {item.show_in_overview && <span className="badge-show-in-overview">IN OVERVIEW</span>}
          {item.action_required && <span className="badge-action-required">ATTENTION REQUIRED</span>}
        </div>
        <div className="key-info-value line-clamp-3">{item.value}</div>
        {item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="key-info-link"
          >
            {item.url_label || item.url}
          </a>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: 'var(--fs-xl)', fontFamily: 'var(--font-display)', color: 'var(--navy)', fontWeight: 'var(--fw-normal)' }}>
          Key Info
        </h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Button variant="ghost" size="sm" onClick={() => setGroupSheetOpen(true)}>
            Manage Groups
          </Button>
          <Button variant="primary" size="sm" onClick={openAddItem}>
            <Plus size={16} /> Add Item
          </Button>
        </div>
      </div>

      <div className="key-info-list">
        {sortedGroups.map(group => {
          const itemsArr = (groupedItems.get(group.id) ?? []).sort((a, b) => a.sort_order - b.sort_order)
          if (itemsArr.length === 0) return null
          return (
            <div key={group.id} className="key-info-group">
              <div className="key-info-group-header">{group.name}</div>
              {itemsArr.map(item => renderItem(item))}
            </div>
          )
        })}

        {/* Uncategorized */}
        {(() => {
          const itemsArr = (groupedItems.get(null) ?? []).sort((a, b) => a.sort_order - b.sort_order)
          if (itemsArr.length === 0) return null
          return (
            <div className="key-info-group">
              <div className="key-info-group-header">Uncategorized</div>
              {itemsArr.map(item => renderItem(item))}
            </div>
          )
        })()}
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
          <FormField label="Label" required>
            <input
              type="text"
              value={itemLabel}
              onChange={e => setItemLabel(e.target.value)}
              placeholder="e.g. WiFi Password"
              style={inputStyle()}
            />
          </FormField>

          <FormField label="Group">
            <select
              value={itemGroupId}
              onChange={e => setItemGroupId(e.target.value)}
              style={{ ...inputStyle(), cursor: 'pointer' }}
            >
              <option value="">Uncategorized</option>
              {sortedGroups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Value">
            <textarea
              value={itemValue}
              onChange={e => setItemValue(e.target.value)}
              placeholder="Detailed information..."
              rows={4}
              style={{ ...inputStyle(), resize: 'vertical' }}
            />
          </FormField>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <FormField label="URL">
              <input
                type="text"
                value={itemUrl}
                onChange={e => setItemUrl(e.target.value)}
                placeholder="https://..."
                style={inputStyle()}
              />
            </FormField>
            <FormField label="URL Label">
              <input
                type="text"
                value={itemUrlLabel}
                onChange={e => setItemUrlLabel(e.target.value)}
                placeholder="Visit Website"
                style={inputStyle()}
              />
            </FormField>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', minHeight: '44px' }}>
            <input
              type="checkbox"
              checked={itemShowInOverview}
              onChange={e => setItemShowInOverview(e.target.checked)}
              style={{ width: '20px', height: '20px', accentColor: 'var(--gold)', cursor: 'pointer', flexShrink: 0 }}
            />
            <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text)', fontWeight: 500 }}>Show in Overview</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', minHeight: '44px' }}>
            <input
              type="checkbox"
              checked={itemActionRequired}
              onChange={e => setItemActionRequired(e.target.checked)}
              style={{ width: '20px', height: '20px', accentColor: 'var(--gold)', cursor: 'pointer', flexShrink: 0 }}
            />
            <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text)', fontWeight: 500 }}>Attention Required</span>
          </label>

          {itemActionRequired && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-bold)', color: 'var(--text2)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Attention Note
              </span>
              <textarea
                value={itemActionNote}
                onChange={e => setItemActionNote(e.target.value)}
                placeholder="Describe what needs attention and by when…"
                rows={3}
                style={{ ...inputStyle(), resize: 'vertical' }}
              />
            </div>
          )}

          {editingItem && (
            confirmDelete ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--red)', textAlign: 'center', margin: 0 }}>Remove this item?</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(false)} style={{ flex: 1 }}>Cancel</Button>
                  <Button variant="primary" size="sm" onClick={handleDeleteItem} disabled={deleting} loading={deleting}
                    style={{ flex: 1, background: 'var(--red)', borderColor: 'var(--red)' }}>Remove</Button>
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

      {/* Manage Groups Sheet */}
      <ResponsiveSheet
        open={groupSheetOpen}
        onClose={() => setGroupSheetOpen(false)}
        title="Manage Groups"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '40px' }}>
          {sortedGroups.length === 0 && (
            <p style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)', color: 'var(--text3)', textAlign: 'center', padding: '24px 0' }}>
              No groups yet.
            </p>
          )}
          {sortedGroups.map((g, i) => {
            const hasItems = groupedItems.has(g.id)
            return (
              <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 'var(--r)', padding: '10px 14px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)', color: 'var(--text)', fontWeight: 500 }}>{g.name}</span>
                </div>
                <button onClick={() => moveGroup(g, 'up')} disabled={i === 0} style={{ ...iconBtnStyle, opacity: i === 0 ? 0.3 : 1 }}>↑</button>
                <button onClick={() => moveGroup(g, 'down')} disabled={i === sortedGroups.length - 1} style={{ ...iconBtnStyle, opacity: i === sortedGroups.length - 1 ? 0.3 : 1 }}>↓</button>
                <button 
                  onClick={() => hasItems ? toast.show('Cannot delete a group with items', 'error') : handleDeleteGroup(g)}
                  style={{ ...iconBtnStyle, color: 'var(--red)', borderColor: 'rgba(139,32,32,0.2)', opacity: hasItems ? 0.3 : 1 }}>×</button>
              </div>
            )
          })}
          <div style={{ borderTop: '1px solid var(--border2)', marginTop: '8px', paddingTop: '16px', display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <FormField label="New Group">
                <input type="text" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} style={inputStyle()} onKeyDown={e => { if (e.key === 'Enter') handleCreateGroup() }} />
              </FormField>
            </div>
            <Button variant="primary" size="sm" onClick={handleCreateGroup} loading={creatingGroup} disabled={!newGroupName.trim() || creatingGroup} style={{ marginBottom: '1px' }}>Create</Button>
          </div>
        </div>
      </ResponsiveSheet>
    </div>
  )
}
