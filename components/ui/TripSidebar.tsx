'use client'

import {
  X,
  Compass,
  CalendarDays,
  Calendar,
  ListChecks,
  Luggage,
  Plane,
  Building2,
  Car,
  Utensils,
  Info,
  ScrollText,
  Printer,
  FileUp,
  Pencil,
  Trash2,
} from 'lucide-react'

interface TripSidebarProps {
  isOpen: boolean
  onClose: () => void
  activeSection: string
  onNavigate: (section: string) => void
  tripName: string
  tripDates: string
  warnCounts: Record<string, number>
  tripId: string
  onPrint: () => void
  onImport: () => void
  onEditTrip: () => void
  onClearTrip: () => void
  onShowLogs: () => void
  onShowCalendar: () => void
  calendarStatus: 'loading' | 'unconnected' | 'connected' | 'update_required'
}

const groupHeaderStyle: React.CSSProperties = {
  fontFamily: "'Lato', sans-serif",
  fontSize: 'var(--fs-xs)',
  fontWeight: 'var(--fw-bold)',
  color: 'var(--gold)',
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  padding: '16px 16px 6px',
}

const WARN_SECTIONS = new Set(['checklist', 'flights', 'hotels', 'transportation', 'restaurants', 'itinerary'])

function NavItem({
  icon: Icon,
  label,
  sectionKey,
  activeSection,
  warnCount,
  onClick,
}: {
  icon: React.ElementType
  label: string
  sectionKey: string
  activeSection: string
  warnCount?: number
  onClick: () => void
}) {
  const isActive = activeSection === sectionKey
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        width: '100%',
        padding: '10px 16px',
        background: isActive ? 'rgba(180,130,30,0.08)' : 'transparent',
        border: 'none',
        borderLeft: isActive ? '3px solid var(--gold)' : '3px solid transparent',
        cursor: 'pointer',
        fontFamily: "'Lato', sans-serif",
        fontSize: 'var(--fs-sm)',
        fontWeight: isActive ? 'var(--fw-bold)' : 'var(--fw-medium)',
        color: isActive ? 'var(--gold)' : 'var(--text)',
        textAlign: 'left',
        minHeight: '44px',
        transition: 'background 0.15s, color 0.15s',
      }}
    >
      <Icon size={16} style={{ flexShrink: 0, color: isActive ? 'var(--gold)' : 'var(--text2)' }} />
      <span style={{ flex: 1 }}>{label}</span>
      {warnCount != null && warnCount > 0 && (
        <span style={{
          background: 'var(--action)',
          color: 'var(--action-text)',
          fontSize: 'var(--fs-xs)',
          fontWeight: 'var(--fw-bold)',
          borderRadius: '10px',
          padding: '1px 7px',
          marginLeft: 'auto',
          flexShrink: 0,
        }}>
          {warnCount}
        </span>
      )}
    </button>
  )
}

function ActionItem({
  icon: Icon,
  label,
  onClick,
  danger,
  badge,
}: {
  icon: React.ElementType
  label: string
  onClick: () => void
  danger?: boolean
  badge?: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        width: '100%',
        padding: '10px 16px',
        background: 'transparent',
        border: 'none',
        borderLeft: '3px solid transparent',
        cursor: 'pointer',
        fontFamily: "'Lato', sans-serif",
        fontSize: 'var(--fs-sm)',
        fontWeight: 'var(--fw-medium)',
        color: danger ? 'var(--red)' : 'var(--text)',
        textAlign: 'left',
        minHeight: '44px',
      }}
    >
      <Icon size={16} style={{ flexShrink: 0, color: danger ? 'var(--red)' : 'var(--text2)' }} />
      <span>{label}</span>
      {badge}
    </button>
  )
}

