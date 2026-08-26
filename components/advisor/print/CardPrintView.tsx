import React from 'react'
import { CardHeader, CardRow, CardWrapper } from './CardTemplates'
import { chunkArray, stripEmojiForPrint } from '@/lib/printing/printing-service'
import type {
  FlightRow,
  HotelRow,
  ItineraryDayRow,
  ItineraryRowRow,
  KeyInfoRow,
  RestaurantRow,
  TransportationRow,
} from '@/types/sections'

export type ReferenceCardType =
  | 'flights'
  | 'hotels'
  | 'transportation'
  | 'restaurants'
  | 'key-info'
  | 'daily'
  | `day-${number}`

interface CardPrintViewProps {
  card: ReferenceCardType
  tripTitle: string
  flights: FlightRow[]
  hotels: HotelRow[]
  transportation: TransportationRow[]
  restaurants: RestaurantRow[]
  keyInfo: KeyInfoRow[]
  days: ItineraryDayRow[]
  itineraryRows: ItineraryRowRow[]
}

function formatTime(value: string | null, timezone?: string | null): string {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-US', {
    ...(timezone ? { timeZone: timezone } : {}),
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: timezone ? 'short' : undefined,
  }).format(new Date(value))
}

function formatCardDate(value: string | null): string {
  if (!value) return 'Date TBD'
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function EmptyCardState({ card }: { card: string }) {
  return (
    <main className="card-empty-state">
      <h1>No {card.replace('-', ' ')} card content</h1>
      <p>This trip has no records available for the selected reference card.</p>
    </main>
  )
}

export function CardPrintView({
  card,
  tripTitle,
  flights,
  hotels,
  transportation,
  restaurants,
  keyInfo,
  days,
  itineraryRows,
}: CardPrintViewProps) {
  if (card === 'flights') {
    if (flights.length === 0) return <EmptyCardState card="flights" />
    const chunks = chunkArray(flights, 4)
    return chunks.map((chunk, index) => (
      <React.Fragment key={index}>
        <CardWrapper side="FRONT" page={index + 1} total={chunks.length}>
          <CardHeader title="✈️ Flights" sub={tripTitle} pageLabel={chunks.length > 1 ? `${index + 1}/${chunks.length}` : undefined} />
          <div style={{ marginTop: '4px' }}>
            {chunk.map(flight => (
              <div key={flight.id} style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700 }}>
                  <span>{flight.flight_number} • {flight.airline}</span>
                  <span style={{ color: '#6E4C10' }}>{flight.confirmation_number}</span>
                </div>
                <div style={{ fontSize: '10px', color: '#3D3020' }}>
                  {flight.origin_airport} → {flight.destination_airport} | {formatTime(flight.departure_time, flight.departure_timezone)}
                </div>
              </div>
            ))}
          </div>
        </CardWrapper>
        <CardWrapper side="BACK" page={index + 1} total={chunks.length}>
          <CardHeader title="✈️ Flights — Details" sub="Reference" pageLabel={chunks.length > 1 ? `${index + 1}/${chunks.length}` : undefined} />
          <div style={{ marginTop: '4px' }}>
            {chunk.map(flight => (
              <div key={flight.id} style={{ marginBottom: '10px' }}>
                <CardRow label={flight.flight_number ?? '—'} value={`${flight.cabin_class || 'Economy'} • Seat: ${flight.seat_number || 'TBD'}`} />
                {flight.notes && <div style={{ fontSize: '9px', fontStyle: 'italic', paddingLeft: '85px', color: '#666' }}>{flight.notes}</div>}
              </div>
            ))}
          </div>
        </CardWrapper>
      </React.Fragment>
    ))
  }

  if (card === 'hotels') {
    if (hotels.length === 0) return <EmptyCardState card="hotels" />
    const chunks = chunkArray(hotels, 3)
    return chunks.map((chunk, index) => (
      <React.Fragment key={index}>
        <CardWrapper side="FRONT" page={index + 1} total={chunks.length}>
          <CardHeader title="🏨 Hotels" sub={tripTitle} pageLabel={chunks.length > 1 ? `${index + 1}/${chunks.length}` : undefined} />
          <div style={{ marginTop: '4px' }}>
            {chunk.map(hotel => (
              <div key={hotel.id} style={{ marginBottom: '8px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700 }}>{hotel.name}</div>
                <div style={{ fontSize: '10px', color: '#3D3020' }}>{hotel.address}</div>
                <div style={{ fontSize: '10px', color: '#6E4C10' }}>Check-in: {hotel.check_in_date ? new Date(`${hotel.check_in_date}T00:00:00`).toLocaleDateString('en-US') : '—'}</div>
              </div>
            ))}
          </div>
        </CardWrapper>
        <CardWrapper side="BACK" page={index + 1} total={chunks.length}>
          <CardHeader title="🏨 Hotels — Confirmations" sub="Reference" pageLabel={chunks.length > 1 ? `${index + 1}/${chunks.length}` : undefined} />
          <div style={{ marginTop: '4px' }}>
            {chunk.map(hotel => <CardRow key={hotel.id} label={hotel.name ?? '—'} value={hotel.confirmation_number || '—'} />)}
          </div>
        </CardWrapper>
      </React.Fragment>
    ))
  }

  if (card === 'transportation') {
    if (transportation.length === 0) return <EmptyCardState card="transportation" />
    const chunks = chunkArray(transportation, 3)
    return chunks.map((chunk, index) => (
      <React.Fragment key={index}>
        <CardWrapper side="FRONT" page={index + 1} total={chunks.length}>
          <CardHeader title="🚍 Transportation" sub={tripTitle} pageLabel={chunks.length > 1 ? `${index + 1}/${chunks.length}` : undefined} />
          <div style={{ marginTop: '4px' }}>
            {chunk.map(item => (
              <div key={item.id} style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700 }}>
                  <span>{item.provider || item.type || 'Transportation'}</span>
                  <span style={{ color: '#6E4C10' }}>{item.confirmation_number}</span>
                </div>
                <div style={{ fontSize: '10px', color: '#3D3020' }}>
                  {item.origin && item.destination ? `${item.origin} → ${item.destination}` : item.origin || item.destination || ''}
                  {item.departure_time && ` | ${formatTime(item.departure_time)}`}
                </div>
              </div>
            ))}
          </div>
        </CardWrapper>
        <CardWrapper side="BACK" page={index + 1} total={chunks.length}>
          <CardHeader title="🚍 Transportation — Details" sub="Reference" pageLabel={chunks.length > 1 ? `${index + 1}/${chunks.length}` : undefined} />
          <div style={{ marginTop: '4px' }}>
            {chunk.map(item => (
              <div key={item.id} style={{ marginBottom: '10px' }}>
                <CardRow label={item.provider || item.type || 'Ref'} value={`${item.phone || 'No phone'} ${item.cost ? `• ${item.cost}` : ''}`} />
                {item.notes && <div style={{ fontSize: '9px', fontStyle: 'italic', paddingLeft: '85px', color: '#666' }}>{item.notes}</div>}
              </div>
            ))}
          </div>
        </CardWrapper>
      </React.Fragment>
    ))
  }

  if (card === 'restaurants') {
    if (restaurants.length === 0) return <EmptyCardState card="restaurants" />
    const chunks = chunkArray(restaurants, 3)
    return chunks.map((chunk, index) => (
      <React.Fragment key={index}>
        <CardWrapper side="FRONT" page={index + 1} total={chunks.length}>
          <CardHeader title="🍽️ Restaurants" sub={tripTitle} pageLabel={chunks.length > 1 ? `${index + 1}/${chunks.length}` : undefined} />
          <div style={{ marginTop: '4px' }}>
            {chunk.map(restaurant => (
              <div key={restaurant.id} style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700 }}>
                  <span>{restaurant.name}</span>
                  <span style={{ color: '#6E4C10' }}>{restaurant.confirmation_number}</span>
                </div>
                <div style={{ fontSize: '10px', color: '#3D3020' }}>
                  {restaurant.address} | {restaurant.reservation_time ? formatTime(restaurant.reservation_time) : 'No time'}
                </div>
              </div>
            ))}
          </div>
        </CardWrapper>
        <CardWrapper side="BACK" page={index + 1} total={chunks.length}>
          <CardHeader title="🍽️ Restaurants — Details" sub="Reference" pageLabel={chunks.length > 1 ? `${index + 1}/${chunks.length}` : undefined} />
          <div style={{ marginTop: '4px' }}>
            {chunk.map(restaurant => (
              <div key={restaurant.id} style={{ marginBottom: '10px' }}>
                <CardRow label={restaurant.name ?? '—'} value={restaurant.phone || 'No phone'} />
                {restaurant.notes && <div style={{ fontSize: '9px', fontStyle: 'italic', paddingLeft: '85px', color: '#666' }}>{restaurant.notes}</div>}
              </div>
            ))}
          </div>
        </CardWrapper>
      </React.Fragment>
    ))
  }

  if (card === 'key-info') {
    if (keyInfo.length === 0) return <EmptyCardState card="key info" />
    return (
      <CardWrapper side="FRONT" page={1} total={1}>
        <CardHeader title="🔑 Key Info" sub={tripTitle} />
        <div style={{ marginTop: '10px' }}>
          {keyInfo.map(item => <CardRow key={item.id} label={item.label ?? '—'} value={item.value ?? '—'} />)}
        </div>
      </CardWrapper>
    )
  }

  const selectedDays = card === 'daily'
    ? days
    : days.filter(day => day.day_number === Number(card.split('-')[1]))
  if (selectedDays.length === 0) return <EmptyCardState card="daily" />

  return selectedDays.map(day => {
    const dayRows = itineraryRows.filter(row => row.day_id === day.id).map(row => ({
        id: row.id, title: row.title, start_time: row.start_time, start_timezone: row.start_timezone,
        is_all_day: row.is_all_day, is_approx: row.is_approx, description: row.description,
      })).sort((a, b) => {
      if (a.is_all_day !== b.is_all_day) return a.is_all_day ? -1 : 1
      return (a.start_time ?? '').localeCompare(b.start_time ?? '')
    })
    const chunks = dayRows.length > 0 ? chunkArray(dayRows, 6) : [[] as typeof dayRows]
    return chunks.map((chunk, index) => (
      <React.Fragment key={`${day.id}-${index}`}>
        <CardWrapper side="FRONT" page={index + 1} total={chunks.length}>
          <CardHeader title={`Day ${day.day_number}: ${stripEmojiForPrint(day.title ?? '')}`} sub={formatCardDate(day.day_date)} pageLabel={chunks.length > 1 ? `${index + 1}/${chunks.length}` : undefined} />
          <div style={{ marginTop: '4px' }}>
            {chunk.length > 0 ? chunk.map(row => (
              <div key={row.id} style={{ display: 'flex', gap: '8px', marginBottom: '4px', fontSize: '10px' }}>
                <span style={{ fontWeight: 700, color: '#6E4C10', minWidth: '40px' }}>
                  {row.is_all_day ? 'All day' : row.start_time ? `${row.is_approx ? '≈ ' : ''}${formatTime(row.start_time, row.start_timezone)}` : 'Time TBD'}
                </span>
                <span>{stripEmojiForPrint(row.title ?? '')}</span>
              </div>
            )) : <p style={{ fontSize: '11px', color: '#666' }}>No rows scheduled for this day.</p>}
          </div>
        </CardWrapper>
        <CardWrapper side="BACK" page={index + 1} total={chunks.length}>
          <CardHeader title={`Day ${day.day_number} — Details`} sub="Reference" pageLabel={chunks.length > 1 ? `${index + 1}/${chunks.length}` : undefined} />
          <div style={{ marginTop: '8px' }}>
            {chunk.some(row => row.description) ? chunk.filter(row => row.description).map(row => (
              <div key={row.id} style={{ fontSize: '9px', lineHeight: 1.4, marginBottom: '6px' }}>
                <strong>{stripEmojiForPrint(row.title ?? '')}:</strong> {stripEmojiForPrint(row.description ?? '')}
              </div>
            )) : <p style={{ fontSize: '10px', lineHeight: 1.5 }}>No detailed notes for this card.</p>}
          </div>
        </CardWrapper>
      </React.Fragment>
    ))
  })
}
