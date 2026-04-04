import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error(
        'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY'
      );
    }
    _supabase = createClient(url, key);
  }
  return _supabase;
}

/**
 * Lazy Supabase client — safe to import at module level.
 * The underlying client is only created on first property access,
 * which happens inside useEffect (browser only), never during SSG.
 */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getSupabaseClient();
    const value = Reflect.get(client, prop, client);
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});

export function getStorageUrl(path: string): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  return `${url}/storage/v1/object/public/report-images/${path}`;
}
