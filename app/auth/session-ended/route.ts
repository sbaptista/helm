import { cookies } from 'next/headers';

// A page found no valid sign-in (signed out on another device, or expired).
// Clear this browser's Supabase sign-in cookies before showing the login
// page, so the browser client never tries to renew a sign-in Supabase has
// already cancelled ("Invalid Refresh Token: Refresh Token Not Found").
// Clearing is local only: nothing is sent to Supabase.
export async function GET(): Promise<Response> {
  const cookieStore = await cookies();
  for (const { name } of cookieStore.getAll()) {
    if (name.startsWith('sb-') && name.includes('-auth-token')) cookieStore.delete(name);
  }
  // Relative, so each device stays on the address it used (localhost or the
  // Bonjour name). request.url carries the dev server's 0.0.0.0 bind address.
  return new Response(null, { status: 307, headers: { Location: '/auth/login' } });
}
