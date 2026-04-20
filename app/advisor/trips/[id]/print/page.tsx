import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import { PrintStyles } from '@/components/advisor/print/PrintStyles';
import { stripEmojiForPrint, formatPrintDateRange } from '@/lib/printing/printing-service';

export default async function TripPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  const supabase = await createClient();
  const BYPASS = process.env.BYPASS_AUTH_USER_ID
  const user = BYPASS
    ? { id: BYPASS }
    : (await supabase.auth.getUser()).data.user
  if (!user) redirect('/auth/login');

  // Service client for full data access
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );

  // Fetch all data in parallel
  const [
    { data: trip },
    { data: days },
    { data: rows },
    { data: flights },
    { data: hotels },
    { data: transport },
    { data: restaurants },
    { data: keyInfo },
    { data: checklist },
    { data: packing },
  ] = await Promise.all([
    supabase.from('trips').select('*').eq('id', id).single(),
    serviceClient.from('itinerary_days').select('*').eq('trip_id', id).is('deleted_at', null).order('day_number'),
    serviceClient.from('itinerary_rows').select('*').eq('trip_id', id).is('deleted_at', null).order('sort_order'),
    serviceClient.from('flights').select('*').eq('trip_id', id).is('deleted_at', null).order('departure_time'),
    serviceClient.from('hotels').select('*').eq('trip_id', id).is('deleted_at', null).order('checkin_date'),
    serviceClient.from('transportation').select('*').eq('trip_id', id).is('deleted_at', null).order('departure_time'),
    serviceClient.from('restaurants').select('*').eq('trip_id', id).is('deleted_at', null),
    serviceClient.from('key_info').select('*').eq('trip_id', id),
    serviceClient.from('checklist_items').select('*').eq('trip_id', id).eq('is_completed', false),
    serviceClient.from('packing').select('*').eq('trip_id', id),
  ]);

  if (!trip) return <div>Trip not found</div>;

  const showSection = (key: string) => sp[key] === '1';
  const itinFull = sp.detail === 'full';

  return (
    <div className="print-preview-root">
      <PrintStyles />
      
      {/* Title Page */}
      <section className="print-section" style={{ height: '9in', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ fontSize: '10pt', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold-text)', marginBottom: '16pt' }}>Helm Trip Companion</div>
        <h1 style={{ fontSize: '42pt' }}>{stripEmojiForPrint(trip.title)}</h1>
        <div style={{ fontSize: '18pt', fontStyle: 'italic', color: 'var(--navy)', marginBottom: '8pt' }}>{trip.destination}</div>
        <div style={{ fontSize: '14pt', fontWeight: 700, color: 'var(--gold-text)' }}>
          {formatPrintDateRange(trip.departure_date, trip.return_date)}
        </div>
      </section>

      {/* Overview */}
      {showSection('overview') && (
        <section className="print-section">
          <h2>Trip Overview</h2>
          <table>
            <tbody>
              <tr>
                <td className="label-cell">Trip</td>
                <td>{trip.title}</td>
                <td className="label-cell">Destination</td>
                <td>{trip.destination}</td>
              </tr>
              <tr>
                <td className="label-cell">Departure</td>
                <td>{new Date(trip.departure_date).toLocaleDateString()}</td>
                <td className="label-cell">Return</td>
                <td>{new Date(trip.return_date).toLocaleDateString()}</td>
              </tr>
            </tbody>
          </table>
        </section>
      )}

      {/* Itinerary */}
      {showSection('itinerary') && days && (
        <section className="print-section">
          <h2>Daily Itinerary</h2>
          {days.map((day: any) => {
            const dayRows = rows?.filter((r: any) => r.day_id === day.id) || [];
            return (
              <div key={day.id} style={{ marginBottom: '20pt', pageBreakInside: 'avoid' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1pt solid #EEE', paddingBottom: '4pt', marginBottom: '8pt' }}>
                  <h3 style={{ margin: 0 }}>Day {day.day_number}: {stripEmojiForPrint(day.title)}</h3>
                  <span style={{ fontSize: '10pt', color: '#666' }}>{new Date(day.day_date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</span>
                </div>
                {itinFull && dayRows.map((row: any) => (
                  <div key={row.id} className="itin-row">
                    <div className="itin-time">{row.start_time ? row.start_time.split('T')[1].substring(0, 5) : 'All Day'}</div>
                    <div>
                      <div className="itin-title">{stripEmojiForPrint(row.title)}</div>
                      {row.description && <div className="itin-detail">{stripEmojiForPrint(row.description)}</div>}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </section>
      )}

      {/* Flights */}
      {showSection('flights') && flights && flights.length > 0 && (
        <section className="print-section">
          <h2>Flights</h2>
          <table>
            <thead>
              <tr style={{ background: '#F9F9F9' }}>
                <th style={{ textAlign: 'left', padding: '6pt' }}>Flight</th>
                <th style={{ textAlign: 'left', padding: '6pt' }}>Route</th>
                <th style={{ textAlign: 'left', padding: '6pt' }}>Departs</th>
                <th style={{ textAlign: 'left', padding: '6pt' }}>Arrives</th>
                <th style={{ textAlign: 'left', padding: '6pt' }}>Seat/Conf</th>
              </tr>
            </thead>
            <tbody>
              {flights.map((f: any) => (
                <tr key={f.id}>
                  <td style={{ fontWeight: 700 }}>{f.flight_number}</td>
                  <td>{f.origin_airport} \u2192 {f.destination_airport}</td>
                  <td>{new Date(f.departure_time).toLocaleString()}</td>
                  <td>{new Date(f.arrival_time).toLocaleString()}</td>
                  <td style={{ fontSize: '9pt' }}>{f.seat_assignment || '-'}<br/><span style={{ color: '#6E4C10' }}>{f.confirmation_number}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Hotels */}
      {showSection('hotels') && hotels && hotels.length > 0 && (
        <section className="print-section">
          <h2>Accommodations</h2>
          {hotels.map((h: any) => (
            <div key={h.id} style={{ marginBottom: '16pt', paddingBottom: '12pt', borderBottom: '0.5pt solid #EEE' }}>
              <h3 style={{ marginBottom: '4pt' }}>{stripEmojiForPrint(h.name)}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20pt' }}>
                <div>
                  <div style={{ fontSize: '9pt', color: '#666', textTransform: 'uppercase' }}>Check-in</div>
                  <div>{new Date(h.check_in_date).toLocaleDateString()} at {h.check_in_time || '4:00 PM'}</div>
                  <div style={{ fontSize: '9pt', color: '#666', textTransform: 'uppercase', marginTop: '8pt' }}>Address</div>
                  <div style={{ fontSize: '10pt' }}>{h.address}</div>
                </div>
                <div>
                  <div style={{ fontSize: '9pt', color: '#666', textTransform: 'uppercase' }}>Check-out</div>
                  <div>{new Date(h.check_out_date).toLocaleDateString()} at {h.check_out_time || '11:00 AM'}</div>
                  <div style={{ fontSize: '9pt', color: '#666', textTransform: 'uppercase', marginTop: '8pt' }}>Confirmation</div>
                  <div style={{ fontWeight: 700, color: '#6E4C10' }}>{h.confirmation_number}</div>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Transportation */}
      {showSection('transport') && transport && transport.length > 0 && (
        <section className="print-section">
          <h2>Transportation</h2>
          <table>
            <thead>
              <tr style={{ background: '#F9F9F9' }}>
                <th style={{ textAlign: 'left', padding: '6pt' }}>Type</th>
                <th style={{ textAlign: 'left', padding: '6pt' }}>Provider</th>
                <th style={{ textAlign: 'left', padding: '6pt' }}>Route</th>
                <th style={{ textAlign: 'left', padding: '6pt' }}>Departs</th>
                <th style={{ textAlign: 'left', padding: '6pt' }}>Confirmation</th>
              </tr>
            </thead>
            <tbody>
              {transport.map((t: any) => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 700 }}>{t.type}</td>
                  <td>{t.provider}</td>
                  <td style={{ fontSize: '10pt' }}>{t.origin} \u2192 {t.destination}</td>
                  <td>{new Date(t.departure_time).toLocaleString()}</td>
                  <td style={{ color: '#6E4C10' }}>{t.confirmation_number}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Restaurants */}
      {showSection('restaurants') && restaurants && restaurants.length > 0 && (
        <section className="print-section">
          <h2>Dining & Reservations</h2>
          <table>
            <thead>
              <tr style={{ background: '#F9F9F9' }}>
                <th style={{ textAlign: 'left', padding: '6pt' }}>Name</th>
                <th style={{ textAlign: 'left', padding: '6pt' }}>Location</th>
                <th style={{ textAlign: 'left', padding: '6pt' }}>Time</th>
                <th style={{ textAlign: 'left', padding: '6pt' }}>Party</th>
                <th style={{ textAlign: 'left', padding: '6pt' }}>Conf #</th>
              </tr>
            </thead>
            <tbody>
              {restaurants.map((r: any) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 700 }}>{stripEmojiForPrint(r.name)}</td>
                  <td>{r.city}</td>
                  <td>{new Date(r.reservation_time).toLocaleString()}</td>
                  <td>{r.party_size}</td>
                  <td style={{ color: '#6E4C10' }}>{r.confirmation_number}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Checklist */}
      {showSection('todo') && checklist && checklist.length > 0 && (
        <section className="print-section">
          <h2>Outstanding Tasks</h2>
          <div style={{ columns: 2, columnGap: '24pt' }}>
            {checklist.map((item: any) => (
              <div key={item.id} style={{ display: 'flex', gap: '8pt', marginBottom: '6pt', fontSize: '10pt', breakInside: 'avoid' }}>
                <div style={{ width: '12pt', height: '12pt', border: '1pt solid #DDD', flexShrink: 0 }}></div>
                <span>{item.title}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Packing */}
      {showSection('packing') && packing && packing.length > 0 && (
        <section className="print-section">
          <h2>Packing List</h2>
          <div style={{ columns: 3, columnGap: '20pt' }}>
            {packing.map((item: any) => (
              <div key={item.id} style={{ display: 'flex', gap: '6pt', marginBottom: '4pt', fontSize: '9pt', breakInside: 'avoid' }}>
                <div style={{ width: '10pt', height: '10pt', border: '1pt solid #DDD', flexShrink: 0 }}></div>
                <span>{item.item}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Key Info */}
      {showSection('keyinfo') && keyInfo && keyInfo.length > 0 && (
        <section className="print-section">
          <h2>Key Information</h2>
          {keyInfo.map((k: any) => (
            <div key={k.id} style={{ marginBottom: '12pt' }}>
              <div style={{ fontWeight: 700, fontSize: '10pt', color: '#6E4C10', textTransform: 'uppercase' }}>{k.label}</div>
              <div style={{ fontSize: '11pt' }}>{k.value}</div>
            </div>
          ))}
        </section>
      )}

      <script dangerouslySetInnerHTML={{ __html: `
        window.onload = () => {
          if (window.location.search.includes('print=1') || true) {
             setTimeout(() => window.print(), 500);
          }
        }
      ` }} />
    </div>
  );
}
