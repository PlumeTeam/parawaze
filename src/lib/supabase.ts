import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  // Warn but don't throw — let the app render the loading/auth screen
  // so the error is visible in the console rather than a white screen.
  console.warn(
    '[ParaWaze] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY'
  );
}

/**
 * Singleton Supabase client.
 * Created once at module level — no Proxy indirection, works on all browsers
 * including older mobile Safari.
 */
export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);

export function getStorageUrl(path: string): string {
  return `${supabaseUrl}/storage/v1/object/public/report-images/${path}`;
}
