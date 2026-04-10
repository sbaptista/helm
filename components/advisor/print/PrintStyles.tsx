'use client';

import React from 'react';

export function PrintStyles() {
  return (
    <style>{`
      /* ── PRINT BASICS ── */
      @media print {
        @page {
          size: 8.5in 11in;
          margin: 0.5in;
        }
        
        body {
          background: white !important;
          color: #1A1209 !important;
          font-size: 11pt !important;
          line-height: 1.4 !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        /* Hide ALL web UI */
        header, nav, .helm-tab-row, .helm-header-inner, button, .actions, .no-print {
          display: none !important;
        }

        /* Prevent breaking cards mid-way */
        .print-section {
          page-break-inside: avoid;
          break-inside: avoid;
          margin-bottom: 24pt;
        }

        /* Header / Footer */
        .print-header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          border-bottom: 1.5pt solid #B8892A;
          padding-bottom: 4pt;
          margin-bottom: 20pt;
        }

        .print-accent {
          color: #6E4C10 !important;
          font-weight: 700;
        }

        /* Text scales */
        h1 { font-family: 'Cormorant Garamond', serif; font-size: 28pt; margin-bottom: 12pt; color: #0D1E35; }
        h2 { font-family: 'Cormorant Garamond', serif; font-size: 20pt; margin-bottom: 8pt; border-bottom: 1pt solid #DDD; padding-bottom: 2pt; margin-top: 16pt; }
        h3 { font-size: 12pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #6E4C10; margin-bottom: 6pt; }

        /* Tables */
        table { width: 100%; border-collapse: collapse; margin-bottom: 12pt; }
        td { padding: 4pt 6pt; vertical-align: top; border-bottom: 0.5pt solid #EEE; }
        .label-cell { font-weight: 700; width: 100pt; color: #6E4C10; font-size: 10pt; text-transform: uppercase; }
        
        /* Itinerary rows */
        .itin-row { display: grid; grid-template-columns: 80pt 1fr; gap: 12pt; padding: 6pt 0; border-bottom: 0.5pt solid #EEE; }
        .itin-time { font-weight: 700; color: #6E4C10; font-size: 10pt; }
        .itin-title { font-weight: 700; }
        .itin-detail { font-size: 10pt; color: #3D3020; margin-top: 2pt; }
      }

      /* Web Preview fallback */
      .print-preview-only {
        background: white;
        min-height: 11in;
        width: 8.5in;
        margin: 40px auto;
        padding: 0.5in;
        box-shadow: 0 0 20px rgba(0,0,0,0.1);
      }
    `}</style>
  );
}
