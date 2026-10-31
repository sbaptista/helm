'use client'

import { useEffect, useRef } from 'react'

// Full-screen "in progress" dialog that blocks every tap, scroll and key until
// a long save finishes (docs/packing-multi-select-plan.md, Revision 1).
// Sits above the header, update banner and sheets (z-index 200), below toasts (999).

interface BusyOverlayProps {
  open: boolean
  message: string
  detail?: string
}

export function BusyOverlay({ open, message, detail }: BusyOverlayProps) {
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    const previousFocus = document.activeElement as HTMLElement | null
    document.body.style.overflow = 'hidden'
    boxRef.current?.focus()
    return () => {
      document.body.style.overflow = previousOverflow
      previousFocus?.focus?.()
    }
  }, [open])

  if (!open) return null

  return (
    <div
      onClick={e => e.stopPropagation()}
      style={{
        position: 'fixed', inset: 0, zIndex: 900,
        background: 'rgba(15, 23, 42, 0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
        touchAction: 'none',
      }}
    >
      <div
        ref={boxRef}
        role="alertdialog"
        aria-modal="true"
        aria-busy="true"
        aria-label={message}
        tabIndex={-1}
        // Keep keyboard focus here so nothing behind can be activated.
        onKeyDown={e => { e.preventDefault(); e.stopPropagation() }}
        style={{
          background: 'var(--bg2)', borderRadius: 'var(--r)', border: '1px solid var(--border2)',
          boxShadow: '0 12px 32px rgba(0,0,0,0.2)',
          padding: '24px 28px', minWidth: '240px', maxWidth: '360px', width: '100%',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px',
          outline: 'none',
        }}
      >
        <div className="busy-spinner" aria-hidden="true" />
        <p style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-base)', color: 'var(--text)', fontWeight: 600, textAlign: 'center', margin: 0 }}>
          {message}
        </p>
        {detail && (
          <p aria-live="polite" style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)', color: 'var(--text2)', textAlign: 'center', margin: 0 }}>
            {detail}
          </p>
        )}
      </div>
    </div>
  )
}
