import { createClient } from '@supabase/supabase-js';

// These should be coming from environment variables in a real app
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mock-supabase-url.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'mock-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
