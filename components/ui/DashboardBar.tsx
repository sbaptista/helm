'use client'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { useIsOnline } from '@/hooks/useOnlineStatus'

interface DashboardBarProps {
  onSearch: () => void
}

export function DashboardBar({ onSearch }: DashboardBarProps) {
  // Search reads every trip from the server: offline it's dimmed, like the
  // other online-only actions (docs/offline-editing-plan.md §4).
  const isOnline = useIsOnline()
  return (
    <div style={{
      position: 'sticky',
      top: 0,
      zIndex: 31,
      height: '40px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      background: 'var(--bg)',
      borderBottom: '1px solid var(--border)',
    }}>
      {/* The dashboard's own path, not "/": "/" redirects, and offline the
          service worker only has the dashboard saved under its own path. */}
      <Link href="/advisor/dashboard" style={{
        fontSize: 'var(--fs-sm)',
        color: 'var(--gold)',
        textDecoration: 'underline',
        textUnderlineOffset: '3px',
        textDecorationColor: 'var(--gold)',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
      }}>
        ← Helm Dashboard
      </Link>
      <button
        onClick={onSearch}
        disabled={!isOnline}
        title={isOnline ? 'Search' : 'Search needs a connection'}
        style={{
          background: 'none',
          border: 'none',
          cursor: isOnline ? 'pointer' : 'not-allowed',
          opacity: isOnline ? 1 : 0.4,
          color: 'var(--text-secondary, var(--text3))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '44px',
          height: '44px',
          borderRadius: 'var(--r)',
          padding: 0,
        }}
        aria-label={isOnline ? 'Search' : 'Search (needs a connection)'}
      >
        <Search size={20} />
      </button>
    </div>
  )
}
