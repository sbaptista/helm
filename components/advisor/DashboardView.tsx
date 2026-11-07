'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { TripCard } from '@/components/advisor/TripCard';
import { CreateTripModal } from '@/components/advisor/CreateTripModal';
import { CopyTripModal } from '@/components/advisor/CopyTripModal';
import { PrintExportModal } from '@/components/advisor/PrintExportModal';
import { EditTripModal } from '@/components/advisor/EditTripModal';
import { useDeviceTrips } from '@/hooks/useDeviceTrips';
import HelmVersionLabel from '@/components/ui/HelmVersionLabel';
import UpdateBanner, { BANNER_HEIGHT } from '@/components/ui/UpdateBanner';
import WhatsNewSheet from '@/components/ui/WhatsNewSheet';
import { createClient } from '@/lib/supabase/client';
import type { Trip, TripStatus } from '@/types/trips';
import { useOfflineWarmup } from '@/hooks/useOfflineWarmup';
import { useIsOnline } from '@/hooks/useOnlineStatus';
import { CALENDAR_UNREACHABLE } from '@/lib/trips/clear-codes';

type FilterValue = 'all' | TripStatus;

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: 'all',      label: 'All'      },
  { value: 'draft',    label: 'Draft'    },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'active',   label: 'Active'   },
  { value: 'done',     label: 'Done'     },
  { value: 'archived', label: 'Archived' },
];

interface DashboardViewProps {
  trips: Trip[];
  userEmail: string;
  fetchError?: string | null;
  showSignOut?: boolean;
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

function DashboardViewInner({ trips: serverTrips, userEmail, fetchError, showSignOut = true }: DashboardViewProps) {
  // Titles and destinations edited offline show before they sync.
  const trips = useDeviceTrips(serverTrips);
  const router = useRouter();
  const toast = useToast();
  const [filter, setFilter] = useState<FilterValue>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [whatsNewOpen, setWhatsNewOpen] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(false);

  // Action modal state
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);

