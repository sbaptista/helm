'use client'
import Link from 'next/link'
import { Search } from 'lucide-react'

interface DashboardBarProps {
  onSearch: () => void
}

export function DashboardBar({ onSearch }: DashboardBarProps) {
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
      <Link href="/" style={{
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
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-secondary, var(--text3))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '44px',
          height: '44px',
          borderRadius: 'var(--r)',
          padding: 0,
        }}
        aria-label="Search"
      >
        <Search size={20} />
      </button>
    </div>
  )
}
