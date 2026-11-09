'use client';

import React, { useState, useEffect, useRef, useContext } from 'react';
import { useRouter } from 'next/navigation';
import HelmVersionLabel from '@/components/ui/HelmVersionLabel';
import UpdateBanner from '@/components/ui/UpdateBanner';
import { Button } from '@/components/ui/Button';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import { CalendarModal, type GCalState } from '@/components/advisor/CalendarModal';
import { PrintExportModal } from '@/components/advisor/PrintExportModal';
import { EditTripModal } from '@/components/advisor/EditTripModal';
import { MapPicturesProvider } from '@/components/ui/MapTile';
import { useDeviceTrip } from '@/hooks/useDeviceTrips';
import { Pencil } from 'lucide-react';
import { LogsClient } from '@/components/sections/LogsClient';
import { DashboardBar } from '@/components/ui/DashboardBar';
import { TripTopBar } from '@/components/ui/TripTopBar';
import { TripSidebar } from '@/components/ui/TripSidebar';
import type { Trip } from '@/types/trips';
import { useOfflineWarmup } from '@/hooks/useOfflineWarmup';
import { useIsOnline } from '@/hooks/useOnlineStatus';
import { isOnline as isOnlineNow } from '@/lib/offline/status';
import {
  DEV_IMPORT_ERROR_KEY,
  IMPORT_ERROR_MESSAGES,
  IMPORT_ERROR_RETRYABLE,
  IMPORT_STREAM_ERROR_MARKER,
  isImportErrorCode,
  type ImportErrorCode,
} from '@/lib/import/errors';

// An import failure with a known cause (docs/import-fix-plan.md, Steps 8–9).
class ImportFailure extends Error {
  constructor(readonly code: ImportErrorCode, message = IMPORT_ERROR_MESSAGES[code]) {
    super(message);
  }
}

export const TabNavigationContext = React.createContext<{
  navigateTo: (tab: string, itemId?: string) => void
  openSourceRecord: (tab: string, recordId: string) => void
  pendingItemId: string | null
  clearPendingItem: () => void
  pendingSheetRecordId: string | null
  clearPendingSheetRecord: () => void
  warnCounts: Record<string, number>
  setWarnCount: (section: string, count: number) => void
}>({
  navigateTo: () => {},
  openSourceRecord: () => {},
  pendingItemId: null,
  clearPendingItem: () => {},
  pendingSheetRecordId: null,
  clearPendingSheetRecord: () => {},
  warnCounts: {},
  setWarnCount: () => {},
})

export function useTabNavigation() {
  return useContext(TabNavigationContext)
}

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

const SECTION_TO_TAB: Record<string, Tab> = {
  overview:       'Overview',
  itinerary:      'Itinerary',
  flights:        'Flights',
  hotels:         'Hotels',
  transportation: 'Transportation',
  restaurants:    'Restaurants',
  checklist:      'Checklist',
  key_info:       'Key Info',
  packing:        'Packing',
};

const TAB_TO_SECTION: Record<string, string> = {
  'Overview':       'overview',
  'Itinerary':      'itinerary',
  'Flights':        'flights',
  'Hotels':         'hotels',
  'Transportation': 'transportation',
  'Restaurants':    'restaurants',
  'Checklist':      'checklist',
  'Packing':        'packing',
  'Key Info':       'key_info',
};

type Tab = typeof TABS[number];

function formatDateRange(departure: string | null, returnDate: string | null): string {
  if (!departure || !returnDate) return 'No dates set';
  const dep = new Date(departure + 'T00:00:00');
  const ret = new Date(returnDate + 'T00:00:00');
  if (departure === returnDate) {
    return dep.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }
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
  overviewContent?:       React.ReactNode;
  itineraryContent?:      React.ReactNode;
  flightsContent?:        React.ReactNode;
  hotelsContent?:         React.ReactNode;
  transportationContent?: React.ReactNode;
  restaurantsContent?:    React.ReactNode;
  checklistContent?:      React.ReactNode;
  packingContent?:        React.ReactNode;
  keyInfoContent?:        React.ReactNode;
}

