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

import { billingAccess, effectiveTier } from './billingAccess.js';
import { TIER_LIMITS, featureAllowed } from './subscriptionTiers.js';
import { AI_POLICY, ONBOARDING_FEATURE, aiResetDate } from './aiPolicy.js';
import { resolveTeamRole } from './teamRole.js';

// Derived from the one limits table — never a second copy.
export const TIER_AI_LIMITS = Object.fromEntries(
  Object.entries(TIER_LIMITS).map(([tier, l]) => [tier, l.max_ai_generations_per_month]),
);

const TIER_ORDER = ['starter', 'pro', 'elite', 'enterprise'];

/**
 * Check + increment the caller's monthly AI counter (atomically, via RPC).
 * Returns { allowed: true } or { allowed: false, status: 402, body } with the
 * Base44-shaped upgrade message.
 */
export async function meterAiGeneration(svc, profile, now = new Date()) {
  // Billing gate: no subscription / trial / grace => no AI. Team coaches ride on
  // their owner's billing and are not gated on their own (empty) profile state.
  if (!billingAccess(profile, now).hasAccess && (await resolveTeamRole(svc, profile.id)) !== 'coach') {
    return {
      allowed: false,
      status: 402,
      body: { error: 'billing_required', message: 'Your subscription is not active. Subscribe on the billing page to use AI features.', upgrade_required: true },
    };
  }

  const tier = effectiveTier(profile);
  const aiLimit = TIER_AI_LIMITS[tier] ?? 15;
  if (aiLimit === -1) return { allowed: true, used: null, limit: -1 };

  const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM

  // Check + increment in ONE atomic statement (public.meter_ai_generation,
  // migration 20261002000300). The previous read-then-write let parallel
  // requests all see the same count and exceed the quota.
  const { data, error } = await svc.rpc('meter_ai_generation', {
    p_profile: profile.id, p_limit: aiLimit, p_month: currentMonth,
  });
  if (error) throw new Error(`meterAiGeneration: ${error.message}`);
  const row = Array.isArray(data) ? data[0] : data;
  const count = row?.used ?? 0;

  if (!row?.allowed) {
    const next = TIER_ORDER[TIER_ORDER.indexOf(tier) + 1] || null;
    const nextLimit = next ? TIER_AI_LIMITS[next] : null;
    const upgradeHint = next
      ? `upgrade to ${next[0].toUpperCase()}${next.slice(1)} for ${nextLimit === -1 ? 'unlimited' : nextLimit} AI generations${nextLimit === -1 ? '' : '/month'}`
      : 'contact support about your plan';
    return {
      allowed: false,
      status: 402,
      body: {
        error: 'monthly_ai_limit_reached',
        message: `You've used ${count} of ${aiLimit} AI generations this month — ${upgradeHint}. Your allowance resets on ${aiResetDate(now)}.`,
        used: count,
        limit: aiLimit,
        resets_on: aiResetDate(now),
        tier,
        next_tier: next,
        upgrade_required: true,
      },
    };
  }
  return { allowed: true, used: count, limit: aiLimit };
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

/** Lowest plan that includes a feature flag (for upgrade messages). */
function minTierFor(feature) {
  return TIER_ORDER.find((t) => featureAllowed(t, feature)) || null;
}

/**
 * Single server-side guard for EVERY AI edge function (see aiPolicy.js).
 *   1. resolve the payer (the coach; a portal client's coach)
 *   2. active subscription / trial / grace required
 *   3. the plan must include the feature (comped/admin = Enterprise)
 *   4. counted functions consume 1 generation from the monthly allowance
 * Returns null when the call may proceed, else { status, body } to send.
 * Never silent: every refusal carries `error`, a human `message` and, when an
 * upgrade would help, `upgrade_required: true`.
 */
export async function guardAiUse(svc, caller, fnKey, { purpose, now = new Date() } = {}) {
  const policy = AI_POLICY[fnKey];
  if (!policy) throw new Error(`guardAiUse: unknown AI function "${fnKey}"`);

  const payer = await resolveMeteredProfile(svc, caller);
  if (!payer) return { status: 403, body: { error: 'No coach account found for this client' } };
  const isPortalClient = payer.id !== caller.profile?.id;

  if (!billingAccess(payer, now).hasAccess && (await resolveTeamRole(svc, payer.id)) !== 'coach') {
    return {
      status: 402,
      body: {
        error: 'billing_required',
        message: isPortalClient
          ? "Your coach's subscription is not active, so this AI feature is unavailable."
          : 'Your subscription is not active. Subscribe on the billing page to use AI features.',
        upgrade_required: !isPortalClient,
      },
    };
  }

  const tier = effectiveTier(payer);
  const feature = purpose === 'onboarding' && policy.counted ? ONBOARDING_FEATURE : policy.feature;
  if (feature && !featureAllowed(tier, feature)) {
    const need = minTierFor(feature);
    const needName = need ? need[0].toUpperCase() + need.slice(1) : 'a higher';
    return {
      status: 403,
      body: {
        error: 'feature_not_in_plan',
        feature,
        tier,
        required_tier: need,
        message: isPortalClient
          ? "This AI feature isn't available on your coach's plan."
          : `This AI feature is included in the ${needName} plan and above. Upgrade to use it.`,
        upgrade_required: !isPortalClient,
      },
    };
  }

  if (policy.counted) {
    const m = await meterAiGeneration(svc, payer, now);
    if (!m.allowed) return { status: m.status, body: m.body };
  }
  return null;
}

/** Non-throwing variant for background work (check-in auto summary): { allowed }. */
export async function aiFeatureAllowed(svc, profile, fnKey, now = new Date()) {
  const res = await guardAiUse(svc, { auth: { id: profile.id }, profile }, fnKey, { now });
  return { allowed: !res };
}
