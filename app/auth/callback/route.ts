import { createClient } from '@/lib/supabase/server';
import { type NextRequest } from 'next/server';

export async function GET(request: NextRequest): Promise<Response> {
  const code = request.nextUrl.searchParams.get('code');

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return Response.redirect(new URL('/advisor/dashboard', request.url));
    }
  }

  // No code present, or session exchange failed
  return Response.redirect(new URL('/auth/login?error=true', request.url));
}
