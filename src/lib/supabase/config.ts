// Central place to read Supabase env and decide whether cloud mode is active.
// When these aren't set, the app runs in local-only mode (no login wall) so
// development and the existing local-first experience keep working.

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
