import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
const supabaseServiceKey = (import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '').trim();

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client strictly for Auth creation/bypassing Edge functions
export const supabaseAdmin = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
}) : null;
