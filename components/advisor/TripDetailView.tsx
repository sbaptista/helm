'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { VERSION } from '@/lib/version';
import { Button } from '@/components/ui/Button';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { inputStyle, inputFocusStyle } from '@/components/ui/FormField';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import { PrintExportModal } from '@/components/advisor/PrintExportModal';
import { CalendarButton } from '@/components/advisor/CalendarButton';
import type { Trip } from '@/types/trips';

export const TabNavigationContext = React.createContext<{
  navigateTo: (tab: string, itemId?: string) => void
  pendingItemId: string | null
  clearPendingItem: () => void
}>({ navigateTo: () => {}, pendingItemId: null, clearPendingItem: () => {} })

const TABS = [
  'Overview',
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
  trip:                   Trip;
  hasImport?:             boolean;
  hasSectionData?:        boolean;
  overviewContent?:       React.ReactNode;
  itineraryContent?:      React.ReactNode;
  flightsContent?:        React.ReactNode;
  hotelsContent?:         React.ReactNode;
  transportationContent?: React.ReactNode;
  restaurantsContent?:    React.ReactNode;
  checklistContent?:      React.ReactNode;
  packingContent?:        React.ReactNode;
  keyInfoContent?:        React.ReactNode;
  days?: { id: string; day_number: number; day_date: string; title: string }[];
  flightsData?: any[];
  hotelsData?: any[];
  keyInfoData?: any[];
  itinRowsData?: any[];
  transportationData?: any[];
  restaurantsData?: any[];
}

function TripDetailViewInner({
  trip,
  hasImport = false,
  hasSectionData = false,
  overviewContent,
  itineraryContent,
  flightsContent,
  hotelsContent,
  transportationContent,
  restaurantsContent,
  checklistContent,
  packingContent,
  keyInfoContent,
  days = [],
  flightsData = [],
  hotelsData = [],
  keyInfoData = [],
  itinRowsData = [],
  transportationData = [],
  restaurantsData = [],
}: TripDetailViewProps) {
  const router = useRouter();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('Overview');
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);

  const tabRowRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollState = () => {
    const el = tabRowRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  };

  useEffect(() => {
    setTimeout(updateScrollState, 50);
    window.addEventListener('resize', updateScrollState);
    return () => window.removeEventListener('resize', updateScrollState);
  }, []);

  // Import modal
  const [importOpen, setImportOpen] = useState(false);
  const [reimportConfirmOpen, setReimportConfirmOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importPhase, setImportPhase] = useState<'idle' | 'reading' | 'mapping' | 'parsing' | 'navigating' | 'error'>('idle');
  const [importError, setImportError] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [totalChars, setTotalChars] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [importDone, setImportDone] = useState(() => {
    if (hasImport) return true;
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem(`helm_import_done_${trip.id}`) === '1';
    }
    return false;
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Local trip state (updated optimistically on edit)
  const [localTrip, setLocalTrip] = useState<Trip>(trip);

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(trip.title);
  const [editDestination, setEditDestination] = useState(trip.destination);
  const [editDepartureDate, setEditDepartureDate] = useState(trip.departure_date);
  const [editReturnDate, setEditReturnDate] = useState(trip.return_date);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete modal
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Clear modal
  const [clearOpen, setClearOpen] = useState(false);
  const [clearAction, setClearAction] = useState<'archive' | 'download_clear' | 'discard' | null>(null);
  const [clearConfirming, setClearConfirming] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);
  const [clearSuccess, setClearSuccess] = useState(false);

  // Print modal
  const [printOpen, setPrintOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam && (TABS as readonly string[]).includes(tabParam)) {
      setActiveTab(tabParam as Tab);
    }
  }, []);

