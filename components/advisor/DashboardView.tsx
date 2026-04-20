'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ToastProvider } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { TripCard } from '@/components/advisor/TripCard';
import { CreateTripModal } from '@/components/advisor/CreateTripModal';
import { VERSION } from '@/lib/version';
import { createClient } from '@/lib/supabase/client';
import type { Trip, TripStatus } from '@/types/trips';

type FilterValue = 'all' | TripStatus;

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: 'all',      label: 'All'      },
  { value: 'active',   label: 'Active'   },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'archived', label: 'Archived' },
];

interface DashboardViewProps {
  trips: Trip[];
  userEmail: string;
  fetchError?: string | null;
}

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  let bg = 'transparent';
  let color = 'var(--text2)';
  let border = 'var(--border2)';

  if (active) {
    bg = 'var(--navy)';
    color = '#ffffff';
    border = 'var(--navy)';
  } else if (hovered) {
    bg = 'var(--bg3)';
    border = 'var(--border)';
  }

  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      style={{
        fontSize: '12px',
        fontWeight: 700,
        fontFamily: "'Lato', sans-serif",
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        padding: '6px 16px',
        borderRadius: '20px',
        border: `1px solid ${border}`,
        background: bg,
        color,
        cursor: 'pointer',
        minHeight: '44px',
        transition: 'background var(--transition), color var(--transition), border-color var(--transition)',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {label}
    </button>
  );
}

function EmptyState({ onCreateTrip }: { onCreateTrip: () => void }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '80px 24px',
        gap: '16px',
      }}
    >
      {/* Decorative compass */}
      <div
        aria-hidden="true"
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--gold), var(--gold2))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '8px',
          opacity: 0.85,
        }}
      >
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
          <circle cx="14" cy="14" r="11" stroke="white" strokeOpacity="0.6" strokeWidth="1.5" />
          <path d="M14 6v2M14 20v2M6 14h2M20 14h2" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M14 10l2.5 4-2.5 4-2.5-4 2.5-4z" fill="white" />
        </svg>
      </div>

      <h2
        style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '28px',
          fontWeight: 600,
          color: 'var(--navy)',
          lineHeight: 1.2,
        }}
      >
        Your first trip awaits
      </h2>

      <p
        style={{
          fontSize: '15px',
          color: 'var(--text3)',
          maxWidth: '320px',
          lineHeight: 1.6,
        }}
      >
        Create your first itinerary and start building unforgettable journeys for your clients.
      </p>

      <Button variant="primary" onClick={onCreateTrip} style={{ marginTop: '8px' }}>
        ＋ Create Trip
      </Button>
    </div>
  );
}

function FilteredEmptyState() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '60px 24px',
        gap: '12px',
        textAlign: 'center',
      }}
    >
      <p style={{ fontSize: '15px', color: 'var(--text3)' }}>No trips match this filter.</p>
    </div>
  );
}

