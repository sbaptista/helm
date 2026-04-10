/**
 * Printing Service for Helm
 * Handles data mapping, PDF generation orchestration, and print-specific cleanup.
 */

/**
 * Removes emoji and pictographs from a string/HTML to ensure clean B&W printing.
 * Ports the logic from CAN26 v3.2.0.
 */
export function stripEmojiForPrint(text: string): string {
  if (!text) return '';
  // Basic emoji/symbol range cleanup
  return text.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
}

/**
 * Draws the Helm Mountain Silhouette onto a canvas.
 * Ports and adapts the drawMountainCanvas logic from CAN26.
 * Uses a normalized 360x28 coordinate space.
 */
export function drawMountainIntoCanvas(ctx: CanvasRenderingContext2D, width: number, height: number, opacityMultiplier: number = 1) {
  const x = (val: number) => (val / 360) * width;
  const y = (val: number) => (val / 28) * height;

  // Layer 1: Back Ridge (Extremely faint watermark)
  ctx.fillStyle = `rgba(13, 30, 53, ${0.04 * opacityMultiplier})`;
  ctx.beginPath();
  ctx.moveTo(x(0), y(28));
  ctx.lineTo(x(0), y(26));
  ctx.lineTo(x(22), y(18));
  ctx.lineTo(x(36), y(24));
  ctx.lineTo(x(52), y(16));
  ctx.lineTo(x(64), y(22));
  ctx.lineTo(x(80), y(14));
  ctx.lineTo(x(94), y(22));
  ctx.lineTo(x(108), y(16));
  ctx.lineTo(x(120), y(24));
  ctx.lineTo(x(136), y(18));
  ctx.lineTo(x(148), y(24));
  ctx.lineTo(x(164), y(16));
  ctx.lineTo(x(178), y(22));
  ctx.lineTo(x(194), y(16));
  ctx.lineTo(x(208), y(24));
  ctx.lineTo(x(224), y(18));
  ctx.lineTo(x(238), y(24));
  ctx.lineTo(x(256), y(16));
  ctx.lineTo(x(270), y(22));
  ctx.lineTo(x(286), y(14));
  ctx.lineTo(x(300), y(22));
  ctx.lineTo(x(316), y(16));
  ctx.lineTo(x(330), y(22));
  ctx.lineTo(x(346), y(16));
  ctx.lineTo(x(360), y(20));
  ctx.lineTo(x(360), y(28));
  ctx.closePath();
  ctx.fill();

  // Layer 2: Front Ridge (Extremely faint watermark)
  ctx.fillStyle = `rgba(13, 30, 53, ${0.06 * opacityMultiplier})`;
  ctx.beginPath();
  ctx.moveTo(x(0), y(28));
  ctx.lineTo(x(0), y(20));
  ctx.lineTo(x(18), y(12));
  ctx.lineTo(x(30), y(18));
  ctx.lineTo(x(44), y(6));
  ctx.lineTo(x(54), y(14));
  ctx.lineTo(x(66), y(2));
  ctx.lineTo(x(76), y(10));
  ctx.lineTo(x(88), y(4));
  ctx.lineTo(x(98), y(14));
  ctx.lineTo(x(112), y(8));
  ctx.lineTo(x(122), y(16));
  ctx.lineTo(x(138), y(4));
  ctx.lineTo(x(150), y(12));
  ctx.lineTo(x(162), y(6));
  ctx.lineTo(x(174), y(16));
  ctx.lineTo(x(186), y(8));
  ctx.lineTo(x(196), y(18));
  ctx.lineTo(x(212), y(6));
  ctx.lineTo(x(224), y(14));
  ctx.lineTo(x(238), y(2));
  ctx.lineTo(x(250), y(10));
  ctx.lineTo(x(262), y(6));
  ctx.lineTo(x(274), y(16));
  ctx.lineTo(x(288), y(8));
  ctx.lineTo(x(300), y(18));
  ctx.lineTo(x(316), y(4));
  ctx.lineTo(x(328), y(12));
  ctx.lineTo(x(342), y(6));
  ctx.lineTo(x(356), y(14));
  ctx.lineTo(x(360), y(12));
  ctx.lineTo(x(360), y(28));
  ctx.closePath();
  ctx.fill();
}

/**
 * Orchestrates the generation of a 3x5 card PDF.
 * Expects a DOM element containing the card(s) to capture.
 */
export async function generate3x5CardPDF(pages: HTMLElement[], filename: string) {
  // We dynamic import these to avoid issues with SSR or if they aren't installed yet
  const { jsPDF } = await import('jspdf');
  const html2canvas = (await import('html2canvas')).default;

  // 3x5 inches in points (72dpi) = 360pt x 216pt
  // We capture at 96dpi (480x288px) and map to 360x216pt
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: [360, 216],
  });

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    
    // Ensure all images/canvases in the page are ready
    const canvas = await html2canvas(page, {
      scale: 2, // High DPI capture
      useCORS: true,
      backgroundColor: '#FFFFFF',
      width: 480,
      height: 288,
    });

    const imgData = canvas.toDataURL('image/png');
    
    if (i > 0) {
      pdf.addPage([360, 216], 'landscape');
    }
    
    pdf.addImage(imgData, 'PNG', 0, 0, 360, 216);
  }

  pdf.save(filename);
}

/**
 * Format a date range for the print title page
 */
export function formatPrintDateRange(departure: string, returnDate: string): string {
  if (!departure || !returnDate) return '';
  const dep = new Date(departure + 'T00:00:00');
  const ret = new Date(returnDate + 'T00:00:00');
  
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  return `${dep.toLocaleDateString('en-US', options)} \u2013 ${ret.toLocaleDateString('en-US', options)}`;
}

/**
 * Splits an array into smaller chunks for pagination
 */
export function chunkArray<T>(array: T[], size: number): T[][] {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}
