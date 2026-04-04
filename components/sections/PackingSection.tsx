import { createClient } from '@supabase/supabase-js';

interface PackingItem {
  id: string;
  category: string;
  label: string;
  packed: boolean;
}

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

export async function PackingSection({ tripId }: { tripId: string }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );

  const { data: items } = await supabase
    .from('packing_items')
    .select('id, category, label, packed')
    .eq('trip_id', tripId)
    .order('sort_order');

  if (!items?.length) {
    return (
      <p style={{ fontFamily: "'Lato', sans-serif", fontSize: '14px', color: 'var(--text3)', padding: '48px 0', textAlign: 'center' }}>
        No packing items yet.
      </p>
    );
  }

  // Group by category, preserving insertion order
  const groups = new Map<string, PackingItem[]>();
  for (const item of items as PackingItem[]) {
    const arr = groups.get(item.category) ?? [];
    arr.push(item);
    groups.set(item.category, arr);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {Array.from(groups.entries()).map(([category, catItems]) => (
        <div key={category}>
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
            {category}
          </div>

          {/* Items */}
          {catItems.map((item) => (
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
              <Checkbox checked={item.packed} />
              <span
                style={{
                  fontFamily: "'Lato', sans-serif",
                  fontSize: '14px',
                  color: item.packed ? 'var(--text3)' : 'var(--text)',
                  textDecoration: item.packed ? 'line-through' : 'none',
                  flex: 1,
                  lineHeight: 1.4,
                }}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
