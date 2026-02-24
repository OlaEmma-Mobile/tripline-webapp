import { createClient } from '@supabase/supabase-js';
import { assertServerEnv } from '@/lib/utils/env';

/**
 * Server-side Supabase client using service role key.
 */
assertServerEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin = createClient(supabaseUrl!, serviceKey!, {
  auth: { persistSession: false },
});
