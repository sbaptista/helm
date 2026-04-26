'use client'

import { Menu, CalendarDays } from 'lucide-react'

interface TripTopBarProps {
  onOpenSidebar: () => void
  tripName: string
  onShowCalendar: () => void
  calendarStatus: 'loading' | 'unconnected' | 'connected' | 'update_required'
}

export function TripTopBar({ onOpenSidebar, tripName, onShowCalendar, calendarStatus }: TripTopBarProps) {
  return (
    <div
      style={{
        position: 'sticky',
        top: '40px',
        zIndex: 30,
        minHeight: '64px',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: '0 4px',
        background: 'var(--bg)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Hamburger */}
      <button
        onClick={onOpenSidebar}
        aria-label="Menu"
        style={{
          width: '44px',
          minHeight: '44px',
          paddingTop: '12px',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text)',
          flexShrink: 0,
        }}
      >
        <Menu size={22} />
      </button>

      {/* Trip name */}
      <div style={{
        flex: 1,
        textAlign: 'center',
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: '40px',
        fontWeight: 'var(--fw-bold)',
        color: 'var(--navy)',
        lineHeight: 1.2,
        letterSpacing: '0.01em',
        padding: '12px 8px',
      }}>
        {tripName}
      </div>

      {/* Calendar icon with dot badge */}
      <button
        onClick={onShowCalendar}
        aria-label="Calendar"
        style={{
          width: '44px',
          minHeight: '44px',
          paddingTop: '12px',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          position: 'relative',
          flexShrink: 0,
        }}
      >
        <CalendarDays
          size={22}
          color={calendarStatus === 'unconnected' ? 'var(--text-secondary, var(--text3))' : 'var(--navy)'}
        />
        {calendarStatus === 'update_required' && (
          <span style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: 'var(--action)',
            border: '1.5px solid var(--bg)',
            display: 'block',
          }} />
        )}
      </button>
    </div>
  )
}