export function TripSidebar({
  isOpen,
  onClose,
  activeSection,
  onNavigate,
  tripName,
  tripDates,
  warnCounts,
  onPrint,
  onImport,
  onEditTrip,
  onClearTrip,
  onShowLogs,
  onShowCalendar,
  calendarStatus,
}: TripSidebarProps) {
  function nav(section: string) {
    onNavigate(section)
    onClose()
  }

  const w = (key: string) => WARN_SECTIONS.has(key) ? (warnCounts[key] ?? 0) : undefined

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.4)',
          zIndex: 40,
          display: isOpen ? 'block' : 'none',
        }}
        aria-hidden="true"
      />

      {/* Sidebar panel */}
      <aside
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100dvh',
          width: '280px',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg)',
          boxShadow: '4px 0 24px rgba(0,0,0,0.18)',
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Header — not scrollable */}
        <div
          style={{
            background: 'var(--bg-secondary, var(--bg2))',
            padding: 'calc(20px + env(safe-area-inset-top, 0px)) 16px 16px',
            borderBottom: '1px solid var(--border2)',
            flexShrink: 0,
            position: 'relative',
          }}
        >
          <span
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 'var(--fs-lg)',
              fontWeight: 'var(--fw-bold)',
              color: 'var(--gold)',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              display: 'block',
            }}
          >
            HELM
          </span>
          <p
            style={{
              fontFamily: "'Lato', sans-serif",
              fontSize: 'var(--fs-sm)',
              fontWeight: 'var(--fw-medium)',
              color: 'var(--text)',
              margin: '8px 0 0',
            }}
          >
            {tripName}
          </p>
          <p
            style={{
              fontFamily: "'Lato', sans-serif",
              fontSize: 'var(--fs-xs)',
              color: 'var(--text-secondary, var(--text3))',
              margin: '2px 0 0',
            }}
          >
            {tripDates}
          </p>

          {/* Close button */}
          <button
            onClick={onClose}
            aria-label="Close sidebar"
            style={{
              position: 'absolute',
              top: 'calc(12px + env(safe-area-inset-top, 0px))',
              right: '8px',
              width: '44px',
              height: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary, var(--text3))',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable nav area */}
        <div
          style={{
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
            flex: 1,
            paddingBottom: 'env(safe-area-inset-bottom, 24px)',
          }}
        >
          {/* TRIP group */}
          <div style={groupHeaderStyle}>Trip</div>
          <NavItem icon={Compass}      label="Overview"       sectionKey="overview"       activeSection={activeSection} onClick={() => nav('overview')} />
          <NavItem icon={CalendarDays} label="Itinerary"      sectionKey="itinerary"      activeSection={activeSection} warnCount={w('itinerary')} onClick={() => nav('itinerary')} />

          {/* PLANNING group */}
          <div style={groupHeaderStyle}>Planning</div>
          <NavItem icon={ListChecks}   label="Checklist"      sectionKey="checklist"      activeSection={activeSection} warnCount={w('checklist')} onClick={() => nav('checklist')} />
          <NavItem icon={Luggage}      label="Packing"        sectionKey="packing"        activeSection={activeSection} onClick={() => nav('packing')} />

          {/* REFERENCE group */}
          <div style={groupHeaderStyle}>Reference</div>
          <NavItem icon={Plane}        label="Flights"        sectionKey="flights"        activeSection={activeSection} warnCount={w('flights')} onClick={() => nav('flights')} />
          <NavItem icon={Building2}    label="Hotels"         sectionKey="hotels"         activeSection={activeSection} warnCount={w('hotels')} onClick={() => nav('hotels')} />
          <NavItem icon={Car}          label="Transportation" sectionKey="transportation" activeSection={activeSection} warnCount={w('transportation')} onClick={() => nav('transportation')} />
          <NavItem icon={Utensils}     label="Restaurants"    sectionKey="restaurants"    activeSection={activeSection} warnCount={w('restaurants')} onClick={() => nav('restaurants')} />
          <NavItem icon={Info}         label="Key Info"       sectionKey="key_info"       activeSection={activeSection} onClick={() => nav('key_info')} />

          {/* APP group */}
          <div style={{ borderTop: '1px solid var(--border2)', marginTop: '8px' }} />
          <ActionItem icon={ScrollText} label="Logs"             onClick={() => { onShowLogs(); onClose() }} />
          <ActionItem
            icon={Calendar}
            label="Calendar"
            onClick={() => { onShowCalendar(); onClose() }}
            badge={
              calendarStatus === 'update_required' ? (
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--action)', flexShrink: 0, marginLeft: 'auto', display: 'inline-block' }} />
              ) : calendarStatus === 'unconnected' ? (
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--text-secondary, var(--text3))', flexShrink: 0, marginLeft: 'auto', display: 'inline-block' }} />
              ) : undefined
            }
          />
          <ActionItem icon={Printer}    label="Print Trip"       onClick={() => { onPrint(); onClose() }} />
          <ActionItem icon={FileUp}     label="Import Document"  onClick={() => { onImport(); onClose() }} />
          <ActionItem icon={Pencil}     label="Edit Trip"        onClick={() => { onEditTrip(); onClose() }} />
          <ActionItem icon={Trash2}     label="Clear Trip Data"  onClick={() => { onClearTrip(); onClose() }} danger />
        </div>
      </aside>
    </>
  )
}
