import { Suspense } from 'react';
import { SearchResults } from '@/components/search/SearchResults';
import { SearchBackButton } from '@/components/search/SearchBackButton';
import { OfflineGuard } from '@/components/ui/OfflineGuard';

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; section?: string; logs?: string }>;
}) {
  const { q = '', section, logs } = await searchParams;

  return (
    <OfflineGuard>
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <SearchBackButton />

      <div
        style={{
          maxWidth: '720px',
          margin: '0 auto',
          paddingLeft: '24px',
          paddingRight: '24px',
          paddingTop: '32px',
          paddingBottom: '64px',
        }}
      >
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
    </OfflineGuard>
  );
}
