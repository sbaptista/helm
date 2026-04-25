'use client';

import Link from 'next/link';
import type { SearchResult } from '@/app/api/search/route';

const SECTION_LABELS: Record<string, string> = {
  flights:        'Flights',
  hotels:         'Hotels',
  transportation: 'Transportation',
  restaurants:    'Restaurants',
  checklist:      'Checklist',
  key_info:       'Key Info',
  itinerary:      'Itinerary',
  packing:        'Packing',
  logs:           'Logs',
};

export function SearchResultCard({ result }: { result: SearchResult }) {
  const href =
    result.section === 'logs'
      ? `/advisor/trips/${result.trip_id}?section=${result.section}`
      : `/advisor/trips/${result.trip_id}?section=${result.section}&record=${result.id}`;

  return (
    <Link
      href={href}
      style={{
        display: 'block',
        padding: '14px 16px',
        borderRadius: 'var(--r-lg)',
        border: '1px solid var(--border2)',
        background: 'var(--bg2)',
        textDecoration: 'none',
        transition: 'border-color var(--transition), background var(--transition)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--gold)';
        e.currentTarget.style.background = 'var(--bg)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border2)';
        e.currentTarget.style.background = 'var(--bg2)';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <span
          style={{
            display: 'inline-block',
            padding: '2px 8px',
            border: '1px solid var(--gold)',
            borderRadius: 'var(--r-sm)',
            fontFamily: "'Lato', sans-serif",
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--gold-text)',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            marginTop: '2px',
          }}
        >
          {SECTION_LABELS[result.section] ?? result.section}
        </span>
        <div style={{ minWidth: 0 }}>
          <p
            style={{
              fontFamily: "'Lato', sans-serif",
              fontSize: '14px',
              fontWeight: 700,
              color: 'var(--text)',
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {result.title}
          </p>
          {result.subtitle && (
            <p
              style={{
                fontFamily: "'Lato', sans-serif",
                fontSize: '12px',
                color: 'var(--text3)',
                margin: '2px 0 0',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {result.subtitle}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