export function DashboardView({ trips, userEmail, fetchError }: DashboardViewProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterValue>('all');
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = filter === 'all' ? trips : trips.filter((t) => t.status === filter);

  const handleSuccess = () => {
    router.refresh();
  };

  async function handleSignOut() {
    // AUTH BYPASS — restore supabase.auth.signOut() when auth is re-enabled
  }

  const tripCount = trips.length;

  return (
    <ToastProvider>
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        {/* Fixed header */}
        <header
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 100,
            height: `calc(64px + var(--sat))`,
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
              justifyContent: 'space-between',
            }}
          >
            {/* Left: wordmark */}
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

            {/* Right: email + New Trip (desktop only) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              {userEmail && (
                <span
                  style={{
                    fontSize: '14px',
                    color: 'var(--text3)',
                    display: 'none', // shown via media query override in style tag below
                  }}
                  className="helm-advisor-email"
                >
                  {userEmail}
                </span>
              )}
              <div className="helm-new-trip-btn">
                <Button
                  variant="primary"
                  onClick={() => setModalOpen(true)}
                >
                  ＋ New Trip
                </Button>
              </div>
              <button
                onClick={handleSignOut}
                style={{
                  fontFamily: "'Lato', sans-serif",
                  fontSize: '13px',
                  fontWeight: 700,
                  color: 'var(--text3)',
                  background: 'none',
                  border: '1px solid var(--border2)',
                  borderRadius: 'var(--r)',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  minHeight: '44px',
                }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </header>

        {/* Responsive header padding & hide/show helpers */}
        <style>{`
          @media (max-width: 1023px) {
            .helm-header-inner { padding: 0 24px !important; }
          }
          @media (max-width: 767px) {
            .helm-header-inner { padding: 0 16px !important; }
            .helm-new-trip-btn { display: none !important; }
          }
          @media (min-width: 768px) {
            .helm-advisor-email { display: block !important; }
          }
        `}</style>

        {/* Main content */}
        <main
          style={{
            paddingTop: `calc(64px + var(--sat) + 40px)`,
            paddingBottom: `calc(40px + var(--sab))`,
            maxWidth: '1200px',
            margin: '0 auto',
            paddingLeft: '48px',
            paddingRight: '48px',
          }}
          className="helm-main-content"
        >
          <style>{`
            @media (max-width: 1023px) {
              .helm-main-content { padding-left: 24px !important; padding-right: 24px !important; }
            }
            @media (max-width: 767px) {
              .helm-main-content { padding-left: 16px !important; padding-right: 16px !important; }
            }
          `}</style>

          {/* Page title row */}
          <div style={{ marginBottom: '28px' }}>
            <div style={{ display: 'inline-block', marginBottom: '8px' }}>
              <h1
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: '32px',
                  fontWeight: 600,
                  color: 'var(--navy)',
                  lineHeight: 1.2,
                  marginBottom: '6px',
                }}
              >
                Your Trips
              </h1>
              {/* Gold underline accent */}
              <div
                aria-hidden="true"
                style={{
                  width: '40px',
                  height: '3px',
                  background: 'linear-gradient(90deg, var(--gold), var(--gold2))',
                  borderRadius: '2px',
                }}
              />
            </div>
            <p style={{ fontSize: '14px', color: 'var(--text3)', marginTop: '6px' }}>
              {tripCount === 0
                ? 'No trips yet'
                : `${tripCount} ${tripCount === 1 ? 'trip' : 'trips'}`}
            </p>
          </div>

          {/* Fetch error banner */}
          {fetchError && (
            <div
              role="alert"
              style={{
                padding: '14px 18px',
                background: 'rgba(139,32,32,0.06)',
                border: '1px solid rgba(139,32,32,0.2)',
                borderRadius: 'var(--r)',
                fontSize: '14px',
                color: 'var(--red)',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <span style={{ flex: 1 }}>{fetchError}</span>
              <Button variant="ghost" size="sm" onClick={() => router.refresh()}>
                Retry
              </Button>
            </div>
          )}

          {/* Filter pills */}
          {trips.length > 0 && (
            <div
              style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '28px',
                flexWrap: 'wrap',
              }}
            >
              {FILTERS.map((f) => (
                <FilterPill
                  key={f.value}
                  label={f.label}
                  active={filter === f.value}
                  onClick={() => setFilter(f.value)}
                />
              ))}
            </div>
          )}

          {/* Trip grid or empty states */}
          {trips.length === 0 ? (
            <EmptyState onCreateTrip={() => setModalOpen(true)} />
          ) : filtered.length === 0 ? (
            <FilteredEmptyState />
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '20px',
              }}
              className="helm-trip-grid"
            >
              <style>{`
                @media (max-width: 1023px) {
                  .helm-trip-grid { grid-template-columns: repeat(2, 1fr) !important; }
                }
                @media (max-width: 767px) {
                  .helm-trip-grid { grid-template-columns: 1fr !important; }
                }
              `}</style>
              {filtered.map((trip) => (
                <TripCard key={trip.id} trip={trip} />
              ))}
            </div>
          )}
        </main>

        {/* Version footer */}
        <footer
          style={{
            textAlign: 'center',
            paddingBottom: `calc(24px + var(--sab))`,
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
            v{VERSION}
          </span>
        </footer>

        {/* Mobile FAB — visible only <768px */}
        <button
          aria-label="Create new trip"
          onClick={() => setModalOpen(true)}
          className="helm-fab"
          style={{
            position: 'fixed',
            bottom: `calc(20px + var(--sab))`,
            right: '20px',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'var(--gold)',
            border: 'none',
            color: 'var(--cream)',
            fontSize: '24px',
            lineHeight: 1,
            cursor: 'pointer',
            display: 'none', // shown only on mobile via media query
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 90,
            transition: 'background var(--transition), transform var(--transition)',
          }}
        >
          <style>{`
            @media (max-width: 767px) {
              .helm-fab { display: flex !important; }
            }
            .helm-fab:hover { background: var(--gold2) !important; transform: scale(1.05); }
            .helm-fab:active { transform: scale(0.97); }
          `}</style>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
            <path d="M11 4v14M4 11h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </button>

        {/* Trip creation modal / bottom sheet */}
        <CreateTripModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSuccess={handleSuccess}
        />
      </div>
    </ToastProvider>
  );
}
