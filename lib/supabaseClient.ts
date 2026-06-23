import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

if (!url || !anonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create a client suitable for the current environment. When running on the
// server (Node) we avoid auth initialization behaviors that assume a browser
// (e.g. `detectSessionInUrl`) because they can trigger network requests during
// module evaluation and cause "Failed to fetch" errors in dev.
export const supabase = typeof window !== 'undefined'
  ? createClient(url, anonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : createClient(url, anonKey, {
      // server-safe: do not attempt to detect sessions in URL or auto-refresh
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });

// server-side client without auth for API routes
export const supabaseServer = createClient(url, anonKey);

// server-side client using service role key for privileged operations
export const getSupabaseAdmin = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.DEVELOPER_TOKEN;
  if (!serviceRoleKey) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY or DEVELOPER_TOKEN not available');
    return null;
  }
  return createClient(url, serviceRoleKey);
};

export const supabaseAdmin = getSupabaseAdmin();

