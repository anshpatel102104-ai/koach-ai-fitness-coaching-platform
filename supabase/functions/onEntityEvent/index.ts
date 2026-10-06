// Supabase Edge Function: onEntityEvent  (Migration Step 5c)
//
// Single endpoint for the five Base44 entity-automation triggers, invoked by
// Postgres AFTER INSERT/UPDATE triggers via pg_net.http_post (see
// 20260714000100_entity_event_triggers.sql — same pattern as the pg_cron →
// runAutomations automation runner).
//
// Idempotency (same discipline as the Step 5a Stripe webhook): every trigger
// firing carries a unique event_key; the function CLAIMS the key by inserting
// into processed_entity_events before doing any work. A duplicate delivery
// (pg_net retry, manual re-invocation, double-fired trigger) hits the primary
// key and is skipped. If processing fails, the claim is RELEASED so a retry
// can succeed — an event is processed at most once, and a failed event isn't
// permanently swallowed.
//
// Auth: only the DB triggers (service key) may call this — reject others.
import { serviceClient, cors, jsonResponse } from '../_shared/edgeClients.js';
import { handleEntityEvent } from '../_shared/entityEvents.js';
import { sendResendEmail } from '../_shared/resendEmail.js';
import { aiFeatureAllowed } from '../_shared/aiMetering.js';
import { invokeClaude, anthropicConfigured } from '../_shared/anthropic.js';
import { TOOL_SYSTEM, CHECKIN_SUMMARY } from '../_shared/aiTools.js';
import { serve } from '../_shared/observe.js';

function isServiceRoleCall(req: Request) {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  return Boolean(serviceKey) && token === serviceKey;
}

serve('onEntityEvent', async (req, ctx) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    if (!isServiceRoleCall(req)) return jsonResponse({ error: 'Unauthorized' }, 401);

    const event = await req.json();
    const { event_key, event_type } = event ?? {};
    if (!event_key || !event_type) {
      return jsonResponse({ error: 'Missing event_key/event_type' }, 400);
    }

    const svc = serviceClient();

    // ── claim ────────────────────────────────────────────────────────────────
    const { error: claimErr } = await svc.from('processed_entity_events')
      .insert({ event_key, event_type });
    if (claimErr) {
      if (claimErr.code === '23505') {
        return jsonResponse({ received: true, duplicate: true });
      }
      throw new Error(`claim failed: ${claimErr.message}`);
    }

    // ── process (release the claim on failure so a retry can succeed) ───────
    try {
      const result = await handleEntityEvent(svc, event, {
        sendEmail: async (msg: Record<string, unknown>) => {
          // Mailer trouble must not fail (and un-claim) the event — the
          // notification writes are the durable part; email is best-effort,
          // matching the Base44 triggers' fire-and-forget sendEmail.
          const r = await sendResendEmail(msg);
          if (!r.ok) console.error(`onEntityEvent ${event_type} email failed:`, r.error);
          return r;
        },
        appUrl: Deno.env.get('APP_URL') || 'https://app.koachai.net',
        // checkin.analyze: NOT a counted generation; only runs for plans that include it (aiPolicy.js).
        analysis: anthropicConfigured() ? {
          meter: (coach: Record<string, unknown>) => aiFeatureAllowed(svc, coach, 'checkin.analyze'),
          invoke: invokeClaude, tool: CHECKIN_SUMMARY, system: TOOL_SYSTEM,
        } : null,
      });
      return jsonResponse({ received: true, ...result });
    } catch (e) {
      await svc.from('processed_entity_events').delete().eq('event_key', event_key);
      throw e;
    }
  } catch (error) {
    console.error('onEntityEvent error:', (error as Error).message);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
