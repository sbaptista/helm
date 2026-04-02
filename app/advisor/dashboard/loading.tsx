/* Suspense-compatible skeleton — shown while dashboard page.tsx awaits Supabase data */

export default function DashboardLoading() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <style>{`
        @keyframes helm-shimmer {
          0%   { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        .helm-shimmer {
          background: linear-gradient(
            90deg,
            var(--bg3) 0%,
            var(--bg2) 40%,
            var(--bg3) 80%
          );
          background-size: 800px 100%;
          animation: helm-shimmer 1.4s ease-in-out infinite;
          border-radius: var(--r);
        }
        @media (max-width: 1023px) {
          .sk-header-inner { padding: 0 24px !important; }
          .sk-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .sk-main { padding-left: 24px !important; padding-right: 24px !important; }
        }
        @media (max-width: 767px) {
          .sk-header-inner { padding: 0 16px !important; }
          .sk-grid { grid-template-columns: 1fr !important; }
          .sk-main { padding-left: 16px !important; padding-right: 16px !important; }
        }
      `}</style>

      {/* Skeleton header */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 'calc(64px + var(--sat))',
          paddingTop: 'var(--sat)',
          background: 'var(--bg2)',
          borderBottom: '1px solid var(--border2)',
          boxShadow: 'var(--shadow)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'flex-end',
        }}
      >
        <div
          className="sk-header-inner"
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
          {/* Wordmark skeleton */}
          <div className="helm-shimmer" style={{ width: '60px', height: '20px' }} />
          {/* Button skeleton */}
          <div className="helm-shimmer" style={{ width: '110px', height: '40px', borderRadius: 'var(--r)' }} />
        </div>
      </div>

      {/* Skeleton content */}
      <main
        className="sk-main"
        style={{
          paddingTop: 'calc(64px + var(--sat) + 40px)',
          paddingBottom: '40px',
          maxWidth: '1200px',
          margin: '0 auto',
          paddingLeft: '48px',
          paddingRight: '48px',
        }}
      >
        {/* Title skeleton */}
        <div style={{ marginBottom: '28px' }}>
          <div className="helm-shimmer" style={{ width: '180px', height: '36px', marginBottom: '8px' }} />
          <div className="helm-shimmer" style={{ width: '40px', height: '3px', marginBottom: '8px' }} />
          <div className="helm-shimmer" style={{ width: '60px', height: '16px' }} />
        </div>

        {/* Filter pills skeleton */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '28px' }}>
          {[80, 70, 90, 85].map((w, i) => (
            <div
              key={i}
              className="helm-shimmer"
              style={{ width: `${w}px`, height: '44px', borderRadius: '20px' }}
            />
          ))}
        </div>

        {/* Card grid skeleton */}
        <div
          className="sk-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '20px',
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </main>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div
      style={{
        background: 'var(--bg2)',
        borderRadius: 'var(--r-lg)',
        boxShadow: 'var(--shadow)',
        overflow: 'hidden',
        border: '1px solid var(--border2)',
      }}
    >
      {/* Accent bar */}
      <div className="helm-shimmer" style={{ height: '4px', borderRadius: 0 }} />

      <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Badge area */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div className="helm-shimmer" style={{ width: '64px', height: '22px', borderRadius: '20px' }} />
        </div>
        {/* Title */}
        <div className="helm-shimmer" style={{ width: '70%', height: '22px' }} />
        {/* Destination */}
        <div className="helm-shimmer" style={{ width: '55%', height: '16px' }} />
        {/* Date */}
        <div className="helm-shimmer" style={{ width: '65%', height: '16px' }} />
        {/* Travelers */}
        <div className="helm-shimmer" style={{ width: '40%', height: '16px' }} />
        {/* Bottom row */}
        <div style={{ paddingTop: '16px', borderTop: '1px solid var(--border2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="helm-shimmer" style={{ width: '80px', height: '36px', borderRadius: 'var(--r)' }} />
          <div className="helm-shimmer" style={{ width: '36px', height: '36px', borderRadius: 'var(--r)' }} />
        </div>
      </div>
    </div>
  );
}
