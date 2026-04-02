'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { VERSION } from '@/lib/version';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ImportFlag {
  field: string;
  issue: string;
  suggestion: string;
}

interface ImportResult {
  itinerary_days:   Record<string, unknown>[];
  itinerary_rows:   Record<string, unknown>[];
  flights:          Record<string, unknown>[];
  hotels:           Record<string, unknown>[];
  transportation:   Record<string, unknown>[];
  restaurants:      Record<string, unknown>[];
  checklist_items:  Record<string, unknown>[];
  packing_items:    Record<string, unknown>[];
  key_info:         Record<string, unknown>[];
  unmapped:         string[];
  flags:            ImportFlag[];
}

interface PreviewPayload {
  tripId:    string;
  tripTitle: string;
  result:    ImportResult;
}

// ─── Section config ───────────────────────────────────────────────────────────

const SECTIONS: { key: keyof Omit<ImportResult, 'unmapped' | 'flags'>; label: string }[] = [
  { key: 'itinerary_days',  label: 'Itinerary Days'   },
  { key: 'itinerary_rows',  label: 'Itinerary Items'  },
  { key: 'flights',         label: 'Flights'           },
  { key: 'hotels',          label: 'Hotels'            },
  { key: 'transportation',  label: 'Transportation'    },
  { key: 'restaurants',     label: 'Restaurants'       },
  { key: 'checklist_items', label: 'Checklist'         },
  { key: 'packing_items',   label: 'Packing'           },
  { key: 'key_info',        label: 'Key Info'          },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function ItemRow({ item }: { item: Record<string, unknown> }) {
  const entries = Object.entries(item).filter(
    ([, v]) => v !== null && v !== undefined && v !== '',
  );
  return (
    <div
      style={{
        padding: '12px 0',
        borderBottom: '1px solid var(--border2)',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}
    >
      {entries.map(([k, v]) => (
        <div key={k} style={{ display: 'flex', gap: '8px', fontSize: '13px' }}>
          <span
            style={{
              color: 'var(--text3)',
              minWidth: '140px',
              flexShrink: 0,
              fontFamily: "'Lato', sans-serif",
              textTransform: 'capitalize',
            }}
          >
            {k.replace(/_/g, ' ')}
          </span>
          <span style={{ color: 'var(--text2)', fontFamily: "'Lato', sans-serif", wordBreak: 'break-word' }}>
            {String(v)}
          </span>
        </div>
      ))}
    </div>
  );
}

function SectionCard({
  label,
  items,
  defaultOpen = true,
}: {
  label: string;
  items: Record<string, unknown>[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      style={{
        background: 'var(--bg2)',
        borderRadius: 'var(--r-xl)',
        border: '1px solid var(--border2)',
        boxShadow: 'var(--shadow)',
        overflow: 'hidden',
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span
            style={{
              fontFamily: "'Lato', sans-serif",
              fontSize: '13px',
              fontWeight: 700,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: 'var(--navy)',
            }}
          >
            {label}
          </span>
          <span
            style={{
              fontFamily: "'Lato', sans-serif",
              fontSize: '12px',
              color: 'var(--text3)',
              background: 'var(--bg3)',
              padding: '2px 8px',
              borderRadius: '10px',
            }}
          >
            {items.length}
          </span>
        </div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
          style={{
            color: 'var(--text3)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform var(--transition)',
            flexShrink: 0,
          }}
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div style={{ padding: '0 24px 16px' }}>
          {items.length === 0 ? (
            <p style={{ fontFamily: "'Lato', sans-serif", fontSize: '13px', color: 'var(--text3)', padding: '8px 0' }}>
              No items found.
            </p>
          ) : (
            items.map((item, i) => <ItemRow key={i} item={item} />)
          )}
        </div>
      )}
    </div>
  );
}

// ─── Inner page (needs toast context) ────────────────────────────────────────

function ReviewInner({ tripId, payload }: { tripId: string; payload: PreviewPayload }) {
  const router = useRouter();
  const toast = useToast();
  const [confirmed, setConfirmed] = useState(false);

  const { result } = payload;
  const hasFlags   = result.flags?.length > 0;
  const hasUnmapped = result.unmapped?.length > 0;

  const handleConfirm = () => {
    setConfirmed(true);
    toast.success('Import confirmed — writing to database coming soon');
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
          <button
            onClick={() => router.push(`/advisor/trips/${tripId}`)}
            aria-label="Back to trip"
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
            {payload.tripTitle}
          </button>

          <span aria-hidden="true" style={{ color: 'var(--border)', fontSize: '18px', lineHeight: 1, userSelect: 'none' }}>/</span>

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
          paddingTop: 'calc(64px + var(--sat) + 40px)',
          paddingBottom: 'calc(80px + var(--sab))',
          maxWidth: '800px',
          margin: '0 auto',
          paddingLeft: '48px',
          paddingRight: '48px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
        className="helm-review-main"
      >
        <style>{`
          @media (max-width: 1023px) { .helm-review-main { padding-left: 24px !important; padding-right: 24px !important; } }
          @media (max-width: 767px)  { .helm-review-main { padding-left: 16px !important; padding-right: 16px !important; } }
        `}</style>

        {/* Page heading */}
        <div style={{ marginBottom: '8px' }}>
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
            Review Import
          </h1>
          <p style={{ fontFamily: "'Lato', sans-serif", fontSize: '14px', color: 'var(--text3)' }}>
            {payload.tripTitle}
          </p>
        </div>

        {/* Flags card */}
        {hasFlags && (
          <div
            style={{
              background: 'rgba(180,130,30,0.06)',
              border: '1px solid rgba(180,130,30,0.25)',
              borderRadius: 'var(--r-xl)',
              padding: '20px 24px',
            }}
          >
            <p
              style={{
                fontFamily: "'Lato', sans-serif",
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                color: 'var(--gold-text)',
                marginBottom: '14px',
              }}
            >
              Needs Review — {result.flags.length} {result.flags.length === 1 ? 'flag' : 'flags'}
            </p>
            {result.flags.map((flag, i) => (
              <div
                key={i}
                style={{
                  padding: '10px 0',
                  borderBottom: i < result.flags.length - 1 ? '1px solid rgba(180,130,30,0.15)' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <p style={{ fontFamily: "'Lato', sans-serif", fontSize: '13px', fontWeight: 700, color: 'var(--navy)' }}>
                  {flag.field}
                </p>
                <p style={{ fontFamily: "'Lato', sans-serif", fontSize: '13px', color: 'var(--text2)' }}>
                  {flag.issue}
                </p>
                {flag.suggestion && (
                  <p style={{ fontFamily: "'Lato', sans-serif", fontSize: '12px', color: 'var(--text3)' }}>
                    Suggestion: {flag.suggestion}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Section cards */}
        {SECTIONS.map(({ key, label }) => (
          <SectionCard
            key={key}
            label={label}
            items={result[key] ?? []}
          />
        ))}

        {/* Unmapped card */}
        {hasUnmapped && (
          <div
            style={{
              background: 'var(--bg2)',
              borderRadius: 'var(--r-xl)',
              border: '1px solid var(--border2)',
              boxShadow: 'var(--shadow)',
              padding: '20px 24px',
            }}
          >
            <p
              style={{
                fontFamily: "'Lato', sans-serif",
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                color: 'var(--text3)',
                marginBottom: '12px',
              }}
            >
              Unmapped Data — {result.unmapped.length} {result.unmapped.length === 1 ? 'item' : 'items'}
            </p>
            {result.unmapped.map((item, i) => (
              <p
                key={i}
                style={{
                  fontFamily: "'Lato', sans-serif",
                  fontSize: '13px',
                  color: 'var(--text2)',
                  padding: '6px 0',
                  borderBottom: i < result.unmapped.length - 1 ? '1px solid var(--border2)' : 'none',
                }}
              >
                {item}
              </p>
            ))}
          </div>
        )}
      </main>

      {/* Sticky confirm bar */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'var(--bg2)',
          borderTop: '1px solid var(--border2)',
          boxShadow: '0 -4px 16px rgba(13,30,53,0.08)',
          padding: 'calc(16px) 48px',
          paddingBottom: 'calc(16px + var(--sab))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '16px',
          zIndex: 90,
        }}
        className="helm-confirm-bar"
      >
        <style>{`
          @media (max-width: 767px) {
            .helm-confirm-bar { padding-left: 16px !important; padding-right: 16px !important; }
            .helm-confirm-bar > * { flex: 1; }
          }
        `}</style>
        <button
          onClick={() => router.push(`/advisor/trips/${tripId}`)}
          style={{
            background: 'none',
            border: 'none',
            fontFamily: "'Lato', sans-serif",
            fontSize: '14px',
            color: 'var(--text3)',
            cursor: 'pointer',
            padding: '10px 0',
            textDecoration: 'underline',
            textUnderlineOffset: '2px',
            minHeight: '44px',
          }}
        >
          Cancel
        </button>
        <Button
          variant="primary"
          onClick={handleConfirm}
          disabled={confirmed}
          style={{ minWidth: '160px' }}
        >
          {confirmed ? 'Confirmed' : 'Confirm Import'}
        </Button>
      </div>

      {/* Version footer */}
      <footer
        style={{
          textAlign: 'center',
          paddingBottom: 'calc(96px + var(--sab))',
          paddingTop: '8px',
        }}
      >
        <span style={{ fontSize: '11px', fontFamily: "'Lato', sans-serif", color: 'var(--text3)', opacity: 0.5, letterSpacing: '0.04em' }}>
          v{VERSION.version}
        </span>
      </footer>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ImportReviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [payload, setPayload] = useState<PreviewPayload | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem('helm_import_preview');
    if (!raw) { setLoadError(true); return; }
    try {
      setPayload(JSON.parse(raw) as PreviewPayload);
    } catch {
      setLoadError(true);
    }
  }, []);

  if (loadError) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          background: 'var(--bg)',
          fontFamily: "'Lato', sans-serif",
        }}
      >
        <p style={{ fontSize: '15px', color: 'var(--text3)' }}>No import data found.</p>
        <Button variant="ghost" onClick={() => router.push(`/advisor/trips/${params.id}`)}>
          Back to trip
        </Button>
      </div>
    );
  }

  if (!payload) return null;

  return (
    <ToastProvider>
      <ReviewInner tripId={params.id} payload={payload} />
    </ToastProvider>
  );
}
