import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

if (!supabaseUrl || !supabaseAnonKey || supabaseAnonKey.includes('PASTE_YOUR')) {
  throw new Error(
    'Missing Supabase env vars.\n' +
      '  1) Copy .env.example → .env\n' +
      '  2) Fill VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from Supabase Dashboard → Project Settings → API → Project API keys (anon public).\n' +
      `  Current: VITE_SUPABASE_URL=${supabaseUrl || '(empty)'}  VITE_SUPABASE_ANON_KEY=${supabaseAnonKey ? supabaseAnonKey.slice(0, 8) + '…' : '(empty)'}`
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
});

// All Silpi tables are in public schema (single schema).
// Earlier drafts used a second schema 'silpidb' — that is obsolete. Everything is public.
export const pub = supabase.schema('public');
// Kept for backward compat — alias to public, NOT silpidb.
export const silpi = supabase.schema('public');

export function fromSchema(schema, table) {
  return supabase.schema(schema).from(table);
}
