// Supabase Edge Function: initializeReferralProgram  (Migration Step 5e)
//
// Faithful port of base44/functions/initializeReferralProgram — creates the
// caller's coach-referral program row (referral_programs) with a generated
// code, idempotent per coach. Lookup is by coach_id (Base44 used coach_email;
// the ported table carries both, id is the stable key).
import { getCaller, serviceClient, cors, jsonResponse } from '../_shared/edgeClients.js';
import { serve } from '../_shared/observe.js';

function generateReferralCode(name: string | null, email: string) {
  const namePart = (name || email.split('@')[0]).split(' ')[0].toUpperCase().slice(0, 6);
  const random = Math.random().toString(36).substring(2, 4).toUpperCase();
  return `${namePart}${random}`;
}

serve('initializeReferralProgram', async (req, ctx) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const caller = await getCaller(req);
    if (!caller) return jsonResponse({ error: 'Unauthorized' }, 401);
    const svc = serviceClient();
    const email = caller.profile.email ?? caller.auth.email;

    // Idempotent per coach
    const { data: existing } = await svc.from('referral_programs')
      .select('*').or(`coach_id.eq.${caller.auth.id},coach_email.eq.${email}`).limit(1);
    if (existing?.length) {
      return jsonResponse({
        success: false,
        message: 'Referral program already exists',
        program: existing[0],
      });
    }

    const referralCode = generateReferralCode(caller.profile.full_name, email);

    const { data: program, error } = await svc.from('referral_programs').insert({
      coach_id: caller.auth.id,
      coach_email: email,
      referral_code: referralCode,
      referral_link: `https://koachai.com/join?ref=${referralCode.toLowerCase()}`,
      total_referrals: 0,
      total_earned: 0,
      pending_balance: 0,
      month_earnings: 0,
      current_tier: 1,
      is_active: true,
      created_by: caller.auth.id,
    }).select('*').single();
    if (error) throw new Error(error.message);

    return jsonResponse({ success: true, program, message: 'Referral program initialized' });
  } catch (error) {
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
