// Supabase Edge Function: googleCalendarProxy  (Migration Step 5e)
//
// Port of base44/functions/googleCalendarProxy. Base44 got its access token
// from the platform's managed OAuth connector (`connectors.getConnection`) —
// infrastructure that doesn't exist here. Adapter: each coach's OAuth tokens
// live on THEIR coach_settings row (google_access_token /
// google_refresh_token / google_token_expires_at, added in migration 13);
// this proxy refreshes expired access tokens via GOOGLE_CLIENT_ID /
// GOOGLE_CLIENT_SECRET and returns 400 `google_not_connected` until the
// consent flow has populated the row (googleCalendarConnect starts that flow,
// googleCalendarCallback stores the tokens).
//
// The four Calendar API actions are verbatim.
import { getCaller, serviceClient, cors, jsonResponse } from '../_shared/edgeClients.js';
import { serve } from '../_shared/observe.js';

const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

async function getAccessToken(svc: ReturnType<typeof serviceClient>, userId: string) {
  const { data: settings } = await svc.from('coach_settings')
    .select('id, google_access_token, google_refresh_token, google_token_expires_at')
    .or(`coach_id.eq.${userId},created_by.eq.${userId}`)
    .limit(1);
  const row = settings?.[0];
  if (!row?.google_access_token && !row?.google_refresh_token) {
    return { error: 'google_not_connected' };
  }

  const stillValid = row.google_access_token && row.google_token_expires_at
    && new Date(row.google_token_expires_at).getTime() - Date.now() > 60_000;
  if (stillValid) return { accessToken: row.google_access_token };

  // Refresh
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
  if (!clientId || !clientSecret || !row.google_refresh_token) {
    // no way to refresh — use whatever we have (may 401 at Google)
    if (row.google_access_token) return { accessToken: row.google_access_token };
    return { error: 'google_not_connected' };
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: row.google_refresh_token,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json();
  if (!data.access_token) return { error: `google_refresh_failed: ${JSON.stringify(data).slice(0, 200)}` };

  await svc.from('coach_settings').update({
    google_access_token: data.access_token,
    google_token_expires_at: new Date(Date.now() + (data.expires_in ?? 3600) * 1000).toISOString(),
  }).eq('id', row.id);

  return { accessToken: data.access_token };
}

serve('googleCalendarProxy', async (req, ctx) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const caller = await getCaller(req);
    if (!caller) return jsonResponse({ error: 'Unauthorized' }, 401);
    const svc = serviceClient();

    const body = await req.json();
    const { action, payload } = body;

    const token = await getAccessToken(svc, caller.auth.id);
    if (token.error) return jsonResponse({ error: token.error }, 400);
    const accessToken = token.accessToken;

    if (action === 'getEvents') {
      const { timeMin, timeMax } = payload;
      const res = await fetch(
        `${CALENDAR_API}/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime&maxResults=100`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      const data = await res.json();
      return jsonResponse({ events: data.items || [], error: data.error });
    }

    if (action === 'createEvent') {
      const res = await fetch(`${CALENDAR_API}/calendars/primary/events`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload.event),
      });
      const data = await res.json();
      return jsonResponse({ event: data, error: data.error });
    }

    if (action === 'deleteEvent') {
      await fetch(`${CALENDAR_API}/calendars/primary/events/${payload.eventId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return jsonResponse({ success: true });
    }

    if (action === 'listCalendars') {
      const res = await fetch(`${CALENDAR_API}/users/me/calendarList`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      return jsonResponse({ calendars: data.items || [], error: data.error });
    }

    return jsonResponse({ error: 'Unknown action' }, 400);
  } catch (error) {
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
