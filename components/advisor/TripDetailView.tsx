'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { VERSION } from '@/lib/version';
import { Button } from '@/components/ui/Button';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal';
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
  trip:      Trip;
  hasImport?: boolean;
}

export function TripDetailView({ trip, hasImport = false }: TripDetailViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('Itinerary');
  const [importOpen, setImportOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importPhase, setImportPhase] = useState<'idle' | 'reading' | 'mapping' | 'parsing' | 'error'>('idle');
  const [importError, setImportError] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [importDone, setImportDone] = useState(hasImport);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!importDone && sessionStorage.getItem(`helm_import_done_${trip.id}`)) setImportDone(true);
  }, [trip.id]);

  const handleImportClose = () => {
    if (importPhase === 'reading' || importPhase === 'mapping' || importPhase === 'parsing') return;
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

    const phaseTimer = setTimeout(() => setImportPhase('mapping'), 2000);

    try {
      const form = new FormData();
      form.append('file', selectedFile);
      form.append('tripId', trip.id);

      const res = await fetch('/api/trips/import', { method: 'POST', body: form });
      clearTimeout(phaseTimer);

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

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
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

      router.push(`/advisor/trips/${trip.id}/import/review`);
    } catch (err) {
      clearTimeout(phaseTimer);
      setImportPhase('error');
      setImportError(err instanceof Error ? err.message : 'Something went wrong.');
    }
  };

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

          {/* Right: actions */}
          <div style={{ flexShrink: 0, paddingTop: '6px' }}>
            <Button variant="primary" onClick={() => setImportOpen(true)} disabled={importDone}>
              {importDone ? 'Document Imported' : 'Import Document'}
            </Button>
          </div>
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
                PDF, Word, or text files
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
            <div
              style={{
                padding: '48px 32px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px',
                textAlign: 'center',
              }}
            >
              <style>{`@keyframes helm-spin { to { transform: rotate(360deg) } }`}</style>
              <svg
                width="32"
                height="32"
                viewBox="0 0 32 32"
                fill="none"
                aria-hidden="true"
                style={{ animation: 'helm-spin 0.8s linear infinite', flexShrink: 0 }}
              >
                <circle cx="16" cy="16" r="13" stroke="var(--border)" strokeWidth="2.5" />
                <path d="M16 3a13 13 0 0 1 13 13" stroke="var(--gold)" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
              <p style={{ fontFamily: "'Lato', sans-serif", fontSize: '15px', color: 'var(--text2)', fontWeight: 600 }}>
                {importPhase === 'reading'
                  ? 'Reading your document…'
                  : importPhase === 'parsing'
                  ? 'Parsing response…'
                  : `Receiving response… ${importProgress.toLocaleString()} chars`}
              </p>
              <p style={{ fontFamily: "'Lato', sans-serif", fontSize: '13px', color: 'var(--text3)' }}>
                This may take a moment.
              </p>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button
            variant="ghost"
            onClick={handleImportClose}
            disabled={importPhase === 'reading' || importPhase === 'mapping' || importPhase === 'parsing'}
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
