'use client'

import { useEffect, useState, useRef } from 'react'
import { useToast } from '@/components/ui/Toast'
import { VERSION } from '@/lib/version'

const BANNER_HEIGHT = 40

interface UpdateBannerProps {
  onVisibilityChange?: (visible: boolean) => void
}

export default function UpdateBanner({ onVisibilityChange }: UpdateBannerProps) {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const toast = useToast()
  const toastShownRef = useRef(false)

  useEffect(() => {
    onVisibilityChange?.(updateAvailable)
  }, [updateAvailable, onVisibilityChange])

  const checkVersion = async () => {
    const isSimulated = typeof window !== 'undefined' && localStorage.getItem('helm-dev-simulate-update') === 'true'

    if (isSimulated) {
      setUpdateAvailable(true)
      if (!toastShownRef.current) {
        toast.neutral('A new version of Helm is available.')
        toastShownRef.current = true
      }
      return
    }

    try {
      const res = await fetch('/api/version')
      if (!res.ok) return
      const data = await res.json()

      if (data.version && data.version !== VERSION) {
        setUpdateAvailable(true)
        if (!toastShownRef.current) {
          toast.neutral('A new version of Helm is available.')
          toastShownRef.current = true
        }
      } else {
        setUpdateAvailable(false)
        toastShownRef.current = false
      }
    } catch {
      // network error — skip silently
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return

    checkVersion()

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkVersion()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('helm-dev-update-change', checkVersion)

    const interval = setInterval(checkVersion, 5 * 60 * 1000)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('helm-dev-update-change', checkVersion)
      clearInterval(interval)
    }
  }, [])

  const handleUpdate = () => {
    setUpdateAvailable(false)
    localStorage.removeItem('helm-dev-simulate-update')
    window.dispatchEvent(new Event('helm-dev-update-change'))
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.update()
        }
      })
    }
    window.location.reload()
  }

  return (
    <div
      style={{
        height: updateAvailable ? `${BANNER_HEIGHT}px` : '0px',
        opacity: updateAvailable ? 1 : 0,
        overflow: 'hidden',
        transition: 'height 0.3s ease, opacity 0.3s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        padding: '0 24px',
        background: '#B8892A',
        borderBottom: updateAvailable ? '1px solid rgba(184, 137, 42, 0.4)' : 'none',
        width: '100%',
        boxSizing: 'border-box',
        pointerEvents: updateAvailable ? 'auto' : 'none',
        position: 'fixed',
        top: 'var(--sat)',
        left: 0,
        zIndex: 110,
      }}
    >
      <button
        onClick={handleUpdate}
        title="New version of Helm available"
        style={{
          background: 'rgba(255, 255, 255, 0.2)',
          color: '#ffffff',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          borderRadius: '12px',
          padding: '4px 14px',
          fontSize: '11px',
          fontWeight: 700,
          cursor: 'pointer',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          transition: 'transform 0.2s ease, background 0.2s ease',
          minHeight: '28px',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.04)'
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)'
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'
        }}
      >
        Update
      </button>
    </div>
  )
}

export { BANNER_HEIGHT }
