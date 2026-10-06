// Supabase Edge Function: getPushPublicKey  (Migration Step 5e)
//
// Faithful port of base44/functions/getPushPublicKey — returns the VAPID
// public key so the browser can subscribe. Generate once per environment:
//   npx web-push generate-vapid-keys
// and set VAPID_PUBLIC_KEY (and VAPID_PRIVATE_KEY, server-side only).
import { getCaller, cors, jsonResponse } from '../_shared/edgeClients.js';
import { serve } from '../_shared/observe.js';

serve('getPushPublicKey', async (req, ctx) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const caller = await getCaller(req);
    if (!caller) return jsonResponse({ error: 'Unauthorized' }, 401);

    const publicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    if (!publicKey) return jsonResponse({ error: 'Push service not configured' }, 500);

    return jsonResponse({ publicKey, message: 'Public key retrieved successfully' });
  } catch (error) {
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
