'use client'

// Selection bar, Actions sheet and bulk save runner shared by the list pages
// (docs/bulk-selection-plan.md, D3–D4). Packing and Checklist predate these
// and keep their own.

import { useState, type CSSProperties, type Dispatch, type SetStateAction } from 'react'
import { apiBulk } from '@/lib/offline/api-fetch'
import type { Collection } from '@/lib/offline/collections'
import { Button } from '@/components/ui/Button'
import { BusyOverlay } from '@/components/ui/BusyOverlay'
import { ResponsiveSheet } from '@/components/ui/ResponsiveSheet'
import { useToast } from '@/components/ui/Toast'
import type { SelectionState } from '@/components/ui/SelectionControls'
import { useSelection } from '@/hooks/useSelection'
import { useIsOnline } from '@/hooks/useOnlineStatus'
import { FormField, inputStyle } from '@/components/ui/FormField'

export interface Noun { one: string; many: string }

export function countOf(n: number, noun: Noun): string {
  return `${n} ${n === 1 ? noun.one : noun.many}`
}

// ─── Select / Done ───────────────────────────────────────────────────────────

export function SelectButton({ selectMode, onEnter, onExit, disabled }: {
  selectMode: boolean; onEnter: () => void; onExit: () => void; disabled?: boolean
}) {
  return (
    <Button variant={selectMode ? 'secondary' : 'ghost'} size="sm" onClick={selectMode ? onExit : onEnter} disabled={disabled}>
      {selectMode ? 'Done' : 'Select'}
    </Button>
  )
}

// ─── Pinned bar: Select All, count, Actions… ─────────────────────────────────

export function SelectionBar({ allState, onToggleAll, onClear, count, noun, onActions, busy }: {
  allState: SelectionState
  onToggleAll: () => void
  // Deselects everything; shown when some (not all) are selected.
  onClear: () => void
  count: number
  noun: Noun
  onActions: () => void
  busy?: boolean
}) {
  return (
    <div role="toolbar" aria-label={`Selected ${noun.many}`} className="select-bar">
      <Button variant="ghost" size="sm" onClick={onToggleAll} disabled={busy}>
        {allState === 'all' ? 'Deselect All' : 'Select All'}
      </Button>
      <span aria-live="polite" style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)', color: 'var(--text2)', flex: 1, textAlign: 'center', padding: '0 16px', whiteSpace: 'nowrap' }}>
        {count} selected
      </span>
      {allState === 'some' && count > 0 && (
        <Button variant="ghost" size="sm" onClick={onClear} disabled={busy} aria-label="Clear selection">
          Clear
        </Button>
      )}
      <Button variant="primary" size="sm" onClick={onActions} disabled={busy || count === 0}>
        Actions…
      </Button>
    </div>
  )
}

// ─── Actions sheet ───────────────────────────────────────────────────────────

export interface BulkAction {
  label: string
  onClick: () => void
  disabled?: boolean
  // Shown under the button, e.g. why it's disabled.
  note?: string
  // Asks first ("Delete 4 flights?"), inside the sheet.
  confirm?: string
  danger?: boolean
}

// Kept mounted (open toggles): unmounting a sheet in the same render that
// closes BusyOverlay leaves the page scroll-locked (Knowledge b70fda2f).
export function BulkActionsSheet({ open, onClose, title, actions }: {
  open: boolean; onClose: () => void; title: string; actions: BulkAction[]
}) {
  const [confirming, setConfirming] = useState<BulkAction | null>(null)
  const close = () => { setConfirming(null); onClose() }

  return (
    <ResponsiveSheet open={open} onClose={close} title={title}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingBottom: '40px' }}>
        {confirming ? (
          <>
            <p style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-md)', color: 'var(--text)', fontWeight: 600, margin: '4px 0 8px' }}>
              {confirming.confirm}
            </p>
            <Button variant="danger" onClick={() => { const a = confirming; setConfirming(null); a.onClick() }} style={{ width: '100%', minHeight: '44px' }}>
              {confirming.label.replace(/…$/, '')}
            </Button>
            <Button variant="secondary" onClick={() => setConfirming(null)} style={{ width: '100%', minHeight: '44px' }}>
              Cancel
            </Button>
          </>
        ) : actions.map((a) => (
          <div key={a.label}>
            <Button
              variant={a.danger ? 'danger' : 'secondary'}
              onClick={() => (a.confirm ? setConfirming(a) : a.onClick())}
              disabled={a.disabled}
              style={{ width: '100%', minHeight: '44px', justifyContent: 'flex-start' }}
            >
              {a.label}
            </Button>
            {a.note && (
              <p style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)', color: 'var(--text2)', margin: '4px 4px 0' }}>{a.note}</p>
            )}
          </div>
        ))}
      </div>
    </ResponsiveSheet>
  )
}

