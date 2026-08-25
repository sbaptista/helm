'use client'

interface ItineraryTimingFlagsProps {
  label: string
  allDay: boolean
  estimated: boolean
  onAllDayChange: (checked: boolean) => void
  onEstimatedChange: (checked: boolean) => void
}

export function ItineraryTimingFlags({
  label, allDay, estimated, onAllDayChange, onEstimatedChange,
}: ItineraryTimingFlagsProps) {
  const checkboxStyle = { width: '20px', height: '20px', accentColor: 'var(--gold)', cursor: 'pointer', flexShrink: 0 }
  return (
    <fieldset style={{ border: '1px solid var(--border2)', borderRadius: '8px', padding: '10px 12px', margin: 0 }}>
      <legend style={{ padding: '0 4px', fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-bold)', color: 'var(--text3)' }}>
        {label} itinerary timing
      </legend>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px' }}>
        <label style={{ display: 'flex', minHeight: '44px', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input type="checkbox" checked={allDay} onChange={event => onAllDayChange(event.target.checked)} style={checkboxStyle} />
          <span style={{ fontSize: 'var(--fs-sm)' }}>All Day</span>
        </label>
        <label style={{ display: 'flex', minHeight: '44px', alignItems: 'center', gap: '8px', cursor: allDay ? 'default' : 'pointer', opacity: allDay ? 0.45 : 1 }}>
          <input type="checkbox" checked={!allDay && estimated} disabled={allDay} onChange={event => onEstimatedChange(event.target.checked)} style={checkboxStyle} />
          <span style={{ fontSize: 'var(--fs-sm)' }}>Estimated time</span>
        </label>
      </div>
    </fieldset>
  )
}
