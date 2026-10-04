/**
 * Google Calendar OAuth helpers — shared by googleCalendarConnect (builds the
 * consent URL / disconnects) and googleCalendarCallback (receives the redirect).
 * No Deno-only imports so node rehearsals can import it; Web Crypto is global
 * in both runtimes.
 */

export const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
export const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';
export const STATE_TTL_MS = 10 * 60 * 1000;

/** The redirect URI to register in Google Cloud (must match byte-for-byte). */
export function redirectUri(supabaseUrl) {
  return `${supabaseUrl.replace(/\/+$/, '')}/functions/v1/googleCalendarCallback`;
}

const b64url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64url = (s) => {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

async function hmacKey(secret) {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

/**
 * Signed, expiring OAuth `state`: binds the callback to the coach who started
 * the flow (the callback has no session — Google redirects the bare browser)
 * and carries the app origin to return to. Signed with GOOGLE_CLIENT_SECRET.
 */
export async function signState(secret, { uid, ret }, now = Date.now()) {
  const payload = b64url(new TextEncoder().encode(JSON.stringify({ uid, ret, exp: now + STATE_TTL_MS })));
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), new TextEncoder().encode(payload));
  return `${payload}.${b64url(sig)}`;
}

/** Returns { uid, ret } or null when the state is malformed, forged or expired. */
export async function verifyState(secret, state, now = Date.now()) {
  try {
    const [payload, sig] = String(state ?? '').split('.');
    if (!payload || !sig) return null;
    const ok = await crypto.subtle.verify('HMAC', await hmacKey(secret), fromB64url(sig),
      new TextEncoder().encode(payload));
    if (!ok) return null;
    const data = JSON.parse(new TextDecoder().decode(fromB64url(payload)));
    if (!data.uid || !(data.exp > now)) return null;
    return { uid: data.uid, ret: data.ret };
  } catch {
    return null;
  }
}

/** Only ever redirect back to the app origin (or local dev) — never an attacker-supplied URL. */
export function safeReturnOrigin(requested, appUrl) {
  const app = new URL(appUrl).origin;
  try {
    const o = new URL(requested);
    if (o.origin === app || /^https?:\/\/localhost(:\d+)?$/.test(o.origin)) return o.origin;
  } catch { /* fall through */ }
  return app;
}

export function buildConsentUrl({ clientId, redirect, state, loginHint }) {
  const p = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirect,
    response_type: 'code',
    scope: CALENDAR_SCOPE,
    access_type: 'offline',   // → refresh_token
    prompt: 'consent',        // always re-issue the refresh_token on reconnect
    include_granted_scopes: 'true',
    state,
  });
  if (loginHint) p.set('login_hint', loginHint);
  return `${GOOGLE_AUTH_URL}?${p}`;
}
