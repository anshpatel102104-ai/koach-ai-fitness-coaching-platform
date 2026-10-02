/**
 * Auth provider feature flag (Migration Step 3a).
 *
 * 'base44'   — legacy hosted-redirect auth (default; the app keeps working
 *              exactly as before until Supabase auth is proven).
 * 'supabase' — real Supabase Auth session (login/signup pages in this repo).
 *
 * Flip via VITE_AUTH_PROVIDER=supabase, or change the default here at cutover.
 * Auth is app-wide (one session for the whole shell), so this is the single
 * switch — see src/api/base44Client.js, which delegates `.auth` accordingly.
 */
// Default is now 'supabase': the Base44 backend is retired, all data + auth
// users live in Supabase, and the whole data layer requires a Supabase session
// for RLS. Set VITE_AUTH_PROVIDER=base44 only to fall back to the legacy shell.
export const AUTH_PROVIDER =
  (import.meta.env?.VITE_AUTH_PROVIDER || 'supabase').toLowerCase() === 'base44'
    ? 'base44'
    : 'supabase';

export const isSupabaseAuth = () => AUTH_PROVIDER === 'supabase';
