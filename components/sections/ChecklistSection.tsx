import { createClient } from '@supabase/supabase-js';

interface ChecklistItem {
  id: string;
  owner_role: string;
  label: string;
  time_horizon: string | null;
  completed: boolean;
}

const TIME_HORIZON_LABELS: Record<string, string> = {
  before_trip: 'Before Trip',
  during_trip: 'During Trip',
  after_trip:  'After Trip',
};

function Checkbox({ checked }: { checked: boolean }) {
  if (checked) {
    return (
      <span
        aria-hidden="true"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '18px',
          height: '18px',
          background: 'var(--navy)',
          borderRadius: '4px',
          flexShrink: 0,
        }}
      >
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
          <path d="M1 4l3 3 5-6" stroke="var(--bg2)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-block',
        width: '18px',
        height: '18px',
        border: '2px solid var(--border2)',
        borderRadius: '4px',
        flexShrink: 0,
      }}
    />
  );
}

export async function ChecklistSection({ tripId }: { tripId: string }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );

  const { data: items } = await supabase
    .from('checklist_items')
    .select('id, owner_role, label, time_horizon, completed')
    .eq('trip_id', tripId)
    .order('sort_order');

  if (!items?.length) {
    return (
      <p style={{ fontFamily: "'Lato', sans-serif", fontSize: '14px', color: 'var(--text3)', padding: '48px 0', textAlign: 'center' }}>
        No checklist items yet.
      </p>
    );
  }

  // Group by owner_role, preserving insertion order
  const groups = new Map<string, ChecklistItem[]>();
  for (const item of items as ChecklistItem[]) {
    const arr = groups.get(item.owner_role) ?? [];
    arr.push(item);
    groups.set(item.owner_role, arr);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {Array.from(groups.entries()).map(([role, roleItems]) => (
        <div key={role}>
          {/* Group header */}
          <div style={{
            fontFamily: "'Lato', sans-serif",
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--gold-text)',
            paddingBottom: '10px',
            borderBottom: '1px solid var(--border2)',
            marginBottom: '2px',
          }}>
            {role}
          </div>

          {/* Items */}
          {roleItems.map((item) => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '13px 0',
                borderBottom: '1px solid var(--border2)',
                minHeight: '44px',
              }}
            >
              <Checkbox checked={item.completed} />
              <span
                style={{
                  fontFamily: "'Lato', sans-serif",
                  fontSize: '14px',
                  color: item.completed ? 'var(--text3)' : 'var(--text)',
                  textDecoration: item.completed ? 'line-through' : 'none',
                  flex: 1,
                  lineHeight: 1.4,
                }}
              >
                {item.label}
              </span>
              {item.time_horizon && (
                <span style={{
                  fontFamily: "'Lato', sans-serif",
                  fontSize: '12px',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  color: 'var(--text3)',
                  background: 'var(--bg3)',
                  border: '1px solid var(--border2)',
                  borderRadius: '20px',
                  padding: '3px 10px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}>
                  {TIME_HORIZON_LABELS[item.time_horizon] ?? item.time_horizon}
                </span>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
