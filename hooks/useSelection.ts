'use client'

import { useCallback, useMemo, useState } from 'react'
import type { SelectionState } from '@/components/ui/SelectionControls'

// Selection mode for a list page (docs/bulk-selection-plan.md, D3–D4).
// `selected` is read from the current records, so ids of records that have
// gone (deleted, refreshed) never count.
export function useSelection<T extends { id: string }>(records: T[]) {
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const selected = useMemo(() => records.filter((r) => selectedIds.has(r.id)), [records, selectedIds])

  const enter = useCallback(() => { setSelectedIds(new Set()); setSelectMode(true) }, [])
  const exit = useCallback(() => { setSelectedIds(new Set()); setSelectMode(false) }, [])

  const stateOf = useCallback((list: T[]): SelectionState => {
    const count = list.filter((r) => selectedIds.has(r.id)).length
    if (count === 0) return 'none'
    return count === list.length ? 'all' : 'some'
  }, [selectedIds])

  // Selects all of list, or deselects it when it's already fully selected.
  const toggle = useCallback((list: T[]) => {
    setSelectedIds((prev) => {
      const select = list.some((r) => !prev.has(r.id))
      const next = new Set(prev)
      list.forEach((r) => { if (select) next.add(r.id); else next.delete(r.id) })
      return next
    })
  }, [])

  const clear = useCallback(() => setSelectedIds(new Set()), [])

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds])

  return { selectMode, selected, enter, exit, stateOf, toggle, clear, isSelected }
}
