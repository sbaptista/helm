'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { VERSION } from '@/lib/version';
import type { Trip } from '@/types/trips';

const TABS = [
  'Itinerary',
  'Flights',
  'Hotels',
  'Transportation',
  'Restaurants',
  'Checklist',
  'Packing',
  'Key Info',
] as const;

type Tab = typeof TABS[number];

function formatDateRange(departure: string, returnDate: string): string {
  const dep = new Date(departure + 'T00:00:00');
  const ret = new Date(returnDate + 'T00:00:00');
  const sameYear = dep.getFullYear() === ret.getFullYear();
  const depStr = dep.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
  const retStr = ret.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  return `${depStr} – ${retStr}`;
}

interface TripDetailViewProps {
  trip: Trip;
}

export function TripDetailView({ trip }: TripDetailViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('Itinerary');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Header */}
      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          height: 'calc(64px + var(--sat))',
          paddingTop: 'var(--sat)',
          background: 'var(--bg2)',
          borderBottom: '1px solid var(--border2)',
          boxShadow: 'var(--shadow)',
          display: 'flex',
          alignItems: 'flex-end',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '0 48px',
            height: '64px',
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
          }}
          className="helm-header-inner"
        >
          {/* Back button */}
          <button
            onClick={() => router.push('/advisor/dashboard')}
            aria-label="Back to dashboard"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text3)',
              fontFamily: "'Lato', sans-serif",
              fontSize: '14px',
              padding: '4px 0',
              flexShrink: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Dashboard
          </button>

          {/* Divider */}
          <span aria-hidden="true" style={{ color: 'var(--border)', fontSize: '18px', lineHeight: 1, userSelect: 'none' }}>/</span>

          {/* Wordmark */}
          <span
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: '24px',
              fontWeight: 400,
              color: 'var(--navy)',
              letterSpacing: '3px',
              textTransform: 'uppercase',
              userSelect: 'none',
            }}
          >
            Helm
          </span>
        </div>
        <style>{`
          @media (max-width: 1023px) { .helm-header-inner { padding: 0 24px !important; } }
          @media (max-width: 767px)  { .helm-header-inner { padding: 0 16px !important; } }
        `}</style>
      </header>

      {/* Main */}
      <main
        style={{
          paddingTop: 'calc(64px + var(--sat))',
          maxWidth: '1200px',
          margin: '0 auto',
          paddingLeft: '48px',
          paddingRight: '48px',
          paddingBottom: 'calc(48px + var(--sab))',
        }}
        className="helm-detail-main"
      >
        <style>{`
          @media (max-width: 1023px) { .helm-detail-main { padding-left: 24px !important; padding-right: 24px !important; } }
          @media (max-width: 767px)  { .helm-detail-main { padding-left: 16px !important; padding-right: 16px !important; } }
        `}</style>

        {/* Trip hero */}
        <div
          style={{
            padding: '40px 0 32px',
            borderBottom: '1px solid var(--border2)',
            marginBottom: '0',
          }}
        >
          <h1
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: '40px',
              fontWeight: 600,
              color: 'var(--navy)',
              lineHeight: 1.15,
              marginBottom: '8px',
            }}
          >
            {trip.title}
          </h1>

          <p
            style={{
              fontSize: '16px',
              color: 'var(--text2)',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              marginBottom: '10px',
            }}
          >
            <span aria-hidden="true" style={{ fontSize: '14px' }}>📍</span>
            {trip.destination}
          </p>

          <p
            style={{
              fontSize: '15px',
              color: 'var(--gold-text)',
              fontWeight: 700,
              fontFamily: "'Lato', sans-serif",
            }}
          >
            {formatDateRange(trip.departure_date, trip.return_date)}
          </p>
        </div>

        {/* Tab row */}
        <div
          style={{
            display: 'flex',
            gap: '0',
            borderBottom: '1px solid var(--border2)',
            overflowX: 'auto',
            scrollbarWidth: 'none',
          }}
          className="helm-tab-row"
        >
          <style>{`
            .helm-tab-row::-webkit-scrollbar { display: none; }
          `}</style>
          {TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                aria-selected={isActive}
                role="tab"
                style={{
                  padding: '14px 18px',
                  background: 'none',
                  border: 'none',
                  borderBottom: isActive ? '2px solid var(--navy)' : '2px solid transparent',
                  cursor: 'pointer',
                  fontFamily: "'Lato', sans-serif",
                  fontSize: '13px',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  color: isActive ? 'var(--navy)' : 'var(--text3)',
                  whiteSpace: 'nowrap',
                  transition: 'color var(--transition), border-color var(--transition)',
                  marginBottom: '-1px',
                  flexShrink: 0,
                }}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div
          style={{
            paddingTop: '48px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            textAlign: 'center',
            minHeight: '240px',
          }}
        >
          <p
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: '24px',
              fontWeight: 400,
              color: 'var(--navy)',
              opacity: 0.5,
            }}
          >
            {activeTab}
          </p>
          <p
            style={{
              fontFamily: "'Lato', sans-serif",
              fontSize: '14px',
              color: 'var(--text3)',
            }}
          >
            Coming soon
          </p>
        </div>
      </main>

      {/* Version footer */}
      <footer
        style={{
          textAlign: 'center',
          paddingBottom: 'calc(24px + var(--sab))',
          paddingTop: '8px',
        }}
      >
        <span
          style={{
            fontSize: '11px',
            fontFamily: "'Lato', sans-serif",
            color: 'var(--text3)',
            opacity: 0.5,
            letterSpacing: '0.04em',
          }}
        >
          v{VERSION.version}
        </span>
      </footer>

    </div>
  );
}
