'use client'

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
        backgroundColor: 'var(--red)',
        color: 'var(--action-text)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--sp-lg)',
        zIndex: 9999,
        padding: 'var(--sp-2xl)',
        textAlign: 'center',
      }}>
        <p style={{ fontSize: 'var(--fs-lg)', fontWeight: 'var(--fw-bold)' }}>
          App error
        </p>
        <p style={{ fontSize: 'var(--fs-base)' }}>Something went wrong. Please reload the page.</p>
        <button
          onClick={handleAction}
          style={{
            marginTop: 'var(--sp-md)',
            padding: 'var(--sp-sm) var(--sp-xl)',
            backgroundColor: 'var(--action-text)',
            color: 'var(--red)',
            fontWeight: 'var(--fw-bold)',
            fontSize: 'var(--fs-base)',
            borderRadius: 'var(--r-md)',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Reload
        </button>
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
