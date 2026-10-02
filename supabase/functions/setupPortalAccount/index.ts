// Supabase Edge Function: setupPortalAccount  (Migration Step 3b, point 4)
//
// The DECISION (documented in SCHEMA_MIGRATION.md): a portal client gets a
// REAL Supabase Auth account, linked to their Client row via
// clients.portal_user_id. The invite token is a ONE-TIME bootstrap, not a
// per-session credential. Rationale:
//   - the ClientSetup UI already collects a password;
//   - portal access must outlive the 7-day invite window;
//   - a real account gives password reset + revocation for free and lets
//     app.is_portal_client() resolve via portal_user_id = auth.uid() (the
//     durable path) instead of a re-minted claim every hour.
//
// Flow: validate token (hash → lookup → expiry) → create-or-fetch an auth
// user for the client's email with the chosen password → link portal_user_id
// → INVALIDATE the invite token (clear hash + expiry) so the link is single
// use. The client then signs in normally with email + password.
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { hashInviteToken, isTokenLive } from '../_shared/portalToken.js';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const json = (body, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

  try {
    const { token, password } = await req.json();
    if (!token) return json({ error: 'No token provided' }, 400);
    if (!password || password.length < 6) return json({ error: 'Password must be at least 6 characters' }, 400);

    const tokenHash = await hashInviteToken(token);
    const admin = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      { auth: { persistSession: false } }
    );

    const { data: client, error: cErr } = await admin
      .from('clients')
      .select('id, name, email, invite_token_expires, portal_user_id')
      .eq('invite_token_hash', tokenHash)
      .maybeSingle();
    if (cErr) throw cErr;
    if (!client) return json({ error: 'Invalid or expired invite' }, 400);
    if (!isTokenLive(client.invite_token_expires)) return json({ error: 'Invite has expired' }, 400);
    if (!client.email) return json({ error: 'Client has no email on file' }, 400);

    // Create the auth user, or LINK an existing one — but NEVER reset the
    // password of an account we did not just create.
    //
    // SECURITY (S1): holding an invite token proves control of the email STRING
    // an attacker typed into a Client row, NOT control of that mailbox/account.
    // The previous code called updateUserById(existing, { password }) when the
    // email already had an account, which let anyone who could create a client
    // row + read the emailed token reset any existing user's password (account
    // takeover, incl. other coaches / platform admins). We now:
    //   - create a fresh account with the chosen password when none exists;
    //   - link (without touching the password) when an account already exists,
    //     so a coach who is also a client can use their EXISTING credentials;
    //   - never reset a password from this endpoint.
    let portalUserId = client.portal_user_id;
    let existingAccount = Boolean(portalUserId);

    if (!portalUserId) {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: client.email,
        password,
        email_confirm: true, // holding the emailed invite proves email ownership
        user_metadata: { full_name: client.name },
        app_metadata: { portal_client_id: client.id }, // app_metadata: not user-writable
      });
      if (createErr) {
        // Email already has an account. Look up its id via profiles (id = auth
        // uid) and LINK it — do not touch its password.
        const { data: existingProfile } = await admin
          .from('profiles')
          .select('id')
          .eq('email', client.email)
          .maybeSingle();
        if (!existingProfile?.id) return json({ error: createErr.message }, 400);
        portalUserId = existingProfile.id;
        existingAccount = true;
      } else {
        portalUserId = created.user.id;
        existingAccount = false;
      }
    }

    // Link the account and single-use the invite in one update.
    const { error: linkErr } = await admin
      .from('clients')
      .update({ portal_user_id: portalUserId, invite_token_hash: null, invite_token_expires: null })
      .eq('id', client.id);
    if (linkErr) throw linkErr;

    // existing_account=true → the client must sign in with their EXISTING
    // password (the one they typed was not applied). The UI redirects to login
    // with a message rather than attempting a sign-in that would fail.
    return json({ success: true, email: client.email, client_id: client.id, existing_account: existingAccount });
  } catch (err) {
    console.error('setupPortalAccount error:', err?.message ?? err);
    return json({ error: 'Server error' }, 500);
  }
});
