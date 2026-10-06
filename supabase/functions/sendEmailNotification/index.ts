// Supabase Edge Function: sendEmailNotification  (Migration Step 5c)
//
// Re-platform of base44/functions/sendEmailNotification — the Resend-backed
// mailer every other function defensively invokes (stripeWebhook, weeklyDigest,
// sendClientInvite, and the Step 5c DB-trigger automations).
//
// Auth: the Base44 version required auth.me(). Here we accept EITHER
//   - a verified user session (frontend / asCaller invocations), OR
//   - the service-role key (svc.functions.invoke from other edge functions and
//     the pg_net trigger path), detected by comparing the bearer token.
// Anonymous calls are rejected — this must not be an open relay.
//
// Env: RESEND_API_KEY, FROM_NAME/FROM_EMAIL (VITE_* fallbacks), plus the
// standard SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY.
import { getCaller, callerClient, serviceClient, cors, jsonResponse } from '../_shared/edgeClients.js';
import { sendResendEmail } from '../_shared/resendEmail.js';
import { billingAccess } from '../_shared/billingAccess.js';
import { teamOwnerFor } from '../_shared/teamRole.js';
import { serve } from '../_shared/observe.js';

/**
 * Conservative sanitizer for coach-composed HTML (session callers only).
 * Formatting is a feature, so we do NOT escape — we strip active content:
 * script/iframe/object/embed/form (with bodies where they have them),
 * inline on*= event handlers, and javascript:/vbscript: URLs.
 * Regex-based by design (no DOM in the edge runtime); errs on removing.
 */
function sanitizeCoachHtml(input) {
  let html = String(input ?? '');
  // paired tags with content
  html = html.replace(/<\s*(script|iframe|object|form)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, '');
  // any remaining opening/closing/self-closing occurrences (incl. embed)
  html = html.replace(/<\s*\/?\s*(script|iframe|object|embed|form)\b[^>]*>/gi, '');
  // inline event handlers: on*="..." | on*='...' | on*=bare
  // (preceded by whitespace, '/', or a quote — covers <img/onerror=...>)
  html = html.replace(/(?<=[\s\/"'])on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  // javascript:/vbscript: URLs (allowing whitespace/entity obfuscation of the colon)
  // (whitespace may also be smuggled in as &#9; &#x0a; &Tab; etc.)
  const ws = String.raw`(?:\s|&#0*(?:9|10|13);?|&#x0*(?:9|a|d);?|&(?:tab|newline);)*`;
  html = html.replace(new RegExp(`(?:java|vb)${ws}script${ws}(?::|&#0*58;?|&#x0*3a;?|&colon;)`, 'gi'), 'blocked:');
  return html;
}

// TODO(abuse): add a per-caller daily send cap for session callers. There is
// no sent-email log table yet (automation_logs is rule-scoped and requires a
// rule_id/client_id); add an `email_send_log (sender_id, created_at, ...)`
// migration and count rows for the last 24h here.

function isServiceRoleCall(req) {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  return Boolean(serviceKey) && token === serviceKey;
}

// A single plain address: no lists, display names, or header-injection chars.
// Session callers must send exactly one recipient (an array or "a@x, b@y"
// would otherwise slip extra recipients past the allowlist below).
const SINGLE_EMAIL = /^[^\s@,;<>"'()\\]+@[^\s@,;<>"'()\\]+\.[^\s@,;<>"'()\\]+$/;

// ilike treats % and _ as wildcards; escape them so the allowlist lookup is an
// exact (case-insensitive) match — "%" must not match every visible client.
function exactIlike(value) {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/**
 * SECURITY (S5): a verified session must not be able to send mail to an
 * ARBITRARY address from our verified domain (phishing + denial-of-wallet).
 * A session caller may only email a recipient they legitimately own:
 *   - their own account email, OR
 *   - a client they can see (RLS-scoped), OR
 *   - a team member they can see (RLS-scoped).
 * We do the lookups with the caller-scoped (RLS) client, so "can the caller
 * see a row with this email" IS the tenant check. The service-role path
 * (trigger/cron/other functions) is unrestricted, as before.
 */
async function callerMayEmail(req, caller, to) {
  if (typeof to !== 'string') return false;
  const target = to.trim().toLowerCase();
  if (!SINGLE_EMAIL.test(target)) return false;
  if (caller?.auth?.email && caller.auth.email.toLowerCase() === target) return true;
  const rls = callerClient(req);
  const pattern = exactIlike(target);
  const { data: clientMatch } = await rls
    .from('clients').select('id').ilike('email', pattern).limit(1);
  if (clientMatch?.length) return true;
  const { data: teamMatch } = await rls
    .from('team_members').select('id').ilike('email', pattern).limit(1);
  return Boolean(teamMatch?.length);
}

serve('sendEmailNotification', async (req, ctx) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const serviceCall = isServiceRoleCall(req);
    let caller = null;
    if (!serviceCall) {
      caller = await getCaller(req);
      if (!caller) return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const { to, toName: _toName, subject, html, replyTo, templateKey } = await req.json();

    if (!to || !subject || !html) {
      return jsonResponse({ error: 'Missing required fields: to, subject, html' }, 400);
    }

    // Session callers must have billing access (trialing/active/grace/comped),
    // mirroring aiMetering: a team coach needs the team OWNER's billing.
    if (!serviceCall) {
      const now = new Date();
      let billedProfile = caller.profile;
      const ownerId = await teamOwnerFor(serviceClient(), caller.profile.id);
      if (ownerId) {
        const { data: owner } = await serviceClient().from('profiles').select('*').eq('id', ownerId).maybeSingle();
        billedProfile = owner ?? { id: ownerId };
      }
      if (!billingAccess(billedProfile, now).hasAccess) {
        return jsonResponse({
          error: 'billing_required',
          message: 'Your subscription is not active. Subscribe on the billing page to send emails.',
        }, 402);
      }
    }

    // Recipient allowlist for session callers (service-role path is trusted).
    if (!serviceCall && !(await callerMayEmail(req, caller, to))) {
      return jsonResponse({ error: 'Recipient not permitted for this account' }, 403);
    }
    if (!Deno.env.get('RESEND_API_KEY')) {
      return jsonResponse({ error: 'RESEND_API_KEY not configured' }, 500);
    }

    // Session callers may only set Reply-To to their own address (the
    // EmailCenter passes user.email); anything else would let a caller route
    // replies from our domain to an arbitrary inbox.
    const callerEmail = caller?.auth?.email?.toLowerCase();
    const safeReplyTo = serviceCall
      ? replyTo
      : (typeof replyTo === 'string' && callerEmail && replyTo.trim().toLowerCase() === callerEmail
        ? replyTo.trim() : undefined);

    const result = await sendResendEmail({
      to: serviceCall ? to : to.trim(),
      subject,
      html: serviceCall ? html : sanitizeCoachHtml(html),
      replyTo: safeReplyTo,
    });
    if (!result.ok) {
      console.error('[sendEmailNotification] send failed:', result.error, result.details);
      return jsonResponse({ error: 'Email could not be sent' }, 500);
    }

    return jsonResponse({ success: true, id: result.id, templateKey });
  } catch (error) {
    console.error('[sendEmailNotification] error:', error);
    return jsonResponse({ error: 'Email could not be sent' }, 500);
  }
});
