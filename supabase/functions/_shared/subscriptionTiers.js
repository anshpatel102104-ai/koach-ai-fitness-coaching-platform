/**
 * Subscription tier tables + gate logic (Step 5c) — verbatim from
 * base44/functions/validateSubscription. Kept in _shared so the
 * validateSubscription edge function and the local rehearsal exercise the
 * SAME tables and gate expressions.
 */

// -1 = unlimited. Mirrors src/lib/subscription.js (TIERS[*].limits) and
// app.tier_client_cap() in supabase/migrations/20261006000100_stripe_production_billing.sql;
// scripts/verify-billing-access.mjs fails if any of the three disagree.
// max_ai_generations_per_month counts ONLY the generations defined in aiPolicy.js.
export const TIER_LIMITS = {
  starter:    { max_clients: 10, max_programs: -1, max_nutrition_plans: -1, max_ai_generations_per_month: 15 },
  pro:        { max_clients: 75, max_programs: -1, max_nutrition_plans: -1, max_ai_generations_per_month: 100 },
  elite:      { max_clients: -1, max_programs: -1, max_nutrition_plans: -1, max_ai_generations_per_month: 300 },
  enterprise: { max_clients: -1, max_programs: -1, max_nutrition_plans: -1, max_ai_generations_per_month: -1 },
};

const ELITE_FEATURES = [
  'clients', 'programs', 'nutrition', 'schedule', 'messages',
  'progress', 'store', 'assistant', 'adherence', 'checkin_review',
  'sales', 'community', 'client_dashboard',
  'ai_suggestions', 'analytics', 'custom_branding', 'voice_video_messages',
  'program_templates', 'analytics_graphs', 'ai_features',
  'adherence_scoring', 'checkin_automation', 'basic_notifications',
  'ai_calorie_suggestions', 'ai_workout_progression', 'ai_checkin_responses',
  'auto_progression_rules', 'trigger_notifications', 'revenue_dashboard',
  'ai_program_builder', 'ai_meal_plan_builder', 'ai_onboarding', 'ai_assistant_full',
  'ai_checkin_summary',
];

export const TIER_FEATURES = {
  starter: [
    'clients', 'programs', 'nutrition', 'schedule', 'messages',
    'ai_program_builder', 'ai_meal_plan_builder',
  ],
  pro: [
    'clients', 'programs', 'nutrition', 'schedule', 'messages',
    'ai_program_builder', 'ai_meal_plan_builder', 'ai_onboarding',
    'ai_checkin_summary', 'ai_suggestions',
    'progress', 'adherence', 'checkin_review', 'client_dashboard',
    'analytics', 'voice_video_messages', 'program_templates',
    'analytics_graphs', 'adherence_scoring', 'checkin_automation', 'basic_notifications',
  ],
  elite: ELITE_FEATURES,
  enterprise: [...ELITE_FEATURES, 'api_access', 'ai_team_access'],
};

export function tierLimits(tier) {
  return TIER_LIMITS[tier] || TIER_LIMITS.starter;
}

export function tierFeatures(tier) {
  return TIER_FEATURES[tier] || TIER_FEATURES.starter;
}

export function featureAllowed(tier, entity) {
  return tierFeatures(tier).includes(entity);
}

/**
 * The create-gate expression used by validate_create_client / _program /
 * _nutrition: blocked when a finite limit is already reached.
 */
export function createBlocked(tier, limitKey, currentCount) {
  const limit = tierLimits(tier)[limitKey] ?? -1;
  return limit !== -1 && currentCount >= limit;
}
