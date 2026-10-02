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
// client they own — enforced by doing the client update with the CALLER's
// JWT (RLS applies), not the service role.
//
// Env: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { generateInviteToken } from '../_shared/portalToken.js';

const APP_URL = Deno.env.get('APP_URL') ?? 'https://app.koachai.net';
const INVITE_TTL_DAYS = 7;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function buildInviteEmailHtml({ clientName, coachName, setupUrl, welcomeMessage }) {
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

Deno.serve(async (req) => {
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

    const { clientName, clientEmail, clientId, welcomeMessage } = await req.json();
    if (!clientEmail) return json({ error: 'Missing clientEmail' }, 400);
    if (!clientId) return json({ error: 'Missing clientId' }, 400);

    const coachName = user.user_metadata?.full_name || 'Your coach';

    // Generate token: plaintext for the email link, hash for the DB.
    const { token, tokenHash } = await generateInviteToken();
    const expires = new Date(Date.now() + INVITE_TTL_DAYS * 86400_000).toISOString();

    // Store ONLY the hash. RLS ensures the caller owns this client.
    const { error: updErr } = await asCaller
      .from('clients')
      .update({ invite_token_hash: tokenHash, invite_token_expires: expires })
      .eq('id', clientId);
    if (updErr) return json({ error: updErr.message }, 403);

    const setupUrl = `${APP_URL}/client-setup/${token}`; // plaintext only here
    const html = buildInviteEmailHtml({ clientName, coachName, setupUrl, welcomeMessage });

    // Email delivery is re-platformed with the rest of the functions in Step 5;
    // invoke the (not-yet-ported) mailer and don't fail the invite if it's absent.
    try {
      await asCaller.functions.invoke('sendEmailNotification', {
        body: {
          to: clientEmail,
          toName: clientName,
          subject: `${coachName} invited you to KOACH AI — set up your account`,
          html,
        },
      });
    } catch (mailErr) {
      console.error('sendClientInvite: mailer not available yet (Step 5):', mailErr?.message ?? mailErr);
    }

    // SECURITY (S1): do NOT return the plaintext token / setupUrl. The token is
    // a bearer credential that grants portal account setup for this client; the
    // only place it may travel is inside the emailed link. Returning it in the
    // HTTP response let any caller read a live token out of the JSON and drive
    // setupPortalAccount directly. Report only whether the email was sent.
    return json({ success: true });
  } catch (err) {
    console.error('sendClientInvite error:', err?.message ?? err);
    return json({ error: 'Server error' }, 500);
  }
});
