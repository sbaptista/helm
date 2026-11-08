'use client'

import { splitLinks } from '@/lib/links'

// Text with any well-formed URLs in it turned into links that open in a new
// tab without opening the card they sit on (docs/links-and-map-tiles-plan.md §1).
export function LinkifiedText({ text }: { text: string }) {
  return (
    <>
      {splitLinks(text).map((part, i) => part.href ? (
        <a
          key={i}
          href={part.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          onKeyDown={e => e.stopPropagation()}
          className="text-link"
          style={{ padding: '10px 0', margin: '-10px 0' }}
        >
          {part.text}
        </a>
      ) : part.text)}
    </>
  )
}

// Under a notes box: the links typed into it, so they can be opened while
// editing (a link inside a text box can't be tapped). Nothing when there are none.
export function LinksFound({ text }: { text: string | null | undefined }) {
  const links = [...new Set(splitLinks(text ?? '').flatMap((p) => (p.href ? [p.href] : [])))]
  if (links.length === 0) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', marginTop: '4px' }}>
      <span style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-xs)', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {links.length === 1 ? 'Link' : 'Links'}
      </span>
      {links.map((href) => (
        <a
          key={href}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-link"
          style={{ display: 'flex', alignItems: 'center', minHeight: '44px', fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)' }}
        >
          {href} ↗
        </a>
      ))}
    </div>
  )
}
