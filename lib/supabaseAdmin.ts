import { createClient } from '@supabase/supabase-js';

// Server-only client — uses service role key, bypasses RLS
// Only import this in API routes (server-side)
// Fallback values used during `next build` only — real values come from env at runtime
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_KEY ?? 'placeholder',
  {
    auth: { persistSession: false, autoRefreshToken: false },
    // Prevent Next.js 14 from caching supabase-js fetch calls — reads must be fresh
    global: {
      fetch: (url: RequestInfo | URL, options: RequestInit = {}) =>
        fetch(url, { ...options, cache: 'no-store' }),
    },
  }
);
