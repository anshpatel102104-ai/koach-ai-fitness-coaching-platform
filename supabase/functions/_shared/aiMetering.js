/**
 * Monthly AI-generation metering (Step 5d) — the guard Base44 inlined
 * identically into generateAIProgram / generateMealPlan / generateSmartMeals,
 * extracted so all three (and future AI functions) share one implementation.
 * The 402 payload shape is verbatim from those functions.
 *
 * Counters live on the caller's profiles row (ai_generation_count /
 * ai_generation_month). Those columns are NOT in the privileged-columns
 * trigger allowlist, but writes still go through the service client scoped to
 * the caller's own id, matching every other self-write in the ported
 * functions.
 *
 * Faithful scope note: Base44 metered only the three generators —
 * claudeAssistant / aiMessageAssistant / generateExerciseLibrary were
 * unmetered. The ports keep that behavior.
 */

export const TIER_AI_LIMITS = { starter: 15, pro: 50, elite: 150, enterprise: -1 };

/**
 * Check + increment the caller's monthly AI counter.
 * Returns { allowed: true } or { allowed: false, status: 402, body } with the
 * Base44-shaped upgrade message.
 */
export async function meterAiGeneration(svc, profile, now = new Date()) {
  const tier = profile.subscription_tier || 'starter';
  const aiLimit = TIER_AI_LIMITS[tier] ?? 15;
  if (aiLimit === -1) return { allowed: true, used: null, limit: -1 };

  const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM
  const storedMonth = profile.ai_generation_month || '';
  const count = storedMonth === currentMonth ? (profile.ai_generation_count || 0) : 0;

  if (count >= aiLimit) {
    const upgradeHint = {
      starter: 'upgrade to Pro for 50 AI generations/month',
      pro: 'upgrade to Elite for 150 AI generations/month',
      elite: 'upgrade to Enterprise for unlimited AI generations',
    };
    return {
      allowed: false,
      status: 402,
      body: {
        error: 'monthly_ai_limit_reached',
        message: `You've used ${count}/${aiLimit} AI generations this month — ${upgradeHint[tier] || 'upgrade your plan'}.`,
        used: count,
        limit: aiLimit,
      },
    };
  }

  const { error } = await svc.from('profiles')
    .update({ ai_generation_count: count + 1, ai_generation_month: currentMonth })
    .eq('id', profile.id);
  if (error) throw new Error(`meterAiGeneration: ${error.message}`);
  return { allowed: true, used: count + 1, limit: aiLimit };
}

/**
 * Who pays for an AI call. Coach sessions pay from their own quota. A client
 * portal session (a real auth user linked via clients.portal_user_id) draws on
 * the OWNING COACH's quota — the portal user's own profile row is a bare
 * starter-tier row that would otherwise cap clients at 15 calls/month, and the
 * coach is the plan holder. Returns the profile row to meter, or null when the
 * caller is a portal client whose coach cannot be resolved (deny).
 */
export async function resolveMeteredProfile(svc, caller) {
  const { data: link } = await svc.from('clients')
    .select('user_id, created_by')
    .eq('portal_user_id', caller.auth.id)
    .limit(1)
    .maybeSingle();
  if (!link) return caller.profile;
  const coachId = link.user_id || link.created_by;
  if (!coachId) return null;
  const { data: coach } = await svc.from('profiles').select('*').eq('id', coachId).maybeSingle();
  return coach ?? null;
}

/**
 * One-call guard for the insight functions: resolve the payer, then
 * check + increment. Returns null when the call may proceed, else a ready-made
 * Response-shaped { body, status } to return.
 */
export async function meterInsightCall(svc, caller) {
  const payer = await resolveMeteredProfile(svc, caller);
  if (!payer) return { status: 403, body: { error: 'No coach account found for this client' } };
  const meter = await meterAiGeneration(svc, payer);
  return meter.allowed ? null : { status: meter.status, body: meter.body };
}
