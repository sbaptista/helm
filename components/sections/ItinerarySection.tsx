import { createClient } from '@supabase/supabase-js';
import { Badge } from '@/components/ui/Badge';

interface Day {
  id: string;
  day_number: number;
  day_date: string;
  title: string;
  location: string | null;
}

interface Row {
  id: string;
  day_id: string;
  start_time: string | null;
  title: string;
  description: string | null;
  category: string;
}

function formatDayDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function formatTime(iso: string): string {
  const raw = iso.split('T')[1]?.split(/[+Z]/)[0] ?? '';
  const [h, m] = raw.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return '';
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

function categoryColor(cat: string): { bg: string; text: string; border: string } {
  const c = cat.toLowerCase();
  if (c === 'flight' || c.includes('air'))
    return { bg: 'var(--bg3)', text: 'var(--navy)', border: 'var(--border2)' };
  if (c === 'hotel' || c.includes('accommodation') || c.includes('lodge') || c.includes('resort'))
    return { bg: 'var(--bg3)', text: 'var(--gold-text)', border: 'var(--border)' };
  if (c === 'transportation' || c.includes('transfer') || c.includes('car') || c.includes('train') || c.includes('ferry'))
    return { bg: 'var(--bg3)', text: 'var(--slate)', border: 'var(--border2)' };
  if (c === 'restaurant' || c.includes('dining') || c.includes('food') || c.includes('meal'))
    return { bg: 'var(--bg3)', text: 'var(--green)', border: 'var(--border2)' };
  return { bg: 'var(--bg3)', text: 'var(--text3)', border: 'var(--border2)' };
}

export async function ItinerarySection({ tripId }: { tripId: string }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );

  const [{ data: days }, { data: rows }] = await Promise.all([
    supabase
      .from('itinerary_days')
      .select('id, day_number, day_date, title, location')
      .eq('trip_id', tripId)
      .is('deleted_at', null)
      .order('day_number'),
    supabase
      .from('itinerary_rows')
      .select('id, day_id, start_time, title, description, category')
      .eq('trip_id', tripId)
      .is('deleted_at', null)
      .order('sort_order'),
  ]);

  if (!days?.length) {
    return (
      <p
        style={{
          fontFamily: "'Lato', sans-serif",
          fontSize: '14px',
          color: 'var(--text3)',
          padding: '48px 0',
          textAlign: 'center',
        }}
      >
        No itinerary data yet.
      </p>
    );
  }

  const rowsByDay = new Map<string, Row[]>();
  for (const row of (rows ?? []) as Row[]) {
    const arr = rowsByDay.get(row.day_id) ?? [];
    arr.push(row);
    rowsByDay.set(row.day_id, arr);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {(days as Day[]).map((day) => {
        const dayRows = rowsByDay.get(day.id) ?? [];
        return (
          <div key={day.id}>
            {/* Day card */}
            <div
              style={{
                background: 'var(--bg2)',
                border: '1px solid var(--border2)',
                borderRadius: 'var(--r-lg)',
                padding: '20px 24px',
                boxShadow: 'var(--shadow)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '10px',
                  marginBottom: '4px',
                }}
              >
                <span
                  style={{
                    fontFamily: "'Lato', sans-serif",
                    fontSize: '12px',
                    fontWeight: 700,
                    letterSpacing: '0.07em',
                    textTransform: 'uppercase',
                    color: 'var(--gold-text)',
                  }}
                >
                  Day {day.day_number}
                </span>
                <span
                  style={{
                    fontFamily: "'Lato', sans-serif",
                    fontSize: '13px',
                    color: 'var(--text3)',
                  }}
                >
                  {formatDayDate(day.day_date)}
                </span>
              </div>
              <h2
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: '22px',
                  fontWeight: 600,
                  color: 'var(--navy)',
                  lineHeight: 1.25,
                  marginBottom: day.location ? '6px' : '0',
                }}
              >
                {day.title}
              </h2>
              {day.location && (
                <p
                  style={{
                    fontFamily: "'Lato', sans-serif",
                    fontSize: '13px',
                    color: 'var(--text3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span aria-hidden="true">📍</span>
                  {day.location}
                </p>
              )}
            </div>

            {/* Rows */}
            {dayRows.length > 0 && (
              <div
                style={{
                  marginTop: '2px',
                  borderLeft: '2px solid var(--border2)',
                  marginLeft: '24px',
                  paddingLeft: '20px',
                }}
              >
                {dayRows.map((row) => (
                  <div
                    key={row.id}
                    style={{
                      padding: '14px 0',
                      borderBottom: '1px solid var(--border2)',
                      minHeight: '44px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        flexWrap: 'wrap',
                      }}
                    >
                      {row.start_time && (
                        <span
                          style={{
                            fontFamily: "'Lato', sans-serif",
                            fontSize: '12px',
                            fontWeight: 700,
                            color: 'var(--gold-text)',
                            letterSpacing: '0.04em',
                            flexShrink: 0,
                          }}
                        >
                          {formatTime(row.start_time)}
                        </span>
                      )}
                      <span
                        style={{
                          fontFamily: "'Lato', sans-serif",
                          fontSize: '14px',
                          fontWeight: 700,
                          color: 'var(--text)',
                          flex: 1,
                        }}
                      >
                        {row.title}
                      </span>
                      <Badge color={categoryColor(row.category)}>
                        {row.category}
                      </Badge>
                    </div>
                    {row.description && (
                      <p
                        style={{
                          fontFamily: "'Lato', sans-serif",
                          fontSize: '13px',
                          color: 'var(--text3)',
                          lineHeight: 1.5,
                        }}
                      >
                        {row.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
