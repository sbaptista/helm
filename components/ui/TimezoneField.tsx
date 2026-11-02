'use client'

// A record's timezone, looked up from its place (docs/timezone-lookup-plan.md).
// Shows the result as a line; Change… opens a searchable list of every
// timezone. The lookup runs when the place changes, or when the record has
// no timezone yet, unless the person chose one in this form.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useIsOnline } from '@/hooks/useOnlineStatus'
import { allTimezones, timezoneLabel } from '@/lib/timezone-names'

export interface TimezoneFound {
  timezone: string
  city: string | null
}

type Props = {
  label?: string
  value: string
  onChange: (timezone: string) => void
  // The place text, from lib/geo/place-query.ts. Empty means nothing to look up.
  query: string
  // A date in the record, so the abbreviation is right for daylight saving.
  date?: string
  // Timezones already used in this trip, listed first in Change….
  suggested?: string[]
  onFound?: (found: TimezoneFound) => void
  error?: string
  // Shown for an empty value that is allowed, e.g. "Same as start".
  emptyLabel?: string
  disabled?: boolean
}

const LOOKUP_DELAY_MS = 1200
const MAX_SHOWN = 60

const buttonStyle: React.CSSProperties = {
  minHeight: '44px',
  padding: '0 14px',
  background: 'var(--bg2)',
  border: '1px solid var(--bg3)',
  borderRadius: '8px',
  color: 'var(--text)',
  fontSize: 'var(--fs-sm)',
  fontWeight: 'var(--fw-bold)' as React.CSSProperties['fontWeight'],
  cursor: 'pointer',
}

export function TimezoneField({ label = 'Timezone', value, onChange, query, date, suggested = [], onFound, error, emptyLabel, disabled = false }: Props) {
  const isOnline = useIsOnline()
  const [status, setStatus] = useState<'idle' | 'looking' | 'not-found' | 'failed'>('idle')
  const [message, setMessage] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [search, setSearch] = useState('')
  // A timezone the person picked in this form is never replaced by a lookup.
  const chosen = useRef(false)
  // The place the current value belongs to: no lookup until the place changes,
  // unless there is no timezone yet.
  const lookedUpFor = useRef(value ? query : '')
  const latest = useRef({ onChange, onFound })
  latest.current = { onChange, onFound }

  async function runLookup(text: string) {
    setStatus('looking')
    try {
      const res = await fetch('/api/timezone/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text }),
      })
      const json = await res.json()
      lookedUpFor.current = text
      if (json.ok) {
        setStatus('idle')
        latest.current.onChange(json.timezone)
        latest.current.onFound?.({ timezone: json.timezone, city: json.city ?? null })
      } else {
        setStatus(json.reason === 'not-found' ? 'not-found' : 'failed')
        setMessage(json.message ?? json.error ?? 'Lookup failed.')
      }
    } catch {
      setStatus('failed')
      setMessage('Lookup failed. The timezone is looked up again when you save.')
    }
  }

  useEffect(() => {
    if (chosen.current || disabled || !isOnline || !query) return
    if (value && query === lookedUpFor.current) return
    const timer = setTimeout(() => { void runLookup(query) }, LOOKUP_DELAY_MS)
    return () => clearTimeout(timer)
    // value is read to skip a lookup, not to trigger one
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, isOnline, disabled])

  const when = date ? new Date(`${date}T12:00:00`) : new Date()
  const zones = useMemo(() => allTimezones(), [])
  const shown = useMemo(() => {
    const term = search.trim().toLowerCase()
    const first = [...new Set(suggested.filter(Boolean))]
    const rest = zones.filter(z => !first.includes(z))
    const all = [...first, ...rest]
    if (!term) return all.slice(0, MAX_SHOWN)
    return all
      .filter(z => z.toLowerCase().replace(/_/g, ' ').includes(term) || timezoneLabel(z, when).toLowerCase().includes(term))
      .slice(0, MAX_SHOWN)
    // when only changes the abbreviation shown
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, zones, suggested])

  function choose(zone: string) {
    chosen.current = true
    setStatus('idle')
    setPickerOpen(false)
    setSearch('')
    onChange(zone)
  }

  let line: React.ReactNode
  if (status === 'looking') line = <span style={{ color: 'var(--text3)' }}>Looking up…</span>
  else if (value) line = <span>{timezoneLabel(value, when)}</span>
  else if (emptyLabel) line = <span>{emptyLabel}</span>
  else line = <span style={{ color: 'var(--red)', fontWeight: 'var(--fw-bold)' as React.CSSProperties['fontWeight'] }}>Timezone needed</span>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text2)' }}>
          {label}: {line}
        </span>
        <div style={{ display: disabled ? 'none' : 'flex', gap: '8px', marginLeft: 'auto' }}>
          {emptyLabel && value && (
            <button type="button" style={buttonStyle} onClick={() => { chosen.current = true; onChange('') }}>
              {emptyLabel}
            </button>
          )}
          {query && (
            <button
              type="button"
              style={{ ...buttonStyle, opacity: isOnline ? 1 : 0.5 }}
              disabled={!isOnline || status === 'looking'}
              title={isOnline ? 'Look up the timezone from the place' : 'Looking up needs a connection'}
              onClick={() => { chosen.current = false; void runLookup(query) }}
            >
              Look up
            </button>
          )}
          <button type="button" style={buttonStyle} aria-expanded={pickerOpen} onClick={() => setPickerOpen(v => !v)}>
            {pickerOpen ? 'Cancel' : 'Change…'}
          </button>
        </div>
      </div>

      {status === 'not-found' && <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text2)' }}>{message} Check the place, or choose with Change….</span>}
      {status === 'failed' && <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--red)' }}>{message}</span>}
      {!value && !query && !emptyLabel && status === 'idle' && (
        <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text2)' }}>Enter the place to look it up, or choose with Change….</span>
      )}
      {error && <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--red)' }}>{error}</span>}

      {pickerOpen && !disabled && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', border: '1px solid var(--bg3)', borderRadius: '8px', padding: '8px' }}>
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by city or name, e.g. Tokyo or Eastern"
            aria-label="Search timezones"
            style={{
              width: '100%', padding: '10px 12px', fontSize: 'var(--fs-base)', border: '1px solid var(--bg3)',
              borderRadius: '8px', background: 'var(--bg2)', color: 'var(--text)', outline: 'none', boxSizing: 'border-box',
            }}
          />
          <div role="listbox" aria-label="Timezones" style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {shown.length === 0 && <span style={{ padding: '10px', color: 'var(--text3)', fontSize: 'var(--fs-sm)' }}>No timezone matches.</span>}
            {shown.map(zone => (
              <button
                key={zone}
                type="button"
                role="option"
                aria-selected={zone === value}
                onClick={() => choose(zone)}
                style={{
                  minHeight: '44px', padding: '8px 10px', textAlign: 'left', border: 'none', borderRadius: '6px',
                  background: zone === value ? 'var(--bg3)' : 'transparent', color: 'var(--text)',
                  fontSize: 'var(--fs-sm)', cursor: 'pointer',
                }}
              >
                {timezoneLabel(zone, when)}
                <span style={{ color: 'var(--text3)' }}> · {zone}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
