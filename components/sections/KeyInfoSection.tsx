import { createClient } from '@supabase/supabase-js';

interface KeyInfoItem {
  id: string;
  category: string;
  label: string;
  value: string | null;
  url: string | null;
  url_label: string | null;
  flag: boolean;
}

export async function KeyInfoSection({ tripId }: { tripId: string }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );

  const { data: items } = await supabase
    .from('key_info')
    .select('id, category, label, value, url, url_label, flag')
    .eq('trip_id', tripId)
    .order('sort_order');

  if (!items?.length) {
    return (
      <p style={{ fontFamily: "'Lato', sans-serif", fontSize: '14px', color: 'var(--text3)', padding: '48px 0', textAlign: 'center' }}>
        No key info yet.
      </p>
    );
  }

  // Group by category, preserving insertion order
  const groups = new Map<string, KeyInfoItem[]>();
  for (const item of items as KeyInfoItem[]) {
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
                flexWrap: 'wrap',
              }}
            >
              {/* Flag indicator */}
              {item.flag && (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  aria-label="Flagged"
                  style={{ flexShrink: 0, color: 'var(--gold-text)' }}
                >
                  <path d="M2 1v12M2 1h8l-2 3.5L10 8H2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}

              {/* Label */}
              <span style={{
                fontFamily: "'Lato', sans-serif",
                fontSize: '14px',
                color: 'var(--text2)',
                flex: 1,
                minWidth: '120px',
                lineHeight: 1.4,
              }}>
                {item.label}
              </span>

              {/* Value */}
              {item.value && (
                <span style={{
                  fontFamily: "'Lato', sans-serif",
                  fontSize: '14px',
                  fontWeight: 700,
                  color: 'var(--text)',
                  lineHeight: 1.4,
                }}>
                  {item.value}
                </span>
              )}

              {/* URL */}
              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontFamily: "'Lato', sans-serif",
                    fontSize: '13px',
                    color: 'var(--gold-text)',
                    textDecoration: 'underline',
                    textUnderlineOffset: '2px',
                    flexShrink: 0,
                    minHeight: '44px',
                    display: 'inline-flex',
                    alignItems: 'center',
                  }}
                >
                  {item.url_label ?? 'Link'}
                </a>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
