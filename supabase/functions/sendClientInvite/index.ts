// Supabase Edge Function: sendClientInvite  (Migration Step 3b, point 3)
//
// Re-platform of base44/functions/sendClientInvite. The Base44 version stored
// the PLAINTEXT token in Client.invite_token. This version stores ONLY the
// sha256 hash in clients.invite_token_hash, while the plaintext travels solely
// inside the emailed /client-setup/<token> link. This is the generation half
// of the Step 1.5 contract — without it, new invites would silently
// reintroduce plaintext tokens even though validation was fixed.
//
// Auth: requires a signed-in coach (verify_jwt). The coach may only invite a
// client they own — enforced by an ownership read under the CALLER's JWT (RLS
// applies) before the service-role token write.
//
// Env: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { generateInviteToken } from '../_shared/portalToken.js';
import { escapeHtml, safeSubject } from '../_shared/escapeHtml.js';
import { sendResendEmail } from '../_shared/resendEmail.js';
import { serve } from '../_shared/observe.js';

const APP_URL = Deno.env.get('APP_URL') ?? 'https://app.koachai.net';
const INVITE_TTL_DAYS = 7;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function buildInviteEmailHtml({ clientName: rawClientName, coachName: rawCoachName, setupUrl, welcomeMessage: rawWelcome }) {
  // Every coach/client-controlled value is escaped (audit 2026-10-05).
  const clientName = escapeHtml(rawClientName);
  const coachName = escapeHtml(rawCoachName);
  const welcomeMessage = escapeHtml(String(rawWelcome ?? '').slice(0, 1000));
  // (unchanged markup from the Base44 version — email template only)
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:24px 12px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;">
  <tr><td style="padding:28px 36px;background:#0F172A;"><span style="font-size:20px;font-weight:900;color:#fff;">KOACH AI</span></td></tr>
  <tr><td style="padding:36px;">
    <h1 style="margin:0 0 12px;font-size:26px;font-weight:900;color:#0F172A;">You've been invited! 🎉</h1>
    <p style="margin:0 0 16px;font-size:15px;color:#374151;">Hi <strong>${clientName || 'there'}</strong>,</p>
    <p style="margin:0 0 16px;font-size:15px;color:#374151;"><strong>${coachName}</strong> has added you as a client on KOACH AI. Set up your account to access your personalized plan.</p>
    ${welcomeMessage ? `<div style="background:#EFF6FF;border-radius:12px;padding:16px 20px;margin:0 0 20px;"><p style="margin:0;font-size:14px;color:#374151;">"${welcomeMessage}"</p></div>` : ''}
    <table cellpadding="0" cellspacing="0"><tr><td style="background:#2563EB;border-radius:10px;">
      <a href="${setupUrl}" style="display:block;padding:16px 32px;color:#fff;font-weight:800;font-size:16px;text-decoration:none;">Set Up My Account →</a>
    </td></tr></table>
    <p style="margin:20px 0 0;font-size:12px;color:#94A3B8;">Or copy this link: <a href="${setupUrl}" style="color:#2563EB;">${setupUrl}</a></p>
    <p style="margin:12px 0 0;font-size:11px;color:#CBD5E1;">This invite link expires in ${INVITE_TTL_DAYS} days.</p>
  </td></tr>
</table></td></tr></table></body></html>`;
}

serve('sendClientInvite', async (req, ctx) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const json = (body, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);

    // Caller-scoped client: the invite update runs under the coach's RLS, so a
    // coach can only mutate a client they actually own.
    const asCaller = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_ANON_KEY'),
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } }
    );
    const { data: { user }, error: userErr } = await asCaller.auth.getUser();
    if (userErr || !user) return json({ error: 'Unauthorized' }, 401);

    // clientEmail is accepted for backward compatibility but NOT trusted — see
    // the recipient note below.
    const { clientName, clientId, welcomeMessage } = await req.json();
    if (!clientId) return json({ error: 'Missing clientId' }, 400);

    const coachName = user.user_metadata?.full_name || 'Your coach';

    // Generate token: plaintext for the email link, hash for the DB.
    const { token, tokenHash } = await generateInviteToken();
    const expires = new Date(Date.now() + INVITE_TTL_DAYS * 86400_000).toISOString();

    // Ownership check under the CALLER's RLS: zero rows back means the client
    // doesn't exist or isn't the caller's. The token write itself then goes
    // through the service role, because invite/portal columns are now
    // server-managed (migration 20261006000200 blocks direct coach writes).
    const { data: owned, error: ownErr } = await asCaller
      .from('clients')
      .select('id, name, email')
      .eq('id', clientId)
      .maybeSingle();
    if (ownErr) {
      console.error('sendClientInvite: ownership lookup failed:', ownErr.message);
      return json({ error: 'Could not load client' }, 403);
    }
    if (!owned) return json({ error: 'Client not found' }, 403);

    // SECURITY (S1): the token is mailed ONLY to the email on the client row —
    // the same address setupPortalAccount provisions. (A later email change on
    // the row clears the token — migration 20261002000100.)
    const clientEmail = owned.email;
    if (!clientEmail) return json({ error: 'Client has no email on file' }, 400);

    const svc = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      { auth: { persistSession: false } },
    );
    // Compare-and-set on the email: if the row's email changed after we read it
    // (a concurrent edit), the token must not be attached to the new address.
    const { data: written, error: updErr } = await svc
      .from('clients')
      .update({ invite_token_hash: tokenHash, invite_token_expires: expires })
      .eq('id', owned.id)
      .eq('email', clientEmail)
      .select('id');
    if (updErr) {
      console.error('sendClientInvite: token write failed:', updErr.message);
      return json({ error: 'Could not create invite' }, 500);
    }
    if (!written || written.length !== 1) {
      return json({ error: "The client's email changed while sending the invite. Please try again." }, 409);
    }

    // Use the client row's name, not the request body.
    const displayName = owned.name || clientName || '';
    const setupUrl = `${APP_URL}/client-setup/${token}`; // plaintext only here
    const html = buildInviteEmailHtml({ clientName: displayName, coachName, setupUrl, welcomeMessage });

    // Send directly (no HTTP hop) and surface failures: the token exists only in
    // this email, so a silent failure leaves the client with no way in.
    const sent = await sendResendEmail({
      to: clientEmail,
      toName: displayName,
      subject: safeSubject(`${coachName} invited you to KOACH AI — set up your account`),
      html,
    });
    if (!sent?.ok) {
      console.error('sendClientInvite: email send failed:', sent?.error);
      // Invalidate the unusable token so a retry mints a fresh one cleanly.
      await svc.from('clients')
        .update({ invite_token_hash: null, invite_token_expires: null })
        .eq('id', owned.id);
      return json({ success: false, emailSent: false, error: 'Invite email could not be sent. Please try again.' }, 502);
    }

    // SECURITY (S1): do NOT return the plaintext token / setupUrl. The token is
    // a bearer credential that grants portal account setup for this client; the
    // only place it may travel is inside the emailed link. Returning it in the
    // HTTP response let any caller read a live token out of the JSON and drive
    // setupPortalAccount directly. Report only whether the email was sent.
    return json({ success: true, emailSent: true });
  } catch (err) {
    console.error('sendClientInvite error:', err?.message ?? err);
    return json({ error: 'Server error' }, 500);
  }
});
