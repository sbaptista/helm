import { Suspense } from 'react';
import { SearchResults } from '@/components/search/SearchResults';

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; section?: string; logs?: string }>;
}) {
  const { q = '', section, logs } = await searchParams;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        paddingTop: '48px',
        paddingBottom: '64px',
      }}
    >
      <div
        style={{
          maxWidth: '720px',
          margin: '0 auto',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}
      >
        <h1
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: '32px',
            fontWeight: 600,
            color: 'var(--navy)',
            marginBottom: '8px',
          }}
        >
          Search
        </h1>
        {q && (
          <p
            style={{
              fontFamily: "'Lato', sans-serif",
              fontSize: '14px',
              color: 'var(--text3)',
              marginBottom: '28px',
            }}
          >
            Results for &ldquo;{q}&rdquo;
          </p>
        )}
        <Suspense>
          <SearchResults q={q} section={section} logs={logs} />
        </Suspense>
      </div>
    </div>
  );
}
