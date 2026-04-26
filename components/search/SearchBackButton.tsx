'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { useState, useRef } from 'react'

export function SearchBackButton() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [inputValue, setInputValue] = useState(searchParams.get('q') ?? '')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setInputValue(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      router.replace('/search?q=' + encodeURIComponent(val))
    }, 200)
  }

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        display: 'grid',
        gridTemplateColumns: 'auto 1fr',
        alignItems: 'center',
        background: 'var(--bg)',
        borderBottom: '1px solid var(--border2)',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        height: 'calc(52px + env(safe-area-inset-top, 0px))',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', paddingLeft: '4px' }}>
        <button
          onClick={() => router.back()}
          aria-label="Go back"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            height: '44px',
            padding: '0 12px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text)',
            fontFamily: "'Lato', sans-serif",
            fontSize: 'var(--fs-sm)',
            fontWeight: 'var(--fw-medium)',
          }}
        >
          <ArrowLeft size={18} />
          Back
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', paddingRight: '16px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            type="text"
            value={inputValue}
            onChange={handleChange}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setInputValue('');
                router.replace('/search');
              }
            }}
            placeholder="Search…"
            style={{
              width: '100%',
              height: '36px',
              padding: inputValue ? '0 32px 0 12px' : '0 12px',
              background: 'var(--bg2)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-md)',
              fontFamily: "'Lato', sans-serif",
              fontSize: 'var(--fs-sm)',
              color: 'var(--text)',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {inputValue && (
            <button
              onClick={() => { setInputValue(''); router.replace('/search'); }}
              aria-label="Clear search"
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text3)',
                fontSize: '16px',
                lineHeight: 1,
                padding: '0',
              }}
            >×</button>
          )}
        </div>
      </div>
    </header>
  )
}
