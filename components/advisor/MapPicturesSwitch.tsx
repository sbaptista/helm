'use client';

// The trip's Map pictures setting, in New Trip and Edit Trip
// (docs/map-pictures-choice-plan.md). A 44pt row; the note says what it does.
export function MapPicturesSwitch({
  checked,
  onChange,
  disabled,
  note,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  note?: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <label
        style={{
          display: 'flex', alignItems: 'center', gap: '10px', minHeight: '44px',
          cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.6 : 1,
        }}
      >
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          style={{ width: '20px', height: '20px', accentColor: 'var(--gold)', cursor: 'inherit', flexShrink: 0, appearance: 'auto' }}
        />
        <span style={{ fontFamily: "'Lato', sans-serif", fontSize: '15px', color: 'var(--text)', fontWeight: 600 }}>
          Map pictures
        </span>
      </label>
      <p style={{ margin: '0 0 0 30px', fontFamily: "'Lato', sans-serif", fontSize: '14px', color: 'var(--text2)', lineHeight: 1.4 }}>
        {note ?? 'Show a small map on Hotel and Restaurant cards. Tap it to open the map.'}
      </p>
    </div>
  );
}
