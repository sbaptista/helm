import { createClient } from '@/lib/supabase/server';

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

  const email = typeof body.email === 'string' ? body.email.trim() : null;
  if (!email) {
    return Response.json({ error: 'Email is required' }, { status: 400 });
  }

  const supabase = await createClient();
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
