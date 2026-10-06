// Supabase Edge Function: googleCalendarCallback
//
// Google's OAuth redirect target (GET ?code=…&state=…). There is no session
// here — the browser arrives straight from Google — so verify_jwt is false and
// the caller is identified ONLY by the HMAC-signed, expiring `state` that
// googleCalendarConnect issued. Exchanges the code for tokens and stores them
// in the coach's coach_settings google_* columns, then redirects back to
// /schedule?google=connected|error.
import { serviceClient } from '../_shared/edgeClients.js';
import { GOOGLE_TOKEN_URL, redirectUri, safeReturnOrigin, verifyState } from '../_shared/googleOAuth.js';
import { serve } from '../_shared/observe.js';

function back(origin: string, status: string, reason?: string) {
  const u = new URL('/schedule', origin);
  u.searchParams.set('google', status);
  if (reason) u.searchParams.set('reason', reason);
  return new Response(null, { status: 302, headers: { Location: u.toString() } });
}

serve('googleCalendarCallback', async (req, ctx) => {
  const appUrl = Deno.env.get('APP_URL') || 'https://app.koachai.net';
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
  if (!clientId || !clientSecret) return back(appUrl, 'error', 'not_configured');

  const url = new URL(req.url);
  const state = await verifyState(clientSecret, url.searchParams.get('state'));
  if (!state) return back(appUrl, 'error', 'invalid_state');
  const origin = safeReturnOrigin(state.ret, appUrl);

  if (url.searchParams.get('error')) return back(origin, 'error', url.searchParams.get('error')!);
  const code = url.searchParams.get('code');
  if (!code) return back(origin, 'error', 'missing_code');

  try {
    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code, client_id: clientId, client_secret: clientSecret,
        redirect_uri: redirectUri(Deno.env.get('SUPABASE_URL')!), grant_type: 'authorization_code',
      }),
    });
    const tokens = await res.json();
    if (!tokens.access_token) {
      console.error('googleCalendarCallback token exchange failed:', tokens.error);
      return back(origin, 'error', 'token_exchange_failed');
    }

    const svc = serviceClient();
    const fields: Record<string, unknown> = {
      google_calendar_connected: true,
      google_access_token: tokens.access_token,
      google_token_expires_at: new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString(),
    };
    // refresh_token is only returned when Google (re)issues it; keep the old one otherwise.
    if (tokens.refresh_token) fields.google_refresh_token = tokens.refresh_token;

    const { data: rows } = await svc.from('coach_settings').select('id')
      .or(`coach_id.eq.${state.uid},created_by.eq.${state.uid}`).limit(1);
    const { error } = rows?.[0]
      ? await svc.from('coach_settings').update(fields).eq('id', rows[0].id)
      : await svc.from('coach_settings').insert({ coach_id: state.uid, created_by: state.uid, ...fields });
    if (error) throw new Error(error.message);
    return back(origin, 'connected');
  } catch (e) {
    console.error('googleCalendarCallback error:', (e as Error).message);
    return back(origin, 'error', 'server_error');
  }
});
