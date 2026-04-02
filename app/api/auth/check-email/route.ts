import { createClient } from '@supabase/supabase-js';

interface CheckEmailBody {
  email?: unknown;
}

export async function POST(request: Request): Promise<Response> {
  let body: CheckEmailBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : null;
  if (!email) {
    return Response.json({ error: 'Email is required' }, { status: 400 });
  }

  // Service role client — bypasses RLS so the lookup works for unauthenticated requests.
  // This route is server-only and returns only a boolean; no user data is exposed.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
  );
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .limit(1)
    .maybeSingle();

  if (error) {
    // Don't expose DB errors — treat as not found
    return Response.json({ exists: false });
  }

  return Response.json({ exists: data !== null });
}
