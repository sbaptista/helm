'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { SearchResult } from '@/app/api/search/route';
import { SearchResultCard } from './SearchResultCard';

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

interface Props {
  q: string;
  section?: string;
  logs?: string;
}

export function SearchResults({ q, section: initialSection, logs: initialLogs }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [allResults, setAllResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [logsEnabled, setLogsEnabled] = useState(initialLogs === 'true');
  const [activeSection, setActiveSection] = useState(initialSection ?? '');
  const [wholeWord, setWholeWord] = useState(false);

  const prevFetchKey = useRef('');

  useEffect(() => {
    if (!q || q.length < 2) return;
    const fetchKey = `${q}|${logsEnabled}|${wholeWord}`;
    if (fetchKey === prevFetchKey.current) return;
    prevFetchKey.current = fetchKey;

    setLoading(true);
    const params = new URLSearchParams({ q });
    if (logsEnabled) params.set('logs', 'true');
    if (wholeWord) params.set('mode', 'whole_word');

    fetch(`/api/search?${params.toString()}`)
      .then((r) => r.json())
      .then((json) => {
        setAllResults(json.results ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [q, logsEnabled, wholeWord]);

  // When logs toggled, update URL and re-fetch
  function toggleLogs() {
    const next = !logsEnabled;
    setLogsEnabled(next);
    prevFetchKey.current = ''; // force re-fetch
    const params = new URLSearchParams(searchParams.toString());
    if (next) params.set('logs', 'true');
    else params.delete('logs');
    router.replace(`/search?${params.toString()}`);
  }

  function selectSection(s: string) {
    setActiveSection(s);
    const params = new URLSearchParams(searchParams.toString());
    if (s) params.set('section', s);
    else params.delete('section');
    router.replace(`/search?${params.toString()}`);
  }

  const displayed = activeSection
    ? allResults.filter((r) => r.section === activeSection)
    : allResults;

  const sectionKeys = Array.from(new Set(allResults.map((r) => r.section)));

  if (!q || q.length < 2) {
    return (
      <p style={{ fontFamily: "'Lato', sans-serif", fontSize: '14px', color: 'var(--text3)', marginTop: '32px' }}>
        Enter at least 2 characters to search.
      </p>
    );
  }

  return (
    <div>
      {/* Controls row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {/* Section pills */}
        {[{ key: '', label: 'All' }, ...sectionKeys.map((k) => ({ key: k, label: SECTION_LABELS[k] ?? k }))].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => selectSection(key)}
            style={{
              padding: '4px 12px',
              borderRadius: '999px',
              border: activeSection === key ? '1.5px solid var(--navy)' : '1.5px solid var(--border)',
              background: activeSection === key ? 'var(--navy)' : 'transparent',
              color: activeSection === key ? '#fff' : 'var(--text3)',
              fontFamily: "'Lato', sans-serif",
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.04em',
              cursor: 'pointer',
              transition: 'all var(--transition)',
            }}
          >
            {label}
          </button>
        ))}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Whole Word toggle */}
        <button
          onClick={() => { setWholeWord(w => !w); prevFetchKey.current = ''; }}
          style={{
            padding: '4px 12px',
            borderRadius: '999px',
            border: wholeWord ? '1.5px solid var(--navy)' : '1.5px solid var(--border)',
            background: wholeWord ? 'var(--navy)' : 'transparent',
            color: wholeWord ? '#fff' : 'var(--text3)',
            fontFamily: "'Lato', sans-serif",
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '0.04em',
            cursor: 'pointer',
            transition: 'all var(--transition)',
          }}
        >
          Whole Word
        </button>

        {/* Logs toggle */}
        <button
          onClick={toggleLogs}
          style={{
            padding: '4px 12px',
            borderRadius: '999px',
            border: logsEnabled ? '1.5px solid var(--gold)' : '1.5px solid var(--border)',
            background: logsEnabled ? 'rgba(180,130,30,0.08)' : 'transparent',
            color: logsEnabled ? 'var(--gold-text)' : 'var(--text3)',
            fontFamily: "'Lato', sans-serif",
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '0.04em',
            cursor: 'pointer',
            transition: 'all var(--transition)',
          }}
        >
          Logs
        </button>
      </div>

      {/* Result count */}
      {!loading && (
        <p style={{ fontFamily: "'Lato', sans-serif", fontSize: '13px', color: 'var(--text3)', marginBottom: '16px' }}>
          {displayed.length} result{displayed.length !== 1 ? 's' : ''}
          {wholeWord && ' — whole word'}
        </p>
      )}

      {/* Loading */}
      {loading && (
        <p style={{ fontFamily: "'Lato', sans-serif", fontSize: '14px', color: 'var(--text3)', marginTop: '32px' }}>
          Searching…
        </p>
      )}

      {/* Empty state */}
      {!loading && displayed.length === 0 && (
        <p style={{ fontFamily: "'Lato', sans-serif", fontSize: '14px', color: 'var(--text3)', marginTop: '32px' }}>
          No results for &ldquo;{q}&rdquo;
        </p>
      )}

      {/* Results list */}
      {!loading && displayed.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {displayed.map((r) => (
            <SearchResultCard key={r.id + r.section} result={r} q={q} wholeWord={wholeWord} />
          ))}
        </div>
      )}
    </div>
  );
}
