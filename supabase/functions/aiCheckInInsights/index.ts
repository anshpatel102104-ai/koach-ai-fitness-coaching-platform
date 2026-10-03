// Supabase Edge Function: aiCheckInInsights  (Migration Step 7 — frontend cutover)
//
// Per-purpose replacement for the raw `integrations.Core.InvokeLLM` calls that
// lived in the check-in review UI. Two prompt-only actions, ported verbatim from
// the frontend prompt builders they replace:
//   - reviewCheckIn      (components/checkin/CheckInReviewDrawer + CheckInEnhancedDrawer)
//   - programSuggestions (components/checkin/AIProgramSuggestions)
// All context arrives in the request body; no DB reads/writes. Uses the shared
// Anthropic client (the same one verify:ai exercises).
import { getCaller, serviceClient, cors, jsonResponse } from '../_shared/edgeClients.js';
import { meterInsightCall } from '../_shared/aiMetering.js';
import { invokeClaude } from '../_shared/anthropic.js';
import { TOOL_SYSTEM, REVIEW_CHECKIN, PROGRAM_SUGGESTIONS } from '../_shared/aiTools.js';

function num(n: unknown): number | null {
  return typeof n === 'number' && !Number.isNaN(n) ? n : null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const caller = await getCaller(req);
    if (!caller) return jsonResponse({ error: 'Unauthorized' }, 401);

    const body = await req.json();
    const { action, client, checkIn, recentCheckIns = [], nutritionPlan } = body;
    const clientName = body.clientName || client?.name || checkIn?.client_name || 'Client';
    if (!checkIn) return jsonResponse({ error: 'Missing checkIn' }, 400);
    // Unknown/invalid requests are rejected BEFORE metering so they cost no quota.
    if (!['reviewCheckIn', 'programSuggestions'].includes(action)) return jsonResponse({ error: 'Unknown action' }, 400);
    // Every action below makes one Claude call: charge it to the AI quota
    // (coach, or the owning coach for a portal client) — same 402 as the generators.
    const blocked = await meterInsightCall(serviceClient(), caller);
    if (blocked) return jsonResponse(blocked.body, blocked.status);

    // ── ACTION: reviewCheckIn ── coach-facing summary + suggested reply + flags
    if (action === 'reviewCheckIn') {
      const result = await invokeClaude({
        tool: REVIEW_CHECKIN, system: TOOL_SYSTEM,
        prompt: `You are a professional fitness coach AI assistant. Analyze this weekly check-in data and provide:
1. A 2-3 sentence summary for the coach (what went well, what needs attention)
2. A suggested coach response (2-3 sentences, encouraging and actionable)
3. Any flags or concerns (1 short sentence each, max 2)

Client: ${clientName}
Weight: ${checkIn.weight ? checkIn.weight + ' lbs' : 'not provided'}
Mood: ${checkIn.mood || 'not provided'}
Sleep: ${checkIn.sleep_hours ? checkIn.sleep_hours + ' hrs' : 'not provided'}
Energy: ${checkIn.energy_level ? checkIn.energy_level + '/10' : 'not provided'}
Stress: ${checkIn.stress_level ? checkIn.stress_level + '/10' : 'not provided'}
Training compliance: ${checkIn.compliance_training ? checkIn.compliance_training + '%' : 'not provided'}
Nutrition compliance: ${checkIn.compliance_nutrition ? checkIn.compliance_nutrition + '%' : 'not provided'}
Client notes: ${checkIn.notes || 'none'}

Return ONLY valid JSON:
{ "summary": "...", "suggested_response": "...", "flags": ["..."] }`,
      });
      if (!result.ok) return jsonResponse({ error: result.error }, result.status ?? 500);
      return jsonResponse(result.parsed);
    }

    // ── ACTION: programSuggestions ── data-driven program adjustments
    if (action === 'programSuggestions') {
      const weights = (recentCheckIns as Array<{ weight?: number }>)
        .filter((c) => c.weight).slice(0, 4).map((c) => c.weight as number);
      let weightTrend = 'no trend data';
      if (weights.length >= 2) {
        const diff = weights[0] - weights[weights.length - 1];
        if (Math.abs(diff) < 0.5) weightTrend = 'weight is stable (not moving)';
        else if (diff > 0) weightTrend = `weight is down ${diff.toFixed(1)} lbs over last ${weights.length} check-ins`;
        else weightTrend = `weight is up ${Math.abs(diff).toFixed(1)} lbs over last ${weights.length} check-ins`;
      }
      const slice = (recentCheckIns as Array<Record<string, number>>).slice(0, 4);
      const denom = Math.min((recentCheckIns as unknown[]).length || 1, 4);
      const avgTraining = (recentCheckIns as unknown[]).length
        ? Math.round(slice.reduce((s, c) => s + (c.compliance_training || 0), 0) / denom) : null;
      const avgNutrition = (recentCheckIns as unknown[]).length
        ? Math.round(slice.reduce((s, c) => s + (c.compliance_nutrition || 0), 0) / denom) : null;

      const result = await invokeClaude({
        tool: PROGRAM_SUGGESTIONS, system: TOOL_SYSTEM,
        prompt: `You are an elite fitness coach analyzing a client check-in to generate smart program adjustment suggestions.

CLIENT: ${clientName}
GOAL: ${client?.goal?.replace(/_/g, ' ') || 'general fitness'}
CURRENT NUTRITION: ${nutritionPlan ? `${nutritionPlan.calories || '?'} calories, ${nutritionPlan.protein_g || '?'}g protein` : 'no plan assigned'}

THIS WEEK'S CHECK-IN:
- Weight: ${checkIn.weight ? `${checkIn.weight} lbs` : 'not recorded'}
- Weight trend: ${weightTrend}
- Sleep: ${checkIn.sleep_hours ? `${checkIn.sleep_hours} hrs` : 'not recorded'}
- Energy: ${checkIn.energy_level ? `${checkIn.energy_level}/5` : 'not recorded'}
- Stress: ${checkIn.stress_level ? `${checkIn.stress_level}/5` : 'not recorded'}
- Mood: ${checkIn.mood || 'not recorded'}
- Training compliance: ${num(checkIn.compliance_training) != null ? `${checkIn.compliance_training}%` : 'not recorded'} (4-check-in avg: ${avgTraining != null ? avgTraining + '%' : 'N/A'})
- Nutrition compliance: ${num(checkIn.compliance_nutrition) != null ? `${checkIn.compliance_nutrition}%` : 'not recorded'} (4-check-in avg: ${avgNutrition != null ? avgNutrition + '%' : 'N/A'})
- Client notes: ${checkIn.notes || 'none'}

Generate 3-5 specific, actionable program adjustment suggestions based on the data above.
Each suggestion must have:
- "title": short action label (e.g. "Decrease calories by 150")
- "rationale": 1 sentence explaining WHY based on the data (be specific, cite a number)
- "category": one of: calories, cardio, intensity, nutrition, recovery
- "impact": one of: high, medium, low
- "action_type": one of: increase_calories, decrease_calories, increase_cardio, decrease_cardio, increase_intensity, decrease_intensity, add_rest_day, adjust_macros, other
- "action_value": numeric value if applicable (e.g. 150 for calorie change, 2000 for steps), null otherwise

Only suggest what the data justifies. Be specific with numbers. No vague suggestions.
Return ONLY valid JSON: { "suggestions": [ ... ] }`,
      });
      if (!result.ok) return jsonResponse({ error: result.error }, result.status ?? 500);
      return jsonResponse(result.parsed);
    }

    return jsonResponse({ error: 'Unknown action' }, 400);
  } catch (error) {
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
