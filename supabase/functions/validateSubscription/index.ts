// Supabase Edge Function: validateSubscription  (Migration Step 5c)
//
// Re-platform of base44/functions/validateSubscription — the tier/limit gate
// Clients.jsx calls before creating a client (validate_create_client), plus
// the feature-check / guard / tier-info actions other surfaces use.
//
// Fidelity notes vs the Base44 version:
//   - tier comes from the caller's own profiles row (subscription_tier), which
//     only the service role / Stripe webhook can write (privileged-columns
//     trigger) — so the gate can't be self-served around.
//   - counts use the CALLER-scoped client (RLS applies), matching Base44's
//     user-scoped entities.Client.list() semantics.
import { getCaller, callerClient, serviceClient, cors, jsonResponse } from '../_shared/edgeClients.js';
// Tier tables + gate expressions live in _shared so the local rehearsal
// exercises the SAME logic (scripts/verify-entity-events.mjs).
import { tierLimits, tierFeatures, createBlocked } from '../_shared/subscriptionTiers.js';
import { billingAccess, effectiveTier } from '../_shared/billingAccess.js';
import { resolveTeamRole } from '../_shared/teamRole.js';
import { serve } from '../_shared/observe.js';

// RLS-scoped row count, mirroring Base44's user-scoped entities.X.list().length
async function countRows(caller, table) {
  const { count, error } = await caller.from(table).select('id', { count: 'exact', head: true });
  if (error) return 0; // Base44 version .catch(() => 0)
  return count ?? 0;
}

serve('validateSubscription', async (req, ctx) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const who = await getCaller(req);
    if (!who) return jsonResponse({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const { action, entity, count } = body;

    const userTier = effectiveTier(who.profile);
    const limits = tierLimits(userTier);
    const features = tierFeatures(userTier);

    // Feature access check (read-only, no 403)
    if (action === 'check_feature') {
      const allowed = features.includes(entity);
      return jsonResponse({ allowed, tier: userTier });
    }

    // Hard gate — returns 403 if feature is not in the user's tier.
    if (action === 'guard_feature') {
      const allowed = features.includes(entity);
      if (!allowed) {
        return jsonResponse({
          error: `This feature requires a higher subscription tier. Current: ${userTier}.`,
          required_feature: entity,
          tier: userTier,
          upgrade_required: true,
        }, 403);
      }
      return jsonResponse({ allowed: true, tier: userTier });
    }

    // Usage limit check
    if (action === 'check_limit') {
      const limitKey = `max_${entity}`;
      const limit = limits[limitKey] ?? -1;
      const allowed = limit === -1 || (count !== undefined ? count < limit : true);
      return jsonResponse({ allowed, limit, tier: userTier });
    }

    const caller = callerClient(req);

    // Billing gate for every create-validation: no subscription / trial / grace
    // => nothing new can be created. Team coaches ride on their owner's billing.
    if (String(action).startsWith('validate_create_')
        && !billingAccess(who.profile).hasAccess
        && (await resolveTeamRole(serviceClient(), who.auth.id)) !== 'coach') {
      return jsonResponse({
        allowed: false,
        error: 'Your subscription is not active. Subscribe on the billing page to continue.',
        billing_required: true,
        tier: userTier,
      });
    }

    // Validate before creating a client
    if (action === 'validate_create_client') {
      const clientCount = await countRows(caller, 'clients');
      const limit = limits.max_clients;
      if (createBlocked(userTier, 'max_clients', clientCount)) {
        return jsonResponse({
          allowed: false,
          error: `Client limit reached (${limit} on ${userTier} plan)`,
          limit,
          current: clientCount,
          tier: userTier,
        });
      }
      return jsonResponse({ allowed: true, tier: userTier });
    }

    // Validate before creating a program
    if (action === 'validate_create_program') {
      const programCount = await countRows(caller, 'workout_programs');
      const limit = limits.max_programs;
      if (createBlocked(userTier, 'max_programs', programCount)) {
        return jsonResponse({
          allowed: false,
          error: `Program limit reached (${limit} on ${userTier} plan)`,
          limit,
          current: programCount,
          tier: userTier,
        });
      }
      return jsonResponse({ allowed: true, tier: userTier });
    }

    // Validate before creating a nutrition plan
    if (action === 'validate_create_nutrition') {
      const planCount = await countRows(caller, 'nutrition_plans');
      const limit = limits.max_nutrition_plans;
      if (createBlocked(userTier, 'max_nutrition_plans', planCount)) {
        return jsonResponse({
          allowed: false,
          error: `Nutrition plan limit reached (${limit} on ${userTier} plan)`,
          limit,
          current: planCount,
          tier: userTier,
        });
      }
      return jsonResponse({ allowed: true, tier: userTier });
    }

    // Return full tier info
    if (action === 'get_tier_info') {
      return jsonResponse({ tier: userTier, limits, features });
    }

    return jsonResponse({ error: 'Unknown action' }, 400);
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
});