// ─── Running a bulk change ───────────────────────────────────────────────────

// Optimistic: the list changes at once and failed records are put back.
export function useBulkRunner<T extends { id: string }>({ collection, tripId, section, itemUrl, setRecords, noun }: {
  collection: Collection
  tripId: string
  section: string
  itemUrl: (id: string) => string
  setRecords: Dispatch<SetStateAction<T[]>>
  noun: Noun
}) {
  const toast = useToast()
  const [busy, setBusy] = useState<{ message: string; detail?: string } | null>(null)
  const bulkUrl = `/api/trips/${tripId}/bulk/${section}`

  async function update(targets: T[], fields: Partial<T>, done: string, skipped?: string) {
    if (targets.length === 0) {
      toast.show(skipped ?? `Nothing to change: already ${done}`, 'neutral')
      return
    }
    const before = new Map(targets.map((r) => [r.id, r]))
    const message = `Updating ${countOf(targets.length, noun)}…`
    setBusy({ message })
    setRecords((prev) => prev.map((r) => (before.has(r.id) ? { ...r, ...fields } : r)))
    const failed = await apiBulk({
      collection, tripId, bulkUrl, itemUrl, action: 'update',
      ids: [...before.keys()],
      fields: fields as Record<string, unknown>,
      onProgress: (n, total) => setBusy({ message, detail: `${n} of ${total}` }),
    })
    setBusy(null)
    window.dispatchEvent(new CustomEvent('gcal:dirty'))
    if (failed.length) {
      const failedIds = new Set(failed)
      setRecords((prev) => prev.map((r) => (failedIds.has(r.id) ? before.get(r.id) ?? r : r)))
      toast.show(`${failed.length} of ${countOf(targets.length, noun)} couldn’t be saved`, 'error')
    } else {
      toast.show(`${countOf(targets.length, noun)} ${done}${skipped ? `; ${skipped}` : ''}`, 'success')
    }
  }

  async function remove(targets: T[]) {
    if (targets.length === 0) return
    const message = `Deleting ${countOf(targets.length, noun)}…`
    setBusy({ message })
    const failed = await apiBulk({
      collection, tripId, bulkUrl, itemUrl, action: 'delete',
      ids: targets.map((r) => r.id),
      onProgress: (n, total) => setBusy({ message, detail: `${n} of ${total}` }),
    })
    setBusy(null)
    const failedIds = new Set(failed)
    setRecords((prev) => prev.filter((r) => failedIds.has(r.id) || !targets.some((t) => t.id === r.id)))
    window.dispatchEvent(new CustomEvent('gcal:dirty'))
    if (failed.length) toast.show(`${failed.length} of ${countOf(targets.length, noun)} couldn’t be deleted`, 'error')
    else toast.show(`${countOf(targets.length, noun)} deleted`, 'success')
  }

  const overlay = <BusyOverlay open={busy !== null} message={busy?.message ?? ''} detail={busy?.detail} />
  return { busy: busy !== null, update, remove, overlay }
}

// ─── Check mark for rows that are themselves buttons ─────────────────────────

