'use client';

import React from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';

interface AuthShellProps {
  children: React.ReactNode;
}

function CompassDecoration() {
  return (
    <svg
      width="180"
      height="180"
      viewBox="0 0 180 180"
      fill="none"
      aria-hidden="true"
      style={{ position: 'absolute', bottom: '40px', left: '50%', transform: 'translateX(-50%)' }}
    >
      {/* Outer ring */}
      <circle cx="90" cy="90" r="80" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
      {/* Middle ring */}
      <circle cx="90" cy="90" r="50" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      {/* Inner dot */}
      <circle cx="90" cy="90" r="4" fill="rgba(255,255,255,0.12)" />
      {/* Cardinal spokes */}
      <line x1="90" y1="10" x2="90" y2="40" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="90" y1="140" x2="90" y2="170" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="10" y1="90" x2="40" y2="90" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="140" y1="90" x2="170" y2="90" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" strokeLinecap="round" />
      {/* Intercardinal ticks */}
      <line x1="33" y1="33" x2="50" y2="50" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeLinecap="round" />
      <line x1="147" y1="33" x2="130" y2="50" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeLinecap="round" />
      <line x1="33" y1="147" x2="50" y2="130" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeLinecap="round" />
      <line x1="147" y1="147" x2="130" y2="130" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeLinecap="round" />
      {/* Compass needle — North */}
      <path d="M90 55 L94 90 L90 85 L86 90 Z" fill="rgba(255,255,255,0.2)" />
      {/* Compass needle — South */}
      <path d="M90 125 L94 90 L90 95 L86 90 Z" fill="rgba(255,255,255,0.08)" />
    </svg>
  );
}

export function AuthShell({ children }: AuthShellProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)');

  if (isDesktop) {
    return (
      <div
        style={{
          display: 'flex',
          minHeight: '100vh',
          overflow: 'hidden',
        }}
      >
        {/* Left: navy brand panel */}
        <div
          style={{
            width: '50%',
            flexShrink: 0,
            background: 'var(--navy)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '14px',
              textAlign: 'center',
              padding: '0 48px',
              zIndex: 1,
            }}
          >
            <span
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: '48px',
                fontWeight: 300,
                color: '#ffffff',
                letterSpacing: '3px',
                textTransform: 'uppercase',
                lineHeight: 1,
              }}
            >
              Helm
            </span>
            <p
              style={{
                fontSize: '15px',
                color: 'rgba(255,255,255,0.65)',
                fontFamily: "'Lato', sans-serif",
                fontWeight: 300,
                lineHeight: 1.6,
                maxWidth: '260px',
                margin: 0,
              }}
            >
              A traveler-side companion for structured journeys.
            </p>
          </div>

          {/* Decorative compass */}
          <CompassDecoration />

          {/* Subtle gradient overlay at bottom */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '200px',
              background: 'linear-gradient(to bottom, transparent, rgba(13,30,53,0.4))',
              pointerEvents: 'none',
            }}
          />
        </div>

        {/* Right: form panel */}
        <div
          style={{
            flex: 1,
            background: 'var(--bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px',
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              background: 'var(--bg2)',
              boxShadow: 'var(--shadow-md)',
              borderRadius: 'var(--r-xl)',
              padding: '40px',
              width: '100%',
              maxWidth: '420px',
            }}
          >
            {children}
          </div>
        </div>
      </div>
    );
  }

  // Mobile layout
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
      }}
    >
      {/* Navy header band */}
      <div
        style={{
          background: 'var(--navy)',
          height: `calc(120px + var(--sat))`,
          paddingTop: 'var(--sat)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: '36px',
            fontWeight: 300,
            color: '#ffffff',
            letterSpacing: '3px',
            textTransform: 'uppercase',
          }}
        >
          Helm
        </span>
      </div>

      {/* Form area */}
      <div
        style={{
          flex: 1,
          background: 'var(--bg)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '24px 16px',
          paddingBottom: 'calc(32px + var(--sab))',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch' as unknown as undefined,
          overscrollBehavior: 'contain',
        }}
      >
        <div
          style={{
            background: 'var(--bg2)',
            boxShadow: 'var(--shadow-md)',
            borderRadius: 'var(--r-xl)',
            padding: '28px',
            width: '100%',
            maxWidth: '420px',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
