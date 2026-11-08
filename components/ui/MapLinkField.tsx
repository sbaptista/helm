'use client'

import type { CSSProperties } from 'react'
import { FormField, inputStyle } from '@/components/ui/FormField'
import { UrlField } from '@/components/ui/UrlField'
import { buildMapsUrl, type MapLinkPlace } from '@/lib/geo/place-query'

// Maps URL with the "Create map link from address" switch
// (docs/links-and-map-tiles-plan.md §2). On: the link is built from the name
// and address and can't be edited. Off: the person types their own.
export function MapLinkField({ auto, onAutoChange, url, onUrlChange, place, style }: {
  auto: boolean
  onAutoChange: (auto: boolean) => void
  url: string
  onUrlChange: (url: string) => void
  place: MapLinkPlace
  style?: CSSProperties
}) {
  const generated = buildMapsUrl(place)
  const fieldStyle = style ?? inputStyle()

  function toggle(next: boolean) {
    // Turning it off starts from the generated link, so it can be adjusted.
    if (!next && !url.trim() && generated) onUrlChange(generated)
    onAutoChange(next)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', minHeight: '44px' }}>
        <input
          type="checkbox"
          checked={auto}
          onChange={e => toggle(e.target.checked)}
          style={{ width: '20px', height: '20px', accentColor: 'var(--gold)', cursor: 'pointer', flexShrink: 0, appearance: 'auto' }}
        />
        <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text)', fontWeight: 500 }}>Create map link from address</span>
      </label>
      <FormField label="Maps URL">
        {auto ? (
          generated ? (
            <UrlField url={generated}>
              <input type="url" value={generated} readOnly aria-readonly="true" style={{ ...fieldStyle, color: 'var(--text2)', background: 'var(--bg3)' }} />
            </UrlField>
          ) : (
            <p style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)', color: 'var(--text2)', minHeight: '44px', display: 'flex', alignItems: 'center', margin: 0 }}>
              Add a street address and city to create the map link.
            </p>
          )
        ) : (
          <UrlField url={url}>
            <input
              type="url"
              value={url}
              onChange={e => onUrlChange(e.target.value)}
              placeholder="e.g. https://maps.google.com/..."
              style={fieldStyle}
            />
          </UrlField>
        )}
      </FormField>
    </div>
  )
}
