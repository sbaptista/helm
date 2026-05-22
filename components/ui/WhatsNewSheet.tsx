'use client'

import { ResponsiveSheet } from '@/components/ui/ResponsiveSheet'
import { CHANGELOG } from '@/lib/changelog'

interface WhatsNewSheetProps {
  open: boolean
  onClose: () => void
}

export default function WhatsNewSheet({ open, onClose }: WhatsNewSheetProps) {
  return (
    <ResponsiveSheet open={open} onClose={onClose} title="What's New">
      <div style={{ position: 'relative', paddingLeft: '28px' }}>
        {/* Timeline line */}
        <div
          style={{
            position: 'absolute',
            left: '6px',
            top: '8px',
            bottom: '8px',
            width: '2px',
            background: 'rgba(184, 137, 42, 0.2)',
            borderRadius: '1px',
          }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {CHANGELOG.map((release, index) => (
            <div key={release.version} style={{ position: 'relative' }}>
              {/* Timeline dot */}
              <div
                style={{
                  position: 'absolute',
                  left: '-28px',
                  top: '6px',
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  background: index === 0 ? '#B8892A' : 'var(--bg3, #e5e5e5)',
                  border: index === 0 ? '3px solid var(--bg, #fff)' : '3px solid var(--bg, #fff)',
                  boxShadow: index === 0 ? '0 0 0 2px rgba(184, 137, 42, 0.3)' : 'none',
                  zIndex: 2,
                }}
              />

              {/* Release card */}
              <div
                style={{
                  background: 'var(--bg2, #f8f8f8)',
                  borderRadius: '10px',
                  padding: '16px 18px',
                  border: '1px solid var(--border, #e0e0e0)',
                }}
              >
                {/* Header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '8px',
                    marginBottom: '12px',
                    borderBottom: '1px solid var(--border, #e0e0e0)',
                    paddingBottom: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '3px 10px',
                        borderRadius: '10px',
                        fontSize: '12px',
                        fontWeight: 600,
                        fontFamily: "'Lato', sans-serif",
                        background: index === 0 ? 'rgba(184, 137, 42, 0.1)' : 'var(--bg3, #e5e5e5)',
                        color: index === 0 ? '#B8892A' : 'var(--text2, #666)',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {release.version}
                    </span>
                    {index === 0 && (
                      <span
                        style={{
                          fontSize: '9px',
                          color: '#B8892A',
                          background: 'rgba(184, 137, 42, 0.08)',
                          border: '1px solid rgba(184, 137, 42, 0.2)',
                          borderRadius: '4px',
                          padding: '1px 5px',
                          fontWeight: 600,
                          fontFamily: "'Lato', sans-serif",
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                        }}
                      >
                        Latest
                      </span>
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: '12px',
                      color: 'var(--text3, #999)',
                      fontFamily: "'Lato', sans-serif",
                      fontWeight: 400,
                    }}
                  >
                    {new Date(release.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>

                {/* Changes list */}
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: '18px',
                    fontSize: '14px',
                    color: 'var(--text2, #555)',
                    fontFamily: "'Lato', sans-serif",
                    lineHeight: '1.65',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    listStyleType: 'disc',
                  }}
                >
                  {release.changes.map((change, cIdx) => (
                    <li key={cIdx} style={{ paddingLeft: '2px' }}>
                      {change}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ResponsiveSheet>
  )
}
