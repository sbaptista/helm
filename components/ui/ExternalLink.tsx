'use client'

import type { CSSProperties, ReactNode } from 'react'
import { isWellFormedUrl } from '@/lib/links'

// A link that opens in a new tab, 44pt tall, and never also triggers the
// card it sits on (docs/links-and-map-tiles-plan.md §1). Renders nothing for a
// URL that isn't well-formed.
export function ExternalLink({ href, children, style }: { href: string | null | undefined; children: ReactNode; style?: CSSProperties }) {
  if (!isWellFormedUrl(href)) return null
  return (
    <a
      href={href.trim()}
      target="_blank"
      rel="noopener noreferrer"
      onClick={e => e.stopPropagation()}
      onKeyDown={e => e.stopPropagation()}
      className="text-link"
      style={{
        display: 'inline-flex', alignItems: 'center', minHeight: '44px',
        fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-bold)',
        maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </a>
  )
}

// A row of links under a card's details; wraps on narrow screens.
export function LinkRow({ children }: { children: ReactNode }) {
  return <div style={{ display: 'flex', flexWrap: 'wrap', columnGap: '20px' }}>{children}</div>
}
