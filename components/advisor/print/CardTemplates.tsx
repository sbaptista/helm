'use client';

import React, { useEffect, useRef } from 'react';
import { drawMountainIntoCanvas } from '@/lib/printing/printing-service';

interface CardWrapperProps {
  children: React.ReactNode;
  side: 'FRONT' | 'BACK';
  page?: number;
  total?: number;
}

export function CardWrapper({ children, side, page, total }: CardWrapperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        drawMountainIntoCanvas(ctx, 480, 44);
      }
    }
  }, []);

  return (
    <div
      className="card-page"
      style={{
        width: '5in',
        height: '3in',
        background: '#FFFFFF',
        position: 'relative',
        overflow: 'hidden',
        padding: '0.35in 0.50in 0.42in 0.28in',
        fontFamily: "'Lato', sans-serif",
        boxSizing: 'border-box',
      }}
    >
      {/* Mountain Canvas (Watermark Layer) */}
      <canvas
        ref={canvasRef}
        width={480}
        height={44}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          width: '5in',
          height: '44px',
          pointerEvents: 'none',
          zIndex: 0,
          opacity: 0.65,
        }}
      />

      {/* Side Label */}
      <div style={{
        position: 'absolute',
        top: '0.20in',
        right: '0.50in',
        fontSize: '10px',
        color: '#5A4D3A',
        letterSpacing: '1px',
        textTransform: 'uppercase',
        zIndex: 2,
      }}>
        {side} {total && total > 1 && `| Card ${page} of ${total}`}
      </div>

      {/* Content Layer (Above watermark) */}
      <div style={{ position: 'relative', zIndex: 1, pointerEvents: 'auto', paddingBottom: '0.30in' }}>
        {children}
      </div>

      {/* Footer Branding */}
      <div style={{
        position: 'absolute',
        bottom: '0.14in',
        left: '0.28in',
        right: '0.50in',
        fontSize: '10px',
        color: '#5A4D3A',
        display: 'flex',
        justifyContent: 'space-between',
        zIndex: 10,
      }}>
        <span>{`Printed ${new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}`}</span>
        <span>Stanley & Cathy Baptista</span>
      </div>
    </div>
  );
}

export function CardHeader({ title, sub, pageLabel }: { title: string; sub: string; pageLabel?: string }) {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'baseline', 
      borderBottom: '1.5pt solid #B8892A',
      paddingBottom: '4px',
      marginBottom: '8px',
    }}>
      <div style={{ 
        fontSize: '14.7px',
        fontWeight: 700,
        letterSpacing: '1.5px',
        textTransform: 'uppercase',
        color: '#0D1E35'
      }}>
        {title} {pageLabel && <span style={{ fontSize: '12px', opacity: 0.6 }}>({pageLabel})</span>}
      </div>
      <div style={{
        fontSize: '13.3px',
        fontWeight: 700,
        color: '#6E4C10'
      }}>
        {sub}
      </div>
    </div>
  );
}

export function CardRow({ label, value }: { label: string; value: string | React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: '8px', marginBottom: '5px', alignItems: 'baseline' }}>
      <div style={{ 
        fontSize: '12px',
        fontWeight: 700,
        letterSpacing: '0.5px',
        textTransform: 'uppercase',
        color: '#7A8B9A',
        minWidth: '77px',
        flexShrink: 0
      }}>
        {label}
      </div>
      <div style={{ fontSize: '13.3px', color: '#1A1209' }}>
        {value}
      </div>
    </div>
  );
}