function TripDetailViewInner({
  trip,
  overviewContent,
  itineraryContent,
  flightsContent,
  hotelsContent,
  transportationContent,
  restaurantsContent,
  checklistContent,
  packingContent,
  keyInfoContent,
}: TripDetailViewProps) {
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    router.prefetch('/advisor/dashboard');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Keep this trip's offline copy current (public/sw.js).
  useOfflineWarmup([`/advisor/trips/${trip.id}`, '/advisor/dashboard']);

  // Calendar, Print, Import and Logs all need the server; offline they say so
  // instead of opening (docs/offline-editing-plan.md §4).
  const isOnline = useIsOnline();
  const needsConnection = (action: () => void) => () => {
    if (!isOnline) {
      toast.show('This needs a connection. You\'re offline.', 'neutral');
      return;
    }
    action();
  };
  const [activeTab, setActiveTab] = useState<Tab>('Overview');
  const [visitedTabs, setVisitedTabs] = useState<Set<Tab>>(() => new Set(['Overview']));

  const switchTab = (tab: Tab) => {
    setActiveTab(tab);
    setVisitedTabs(prev => {
      if (prev.has(tab)) return prev;
      const next = new Set(prev);
      next.add(tab);
      return next;
    });
  };
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);
  const [pendingSheetRecordId, setPendingSheetRecordId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [warnCounts, setWarnCountsState] = useState<Record<string, number>>({});

  const setWarnCount = (section: string, count: number) => {
    setWarnCountsState(prev => ({ ...prev, [section]: count }));
  };

  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  // Import modal
  const [importOpen, setImportOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importPhase, setImportPhase] = useState<'idle' | 'reading' | 'mapping' | 'parsing' | 'navigating' | 'error'>('idle');
  const [importError, setImportError] = useState<string | null>(null);
  // False when trying the same file again can't help (credits, not set up, too long).
  const [importRetryable, setImportRetryable] = useState(true);
  const [importProgress, setImportProgress] = useState(0);
  const [totalChars, setTotalChars] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Title and destination as this device knows them: an edit made offline
  // shows before it syncs (docs/edit-trip-in-trip-plan.md).
  const localTrip = useDeviceTrip(trip);

  // Edit Trip (title, destination); works offline.
  const [editTripOpen, setEditTripOpen] = useState(false);

  // Logs view
  const [showLogs, setShowLogs] = useState(false);

  // Calendar overlay
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarStatus, setCalendarStatus] = useState<GCalState>('loading');

  // Print modal
  const [printOpen, setPrintOpen] = useState(false);

  useEffect(() => {
    if (calendarStatus === 'update_required') {
      toast.show('Calendar update required — tap the calendar icon to sync.', 'neutral');
    }
  }, [calendarStatus]); // eslint-disable-line react-hooks/exhaustive-deps


  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    const sectionParam = params.get('section');
    const recordParam = params.get('record');

    if (tabParam && (TABS as readonly string[]).includes(tabParam)) {
      switchTab(tabParam as Tab);
    } else if (sectionParam) {
      const mappedTab = SECTION_TO_TAB[sectionParam];
      if (mappedTab) switchTab(mappedTab);
    }

    if (recordParam) {
      setPendingSheetRecordId(recordParam);
      const clean = new URL(window.location.href);
      clean.searchParams.delete('section');
      clean.searchParams.delete('record');
      router.replace(clean.pathname + (clean.search || ''));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      if (!isOnlineNow()) throw new ImportFailure('connection');

      const form = new FormData();
      form.append('file', uploadBlob, selectedFile.name);
      form.append('tripId', trip.id);
      form.append('departureDate', trip.start_date ?? '');
      form.append('returnDate', trip.end_date ?? '');
      if (process.env.NODE_ENV === 'development') {
        try {
          const devError = localStorage.getItem(DEV_IMPORT_ERROR_KEY);
          if (devError) form.append('devAiError', devError);
        } catch {}
      }

      let res: Response;
      try {
        res = await fetch('/api/trips/import', { method: 'POST', body: form });
      } catch {
        // fetch rejects only when the request couldn't be made or finished.
        throw new ImportFailure('connection');
      }

      // Errors before Claude starts writing come back as JSON with a status.
      if (!res.ok) {
        let errorMsg = `Import failed (HTTP ${res.status}).`;
        let code: unknown;
        try {
          const errJson = await res.json();
          if (typeof errJson.error === 'string' && errJson.error) errorMsg = errJson.error;
          code = errJson.code;
        } catch {}
        if (isImportErrorCode(code)) throw new ImportFailure(code, errorMsg);
        throw new Error(errorMsg);
      }

      // Read the streaming response body and accumulate chunks.
      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body from server.');

      const decoder = new TextDecoder();
      let accumulated = '';
      let firstChunk = true;

      try {
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
      } catch {
        throw new ImportFailure('connection');
      }
      accumulated += decoder.decode(); // flush remaining bytes
      setImportProgress(accumulated.length);

      // An error after Claude started writing ends the stream with a marker.
      const markerAt = accumulated.indexOf(IMPORT_STREAM_ERROR_MARKER);
      if (markerAt !== -1) {
        let code: unknown;
        try { code = JSON.parse(accumulated.slice(markerAt + IMPORT_STREAM_ERROR_MARKER.length)).code; } catch {}
        throw new ImportFailure(isImportErrorCode(code) ? code : 'ai_error');
      }

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
      setImportRetryable(!(err instanceof ImportFailure) || IMPORT_ERROR_RETRYABLE.has(err.code));
    }
  };


  return (
    <MapPicturesProvider value={localTrip.show_map_pictures}>
    <TabNavigationContext.Provider value={{
      navigateTo: (tab, itemId) => {
        switchTab(tab as Tab)
        if (itemId) setPendingItemId(itemId)
      },
      openSourceRecord: (tab, recordId) => {
        setPendingSheetRecordId(recordId)
        switchTab(tab as Tab)
      },
      pendingItemId,
      clearPendingItem: () => setPendingItemId(null),
      pendingSheetRecordId,
      clearPendingSheetRecord: () => setPendingSheetRecordId(null),
      warnCounts,
      setWarnCount,
    }}>
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      <DashboardBar onSearch={() => router.push('/search')} />

      <TripTopBar
        onOpenSidebar={() => setSidebarOpen(true)}
        tripName={localTrip.title}
        onShowCalendar={needsConnection(() => { setShowCalendar(true) })}
        calendarStatus={calendarStatus}
      />

      <UpdateBanner onVisibilityChange={() => {}} />

      <TripSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeSection={TAB_TO_SECTION[activeTab] ?? 'overview'}
        onNavigate={(section) => {
          const tab = SECTION_TO_TAB[section];
          if (tab) switchTab(tab);
          setShowLogs(false);
          setSidebarOpen(false);
        }}
        tripName={localTrip.title}
        tripDates={formatDateRange(localTrip.start_date, localTrip.end_date)}
        warnCounts={warnCounts}
        tripId={trip.id}
        onPrint={needsConnection(() => setPrintOpen(true))}
        onEditTrip={() => setEditTripOpen(true)}
        // Imports only add, so another document can be imported at any time.
        onImport={needsConnection(() => setImportOpen(true))}
        onShowLogs={needsConnection(() => { setShowLogs(true); setSidebarOpen(false); })}
        onShowCalendar={needsConnection(() => { setShowCalendar(true); setSidebarOpen(false); })}
        calendarStatus={calendarStatus}
      />

      <CalendarModal
        tripId={localTrip.id}
        tripName={localTrip.title}
        open={showCalendar}
        onOpenChange={setShowCalendar}
        onStatusChange={setCalendarStatus}
      />

      <EditTripModal
        open={editTripOpen}
        onClose={() => setEditTripOpen(false)}
        trip={localTrip}
      />

      <PrintExportModal
        open={printOpen}
        onClose={() => setPrintOpen(false)}
        tripId={localTrip.id}
      />

      {/* Main */}
      <main
        style={{
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
            padding: '24px 0 20px',
            borderBottom: '1px solid var(--border2)',
          }}
        >
          <div className="trip-hero-meta" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <span className="trip-hero-meta-dest">
              <span aria-hidden="true">📍</span>
              {localTrip.destination}
            </span>
            <span style={{ display: 'inline-block', margin: '0 6px', color: 'var(--text3)' }}>|</span>
            <span className="trip-hero-meta-dates">
              {formatDateRange(localTrip.start_date, localTrip.end_date)}
            </span>
            <button
              type="button"
              onClick={() => setEditTripOpen(true)}
              aria-label="Edit trip title and destination"
              title="Edit trip"
              style={{
                width: '44px', height: '44px', marginLeft: '4px', flexShrink: 0,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                background: 'none', border: 'none', borderRadius: 'var(--r)', cursor: 'pointer',
                color: 'var(--text2)',
              }}
            >
              <Pencil size={18} />
            </button>
          </div>
        </div>

        {showLogs ? (
          <div>
            <LogsClient tripId={localTrip.id} />
          </div>
        ) : (
          <>
        {/* Section content — lazy-mounted on first tab visit */}
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
          const activeContent = tabContents[activeTab];
          return activeContent ? (
            <>
              {TABS.map(tab => {
                if (!visitedTabs.has(tab)) return null;
                const content = tabContents[tab];
                if (!content) return null;
                return (
                  <div
                    key={tab}
                    className="content-container"
                    style={{ paddingTop: '32px', display: tab === activeTab ? undefined : 'none' }}
                  >
                    {content}
                  </div>
                );
              })}
            </>
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
          </>
        )}
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
          {importPhase === 'error' && importRetryable && (
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
          <HelmVersionLabel />
        </span>
      </footer>

    </div>
    </TabNavigationContext.Provider>
    </MapPicturesProvider>
  );
}

export function TripDetailView(props: TripDetailViewProps) {
  return (
    <ToastProvider>
      <TripDetailViewInner {...props} />
    </ToastProvider>
  );
}