const handleImportClose = () => {
    if (importPhase !== 'idle') toast.show('Import cancelled', 'neutral');
    setImportOpen(false);
    setSelectedFile(null);
    setImportPhase('idle');
    setImportError(null);
    setImportProgress(0);
  };

  const handleImport = async () => {
    if (!selectedFile) return;
    setImportPhase('reading');
    setImportError(null);
    setImportProgress(0);
    setTotalChars(0);

    // Read the file once: byte count for the progress bar and a fresh Blob for
    // the upload. Reading the original File twice can exhaust its internal stream,
    // causing the API to receive an empty body.
    let uploadBlob: Blob = selectedFile;
    try {
      const buffer = await selectedFile.arrayBuffer();
      setTotalChars(buffer.byteLength);
      uploadBlob = new Blob([buffer], { type: selectedFile.type });
    } catch {
      setTotalChars(selectedFile.size);
    }

    try {
      const form = new FormData();
      form.append('file', uploadBlob, selectedFile.name);
      form.append('tripId', trip.id);
      form.append('departureDate', trip.departure_date ?? '');
      form.append('returnDate', trip.return_date ?? '');

      const res = await fetch('/api/trips/import', { method: 'POST', body: form });

      // Pre-streaming errors come back as JSON with a non-200 status.
      if (!res.ok) {
        let errorMsg = `Import failed (HTTP ${res.status}).`;
        try {
          const errJson = await res.json();
          if (typeof errJson.error === 'string' && errJson.error) errorMsg = errJson.error;
        } catch {}
        throw new Error(errorMsg);
      }

      // Read the streaming response body and accumulate chunks.
      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body from server.');

      const decoder = new TextDecoder();
      let accumulated = '';
      let firstChunk = true;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (firstChunk) {
          setImportPhase('mapping');
          firstChunk = false;
        }
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        setImportProgress(accumulated.length);
      }
      accumulated += decoder.decode(); // flush remaining bytes
      setImportProgress(accumulated.length);

      setImportPhase('parsing');

      // Strip any accidental markdown code fences and parse.
      const stripped = accumulated
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```\s*$/i, '')
        .trim();

      let parsed: unknown;
      try {
        parsed = JSON.parse(stripped);
      } catch (parseErr) {
        throw new Error(
          `AI returned invalid JSON: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`,
        );
      }

      sessionStorage.setItem(
        'helm_import_preview',
        JSON.stringify({ tripId: trip.id, tripTitle: trip.title, result: parsed }),
      );

      setImportPhase('navigating');
      router.push(`/advisor/trips/${trip.id}/import/review`);
    } catch (err) {
      setImportPhase('error');
      setImportError(err instanceof Error ? err.message : 'Something went wrong.');
    }
  };

  const handleEditSave = async () => {
    setEditSaving(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/trips/${localTrip.id}`, {
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
      setLocalTrip(json.trip as Trip);
      setEditOpen(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleteConfirming(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/trips/${localTrip.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to delete.');
      router.push('/advisor/dashboard');
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Something went wrong.');
      setDeleteConfirming(false);
    }
  };

  const handleClear = async () => {
    if (!clearAction) return;
    setClearConfirming(true);
    setClearError(null);
    try {
      const res = await fetch(`/api/trips/${localTrip.id}/clear`, {
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
        a.download = `import-${localTrip.id}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }

      setImportDone(false);
      setClearAction(null);
      setClearConfirming(false);
      setClearOpen(false);
      setClearSuccess(true);
      setTimeout(() => setClearSuccess(false), 4000);
      router.refresh();
    } catch (err) {
      setClearError(err instanceof Error ? err.message : 'Something went wrong.');
      setClearConfirming(false);
    }
  };

  return (
    <TabNavigationContext.Provider value={{
      navigateTo: (tab, itemId) => {
        setActiveTab(tab as Tab)
        if (itemId) setPendingItemId(itemId)
      },
      pendingItemId,
      clearPendingItem: () => setPendingItemId(null),
    }}>
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
          @keyframes helm-progress-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }
        `}</style>

        {/* Trip hero */}
        <div
          style={{
            padding: '40px 0 32px',
            borderBottom: '1px solid var(--border2)',
            marginBottom: '0',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '24px',
          }}
        >
          {/* Left: title + meta */}
          <div>
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
              {localTrip.title}
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
              {localTrip.destination}
            </p>

            <p
              style={{
                fontSize: '15px',
                color: 'var(--gold-text)',
                fontWeight: 700,
                fontFamily: "'Lato', sans-serif",
              }}
            >
              {formatDateRange(localTrip.departure_date, localTrip.return_date)}
            </p>

          </div>

          {/* Right: actions */}
          <div style={{ flexShrink: 0, paddingTop: '6px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                variant="secondary"
                onClick={() => {
                  if (importDone && hasSectionData) {
                    setReimportConfirmOpen(true);
                  } else {
                    setImportOpen(true);
                  }
                }}
                disabled={importPhase === 'reading' || importPhase === 'mapping' || importPhase === 'parsing' || importPhase === 'navigating'}
              >
                Import Document
              </Button>
              <Button
                variant="secondary"
                onClick={() => setPrintOpen(true)}
              >
                Print Trip
              </Button>
              <CalendarButton tripId={trip.id} tripName={trip.title} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <button
                type="button"
                onClick={() => {
                  setEditTitle(localTrip.title);
                  setEditDestination(localTrip.destination ?? '');
                  setEditDepartureDate(localTrip.departure_date ?? '');
                  setEditReturnDate(localTrip.return_date ?? '');
                  setEditError(null);
                  setEditOpen(true);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: "'Lato', sans-serif",
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text3)',
                  textDecoration: 'underline',
                  textUnderlineOffset: '2px',
                  padding: '6px 0',
                  minHeight: '44px',
                  textAlign: 'right',
                }}
              >
                Edit trip
              </button>
              <button
                type="button"
                onClick={() => { setClearAction(null); setClearError(null); setClearOpen(true); }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: "'Lato', sans-serif",
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text3)',
                  textDecoration: 'underline',
                  textUnderlineOffset: '2px',
                  padding: '6px 0',
                  minHeight: '44px',
                  textAlign: 'right',
                }}
              >
                Clear trip data
              </button>
              <button
                type="button"
                onClick={() => { setDeleteError(null); setDeleteOpen(true); }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: "'Lato', sans-serif",
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--red)',
                  textDecoration: 'underline',
                  textUnderlineOffset: '2px',
                  padding: '6px 0',
                  minHeight: '44px',
                  textAlign: 'right',
                }}
              >
                Delete trip
              </button>
            </div>
          </div>
        </div>

        {clearSuccess && (
          <div style={{
            position: 'fixed',
            bottom: 'calc(24px + var(--sab))',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--green)',
            color: 'var(--cream)',
            fontFamily: "'Lato', sans-serif",
            fontSize: '13px',
            fontWeight: 600,
            padding: '12px 24px',
            borderRadius: 'var(--r-xl)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 200,
            whiteSpace: 'nowrap',
          }}>
            Trip data cleared successfully.
          </div>
        )}

        {/* Tab row */}
        <div style={{ position: 'relative' }}>
          <style>{`
            .helm-tab-row::-webkit-scrollbar { display: none; }
          `}</style>

          <button
            type="button"
            aria-label="Scroll tabs left"
            onClick={() => tabRowRef.current?.scrollBy({ left: -200, behavior: 'smooth' })}
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 0,
              width: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--bg)',
              border: 'none',
              cursor: 'pointer',
              zIndex: 2,
              fontSize: '34px',
              fontWeight: 700,
              color: 'var(--text3)',
              padding: 0,
              opacity: canScrollLeft ? 1 : 0,
              pointerEvents: canScrollLeft ? 'auto' : 'none',
              transition: 'opacity 0.2s',
            }}
          >
            ‹
          </button>
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: '44px',
              width: '24px',
              background: 'linear-gradient(to right, var(--bg), transparent)',
              pointerEvents: 'none',
              zIndex: 1,
              opacity: canScrollLeft ? 1 : 0,
              transition: 'opacity 0.2s',
            }}
          />
          <button
            type="button"
            aria-label="Scroll tabs right"
            onClick={() => tabRowRef.current?.scrollBy({ left: 200, behavior: 'smooth' })}
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              right: 0,
              width: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--bg)',
              border: 'none',
              cursor: 'pointer',
              zIndex: 2,
              fontSize: '34px',
              fontWeight: 700,
              color: 'var(--text3)',
              padding: 0,
              opacity: canScrollRight ? 1 : 0,
              pointerEvents: canScrollRight ? 'auto' : 'none',
              transition: 'opacity 0.2s',
            }}
          >
            ›
          </button>
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              right: '44px',
              width: '24px',
              background: 'linear-gradient(to left, var(--bg), transparent)',
              pointerEvents: 'none',
              zIndex: 1,
              opacity: canScrollRight ? 1 : 0,
              transition: 'opacity 0.2s',
            }}
          />

        <div
          ref={tabRowRef}
          onScroll={updateScrollState}
          style={{
            display: 'flex',
            gap: '0',
            borderBottom: '1px solid var(--border2)',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
          }}
          className="helm-tab-row"
        >
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
        </div>

        {/* Tab content */}
        {(() => {
          const tabContents: Partial<Record<Tab, React.ReactNode>> = {
            Overview:       overviewContent,
            Itinerary:      itineraryContent,
            Flights:        flightsContent,
            Hotels:         hotelsContent,
            Transportation: transportationContent,
            Restaurants:    restaurantsContent,
            Checklist:      checklistContent,
            Packing:        packingContent,
            'Key Info':     keyInfoContent,
          };
          const content = tabContents[activeTab];
          return content ? (
            <div className="content-container" style={{ paddingTop: '32px' }}>{content}</div>
          ) : (
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
          );
        })()}
      </main>

      {/* Import Document modal */}
      <Modal open={importOpen} onClose={handleImportClose}>
        <ModalHeader title="Import Trip Document" onClose={handleImportClose} />
        <ModalBody>
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt,.md,.json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setSelectedFile(f);
              setImportPhase('idle');
              setImportError(null);
            }}
          />

          {importPhase === 'idle' ? (
            /* Drop zone */
            <div
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }}
              onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragOver(false);
                const f = e.dataTransfer.files?.[0] ?? null;
                if (f) { setSelectedFile(f); setImportPhase('idle'); setImportError(null); }
              }}
              style={{
                border: `2px dashed ${isDragOver ? 'var(--gold)' : selectedFile ? 'var(--gold)' : 'var(--border)'}`,
                borderRadius: 'var(--r-xl)',
                padding: '40px 32px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                textAlign: 'center',
                background: isDragOver ? 'rgba(180,130,30,0.04)' : 'var(--bg)',
                transition: 'border-color var(--transition), background var(--transition)',
              }}
            >
              <svg
                width="40"
                height="40"
                viewBox="0 0 40 40"
                fill="none"
                aria-hidden="true"
                style={{ color: isDragOver || selectedFile ? 'var(--gold)' : 'var(--slate)', opacity: 0.7, flexShrink: 0 }}
              >
                <rect x="8" y="4" width="22" height="28" rx="3" stroke="currentColor" strokeWidth="1.75" />
                <path d="M24 4v8h6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M13 18h14M13 23h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>

              {isDragOver ? (
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '20px', fontWeight: 600, color: 'var(--gold-text)', lineHeight: 1.2 }}>
                  Release to import
                </p>
              ) : selectedFile ? (
                <p style={{ fontFamily: "'Lato', sans-serif", fontSize: '14px', fontWeight: 700, color: 'var(--navy)' }}>
                  {selectedFile.name}
                </p>
              ) : (
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '20px', fontWeight: 600, color: 'var(--navy)', lineHeight: 1.2 }}>
                  Drop your document here
                </p>
              )}

              <p style={{ fontFamily: "'Lato', sans-serif", fontSize: '13px', color: 'var(--text3)', lineHeight: 1.5 }}>
                PDF, Word, text, or JSON files
              </p>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  marginTop: '4px',
                  background: 'none',
                  border: 'none',
                  padding: '4px 0',
                  fontFamily: "'Lato', sans-serif",
                  fontSize: '14px',
                  fontWeight: 700,
                  color: 'var(--gold-text)',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  textUnderlineOffset: '2px',
                  minHeight: '44px',
                }}
              >
                {selectedFile ? 'Choose a different file' : 'Choose file'}
              </button>
            </div>
          ) : importPhase === 'error' ? (
            /* Error state */
            <div
              style={{
                padding: '12px 16px',
                background: 'rgba(139,32,32,0.06)',
                border: '1px solid rgba(139,32,32,0.2)',
                borderRadius: 'var(--r)',
                fontSize: '14px',
                color: 'var(--red)',
                fontFamily: "'Lato', sans-serif",
                lineHeight: 1.5,
              }}
            >
              {importError}
            </div>
          ) : (
            /* Processing state */
            <div style={{ padding: '32px 32px 40px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Progress bar — visible once streaming begins */}
              {(importProgress > 0 || importPhase === 'parsing' || importPhase === 'navigating') && (() => {
                const isPulsing = importPhase === 'parsing' || importPhase === 'navigating' ||
                  (totalChars > 0 && importProgress >= totalChars * 0.95);
                return (
                  <div style={{ width: '100%', height: '8px', background: 'var(--bg3)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        background: 'var(--gold)',
                        borderRadius: '4px',
                        width: isPulsing ? '100%' : `${Math.min(totalChars > 0 ? (importProgress / totalChars) * 100 : 100, 100)}%`,
                        transition: isPulsing ? 'none' : 'width 0.2s ease',
                        animation: isPulsing ? 'helm-progress-pulse 2s ease-in-out infinite' : 'none',
                      }}
                    />
                  </div>
                );
              })()}
              {/* Status text */}
              <p style={{ fontFamily: "'Lato', sans-serif", fontSize: '14px', color: 'var(--text2)', margin: 0 }}>
                {importPhase === 'reading'
                  ? 'Reading document…'
                  : importPhase === 'parsing'
                  ? 'Finalizing…'
                  : importPhase === 'navigating'
                  ? 'Analysis complete'
                  : `Analyzing… ${importProgress.toLocaleString()} characters processed`}
              </p>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button
            variant="ghost"
            onClick={handleImportClose}
          >
            Cancel
          </Button>
          {importPhase === 'error' && (
            <Button variant="ghost" onClick={() => { setImportPhase('idle'); setImportError(null); }}>
              Try Again
            </Button>
          )}
          {importPhase === 'idle' && selectedFile && (
            <Button variant="primary" onClick={handleImport}>
              Import
            </Button>
          )}
        </ModalFooter>
      </Modal>

      {/* Re-import confirmation modal */}
      <Modal open={reimportConfirmOpen} onClose={() => setReimportConfirmOpen(false)}>
        <ModalHeader title="Re-import Document" onClose={() => setReimportConfirmOpen(false)} />
        <ModalBody>
          <p style={{ fontFamily: "'Lato', sans-serif", fontSize: '15px', color: 'var(--text)', lineHeight: 1.6 }}>
            Importing a new document may add to or overwrite existing trip data. Continue?
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setReimportConfirmOpen(false)}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => {
              sessionStorage.removeItem(`helm_import_done_${trip.id}`);
              setImportDone(false);
              setReimportConfirmOpen(false);
              setImportOpen(true);
            }}
          >
            Continue
          </Button>
        </ModalFooter>
      </Modal>

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
            Are you sure you want to delete <strong>{localTrip.title}</strong>? This will permanently remove the trip and all associated data. This action cannot be undone.
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

      {/* Clear Trip modal */}
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
          v{VERSION}
        </span>
      </footer>

      {/* Clear trip data modal */}
      <Modal open={clearOpen} onClose={() => setClearOpen(false)}>
        <>
          {/* ... existing clear modal content ... */}
        </>
      </Modal>

      {/* Print modal */}
      <PrintExportModal
        open={printOpen}
        onClose={() => setPrintOpen(false)}
        tripId={localTrip.id}
        tripTitle={localTrip.title}
        days={days}
        initialFlights={flightsData}
        initialHotels={hotelsData}
        initialKeyInfo={keyInfoData}
        initialItinRows={itinRowsData}
        initialTransportation={transportationData}
        initialRestaurants={restaurantsData}
      />

    </div>
    </TabNavigationContext.Provider>
  );
}

export function TripDetailView(props: TripDetailViewProps) {
  return (
    <ToastProvider>
      <TripDetailViewInner {...props} />
    </ToastProvider>
  );
}
