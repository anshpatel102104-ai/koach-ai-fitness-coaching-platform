// Supabase Edge Function: sendCheckInReminders  (Migration Step 5e)
//
// Re-platform of base44/functions/sendCheckInReminders — the scheduled Friday
// sweep reminding active clients who haven't checked in or trained this week.
// Logic lives in _shared/checkinReminders.js (rehearsed offline); this file
// is the scheduled entrypoint.
//
// Scheduling: pg_cron + pg_net, same pattern as runAutomations —
//   select cron.schedule('friday-reminders', '0 18 * * 5',  -- 2pm ET
//     $$ select net.http_post(url := '<URL>/functions/v1/sendCheckInReminders',
//        headers := jsonb_build_object('Authorization','Bearer <SERVICE_KEY>',
//                                      'Content-Type','application/json'),
//        body := '{}'::jsonb); $$);
//
// SERVICE-ROLE ONLY (unlike Base44, which left it open): this function
// emails every lagging client — an arbitrary authenticated user must not be
// able to trigger it. Per-week idempotency inside the shared module makes
// at-least-once scheduling safe.
import { serviceClient, cors, jsonResponse } from '../_shared/edgeClients.js';
import { runCheckinReminders } from '../_shared/checkinReminders.js';
import { sendResendEmail } from '../_shared/resendEmail.js';
import { serve } from '../_shared/observe.js';

function isServiceRoleCall(req: Request) {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  return Boolean(serviceKey) && token === serviceKey;
}

serve('sendCheckInReminders', async (req, ctx) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    if (!isServiceRoleCall(req)) return jsonResponse({ error: 'Unauthorized' }, 401);

    const appUrl = Deno.env.get('APP_URL') || 'https://app.koachai.net';
    const result = await runCheckinReminders(serviceClient(), {
      sendEmail: sendResendEmail,
      appUrl,
    });

    console.log(`Friday reminders sent to ${result.count} client(s):`, result.remindersSent.map((r: { name: string }) => r.name));
    return jsonResponse({ ok: true, ...result });
  } catch (error) {
    console.error('sendCheckInReminders error:', error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
