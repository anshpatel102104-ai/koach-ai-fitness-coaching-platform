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
import { getCaller, callerClient, cors, jsonResponse } from '../_shared/edgeClients.js';
import { sendResendEmail } from '../_shared/resendEmail.js';

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

Deno.serve(async (req) => {
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
      to: serviceCall ? to : to.trim(), subject, html, replyTo: safeReplyTo,
    });
    if (!result.ok) {
      return jsonResponse({ error: result.error || 'Resend API error', details: result.details }, 500);
    }

    return jsonResponse({ success: true, id: result.id, templateKey });
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
});
