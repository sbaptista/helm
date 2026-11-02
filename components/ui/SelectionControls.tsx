'use client'

// Heading controls shared by Packing and Checklist.

export type SelectionState = 'none' | 'some' | 'all'

export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

// ▾ / ▸ on a group heading (docs/packing-collapse-plan.md).
export function ShowHideButton({ hidden, name, onToggle }: { hidden: boolean; name: string; onToggle: () => void }) {
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

// Multi-select checkbox (docs/packing-multi-select-plan.md): 44pt hit target,
// dash when only some of its items are selected.
export function SelectBox({ state, onToggle, label }: { state: SelectionState; onToggle: () => void; label: string }) {
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
