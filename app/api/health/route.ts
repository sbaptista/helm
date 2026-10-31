import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  // On localhost the server is the Mac itself: it answers with Wi-Fi off, and
  // the browser may still report online (VPN, Thunderbolt Bridge, tethering).
  // So in development, "online" also means this server can reach Supabase.
  // Any HTTP response counts; only a network failure (e.g. DNS) is offline.
  // In production the server always can, and an offline device can't reach
  // this route at all.
  if (process.env.NODE_ENV === 'development') {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(3000),
      });
    } catch {
      return NextResponse.json({ ok: false }, { status: 503 });
    }
  }
  return NextResponse.json({ ok: true });
}
