// Supabase Edge Function: googleCalendarConnect
//
// Starts / ends the coach's Google Calendar connection (verified session).
//   { action: 'start', returnTo }  → { url } — Google consent URL
//                                    (calendar.events scope, offline access)
//   { action: 'disconnect' }       → revokes at Google, clears google_* columns
// The consent redirect lands on googleCalendarCallback, which stores the tokens.
// Secrets: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET (APP_URL optional).
import { getCaller, serviceClient, cors, jsonResponse } from '../_shared/edgeClients.js';
import { buildConsentUrl, redirectUri, safeReturnOrigin, signState } from '../_shared/googleOAuth.js';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const caller = await getCaller(req);
    if (!caller) return jsonResponse({ error: 'Unauthorized' }, 401);
    const { action, returnTo } = await req.json();
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    if (!clientId || !clientSecret) return jsonResponse({ error: 'google_oauth_not_configured' }, 500);

    if (action === 'start') {
      const appUrl = Deno.env.get('APP_URL') || 'https://app.koachai.net';
      const state = await signState(clientSecret, {
        uid: caller.auth.id, ret: safeReturnOrigin(returnTo, appUrl),
      });
      return jsonResponse({
        url: buildConsentUrl({
          clientId, redirect: redirectUri(Deno.env.get('SUPABASE_URL')!), state,
          loginHint: caller.auth.email,
        }),
      });
    }

    if (action === 'disconnect') {
      const svc = serviceClient();
      const { data: rows } = await svc.from('coach_settings')
        .select('id, google_access_token, google_refresh_token')
        .or(`coach_id.eq.${caller.auth.id},created_by.eq.${caller.auth.id}`).limit(1);
      const row = rows?.[0];
      if (row) {
        const token = row.google_refresh_token || row.google_access_token;
        if (token) {
          // Best-effort revoke; local state is cleared regardless.
          await fetch('https://oauth2.googleapis.com/revoke', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ token }),
          }).catch(() => {});
        }
        await svc.from('coach_settings').update({
          google_calendar_connected: false,
          google_access_token: null, google_refresh_token: null, google_token_expires_at: null,
        }).eq('id', row.id);
      }
      return jsonResponse({ success: true });
    }

    return jsonResponse({ error: 'Unknown action' }, 400);
  } catch (error) {
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
