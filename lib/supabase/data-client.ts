import { createClient as createSSRClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export async function getDataClient() {
  if (process.env.BYPASS_AUTH_USER_ID) {
    return createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    );
  }
  return createSSRClient();
}
