import { createClient } from '@/lib/supabase/server';
import { getURL } from '@/lib/utils';
import { type NextRequest } from 'next/server';

export async function GET(request: NextRequest): Promise<Response> {
  const code = request.nextUrl.searchParams.get('code');

  if (code) {
    const supabase = await createClient();
    const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

    if (!sessionError) {
      // Session is now live — auth.uid() is set.
      // If the user carried first_name/last_name in OTP metadata (new account flow),
      // insert their users row now. auth.uid() = id satisfies the SELECT/UPDATE policies,
      // and any INSERT policy using the same predicate will also be satisfied here.
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const meta = user.user_metadata as {
          first_name?: string;
          last_name?: string;
        };

        if (meta.first_name && meta.last_name) {
          // New account — create the users row. Ignore conflict in case of retry.
          await supabase.from('users').upsert(
            {
              id:         user.id,
              email:      user.email,
              first_name: meta.first_name,
              last_name:  meta.last_name,
            },
            { onConflict: 'id', ignoreDuplicates: true }
          );
          // Non-fatal: if the insert fails we still let them in.
          // The row can be created on the next request if needed.
        }
      }

      return Response.redirect(new URL('/advisor/dashboard', getURL()));
    }
  }

  // No code present, or session exchange failed
  return Response.redirect(new URL('/auth/login?error=true', getURL()));
}
