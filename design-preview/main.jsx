/**
 * Design-preview entry: renders the REAL <App /> against an in-memory fake
 * Supabase client seeded with realistic data. No backend, no env vars.
 *
 * URL params (all optional):
 *   ?as=coach|client|anon   persona (persisted in sessionStorage so in-app
 *                           navigation keeps it). client = Jordan Reyes' portal login.
 *   ?theme=light|dark       stored as the app's theme preference.
 *   ?prompts=1              allow PWA / notification prompts (suppressed by default).
 *
 * /program-builder?id=<programId> pre-loads that program: the builder only
 * reads `location.state.program`, so the harness puts it into history state.
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import '@/index.css';
import { __setSupabaseClientForTests } from '@/api/supabaseClient';
import { createFakeSupabase } from './fakeSupabase.js';
import { buildSeed, buildFunctionHandlers, IDS } from './seed.js';

const PERSONA_KEY = 'design-preview:persona';
const params = new URLSearchParams(window.location.search);

function safeStorage(fn) {
  try { return fn(); } catch { return undefined; }
}

// ---- persona -----------------------------------------------------------------
const PERSONAS = {
  coach: { kind: 'coach', userId: IDS.coach, clientId: null },
  client: { kind: 'client', userId: IDS.jordanUser, clientId: IDS.clients.jordan },
  anon: { kind: 'anon', userId: null, clientId: null },
};
const requested = params.get('as');
if (requested && PERSONAS[requested]) safeStorage(() => sessionStorage.setItem(PERSONA_KEY, requested));
const personaKind = safeStorage(() => sessionStorage.getItem(PERSONA_KEY)) || 'coach';
const persona = { ...(PERSONAS[personaKind] || PERSONAS.coach) };

// ---- theme / prompts -----------------------------------------------------------
const theme = params.get('theme');
if (theme === 'light' || theme === 'dark' || theme === 'system') safeStorage(() => localStorage.setItem('koach-theme', theme));
if (params.get('prompts') !== '1') {
  safeStorage(() => {
    localStorage.setItem('koach_notification_denied_at', String(Date.now()));
    localStorage.setItem('koach_add_to_home_screen_shown', 'true');
    localStorage.setItem('pwa_install_dismissed', '2');
  });
}

// ---- fake backend ----------------------------------------------------------------
const seed = buildSeed(new Date());
const client = createFakeSupabase({
  store: seed.store,
  users: seed.users,
  persona,
  functionHandlers: buildFunctionHandlers(seed),
  setPersona: (kind) => {
    safeStorage(() => sessionStorage.setItem(PERSONA_KEY, kind));
    return { ...(PERSONAS[kind] || PERSONAS.coach) };
  },
});
__setSupabaseClientForTests(client);
window.__preview = { store: seed.store, ids: IDS, client, persona };

// ---- /program-builder?id= shim -----------------------------------------------------
if (window.location.pathname === '/program-builder' && params.get('id')) {
  const program = seed.store.workout_programs.find((p) => p.id === params.get('id'));
  if (program) {
    const state = { usr: { program: { ...program, created_date: program.created_at } }, key: 'preview', idx: 0 };
    window.history.replaceState(state, '', window.location.href);
  }
}

// ---- render the real app (imported after the seam is installed) -----------------------
const [{ default: App }, { initTheme }] = await Promise.all([
  import('@/App.jsx'),
  import('@/lib/theme'),
]);
initTheme();
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
