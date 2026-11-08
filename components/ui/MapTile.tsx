'use client'

import { useState } from 'react'
import { isWellFormedUrl } from '@/lib/links'
import { useIsOnline } from '@/hooks/useOnlineStatus'

// A small map with a pin at the place, opening its map link
// (docs/links-and-map-tiles-plan.md §3). Shown only when the record has a
// location the server confirmed and a well-formed link; if the image can't
// load (offline, Google refuses), the tile is left out and the Map ↗ link
// remains.
export function MapTile({ table, id, name, url, lat, lng }: {
  table: 'hotels' | 'restaurants'
  id: string
  name: string | null | undefined
  url: string | null | undefined
  lat: number | null | undefined
  lng: number | null | undefined
}) {
  const online = useIsOnline()
  const at = lat != null && lng != null ? `${lat},${lng}` : null
  const [failedAt, setFailedAt] = useState<string | null>(null)
  if (!at || !isWellFormedUrl(url) || failedAt === at || !online) return null
  return (
    <a
      href={url.trim()}
      target="_blank"
      rel="noopener noreferrer"
      onClick={e => e.stopPropagation()}
      onKeyDown={e => e.stopPropagation()}
      aria-label={`Map of ${name || 'this place'} (opens in a new tab)`}
      style={{
        display: 'block', width: '100%', maxWidth: '320px', aspectRatio: '2 / 1',
        marginTop: '8px', borderRadius: '8px', overflow: 'hidden',
        border: '1px solid var(--border2)', background: 'var(--bg2)',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- served by our own route; next/image would re-fetch it */}
      <img
        src={`/api/map-tile/${table}/${id}?v=${encodeURIComponent(at)}`}
        alt=""
        width={320}
        height={160}
        loading="lazy"
        onError={() => setFailedAt(at)}
        style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
      />
    </a>
  )
}
