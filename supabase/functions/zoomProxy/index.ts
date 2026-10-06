// Supabase Edge Function: zoomProxy  (Migration Step 5e)
//
// Faithful port of base44/functions/zoomProxy — server-to-server OAuth
// (ZOOM_ACCOUNT_ID / ZOOM_CLIENT_ID / ZOOM_CLIENT_SECRET), same four actions.
// Base44's `role !== 'admin'` gate meant "the coach" in the single-tenant
// app; under the Step 6 model any authenticated coach may use it — meeting
// reads/deletes stay ownership-verified through coaching_sessions
// (zoom_meeting_id + created_by), exactly as Base44 did.
import { getCaller, serviceClient, cors, jsonResponse } from '../_shared/edgeClients.js';
import { serve } from '../_shared/observe.js';

const getZoomAccessToken = async () => {
  const accountId = Deno.env.get('ZOOM_ACCOUNT_ID');
  const clientId = Deno.env.get('ZOOM_CLIENT_ID');
  const clientSecret = Deno.env.get('ZOOM_CLIENT_SECRET');
  if (!accountId || !clientId || !clientSecret) throw new Error('Zoom credentials not configured');
  const credentials = btoa(`${clientId}:${clientSecret}`);
  const response = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    },
  );
  const data = await response.json();
  if (!data.access_token) throw new Error(`Zoom token error: ${JSON.stringify(data)}`);
  return data.access_token;
};

// Verify a meeting was created by this coach via our session records
const verifyMeetingOwnership = async (svc: ReturnType<typeof serviceClient>, userId: string, meetingId: unknown) => {
  const { data: sessions } = await svc.from('coaching_sessions')
    .select('id, created_by').eq('zoom_meeting_id', String(meetingId)).limit(1);
  const session = sessions?.[0];
  if (!session) return false; // meeting not in our DB — deny
  return session.created_by === userId;
};

serve('zoomProxy', async (req, ctx) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const caller = await getCaller(req);
    if (!caller) return jsonResponse({ error: 'Unauthorized' }, 401);
    const svc = serviceClient();

    const { action, payload = {} } = await req.json();
    const accessToken = await getZoomAccessToken();

    if (action === 'testConnection') {
      const res = await fetch('https://api.zoom.us/v2/users/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      return jsonResponse({ success: true, email: data.email, name: `${data.first_name} ${data.last_name}` });
    }

    if (action === 'createMeeting') {
      const res = await fetch('https://api.zoom.us/v2/users/me/meetings', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: payload.topic || 'Coaching Session',
          type: 2,
          start_time: payload.start_time,
          duration: payload.duration || 60,
          timezone: payload.timezone || 'UTC',
          agenda: payload.agenda || '',
          settings: {
            host_video: true,
            participant_video: true,
            join_before_host: false,
            waiting_room: payload.waiting_room !== false,
            auto_recording: payload.auto_record ? 'cloud' : 'none',
          },
        }),
      });
      const data = await res.json();
      return jsonResponse(data);
    }

    if (action === 'deleteMeeting') {
      const { meeting_id } = payload;
      const owns = await verifyMeetingOwnership(svc, caller.auth.id, meeting_id);
      if (!owns) return jsonResponse({ error: 'Forbidden: meeting not owned by you' }, 403);
      await fetch(`https://api.zoom.us/v2/meetings/${meeting_id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return jsonResponse({ success: true });
    }

    if (action === 'getMeeting') {
      const { meeting_id } = payload;
      const owns = await verifyMeetingOwnership(svc, caller.auth.id, meeting_id);
      if (!owns) return jsonResponse({ error: 'Forbidden: meeting not owned by you' }, 403);
      const res = await fetch(`https://api.zoom.us/v2/meetings/${meeting_id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      return jsonResponse(data);
    }

    return jsonResponse({ error: 'Unknown action' }, 400);
  } catch (error) {
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
