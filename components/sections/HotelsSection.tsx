import { createClient } from '@supabase/supabase-js';

interface Hotel {
  id: string;
  name: string | null;
  city: string | null;
  address: string | null;
  check_in_date: string | null;
  check_in_time: string | null;
  check_out_date: string | null;
  check_out_time: string | null;
  confirmation_number: string | null;
  phone: string | null;
  website_url: string | null;
  notes: string | null;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTimeStr(t: string | null): string {
  if (!t) return '';
  const [hStr, mStr] = t.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return t;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

export async function HotelsSection({ tripId }: { tripId: string }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );

  const { data: hotels } = await supabase
    .from('hotels')
    .select('id, name, city, address, check_in_date, check_in_time, check_out_date, check_out_time, confirmation_number, phone, website_url, notes')
    .eq('trip_id', tripId)
    .is('deleted_at', null)
    .order('check_in_date');

  if (!hotels?.length) {
    return (
      <p style={{ fontFamily: "'Lato', sans-serif", fontSize: '14px', color: 'var(--text3)', padding: '48px 0', textAlign: 'center' }}>
        No hotels yet.
      </p>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {(hotels as Hotel[]).map((h) => {
        const checkIn = [formatDate(h.check_in_date), formatTimeStr(h.check_in_time)].filter(Boolean).join(' · ');
        const checkOut = [formatDate(h.check_out_date), formatTimeStr(h.check_out_time)].filter(Boolean).join(' · ');

        return (
          <div
            key={h.id}
            style={{
              background: 'var(--bg2)',
              border: '1px solid var(--border2)',
              borderRadius: 'var(--r-lg)',
              padding: '20px 24px',
              boxShadow: 'var(--shadow)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            {/* Name + city */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '22px', fontWeight: 600, color: 'var(--navy)', lineHeight: 1.25 }}>
                {h.name ?? '—'}
              </span>
              {h.city && (
                <span style={{ fontFamily: "'Lato', sans-serif", fontSize: '13px', color: 'var(--text3)' }}>
                  {h.city}
                </span>
              )}
            </div>

            {/* Address */}
            {h.address && (
              <p style={{ fontFamily: "'Lato', sans-serif", fontSize: '13px', color: 'var(--text3)' }}>
                {h.address}
              </p>
            )}

            {/* Check-in / Check-out */}
            <div style={{ fontFamily: "'Lato', sans-serif", fontSize: '13px', color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, color: 'var(--text2)' }}>Check-in:</span>
              <span>{checkIn || '—'}</span>
              <span aria-hidden="true" style={{ color: 'var(--border2)', padding: '0 4px' }}>|</span>
              <span style={{ fontWeight: 700, color: 'var(--text2)' }}>Check-out:</span>
              <span>{checkOut || '—'}</span>
            </div>

            {/* Confirmation */}
            {h.confirmation_number && (
              <div style={{ fontFamily: "'Lato', sans-serif", fontSize: '13px', color: 'var(--text3)' }}>
                <span style={{ fontWeight: 700, color: 'var(--text2)' }}>Conf: </span>
                {h.confirmation_number}
              </div>
            )}

            {/* Phone + website */}
            {(h.phone || h.website_url) && (
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontFamily: "'Lato', sans-serif", fontSize: '13px' }}>
                {h.phone && (
                  <span style={{ color: 'var(--text3)' }}>{h.phone}</span>
                )}
                {h.website_url && (
                  <a
                    href={h.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--gold-text)', textDecoration: 'underline', textUnderlineOffset: '2px' }}
                  >
                    Website
                  </a>
                )}
              </div>
            )}

            {/* Notes */}
            {h.notes && (
              <p style={{ fontFamily: "'Lato', sans-serif", fontSize: '13px', color: 'var(--text3)', lineHeight: 1.5, marginTop: '2px' }}>
                {h.notes}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