// A real checkbox can't sit inside a <button>, so rows that are buttons show
// this mark and carry aria-pressed instead. Same 44pt footprint as SelectBox.
export function SelectMark({ checked }: { checked: boolean }) {
  return (
    <span aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px', flexShrink: 0, margin: '-10px 0 -10px -10px' }}>
      <span style={{
        width: '24px', height: '24px', borderRadius: '4px',
        border: `2px solid ${checked ? 'var(--gold)' : 'var(--border2)'}`,
        background: checked ? 'var(--gold)' : 'var(--bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {checked && (
          <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
    </span>
  )
}

// Style for a selected row (tint + gold outline).
export function selectedRowStyle(selected: boolean): CSSProperties {
  return selected ? { background: 'var(--bg3)', outline: '2px solid var(--gold)', outlineOffset: '-2px' } : {}
}

// ─── Everything a list page needs ────────────────────────────────────────────

type FlagKey = 'action_required' | 'show_in_itinerary' | 'gcal_include' | 'show_in_overview'

// The standard on/off actions, Delete, and any extra actions (Move…) for one
// page. calendarReady says which records can go on Google Calendar.
export function useListBulk<T extends { id: string }>({ records, setRecords, tripId, section, collection, itemUrl, noun, flags, calendarReady, calendarNeeds, extraActions, copySection }: {
  records: T[]
  setRecords: Dispatch<SetStateAction<T[]>>
  tripId: string
  section: string
  collection: Collection
  itemUrl: (id: string) => string
  noun: Noun
  flags: FlagKey[]
  calendarReady?: (r: T) => boolean
  // e.g. 'a date' — used in "1 skipped — needs a date".
  calendarNeeds?: string
  extraActions?: (act: (run: (selected: T[]) => Promise<void>) => void) => BulkAction[]
  // Section name for Copy to Trip (/api/trips/[id]/copy-records).
  copySection?: string
}) {
  const selection = useSelection(records)
  const copy = useCopyToTrip({ tripId, section: copySection ?? section, noun })
  const [actionsOpen, setActionsOpen] = useState(false)
  const bulk = useBulkRunner<T>({ collection, tripId, section, itemUrl, setRecords, noun })

  // Runs after the sheet closes (it stays mounted), so BusyOverlay never sits over it.
  function act(run: (selected: T[]) => Promise<void>) {
    const selected = selection.selected
    setActionsOpen(false)
    void run(selected)
  }

  function setFlag(key: FlagKey, value: boolean, done: string) {
    act(async (selected) => {
      const field = (r: T) => (r as unknown as Record<string, unknown>)[key] ?? false
      let targets = selected.filter((r) => field(r) !== value)
      let skipped: string | undefined
      if (key === 'gcal_include' && value && calendarReady) {
        const ready = targets.filter(calendarReady)
        if (ready.length < targets.length) skipped = `${targets.length - ready.length} skipped — needs ${calendarNeeds ?? 'a date'}`
        targets = ready
      }
      await bulk.update(targets, { [key]: value } as Partial<T>, done, skipped)
    })
  }

  const count = selection.selected.length
  const actions: BulkAction[] = []
  if (flags.includes('action_required')) actions.push(
    { label: 'Mark Attention Required', onClick: () => setFlag('action_required', true, 'marked Attention Required') },
    { label: 'Clear Attention Required', onClick: () => setFlag('action_required', false, 'cleared of Attention Required') },
  )
  if (flags.includes('show_in_itinerary')) actions.push(
    { label: 'Show in Itinerary', onClick: () => setFlag('show_in_itinerary', true, 'shown in the Itinerary') },
    { label: 'Remove from Itinerary', onClick: () => setFlag('show_in_itinerary', false, 'removed from the Itinerary') },
  )
  if (flags.includes('show_in_overview')) actions.push(
    { label: 'Show in Overview', onClick: () => setFlag('show_in_overview', true, 'shown in the Overview') },
    { label: 'Remove from Overview', onClick: () => setFlag('show_in_overview', false, 'removed from the Overview') },
  )
  if (flags.includes('gcal_include')) actions.push(
    { label: 'Add to Google Calendar', onClick: () => setFlag('gcal_include', true, 'set to sync with Google Calendar'), note: calendarNeeds ? `${noun.many[0].toUpperCase()}${noun.many.slice(1)} without ${calendarNeeds} are skipped.` : undefined },
    { label: 'Remove from Google Calendar', onClick: () => setFlag('gcal_include', false, 'set to leave Google Calendar') },
  )
  actions.push(...(extraActions?.(act) ?? []))
  actions.push(copy.action((run) => act(run)))
  actions.push({
    label: 'Delete…', danger: true,
    confirm: `Delete ${countOf(count, noun)}?${flags.includes('gcal_include') ? ' Their Google Calendar events are removed at the next sync.' : ''}`,
    onClick: () => act(async (selected) => { await bulk.remove(selected) }),
  })

  const bar = selection.selectMode ? (
    <SelectionBar
      allState={selection.stateOf(records)}
      onToggleAll={() => selection.toggle(records)}
      onClear={selection.clear}
      count={count}
      noun={noun}
      onActions={() => setActionsOpen(true)}
      busy={bulk.busy}
    />
  ) : null

  const selectButton = (
    <SelectButton selectMode={selection.selectMode} onEnter={selection.enter} onExit={selection.exit} disabled={bulk.busy || records.length === 0} />
  )

  // The Actions sheet and progress overlay; render once per page.
  const overlays = (
    <>
      <BulkActionsSheet open={actionsOpen} onClose={() => setActionsOpen(false)} title={`${countOf(count, noun)} selected`} actions={actions} />
      {copy.sheet}
      {bulk.overlay}
    </>
  )

  return { selection, bulk, bar, selectButton, overlays, act }
}

// ─── Copy to Trip (docs/bulk-selection-plan.md, D5) ──────────────────────────

interface CopyTarget { id: string; title: string; destination: string | null }

// The sheet that picks the trip, and the copy itself. Online only: it writes
// into another trip in one transaction (copy_records).
export function useCopyToTrip({ tripId, section, noun }: { tripId: string; section: string; noun: Noun }) {
  const toast = useToast()
  const isOnline = useIsOnline()
  const [open, setOpen] = useState(false)
  const [ids, setIds] = useState<string[]>([])
  const [targets, setTargets] = useState<CopyTarget[] | null>(null)
  const [targetId, setTargetId] = useState('')
  const [busy, setBusy] = useState(false)

  async function start(selectedIds: string[]) {
    setIds(selectedIds)
    setTargetId('')
    setTargets(null)
    setOpen(true)
    try {
      const res = await fetch(`/api/trips/${tripId}/copy-targets`)
      setTargets(res.ok ? await res.json() : [])
    } catch {
      setTargets([])
    }
  }

  async function run() {
    const target = targets?.find((t) => t.id === targetId)
    if (!target) return
    setOpen(false)
    setBusy(true)
    try {
      const res = await fetch(`/api/trips/${tripId}/copy-records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section, ids, targetTripId: target.id }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.show(json.error ?? 'Couldn’t copy. Nothing was copied.', 'error')
        return
      }
      const { copied = 0, skipped = 0, days = 0 } = json as { copied?: number; skipped?: number; days?: number }
      const parts = [`${countOf(copied, noun)} copied to ${target.title}`]
      if (skipped) parts.push(`${skipped} already there`)
      if (days) parts.push(`${days} itinerary ${days === 1 ? 'day' : 'days'} added`)
      toast.show(parts.join('; '), copied ? 'success' : 'neutral')
    } catch {
      toast.show('Couldn’t copy (no connection?). Nothing was copied.', 'error')
    } finally {
      setBusy(false)
    }
  }

  // An entry for the Actions sheet; `act` closes that sheet first.
  function action<T extends { id: string }>(act: (run: (selected: T[]) => Promise<void>) => void): BulkAction {
    return {
      label: 'Copy to Trip…',
      disabled: !isOnline,
      note: isOnline ? undefined : 'Copy to Trip needs a connection.',
      onClick: () => act(async (selected) => { await start(selected.map((r) => r.id)) }),
    }
  }

  // Kept mounted (open toggles), like the other sheets.
  const sheet = (
    <>
      <ResponsiveSheet
        open={open}
        onClose={() => setOpen(false)}
        title={`Copy ${countOf(ids.length, noun)} to Trip`}
        primaryAction={{ label: 'Copy', onClick: run, disabled: !targetId || busy || !isOnline }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '40px' }}>
          <FormField label="Copy to">
            {targets === null ? (
              <p style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)', color: 'var(--text3)' }}>Loading your trips…</p>
            ) : targets.length === 0 ? (
              <p style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)', color: 'var(--text3)' }}>You have no other trips to copy to.</p>
            ) : (
              <select value={targetId} onChange={(e) => setTargetId(e.target.value)} style={{ ...inputStyle(), cursor: 'pointer' }}>
                <option value="" disabled>Choose a trip…</option>
                {targets.map((t) => <option key={t.id} value={t.id}>{t.title}{t.destination ? ` — ${t.destination}` : ''}</option>)}
              </select>
            )}
          </FormField>
          <p style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)', color: 'var(--text2)', lineHeight: 1.5 }}>
            Copies keep their details. Google Calendar is off on the copies, and anything the other trip already has is skipped.
          </p>
          {!isOnline && (
            <p role="status" style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)', color: 'var(--red)' }}>Copy to Trip needs a connection.</p>
          )}
        </div>
      </ResponsiveSheet>
      <BusyOverlay open={busy} message={`Copying ${countOf(ids.length, noun)}…`} />
    </>
  )

  return { start, action, sheet, busy }
}
