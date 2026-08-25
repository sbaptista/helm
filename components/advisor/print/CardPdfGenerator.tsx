'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { generate3x5CardPDF } from '@/lib/printing/printing-service'

interface CardPdfGeneratorProps {
  children: React.ReactNode
  filename: string
}

type GenerationState = 'preparing' | 'generating' | 'complete' | 'error'

export function CardPdfGenerator({ children, filename }: CardPdfGeneratorProps) {
  const captureRef = useRef<HTMLDivElement>(null)
  const startedRef = useRef(false)
  const [state, setState] = useState<GenerationState>('preparing')
  const [current, setCurrent] = useState(0)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState('')

  const generate = useCallback(async () => {
    setState('preparing')
    setCurrent(0)
    setTotal(0)
    setError('')

    try {
      if ('fonts' in document) await document.fonts.ready
      await new Promise<void>(resolve => window.setTimeout(resolve, 150))

      const pages = Array.from(captureRef.current?.querySelectorAll<HTMLElement>('.card-page') ?? [])
      if (pages.length === 0) {
        throw new Error('This trip has no records available for the selected reference card.')
      }

      setTotal(pages.length)
      setState('generating')
      await generate3x5CardPDF(pages, filename, (nextCurrent, nextTotal) => {
        setCurrent(nextCurrent)
        setTotal(nextTotal)
      })
      setState('complete')
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : 'Card PDF generation failed.')
      setState('error')
    }
  }, [filename])

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    void generate()
  }, [generate])

  const progress = total > 0 ? Math.round((current / total) * 100) : 18
  const message = state === 'preparing'
    ? 'Rendering the selected 3×5 card layout.'
    : state === 'generating'
      ? `Capturing card ${current + 1 > total ? total : current + 1} of ${total} and assembling the PDF.`
      : state === 'complete'
        ? 'Your 3×5 PDF has been prepared and the download has started.'
        : error

  return (
    <main
      role="status"
      aria-live="polite"
      aria-busy={state === 'preparing' || state === 'generating'}
      style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'var(--bg)' }}
    >
      <div style={{ width: 'min(460px, 100%)', textAlign: 'center' }}>
        <h1 style={{ margin: '0 0 10px', fontFamily: "'Cormorant Garamond', serif", fontSize: '32px', color: 'var(--navy)' }}>
          {state === 'complete' ? 'Reference cards prepared' : state === 'error' ? 'Unable to prepare cards' : 'Preparing reference cards…'}
        </h1>
        <p style={{ margin: '0 0 18px', fontSize: '15px', lineHeight: 1.5, color: state === 'error' ? 'var(--red)' : 'var(--text3)' }}>
          {message}
        </p>
        {(state === 'preparing' || state === 'generating') && (
          <>
            <div style={{ height: '8px', overflow: 'hidden', borderRadius: '999px', background: 'var(--bg3)' }}>
              <div style={{ width: `${progress}%`, height: '100%', borderRadius: '999px', background: 'var(--gold)', transition: 'width 0.25s ease' }} />
            </div>
            <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--text3)' }}>
              {state === 'preparing' ? 'Preparing layout' : `${current} of ${total} cards captured`}
            </div>
          </>
        )}
        {(state === 'complete' || state === 'error') && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '20px' }}>
            <Button variant="secondary" onClick={() => window.close()}>Close</Button>
            <Button variant="primary" onClick={() => void generate()}>
              {state === 'complete' ? 'Download Again' : 'Try Again'}
            </Button>
          </div>
        )}
      </div>

      <div ref={captureRef} aria-hidden="true" style={{ position: 'fixed', left: '-9999px', top: 0, pointerEvents: 'none' }}>
        {children}
      </div>
    </main>
  )
}
