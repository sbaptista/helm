'use client';

import React, { useEffect, useState } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface PrintExportModalProps {
  open: boolean;
  onClose: () => void;
  tripId: string;
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

const PRESETS: Record<'travel' | 'itinerary' | 'full', PacketSections> = {
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

const CARD_OPTIONS = [
  { value: 'flights', label: 'flights', icon: '✈️' },
  { value: 'hotels', label: 'hotels', icon: '🏨' },
  { value: 'transportation', label: 'transportation', icon: '🚍' },
  { value: 'restaurants', label: 'restaurants', icon: '🍽️' },
  { value: 'key-info', label: 'Key Info', icon: '🔑' },
  { value: 'daily', label: 'daily itinerary', icon: '🗓️' },
] as const;

export function PrintExportModal({
  open,
  onClose,
  tripId,
}: PrintExportModalProps) {
  const [activeTab, setActiveTab] = useState<PrintTab>('packet');
  const [isIPad, setIsIPad] = useState(false);
  const [sections, setSections] = useState<PacketSections>(PRESETS.travel);
  const [activePreset, setActivePreset] = useState<'travel' | 'itinerary' | 'full' | null>('travel');
  const [selectedCard, setSelectedCard] = useState<string>('flights');

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const ua = navigator.userAgent;
      setIsIPad(/iPad/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const handlePreset = (name: 'travel' | 'itinerary' | 'full') => {
    setSections(PRESETS[name]);
    setActivePreset(name);
  };

  const toggleSection = (key: keyof PacketSections) => {
    if (key === 'detail') return;
    setSections(prev => ({ ...prev, [key]: !prev[key] }));
    setActivePreset(null);
  };

  const openPrintPage = (query: URLSearchParams) => {
    window.open(`/advisor/trips/${tripId}/print?${query.toString()}`, '_blank');
    onClose();
  };

  const handleExecutePrint = () => {
    const query = new URLSearchParams();
    Object.entries(sections).forEach(([key, value]) => {
      if (typeof value === 'boolean' && value) query.append(key, '1');
      if (key === 'detail') query.append('detail', value);
    });
    openPrintPage(query);
  };

  const handleOpenCardPrint = () => {
    openPrintPage(new URLSearchParams({ mode: 'cards', card: selectedCard }));
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
          <button onClick={() => setActiveTab('packet')} style={{ flex: 1, minHeight: '44px', padding: '10px', borderRadius: 'var(--r)', fontSize: '13px', fontWeight: 700, background: activeTab === 'packet' ? 'var(--navy)' : 'var(--bg3)', color: activeTab === 'packet' ? 'var(--cream)' : 'var(--text3)', border: 'none', cursor: 'pointer' }}>Full Packet (8.5×11)</button>
          <button onClick={() => setActiveTab('cards')} style={{ flex: 1, minHeight: '44px', padding: '10px', borderRadius: 'var(--r)', fontSize: '13px', fontWeight: 700, background: activeTab === 'cards' ? 'var(--navy)' : 'var(--bg3)', color: activeTab === 'cards' ? 'var(--cream)' : 'var(--text3)', border: 'none', cursor: 'pointer' }}>Reference Cards (3×5)</button>
        </div>

        {activeTab === 'packet' ? (
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gold-text)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Presets</div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
              {(['travel', 'itinerary', 'full'] as const).map(preset => (
                <button key={preset} onClick={() => handlePreset(preset)} style={{ flex: 1, minHeight: '44px', padding: '8px', borderRadius: 'var(--r)', fontSize: '12px', fontWeight: 600, background: activePreset === preset ? 'var(--gold)' : 'var(--bg2)', color: activePreset === preset ? 'var(--cream)' : 'var(--text2)', border: `1px solid ${activePreset === preset ? 'var(--gold)' : 'var(--border2)'}`, cursor: 'pointer' }}>
                  {preset} {preset === 'travel' ? 'Packet' : preset === 'itinerary' ? 'Detail' : 'Planner'}
                </button>
              ))}
            </div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gold-text)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Sections</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {Object.keys(sections).filter(key => key !== 'detail').map(key => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px', minHeight: '44px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={sections[key as keyof PacketSections] as boolean} onChange={() => toggleSection(key as keyof PacketSections)} style={{ width: '20px', height: '20px', accentColor: 'var(--gold)' }} />
                  <span style={{ fontSize: '14px', color: 'var(--text)', textTransform: 'capitalize' }}>{key === 'keyinfo' ? 'Key Info' : key}</span>
                </label>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gold-text)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Reference Cards</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {CARD_OPTIONS.map(card => (
                <button
                  key={card.value}
                  onClick={() => setSelectedCard(card.value)}
                  style={{ minHeight: '44px', padding: '8px 16px', borderRadius: '22px', fontSize: '13px', fontWeight: 600, background: selectedCard === card.value ? 'var(--gold)' : 'var(--bg2)', color: selectedCard === card.value ? 'var(--cream)' : 'var(--text3)', border: `1px solid ${selectedCard === card.value ? 'var(--gold)' : 'var(--border2)'}`, cursor: 'pointer' }}
                >
                  {card.icon} {card.label}
                </button>
              ))}
            </div>
            <p style={{ margin: '16px 0 0', fontSize: '13px', lineHeight: 1.5, color: 'var(--text3)' }}>
              A new page will prepare and download an exact-size 3×5 PDF. Progress will be shown while each card is captured.
            </p>
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        {activeTab === 'packet' ? (
          <Button onClick={handleExecutePrint} disabled={isIPad}>Open Print Page</Button>
        ) : (
          <Button onClick={handleOpenCardPrint} disabled={isIPad || !selectedCard}>Prepare 3×5 PDF</Button>
        )}
      </ModalFooter>
    </Modal>
  );
}
