import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create Supabase client (singleton)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for thread titles table
export interface ThreadTitle {
  id?: number;
  thread_id: string;
  title: string;
  created_at?: string;
  updated_at?: string;
}

// Check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}
