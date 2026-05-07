import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0D1E35',
          borderRadius: '36px',
        }}
      >
        <svg width="130" height="130" viewBox="190 110 300 300">
          <circle cx="340" cy="260" r="104" fill="none" stroke="#B8892A" strokeWidth="1.5" opacity="0.55" />
          <circle cx="340" cy="260" r="99" fill="none" stroke="#E8E2D8" strokeWidth="9" />
          <line x1="367" y1="260" x2="431" y2="260" stroke="#E8E2D8" strokeWidth="7.5" strokeLinecap="round" />
          <line x1="359" y1="279" x2="404" y2="324" stroke="#E8E2D8" strokeWidth="7.5" strokeLinecap="round" />
          <line x1="340" y1="287" x2="340" y2="351" stroke="#E8E2D8" strokeWidth="7.5" strokeLinecap="round" />
          <line x1="321" y1="279" x2="276" y2="324" stroke="#E8E2D8" strokeWidth="7.5" strokeLinecap="round" />
          <line x1="313" y1="260" x2="249" y2="260" stroke="#E8E2D8" strokeWidth="7.5" strokeLinecap="round" />
          <line x1="321" y1="241" x2="276" y2="196" stroke="#E8E2D8" strokeWidth="7.5" strokeLinecap="round" />
          <line x1="340" y1="233" x2="340" y2="169" stroke="#E8E2D8" strokeWidth="7.5" strokeLinecap="round" />
          <line x1="359" y1="241" x2="404" y2="196" stroke="#E8E2D8" strokeWidth="7.5" strokeLinecap="round" />
          <circle cx="449" cy="260" r="9" fill="#E8E2D8" />
          <circle cx="417" cy="337" r="9" fill="#E8E2D8" />
          <circle cx="340" cy="369" r="9" fill="#E8E2D8" />
          <circle cx="263" cy="337" r="9" fill="#E8E2D8" />
          <circle cx="231" cy="260" r="9" fill="#E8E2D8" />
          <circle cx="263" cy="183" r="9" fill="#E8E2D8" />
          <circle cx="340" cy="151" r="9" fill="#E8E2D8" />
          <circle cx="417" cy="183" r="9" fill="#E8E2D8" />
          <circle cx="340" cy="260" r="26" fill="#E8E2D8" />
          <circle cx="340" cy="260" r="18" fill="#B8892A" />
          <circle cx="340" cy="260" r="10" fill="#0D1E35" />
          <circle cx="340" cy="260" r="6" fill="#B8892A" />
        </svg>
      </div>
    ),
    { ...size },
  )
}
