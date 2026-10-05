/**
 * Client mirror of supabase/functions/_shared/aiPolicy.js (edge functions can't
 * import from src/): which edge functions count as one "AI generation", plus
 * the monthly usage helpers. scripts/verify-billing-access.mjs fails if the
 * counted list drifts from the server's.
 */
export const COUNTED_AI_FUNCTIONS = ['generateAIProgram', 'generateMealPlan', 'generateSmartMeals'];

/** First day of next month, UTC (YYYY-MM-DD). */
export function aiResetDate(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);
}

/** { used, limit (-1 = unlimited), resetsOn } from a profile row. Counter is per UTC month. */
export function aiUsage(user, limit, now = new Date()) {
  const month = now.toISOString().slice(0, 7);
  const used = user?.ai_generation_month === month ? (user.ai_generation_count || 0) : 0;
  return { used, limit, resetsOn: aiResetDate(now) };
}
