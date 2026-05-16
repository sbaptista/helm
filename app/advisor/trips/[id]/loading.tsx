export default function TripDetailLoading() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* DashboardBar skeleton */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 31,
        height: '40px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        background: 'var(--bg)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ width: 80, height: 14, borderRadius: 4, background: 'var(--border)' }} />
      </div>

      {/* TripTopBar skeleton */}
      <div style={{
        position: 'sticky',
        top: 40,
        zIndex: 30,
        minHeight: '64px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '0 16px',
        background: 'var(--bg)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ width: 28, height: 28, borderRadius: 4, background: 'var(--border)' }} />
        <div style={{ width: 200, height: 20, borderRadius: 4, background: 'var(--border)' }} />
      </div>

      {/* Content skeleton */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}>
        {/* Tab bar skeleton */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} style={{
              width: i === 0 ? 80 : 60 + (i % 3) * 20,
              height: 32,
              borderRadius: 6,
              background: i === 0 ? 'var(--navy)' : 'var(--border)',
              opacity: i === 0 ? 0.3 : 0.5,
            }} />
          ))}
        </div>

        {/* Card skeletons */}
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} style={{
            height: 80,
            borderRadius: 8,
            background: 'var(--border)',
            opacity: 0.4 - i * 0.1,
          }} />
        ))}
      </div>
    </div>
  );
}
