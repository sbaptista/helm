import { createClient } from '@supabase/supabase-js';

interface Flight {
  id: string;
  flight_number: string | null;
  airline: string | null;
  origin_airport: string | null;
  destination_airport: string | null;
  departure_time: string | null;
  arrival_time: string | null;
  cabin_class: string | null;
  confirmation_number: string | null;
  notes: string | null;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  const [datePart, rest] = iso.split('T');
  if (!datePart || !rest) return iso;
  const [year, month, day] = datePart.split('-').map(Number);
  const timeStr = rest.split(/[+Z]/)[0];
  const [h, m] = timeStr.split(':').map(Number);
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const weekday = weekdays[new Date(year, month - 1, day).getDay()];
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${weekday}, ${months[month - 1]} ${day} · ${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

export async function FlightsSection({ tripId }: { tripId: string }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );

  const { data: flights } = await supabase
    .from('flights')
    .select('id, flight_number, airline, origin_airport, destination_airport, departure_time, arrival_time, cabin_class, confirmation_number, notes')
    .eq('trip_id', tripId)
    .is('deleted_at', null)
    .order('departure_time');

  if (!flights?.length) {
    return (
      <p style={{ fontFamily: "'Lato', sans-serif", fontSize: '14px', color: 'var(--text3)', padding: '48px 0', textAlign: 'center' }}>
        No flights yet.
      </p>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {(flights as Flight[]).map((f) => (
        <div
          key={f.id}
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
          {/* Airline + flight number + cabin */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {f.airline && (
              <span style={{ fontFamily: "'Lato', sans-serif", fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>
                {f.airline}
              </span>
            )}
            {f.flight_number && (
              <span style={{ fontFamily: "'Lato', sans-serif", fontSize: '13px', color: 'var(--text3)' }}>
                {f.flight_number}
              </span>
            )}
            {f.cabin_class && (
              <span style={{
                fontFamily: "'Lato', sans-serif",
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: 'var(--gold-text)',
                background: 'var(--bg3)',
                border: '1px solid var(--border)',
                borderRadius: '20px',
                padding: '3px 10px',
                marginLeft: 'auto',
              }}>
                {f.cabin_class}
              </span>
            )}
          </div>

          {/* Route */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '26px', fontWeight: 600, color: 'var(--navy)', letterSpacing: '0.02em' }}>
              {f.origin_airport ?? '—'}
            </span>
            <svg width="24" height="12" viewBox="0 0 24 12" fill="none" aria-hidden="true" style={{ color: 'var(--text3)', flexShrink: 0 }}>
              <path d="M2 6h20M16 2l6 4-6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '26px', fontWeight: 600, color: 'var(--navy)', letterSpacing: '0.02em' }}>
              {f.destination_airport ?? '—'}
            </span>
          </div>

          {/* Times */}
          <div style={{ fontFamily: "'Lato', sans-serif", fontSize: '13px', color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span>{formatDateTime(f.departure_time)}</span>
            <span aria-hidden="true">→</span>
            <span>{formatDateTime(f.arrival_time)}</span>
          </div>

          {/* Confirmation */}
          {f.confirmation_number && (
            <div style={{ fontFamily: "'Lato', sans-serif", fontSize: '13px', color: 'var(--text3)' }}>
              <span style={{ fontWeight: 700, color: 'var(--text2)' }}>Conf: </span>
              {f.confirmation_number}
            </div>
          )}

          {/* Notes */}
          {f.notes && (
            <p style={{ fontFamily: "'Lato', sans-serif", fontSize: '13px', color: 'var(--text3)', lineHeight: 1.5, marginTop: '2px' }}>
              {f.notes}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
