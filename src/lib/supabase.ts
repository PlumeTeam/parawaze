import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Public keys — safe to include in client-side code (NEXT_PUBLIC_ prefix)
const supabaseUrl = 'https://nceodlvyacukpcplztca.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jZW9kbHZ5YWN1a3BjcGx6dGNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMDEyMzEsImV4cCI6MjA5MDg3NzIzMX0.0nrh72rlFbx3ly1apkZpDdvXCkYYo5O1aC0_KKlmxPY';

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export function getStorageUrl(path: string): string {
  return `${supabaseUrl}/storage/v1/object/public/report-images/${path}`;
}
