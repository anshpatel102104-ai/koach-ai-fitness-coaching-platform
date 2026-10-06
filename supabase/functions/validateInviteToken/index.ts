// Supabase Edge Function: validateInviteToken  (Migration Step 3b)
//
// Re-platform of base44/functions/validateInviteToken. The Base44 version
// looked the RAW token up against a plaintext column that Step 1.5 renamed to
// invite_token_hash — so it is broken against the new schema. This version:
//   1. sha256-hashes the incoming token (never logs/stores the plaintext),
//   2. service-role lookup by invite_token_hash + expiry check,
//   3. on success mints a short-lived (1h) portal JWT carrying the
//      portal_client_id claim that app.is_portal_client() accepts.
//
// The plaintext token is read from the request body only, hashed immediately,
// and never persisted or logged.
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_JWT_SECRET.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { hashInviteToken, mintPortalJwt, isTokenLive } from '../_shared/portalToken.js';
import { serve } from '../_shared/observe.js';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve('validateInviteToken', async (req, ctx) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const json = (body, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

  try {
    const { token } = await req.json();
    if (!token) return json({ valid: false, reason: 'No token provided' });

    // Hash immediately — the plaintext is never used again beyond this line.
    const tokenHash = await hashInviteToken(token);

    const admin = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      { auth: { persistSession: false } }
    );

    const { data: client, error } = await admin
      .from('clients')
      .select('id, name, email, invite_token_expires, portal_user_id')
      .eq('invite_token_hash', tokenHash)
      .maybeSingle();

    if (error) throw error;
    if (!client) return json({ valid: false, reason: 'Token not found' });
    if (!isTokenLive(client.invite_token_expires)) {
      return json({ valid: false, reason: 'Token expired' });
    }

    // Short-lived portal access token (claim-based; unrevocable → keep ≤1h).
    const { access_token, expires_in } = await mintPortalJwt({
      clientId: client.id,
      jwtSecret: Deno.env.get('SUPABASE_JWT_SECRET'),
      ttlSeconds: 3600,
    });

    return json({
      valid: true,
      client: { id: client.id, name: client.name, email: client.email },
      has_account: !!client.portal_user_id, // frontend: log in vs. set password
      access_token,
      token_type: 'bearer',
      expires_in,
    });
  } catch (err) {
    // Never include the token in logs.
    console.error('validateInviteToken error:', err?.message ?? err);
    return json({ valid: false, reason: 'Server error' }, 500);
  }
});
