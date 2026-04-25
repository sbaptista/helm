'use client';

import { useState, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

export function SearchBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function navigate() {
    const trimmed = value.trim();
    if (trimmed.length < 2) return;

    if (pathname === '/search') {
      const params = new URLSearchParams(searchParams.toString());
      params.set('q', trimmed);
      router.push(`/search?${params.toString()}`);
    } else {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    }
  }

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') navigate(); }}
        placeholder="Search…"
        aria-label="Search trips"
        style={{
          height: '34px',
          width: '200px',
          paddingLeft: '32px',
          paddingRight: '10px',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg)',
          background: 'var(--bg)',
          color: 'var(--text)',
          fontFamily: "'Lato', sans-serif",
          fontSize: '13px',
          outline: 'none',
          transition: 'border-color var(--transition), width var(--transition)',
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.width = '240px'; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.width = '200px'; }}
      />
      {/* search icon */}
      <svg
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '10px',
          color: 'var(--text3)',
          pointerEvents: 'none',
          flexShrink: 0,
        }}
        onClick={navigate}
      >
        <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 10l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}
