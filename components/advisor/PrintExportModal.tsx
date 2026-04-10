'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { stripEmojiForPrint, generate3x5CardPDF, chunkArray } from '@/lib/printing/printing-service';
import { CardWrapper, CardHeader, CardRow } from '@/components/advisor/print/CardTemplates';

interface PrintExportModalProps {
  open: boolean;
  onClose: () => void;
  tripId: string;
  days: { id: string; day_number: number; day_date: string; title: string }[];
  initialFlights?: any[];
  initialHotels?: any[];
  initialKeyInfo?: any[];
  initialItinRows?: any[];
  initialTransportation?: any[];
  initialRestaurants?: any[];
  tripTitle: string;
}

type PrintTab = 'packet' | 'cards';

interface PacketSections {
  overview: boolean;
  itinerary: boolean;
  keyinfo: boolean;
  hotels: boolean;
  flights: boolean;
  transport: boolean;
  restaurants: boolean;
  todo: boolean;
  packing: boolean;
  detail: 'summary' | 'full';
}

const PRESETS: Record<string, PacketSections> = {
  travel: {
    overview: true, itinerary: true, keyinfo: true, hotels: true, flights: true,
    transport: true, restaurants: true, todo: false, packing: false, detail: 'summary',
  },
  itinerary: {
    overview: false, itinerary: true, keyinfo: false, hotels: false, flights: false,
    transport: false, restaurants: false, todo: false, packing: false, detail: 'full',
  },
  full: {
    overview: true, itinerary: true, keyinfo: true, hotels: true, flights: true,
    transport: true, restaurants: true, todo: true, packing: true, detail: 'full',
  },
};

