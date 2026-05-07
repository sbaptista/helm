import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0D1E35',
          borderRadius: '6px',
        }}
      >
        <svg width="24" height="24" viewBox="190 110 300 300">
          <circle cx="340" cy="260" r="99" fill="none" stroke="#E8E2D8" strokeWidth="14" />
          <line x1="367" y1="260" x2="431" y2="260" stroke="#E8E2D8" strokeWidth="12" strokeLinecap="round" />
          <line x1="359" y1="279" x2="404" y2="324" stroke="#E8E2D8" strokeWidth="12" strokeLinecap="round" />
          <line x1="340" y1="287" x2="340" y2="351" stroke="#E8E2D8" strokeWidth="12" strokeLinecap="round" />
          <line x1="321" y1="279" x2="276" y2="324" stroke="#E8E2D8" strokeWidth="12" strokeLinecap="round" />
          <line x1="313" y1="260" x2="249" y2="260" stroke="#E8E2D8" strokeWidth="12" strokeLinecap="round" />
          <line x1="321" y1="241" x2="276" y2="196" stroke="#E8E2D8" strokeWidth="12" strokeLinecap="round" />
          <line x1="340" y1="233" x2="340" y2="169" stroke="#E8E2D8" strokeWidth="12" strokeLinecap="round" />
          <line x1="359" y1="241" x2="404" y2="196" stroke="#E8E2D8" strokeWidth="12" strokeLinecap="round" />
          <circle cx="449" cy="260" r="14" fill="#E8E2D8" />
          <circle cx="417" cy="337" r="14" fill="#E8E2D8" />
          <circle cx="340" cy="369" r="14" fill="#E8E2D8" />
          <circle cx="263" cy="337" r="14" fill="#E8E2D8" />
          <circle cx="231" cy="260" r="14" fill="#E8E2D8" />
          <circle cx="263" cy="183" r="14" fill="#E8E2D8" />
          <circle cx="340" cy="151" r="14" fill="#E8E2D8" />
          <circle cx="417" cy="183" r="14" fill="#E8E2D8" />
          <circle cx="340" cy="260" r="36" fill="#E8E2D8" />
          <circle cx="340" cy="260" r="24" fill="#B8892A" />
          <circle cx="340" cy="260" r="14" fill="#0D1E35" />
          <circle cx="340" cy="260" r="8" fill="#B8892A" />
        </svg>
      </div>
    ),
    { ...size },
  )
}
