'use client'

import { ShieldX } from 'lucide-react'

type PersistentMessageVariant = 'critical' | 'fatal'

interface PersistentMessageProps {
  variant: PersistentMessageVariant
  message: string
  onAction?: () => void
}

export function PersistentMessage({ variant, message, onAction }: PersistentMessageProps) {
  const isFatal = variant === 'fatal'

  const handleAction = () => {
    if (isFatal) {
      window.location.reload()
    } else {
      onAction?.()
    }
  }

  if (isFatal) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: '#111111',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          maxWidth: '480px',
          width: '90%',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(255,255,255,0.05)',
          overflow: 'hidden',
        }}>
          {/* Card header */}
          <div style={{
            padding: '24px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}>
            <ShieldX size={24} color="var(--fatal)" style={{ flexShrink: 0 }} />
            <div>
              <p style={{
                margin: 0,
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--fatal)',
              }}>
                Fatal error
              </p>
              <p style={{
                margin: 0,
                fontSize: 'var(--fs-xl)',
                fontWeight: 'var(--fw-bold)',
                color: '#ffffff',
              }}>
                App error
              </p>
            </div>
          </div>

          {/* Card body */}
          <div style={{ padding: '24px' }}>
            <p style={{
              margin: 0,
              fontSize: 'var(--fs-sm)',
              color: 'rgba(255,255,255,0.6)',
              lineHeight: 1.6,
            }}>
              Something went wrong. Please reload the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: '24px',
                width: '100%',
                padding: '12px 24px',
                background: '#ffffff',
                color: '#111111',
                fontWeight: 'var(--fw-bold)',
                fontSize: 'var(--fs-sm)',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Reload
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      backgroundColor: 'var(--critical)',
      color: 'var(--critical-text)',
      padding: 'var(--sp-md) var(--sp-lg)',
      borderRadius: 'var(--r-md)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 'var(--sp-md)',
      fontSize: 'var(--fs-sm)',
      fontWeight: 'var(--fw-medium)',
    }}>
      <div>
        <p style={{ fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-bold)', margin: 0 }}>
          Feature unavailable
        </p>
        <p style={{ fontSize: 'var(--fs-sm)', margin: 0 }}>Something went wrong. Please try again.</p>
      </div>
      {onAction && (
        <button
          onClick={handleAction}
          style={{
            backgroundColor: 'transparent',
            color: 'var(--critical-text)',
            border: '1px solid var(--critical-text)',
            borderRadius: 'var(--r-sm)',
            padding: '4px var(--sp-md)',
            fontSize: 'var(--fs-xs)',
            fontWeight: 'var(--fw-medium)',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Retry
        </button>
      )}
    </div>
  )
}