  // Delete state
  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Clear state
  const [clearAction, setClearAction] = useState<'download_discard' | 'discard' | null>(null);
  const [clearConfirming, setClearConfirming] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);

  // Google Calendar couldn't be reached while clearing or deleting:
  // offer to go ahead and leave the trip's events (docs/archive-route-plan.md, D3).
  const [calendarRetry, setCalendarRetry] = useState<{ kind: 'clear' | 'delete'; trip: Trip } | null>(null);
  const [calendarRetrying, setCalendarRetrying] = useState(false);

  const filtered = filter === 'all' ? trips : trips.filter((t) => t.status === filter);

  // Upcoming and Active trips are kept on the device for offline reading
  // (docs/offline-editing-plan.md, decision 2); other trips once opened.
  useOfflineWarmup([
    '/advisor/dashboard',
    ...trips.filter((t) => t.status === 'upcoming' || t.status === 'active').map((t) => `/advisor/trips/${t.id}`),
  ]);
  const isOnline = useIsOnline();

  const handleSuccess = () => {
    router.refresh();
  };

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/auth/login';
  }

  function openEdit(trip: Trip) {
    setSelectedTrip(trip);
    setEditOpen(true);
  }

  function openDelete(trip: Trip) {
    setSelectedTrip(trip);
    setDeleteError(null);
    setDeleteConfirming(false);
    setDeleteOpen(true);
  }

  function openCopy(trip: Trip) {
    setSelectedTrip(trip);
    setCopyOpen(true);
  }

  function openClear(trip: Trip) {
    setSelectedTrip(trip);
    setClearAction(null);
    setClearError(null);
    setClearConfirming(false);
    setClearOpen(true);
  }

  function openPrint(trip: Trip) {
    setSelectedTrip(trip);
    setPrintOpen(true);
  }

  async function handleStatusChange(trip: Trip, status: TripStatus) {
    try {
      const res = await fetch(`/api/trips/${trip.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? 'Failed to update status.');
      }
      router.refresh();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Something went wrong.', 'neutral');
    }
  }

  async function handleDelete(skipCalendar = false) {
    if (!selectedTrip) return;
    if (!isOnline) { setDeleteError('This needs a connection. You\'re offline.'); return; }
    setDeleteConfirming(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/trips/${selectedTrip.id}${skipCalendar ? '?skipCalendar=1' : ''}`, { method: 'DELETE' });
      const json = await res.json().catch(() => ({}));
      if (res.status === 409 && json.code === CALENDAR_UNREACHABLE) {
        setDeleteOpen(false);
        setDeleteConfirming(false);
        setCalendarRetry({ kind: 'delete', trip: selectedTrip });
        return;
      }
      if (!res.ok) throw new Error(json.error ?? 'Failed to delete.');
      setDeleteOpen(false);
      setDeleteConfirming(false);
      router.refresh();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Something went wrong.');
      setDeleteConfirming(false);
    }
  }

  async function handleClear(skipCalendar = false) {
    if (!selectedTrip || !clearAction) return;
    if (!isOnline) { setClearError('This needs a connection. You\'re offline.'); return; }
    setClearConfirming(true);
    setClearError(null);
    try {
      const res = await fetch(`/api/trips/${selectedTrip.id}/clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: clearAction, skipCalendar }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 409 && json.code === CALENDAR_UNREACHABLE) {
        setClearOpen(false);
        setClearConfirming(false);
        setCalendarRetry({ kind: 'clear', trip: selectedTrip });
        return;
      }
      if (!res.ok) throw new Error(json.error ?? 'Failed to clear.');

      // Download & discard: every section's data as one JSON file (D2).
      if (clearAction === 'download_discard' && json.backup) {
        const blob = new Blob([JSON.stringify(json.backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const slug = (selectedTrip.title || 'trip').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        a.href = url;
        a.download = `helm-backup-${slug}-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }

      setClearOpen(false);
      setClearConfirming(false);
      toast.show('Trip data cleared', 'neutral');
      router.refresh();
    } catch (err) {
      setClearError(err instanceof Error ? err.message : 'Something went wrong.');
      setClearConfirming(false);
    }
  }

  const tripCount = trips.length;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Fixed header */}
      <header
        style={{
          position: 'fixed',
          top: bannerVisible ? `${BANNER_HEIGHT}px` : '0px',
          left: 0,
          right: 0,
          zIndex: 100,
          height: `calc(64px + var(--sat))`,
          paddingTop: 'var(--sat)',
          transition: 'top 0.3s ease',
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {userEmail && (
              <span
                style={{
                  fontSize: '14px',
                  color: 'var(--text3)',
                  display: 'none',
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
                disabled={!isOnline}
              >
                ＋ New Trip
              </Button>
            </div>
            <button
              onClick={() => setWhatsNewOpen(true)}
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
              Help
            </button>
            {showSignOut && (
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
            )}
          </div>
        </div>
      </header>

      <UpdateBanner onVisibilityChange={setBannerVisible} />
      <WhatsNewSheet open={whatsNewOpen} onClose={() => setWhatsNewOpen(false)} />

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
          paddingTop: `calc(64px + var(--sat) + 40px + ${bannerVisible ? BANNER_HEIGHT : 0}px)`,
          transition: 'padding-top 0.3s ease',
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
            {/* Archived only while a trip still has that status (Archive was removed 2026-11-06). */}
            {FILTERS.filter((f) => f.value !== 'archived' || trips.some((t) => t.status === 'archived')).map((f) => (
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
              <TripCard
                key={trip.id}
                trip={trip}
                onEdit={() => openEdit(trip)}
                onCopy={() => openCopy(trip)}
                onPrint={() => openPrint(trip)}
                onDelete={() => openDelete(trip)}
                onClear={() => openClear(trip)}
                onStatusChange={(status) => handleStatusChange(trip, status)}
              />
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
        <HelmVersionLabel
          style={{
            fontSize: '11px',
            fontFamily: "'Lato', sans-serif",
            color: 'var(--text3)',
            opacity: 0.5,
            letterSpacing: '0.04em',
          }}
        />
      </footer>

      {/* Mobile FAB */}
      <button
        aria-label="Create new trip"
        onClick={() => setModalOpen(true)}
        disabled={!isOnline}
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
          cursor: isOnline ? 'pointer' : 'not-allowed',
          opacity: isOnline ? 1 : 0.4,
          display: 'none',
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

      {/* Create trip modal */}
      <CreateTripModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleSuccess}
      />

      <CopyTripModal
        open={copyOpen}
        sourceTrip={selectedTrip}
        onClose={() => setCopyOpen(false)}
        onSuccess={(tripId) => {
          setCopyOpen(false);
          router.push(`/advisor/trips/${tripId}`);
        }}
      />

      {/* Edit Trip modal */}
      <EditTripModal open={editOpen} onClose={() => setEditOpen(false)} trip={selectedTrip} />

      {/* Delete Trip modal */}
      <Modal open={deleteOpen} onClose={() => { if (!deleteConfirming) setDeleteOpen(false); }}>
        <ModalHeader title="Delete Trip" onClose={() => { if (!deleteConfirming) setDeleteOpen(false); }} />
        <ModalBody>
          <p style={{ fontFamily: "'Lato', sans-serif", fontSize: '15px', color: 'var(--text)', lineHeight: 1.6 }}>
            Are you sure you want to delete <strong>{selectedTrip?.title}</strong>? This will permanently remove the trip and all associated data. This action cannot be undone.
          </p>
          {deleteError && (
            <p style={{ marginTop: '12px', fontSize: '13px', color: 'var(--red)', fontFamily: "'Lato', sans-serif" }}>{deleteError}</p>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setDeleteOpen(false)} disabled={deleteConfirming}>Cancel</Button>
          <Button variant="danger" onClick={() => handleDelete()} disabled={deleteConfirming}>
            {deleteConfirming ? 'Deleting…' : 'Delete trip'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Clear Trip Data modal */}
      <Modal open={clearOpen} onClose={() => { if (!clearConfirming) setClearOpen(false); }}>
        <ModalHeader title="Clear Trip Data" onClose={() => { if (!clearConfirming) setClearOpen(false); }} />
        <ModalBody>
          <p style={{ fontFamily: "'Lato', sans-serif", fontSize: '14px', color: 'var(--text2)', marginBottom: '16px', lineHeight: 1.6 }}>
            Empty <strong>{selectedTrip?.title}</strong>: its itinerary, bookings, checklist, packing and Key Info are removed, along with its events in Google Calendar. The trip itself stays, so you can fill it again.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {([
              { value: 'download_discard', label: 'Download & discard', description: 'Save a backup of everything in the trip as one file, then empty the trip.' },
              { value: 'discard', label: 'Discard data', description: 'Empty the trip without a backup. This can\'t be undone.' },
            ] as const).map(({ value, label, description }) => (
              <button
                key={value}
                onClick={() => setClearAction(value)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: '3px',
                  padding: '14px 16px',
                  minHeight: '44px',
                  borderRadius: 'var(--r)',
                  border: `2px solid ${clearAction === value ? 'var(--navy)' : 'var(--border2)'}`,
                  background: clearAction === value ? 'rgba(10,30,60,0.04)' : 'var(--bg)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'border-color var(--transition), background var(--transition)',
                }}
                disabled={clearConfirming}
              >
                <span style={{ fontFamily: "'Lato', sans-serif", fontSize: '14px', fontWeight: 700, color: 'var(--navy)' }}>{label}</span>
                <span style={{ fontFamily: "'Lato', sans-serif", fontSize: '13px', color: 'var(--text3)', lineHeight: 1.4 }}>{description}</span>
              </button>
            ))}
          </div>
          {clearError && (
            <p style={{ marginTop: '12px', fontSize: '13px', color: 'var(--red)', fontFamily: "'Lato', sans-serif" }}>{clearError}</p>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setClearOpen(false)} disabled={clearConfirming}>Cancel</Button>
          <Button
            variant="danger"
            onClick={() => handleClear()}
            disabled={clearConfirming || !clearAction}
          >
            {clearConfirming ? 'Working…' : 'Confirm'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Google Calendar unreachable: go ahead anyway? */}
      <Modal open={calendarRetry !== null} onClose={() => { if (!calendarRetrying) setCalendarRetry(null); }}>
        <ModalHeader title="Google Calendar Not Reachable" onClose={() => { if (!calendarRetrying) setCalendarRetry(null); }} />
        <ModalBody>
          <p style={{ fontFamily: "'Lato', sans-serif", fontSize: '15px', color: 'var(--text)', lineHeight: 1.6 }}>
            Helm couldn&apos;t remove the events for <strong>{calendarRetry?.trip.title}</strong> from Google Calendar,
            so nothing has been deleted yet. You can try again later, or go ahead and leave its events in Google Calendar.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setCalendarRetry(null)} disabled={calendarRetrying}>Cancel</Button>
          <Button
            variant="danger"
            disabled={calendarRetrying}
            onClick={async () => {
              if (!calendarRetry) return;
              const { kind, trip } = calendarRetry;
              setCalendarRetrying(true);
              setSelectedTrip(trip);
              if (kind === 'clear') await handleClear(true);
              else await handleDelete(true);
              setCalendarRetrying(false);
              setCalendarRetry(null);
            }}
          >
            {calendarRetrying ? 'Working…' : calendarRetry?.kind === 'clear' ? 'Discard anyway' : 'Delete anyway'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Print modal */}
      {selectedTrip && (
        <PrintExportModal
          open={printOpen}
          onClose={() => setPrintOpen(false)}
          tripId={selectedTrip.id}
        />
      )}
    </div>
  );
}

export function DashboardView(props: DashboardViewProps) {
  return (
    <ToastProvider>
      <DashboardViewInner {...props} />
    </ToastProvider>
  );
}
