export default function PrintLoading() {
  return (
    <main
      role="status"
      aria-live="polite"
      aria-busy="true"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'var(--bg)',
        color: 'var(--text)',
      }}
    >
      <div style={{ width: 'min(420px, 100%)', textAlign: 'center' }}>
        <div
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: '30px',
            fontWeight: 600,
            color: 'var(--navy)',
            marginBottom: '10px',
          }}
        >
          Preparing print page…
        </div>
        <p style={{ margin: '0 0 18px', fontSize: '15px', color: 'var(--text3)', lineHeight: 1.5 }}>
          Loading trip details and preparing printable content.
        </p>
        <div style={{ height: '8px', overflow: 'hidden', borderRadius: '999px', background: 'var(--bg3)' }}>
          <div className="print-loading-bar" />
        </div>
        <style>{`
          @keyframes print-loading-slide {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(300%); }
          }
          .print-loading-bar {
            width: 34%;
            height: 100%;
            border-radius: 999px;
            background: var(--gold);
            animation: print-loading-slide 1.2s ease-in-out infinite;
          }
          @media (prefers-reduced-motion: reduce) {
            .print-loading-bar { width: 100%; animation: none; }
          }
        `}</style>
      </div>
    </main>
  )
}