export function PrintExportModal({ 
  open, 
  onClose, 
  tripId, 
  tripTitle, 
  days,
  initialFlights = [],
  initialHotels = [],
  initialKeyInfo = [],
  initialItinRows = [],
  initialTransportation = [],
  initialRestaurants = [],
}: PrintExportModalProps) {
  const [activeTab, setActiveTab] = useState<PrintTab>('packet');
  const [isIPad, setIsIPad] = useState(false);
  const [sections, setSections] = useState<PacketSections>(PRESETS.travel);
  const [activePreset, setActivePreset] = useState<'travel' | 'itinerary' | 'full' | null>('travel');
  const [selectedCard, setSelectedCard] = useState<string>('flights');
  const [isGenerating, setIsGenerating] = useState(false);
  const captureLayerRef = useRef<HTMLDivElement>(null);

  const [cardData, setCardData] = useState<{
    flights: any[];
    hotels: any[];
    keyInfo: any[];
    itinRows: any[];
    transportation: any[];
    restaurants: any[];
  }>({ 
    flights: initialFlights, 
    hotels: initialHotels, 
    keyInfo: initialKeyInfo, 
    itinRows: initialItinRows,
    transportation: initialTransportation,
    restaurants: initialRestaurants
  });

  // Keep state in sync with props when modal opens
  useEffect(() => {
    if (open) {
      setCardData({
        flights: initialFlights,
        hotels: initialHotels,
        keyInfo: initialKeyInfo,
        itinRows: initialItinRows,
        transportation: initialTransportation,
        restaurants: initialRestaurants,
      });
    }
  }, [open, initialFlights, initialHotels, initialKeyInfo, initialItinRows, initialTransportation, initialRestaurants]);

  useEffect(() => {
    const checkIPad = () => {
      const ua = navigator.userAgent;
      const isIPadUA = /iPad/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      setIsIPad(isIPadUA);
    };
    checkIPad();
  }, []);

  const handlePreset = (name: 'travel' | 'itinerary' | 'full') => {
    setSections(PRESETS[name]);
    setActivePreset(name);
  };

  const toggleSection = (key: keyof PacketSections) => {
    if (key === 'detail') return;
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
    setActivePreset(null);
  };

  const handleExecutePrint = () => {
    const query = new URLSearchParams();
    Object.entries(sections).forEach(([k, v]) => {
      if (typeof v === 'boolean' && v) query.append(k, '1');
      if (k === 'detail') query.append('detail', v);
    });
    const url = `/advisor/trips/${tripId}/print?${query.toString()}`;
    window.open(url, '_blank');
    onClose();
  };

  const downloadCard = async (cardName: string, elements: HTMLElement[]) => {
    try {
      const filename = `${tripTitle.replace(/\s+/g, '_')}_3x5_${cardName}.pdf`;
      await generate3x5CardPDF(elements, filename);
    } catch (err) {
      console.error('Card generation failed:', err);
      alert('Card generation failed. Ensure jspdf and html2canvas are installed.');
    }
  };

  const handleGenerateCard = async () => {
    if (!captureLayerRef.current) return;
    setIsGenerating(true);
    
    // We render the card into the capture layer momentarily
    // Note: In a production app, we'd use a dedicated offscreen renderer
    // For this implementation, we'll reach into the DOM nodes created by the card components
    const pages = Array.from(captureLayerRef.current.querySelectorAll<HTMLElement>('.card-page'));
    
    if (pages.length > 0) {
      await downloadCard(selectedCard, pages);
    } else {
      alert('No card content generated to capture.');
    }
    
    setIsGenerating(false);
  };

  return (
    <Modal open={open} onClose={onClose}>
      <ModalHeader title="🖨️ Print / Export Trip" onClose={onClose} />
      <ModalBody>
        {isIPad && (
          <div style={{ background: 'var(--gold3)', color: 'var(--gold-text)', padding: '12px 16px', borderRadius: 'var(--r)', fontSize: '13px', fontWeight: 600, marginBottom: '20px', border: '1px solid var(--gold)' }}>
            ⚠️ Print / PDF is not supported on iPad. Please use your Mac to print or save as PDF.
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          <button onClick={() => setActiveTab('packet')} style={{ flex: 1, padding: '10px', borderRadius: 'var(--r)', fontSize: '13px', fontWeight: 700, background: activeTab === 'packet' ? 'var(--navy)' : 'var(--bg3)', color: activeTab === 'packet' ? 'var(--cream)' : 'var(--text3)', border: 'none', cursor: 'pointer' }}>Full Packet (8.5×11)</button>
          <button onClick={() => setActiveTab('cards')} style={{ flex: 1, padding: '10px', borderRadius: 'var(--r)', fontSize: '13px', fontWeight: 700, background: activeTab === 'cards' ? 'var(--navy)' : 'var(--bg3)', color: activeTab === 'cards' ? 'var(--cream)' : 'var(--text3)', border: 'none', cursor: 'pointer' }}>Reference Cards (3×5)</button>
        </div>

        {activeTab === 'packet' ? (
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gold-text)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Presets</div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
              {(['travel', 'itinerary', 'full'] as const).map((p) => (
                <button key={p} onClick={() => handlePreset(p)} style={{ flex: 1, padding: '8px', borderRadius: 'var(--r)', fontSize: '12px', fontWeight: 600, background: activePreset === p ? 'var(--gold)' : 'var(--bg2)', color: activePreset === p ? 'var(--cream)' : 'var(--text2)', border: `1px solid ${activePreset === p ? 'var(--gold)' : 'var(--border2)'}`, cursor: 'pointer' }}>
                  {p} {p === 'travel' ? 'Packet' : p === 'itinerary' ? 'Detail' : 'Planner'}
                </button>
              ))}
            </div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gold-text)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Sections</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {Object.keys(sections).filter(k => k !== 'detail').map((key) => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={sections[key as keyof PacketSections] as boolean} onChange={() => toggleSection(key as keyof PacketSections)} style={{ width: '18px', height: '18px' }} />
                  <span style={{ fontSize: '14px', color: 'var(--text)', textTransform: 'capitalize' }}>{key === 'keyinfo' ? 'Key Info' : key}</span>
                </label>
              ))}
            </div>
          </div>
        ) : (
          <div>
             <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gold-text)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Reference Cards</div>
             <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px' }}>
              {['flights', 'hotels', 'transportation', 'restaurants', 'contacts'].map((card) => (
                <button key={card} onClick={() => setSelectedCard(card)} style={{ padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 600, background: selectedCard === card ? 'var(--gold)' : 'var(--bg2)', color: selectedCard === card ? 'var(--cream)' : 'var(--text3)', border: `1px solid ${selectedCard === card ? 'var(--gold)' : 'var(--border2)'}`, cursor: 'pointer' }}>
                  {card === 'flights' ? '✈️ ' : card === 'hotels' ? '🏨 ' : card === 'transportation' ? '🚍 ' : card === 'restaurants' ? '🍽️ ' : '📋 '}{card}
                </button>
              ))}
            </div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gold-text)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Daily Cards</div>
            <select value={selectedCard.startsWith('day-') ? selectedCard : ''} onChange={(e) => setSelectedCard(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: 'var(--r)', border: '1px solid var(--border2)', background: 'var(--bg2)', fontSize: '14px' }}>
              <option value="">— Select a day —</option>
              {days.map((d) => (
                <option key={d.id} value={`day-${d.day_number}`}>Day {d.day_number}: {d.title}</option>
              ))}
            </select>
          </div>
        )}

        {/* Hidden capture area (off-screen) */}
        <div style={{ position: 'fixed', left: '-9999px', top: 0, pointerEvents: 'none' }} ref={captureLayerRef}>
          {selectedCard === 'flights' && cardData.flights.length > 0 && (
            <>
              {chunkArray(cardData.flights, 4).map((chunk, idx, all) => (
                <React.Fragment key={idx}>
                  <CardWrapper side="FRONT" page={idx + 1} total={all.length}>
                    <CardHeader title="✈️ Flights" sub={tripTitle} pageLabel={all.length > 1 ? `${idx + 1}/${all.length}` : undefined} />
                    <div style={{ marginTop: '4px' }}>
                      {chunk.map((f) => (
                        <div key={f.id} style={{ marginBottom: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700 }}>
                            <span>{f.flight_number} • {f.airline}</span>
                            <span style={{ color: '#6E4C10' }}>{f.confirmation_number}</span>
                          </div>
                          <div style={{ fontSize: '10px', color: '#3D3020' }}>
                            {f.origin_airport} → {f.destination_airport} | {new Date(f.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardWrapper>
                  <CardWrapper side="BACK" page={idx + 1} total={all.length}>
                    <CardHeader title="✈️ Flights — Details" sub="Reference" pageLabel={all.length > 1 ? `${idx + 1}/${all.length}` : undefined} />
                    <div style={{ marginTop: '4px' }}>
                      {chunk.map((f) => (
                        <div key={f.id} style={{ marginBottom: '10px' }}>
                          <CardRow label={f.flight_number} value={`${f.cabin_class || 'Economy'} • Seat: ${f.seat_assignment || 'TBD'}`} />
                          {f.notes && <div style={{ fontSize: '9px', fontStyle: 'italic', paddingLeft: '85px', color: '#666' }}>{f.notes}</div>}
                        </div>
                      ))}
                    </div>
                  </CardWrapper>
                </React.Fragment>
              ))}
            </>
          )}

          {selectedCard === 'hotels' && cardData.hotels.length > 0 && (
            <>
              {chunkArray(cardData.hotels, 3).map((chunk, idx, all) => (
                <React.Fragment key={idx}>
                  <CardWrapper side="FRONT" page={idx + 1} total={all.length}>
                    <CardHeader title="🏨 Hotels" sub={tripTitle} pageLabel={all.length > 1 ? `${idx + 1}/${all.length}` : undefined} />
                    <div style={{ marginTop: '4px' }}>
                      {chunk.map((h) => (
                        <div key={h.id} style={{ marginBottom: '8px' }}>
                          <div style={{ fontSize: '11px', fontWeight: 700 }}>{h.name}</div>
                          <div style={{ fontSize: '10px', color: '#3D3020' }}>{h.address}</div>
                          <div style={{ fontSize: '10px', color: '#6E4C10' }}>Check-in: {new Date(h.check_in_date).toLocaleDateString()}</div>
                        </div>
                      ))}
                    </div>
                  </CardWrapper>
                  <CardWrapper side="BACK" page={idx + 1} total={all.length}>
                    <CardHeader title="🏨 Hotels — Confirmations" sub="Reference" pageLabel={all.length > 1 ? `${idx + 1}/${all.length}` : undefined} />
                    <div style={{ marginTop: '4px' }}>
                      {chunk.map((h) => (
                        <CardRow key={h.id} label={h.name} value={h.confirmation_number || '—'} />
                      ))}
                    </div>
                  </CardWrapper>
                </React.Fragment>
              ))}
            </>
          )}

          {selectedCard === 'transportation' && cardData.transportation.length > 0 && (
            <>
              {chunkArray(cardData.transportation, 3).map((chunk, idx, all) => (
                <React.Fragment key={idx}>
                  <CardWrapper side="FRONT" page={idx + 1} total={all.length}>
                    <CardHeader title="🚍 Transportation" sub={tripTitle} pageLabel={all.length > 1 ? `${idx + 1}/${all.length}` : undefined} />
                    <div style={{ marginTop: '4px' }}>
                      {chunk.map((t) => (
                        <div key={t.id} style={{ marginBottom: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700 }}>
                            <span>{t.provider || t.type || 'Transportation'}</span>
                            <span style={{ color: '#6E4C10' }}>{t.confirmation_number}</span>
                          </div>
                          <div style={{ fontSize: '10px', color: '#3D3020' }}>
                            {t.origin && t.destination ? `${t.origin} → ${t.destination}` : t.origin || t.destination || ''}
                            {t.departure_time && ` | ${new Date(t.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardWrapper>
                  <CardWrapper side="BACK" page={idx + 1} total={all.length}>
                    <CardHeader title="🚍 Trans — Details" sub="Reference" pageLabel={all.length > 1 ? `${idx + 1}/${all.length}` : undefined} />
                    <div style={{ marginTop: '4px' }}>
                      {chunk.map((t) => (
                        <div key={t.id} style={{ marginBottom: '10px' }}>
                          <CardRow label={t.provider || t.type || 'Ref'} value={`${t.phone || 'No phone'} ${t.cost ? `• ${t.cost}` : ''}`} />
                          {t.notes && <div style={{ fontSize: '9px', fontStyle: 'italic', paddingLeft: '85px', color: '#666' }}>{t.notes}</div>}
                        </div>
                      ))}
                    </div>
                  </CardWrapper>
                </React.Fragment>
              ))}
            </>
          )}

          {selectedCard === 'restaurants' && cardData.restaurants.length > 0 && (
            <>
              {chunkArray(cardData.restaurants, 3).map((chunk, idx, all) => (
                <React.Fragment key={idx}>
                  <CardWrapper side="FRONT" page={idx + 1} total={all.length}>
                    <CardHeader title="🍽️ Restaurants" sub={tripTitle} pageLabel={all.length > 1 ? `${idx + 1}/${all.length}` : undefined} />
                    <div style={{ marginTop: '4px' }}>
                      {chunk.map((r) => (
                        <div key={r.id} style={{ marginBottom: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700 }}>
                            <span>{r.name}</span>
                            <span style={{ color: '#6E4C10' }}>{r.confirmation_number}</span>
                          </div>
                          <div style={{ fontSize: '10px', color: '#3D3020' }}>
                            {r.address} | {r.reservation_time ? new Date(r.reservation_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'No time'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardWrapper>
                  <CardWrapper side="BACK" page={idx + 1} total={all.length}>
                    <CardHeader title="🍽️ Rest — Details" sub="Reference" pageLabel={all.length > 1 ? `${idx + 1}/${all.length}` : undefined} />
                    <div style={{ marginTop: '4px' }}>
                      {chunk.map((r) => (
                        <div key={r.id} style={{ marginBottom: '10px' }}>
                          <CardRow label={r.name} value={r.phone || 'No phone'} />
                          {r.notes && <div style={{ fontSize: '9px', fontStyle: 'italic', paddingLeft: '85px', color: '#666' }}>{r.notes}</div>}
                        </div>
                      ))}
                    </div>
                  </CardWrapper>
                </React.Fragment>
              ))}
            </>
          )}

          {selectedCard === 'contacts' && (
            <CardWrapper side="FRONT">
              <CardHeader title="📋 Key Contacts" sub={tripTitle} />
              <div style={{ marginTop: '10px' }}>
                {cardData.keyInfo.length > 0 ? (
                  cardData.keyInfo.map((k) => (
                    <CardRow key={k.id} label={k.label} value={k.value} />
                  ))
                ) : (
                  <p style={{ fontSize: '11px', color: '#666' }}>No key information found.</p>
                )}
              </div>
            </CardWrapper>
          )}

          {selectedCard.startsWith('day-') && (
            <>
              {chunkArray(cardData.itinRows, 6).map((chunk, idx, all) => (
                <React.Fragment key={idx}>
                  <CardWrapper side="FRONT" page={idx + 1} total={all.length}>
                    <CardHeader title={`Day ${selectedCard.split('-')[1]}`} sub={tripTitle} pageLabel={all.length > 1 ? `${idx + 1}/${all.length}` : undefined} />
                    <div style={{ marginTop: '4px' }}>
                      {chunk.length > 0 ? (
                        chunk.map((r) => (
                          <div key={r.id} style={{ display: 'flex', gap: '8px', marginBottom: '4px', fontSize: '10px' }}>
                            <span style={{ fontWeight: 700, color: '#6E4C10', minWidth: '40px' }}>
                              {r.start_time ? r.start_time.split('T')[1].substring(0, 5) : '--:--'}
                            </span>
                            <span>{stripEmojiForPrint(r.title)}</span>
                          </div>
                        ))
                      ) : (
                        <p style={{ fontSize: '11px', color: '#666' }}>No rows scheduled for this day.</p>
                      )}
                    </div>
                  </CardWrapper>
                  <CardWrapper side="BACK" page={idx + 1} total={all.length}>
                    <CardHeader title="Daily — Details" sub="Reference" pageLabel={all.length > 1 ? `${idx + 1}/${all.length}` : undefined} />
                    <div style={{ marginTop: '8px' }}>
                      <p style={{ fontSize: '10px', lineHeight: 1.5 }}>{chunk.find(r => r.description)?.description || 'No detailed notes for this card.'}</p>
                    </div>
                  </CardWrapper>
                </React.Fragment>
              ))}
            </>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        {activeTab === 'packet' ? (
          <Button onClick={handleExecutePrint} disabled={isIPad}>Open Print Page</Button>
        ) : (
          <Button onClick={handleGenerateCard} loading={isGenerating} disabled={isIPad || !selectedCard}>Save Card PDF</Button>
        )}
      </ModalFooter>
    </Modal>
  );
}
