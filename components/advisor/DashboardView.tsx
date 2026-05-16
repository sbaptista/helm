'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { inputStyle, inputFocusStyle } from '@/components/ui/FormField';
import { TripCard } from '@/components/advisor/TripCard';
import { CreateTripModal } from '@/components/advisor/CreateTripModal';
import { PrintExportModal } from '@/components/advisor/PrintExportModal';
import { VERSION } from '@/lib/version';
import { createClient } from '@/lib/supabase/client';
import type { Trip, TripStatus } from '@/types/trips';

type FilterValue = 'all' | TripStatus;

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: 'all',      label: 'All'      },
  { value: 'draft',    label: 'Draft'    },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'active',   label: 'Active'   },
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

function DashboardViewInner({ trips, userEmail, fetchError, showSignOut = true }: DashboardViewProps) {
  const router = useRouter();
  const toast = useToast();
  const [filter, setFilter] = useState<FilterValue>('all');
  const [modalOpen, setModalOpen] = useState(false);

  // Action modal state
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);

  // Edit form state
  const [editTitle, setEditTitle] = useState('');
  const [editDestination, setEditDestination] = useState('');
  const [editDepartureDate, setEditDepartureDate] = useState('');
  const [editReturnDate, setEditReturnDate] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete state
  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Clear state
  const [clearAction, setClearAction] = useState<'archive' | 'download_clear' | 'discard' | null>(null);
  const [clearConfirming, setClearConfirming] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);

  const filtered = filter === 'all' ? trips : trips.filter((t) => t.status === filter);

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
    setEditTitle(trip.title);
    setEditDestination(trip.destination ?? '');
    setEditDepartureDate(trip.departure_date ?? '');
    setEditReturnDate(trip.return_date ?? '');
    setEditError(null);
    setEditOpen(true);
  }

  function openDelete(trip: Trip) {
    setSelectedTrip(trip);
    setDeleteError(null);
    setDeleteConfirming(false);
    setDeleteOpen(true);
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

  async function handleArchive(trip: Trip) {
    try {
      const res = await fetch(`/api/trips/${trip.id}/clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'archive' }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? 'Failed to archive.');
      }
      toast.show('Trip archived', 'neutral');
      router.refresh();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Something went wrong.', 'neutral');
    }
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

  async function handleEditSave() {
    if (!selectedTrip) return;
    setEditSaving(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/trips/${selectedTrip.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          destination: editDestination,
          departure_date: editDepartureDate,
          return_date: editReturnDate,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to save.');
      setEditOpen(false);
      router.refresh();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedTrip) return;
    setDeleteConfirming(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/trips/${selectedTrip.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to delete.');
      setDeleteOpen(false);
      setDeleteConfirming(false);
      router.refresh();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Something went wrong.');
      setDeleteConfirming(false);
    }
  }

  async function handleClear() {
    if (!selectedTrip || !clearAction) return;
    setClearConfirming(true);
    setClearError(null);
    try {
      const res = await fetch(`/api/trips/${selectedTrip.id}/clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: clearAction }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to clear.');

      if (clearAction === 'download_clear' && json.importJob) {
        const blob = new Blob([JSON.stringify(json.importJob, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `import-${selectedTrip.id}.json`;
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
              >
                ＋ New Trip
              </Button>
            </div>
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
              <TripCard
                key={trip.id}
                trip={trip}
                onEdit={() => openEdit(trip)}
                onPrint={() => openPrint(trip)}
                onDelete={() => openDelete(trip)}
                onArchive={() => handleArchive(trip)}
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

      {/* Mobile FAB */}
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

      {/* Edit Trip modal */}
      <Modal open={editOpen} onClose={() => { if (!editSaving) setEditOpen(false); }}>
        <ModalHeader title="Edit Trip" onClose={() => { if (!editSaving) setEditOpen(false); }} />
        <ModalBody>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontFamily: "'Lato', sans-serif", fontSize: '13px', fontWeight: 700, color: 'var(--text2)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Trip title
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                style={inputStyle()}
                onFocus={(e) => Object.assign(e.currentTarget.style, inputFocusStyle())}
                onBlur={(e) => Object.assign(e.currentTarget.style, inputStyle())}
                disabled={editSaving}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontFamily: "'Lato', sans-serif", fontSize: '13px', fontWeight: 700, color: 'var(--text2)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Destination
              <input
                value={editDestination}
                onChange={(e) => setEditDestination(e.target.value)}
                style={inputStyle()}
                onFocus={(e) => Object.assign(e.currentTarget.style, inputFocusStyle())}
                onBlur={(e) => Object.assign(e.currentTarget.style, inputStyle())}
                disabled={editSaving}
              />
            </label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', fontFamily: "'Lato', sans-serif", fontSize: '13px', fontWeight: 700, color: 'var(--text2)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Departure date
                <input
                  type="date"
                  value={editDepartureDate}
                  onChange={(e) => setEditDepartureDate(e.target.value)}
                  style={inputStyle()}
                  onFocus={(e) => Object.assign(e.currentTarget.style, inputFocusStyle())}
                  onBlur={(e) => Object.assign(e.currentTarget.style, inputStyle())}
                  disabled={editSaving}
                />
              </label>
              <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', fontFamily: "'Lato', sans-serif", fontSize: '13px', fontWeight: 700, color: 'var(--text2)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Return date
                <input
                  type="date"
                  value={editReturnDate}
                  onChange={(e) => setEditReturnDate(e.target.value)}
                  style={inputStyle()}
                  onFocus={(e) => Object.assign(e.currentTarget.style, inputFocusStyle())}
                  onBlur={(e) => Object.assign(e.currentTarget.style, inputStyle())}
                  disabled={editSaving}
                />
              </label>
            </div>
            {editError && (
              <p style={{ fontSize: '13px', color: 'var(--red)', fontFamily: "'Lato', sans-serif" }}>{editError}</p>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setEditOpen(false)} disabled={editSaving}>Cancel</Button>
          <Button variant="primary" onClick={handleEditSave} disabled={editSaving || !editTitle.trim()}>
            {editSaving ? 'Saving…' : 'Save'}
          </Button>
        </ModalFooter>
      </Modal>

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
          <Button variant="danger" onClick={handleDelete} disabled={deleteConfirming}>
            {deleteConfirming ? 'Deleting…' : 'Delete trip'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Clear Trip Data modal */}
      <Modal open={clearOpen} onClose={() => { if (!clearConfirming) setClearOpen(false); }}>
        <ModalHeader title="Clear Trip Data" onClose={() => { if (!clearConfirming) setClearOpen(false); }} />
        <ModalBody>
          <p style={{ fontFamily: "'Lato', sans-serif", fontSize: '14px', color: 'var(--text2)', marginBottom: '16px', lineHeight: 1.6 }}>
            Choose what to do with the imported trip data:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {([
              { value: 'archive', label: 'Archive trip', description: 'Mark the trip as archived and keep all data.' },
              { value: 'download_clear', label: 'Download & clear', description: 'Download a JSON backup of the import, then delete all imported data.' },
              { value: 'discard', label: 'Discard data', description: 'Permanently delete all imported data with no backup.' },
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
            variant={clearAction === 'discard' ? 'danger' : 'primary'}
            onClick={handleClear}
            disabled={clearConfirming || !clearAction}
          >
            {clearConfirming ? 'Working…' : 'Confirm'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Print modal */}
      {selectedTrip && (
        <PrintExportModal
          open={printOpen}
          onClose={() => setPrintOpen(false)}
          tripId={selectedTrip.id}
          tripTitle={selectedTrip.title}
          days={[]}
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
