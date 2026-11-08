'use client'

import type { ReactNode } from 'react'
import { isWellFormedUrl } from '@/lib/links'

// A URL input with a 44pt "Open ↗" beside it once the URL is well-formed
// (docs/links-and-map-tiles-plan.md §1). Pass the input as children.
export function UrlField({ url, children }: { url: string | null | undefined; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
      {isWellFormedUrl(url) && (
        <a
          href={url.trim()}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open link in a new tab"
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            minHeight: '44px', minWidth: '44px', padding: '0 14px',
            fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-bold)',
            color: 'var(--navy)', background: 'var(--bg3)', border: '1px solid var(--border2)',
            borderRadius: 'var(--r)', textDecoration: 'none', whiteSpace: 'nowrap',
          }}
        >
          Open ↗
        </a>
      )}
    </div>
  )
}
