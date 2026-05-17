import { createClient } from '@supabase/supabase-js';

// Browser client — uses anon key, read-only for realtime + reads
// Fallback URL used during `next build` only — real values come from env at runtime
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder',
  { auth: { persistSession: false, autoRefreshToken: false } }
);
