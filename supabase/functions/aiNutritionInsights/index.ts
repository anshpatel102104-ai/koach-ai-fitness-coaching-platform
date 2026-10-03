// Supabase Edge Function: aiNutritionInsights  (Migration Step 7 — frontend cutover)
//
// Per-purpose replacement for the raw `integrations.Core.InvokeLLM` calls in the
// nutrition UI. Three prompt-only actions, ported verbatim from the frontend
// prompt builders they replace:
//   - foodSwaps     (components/nutrition/MealPlanViewer)
//   - weeklyInsight (components/portal/WeeklySnapshot)
//   - nutritionQA   (components/portal/nutrition/AIAssistant)
// Context arrives in the request body. Uses the shared Anthropic client.
//
// NOTE: weeklyInsight / nutritionQA are called from the CLIENT PORTAL. getCaller
// accepts any verified session (coach or portal-client JWT), so portal callers
// are authorized here without exposing the LLM key to the browser.
import { getCaller, serviceClient, cors, jsonResponse } from '../_shared/edgeClients.js';
import { meterInsightCall } from '../_shared/aiMetering.js';
import { invokeClaude } from '../_shared/anthropic.js';
import { TOOL_SYSTEM, FOOD_SWAPS } from '../_shared/aiTools.js';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const caller = await getCaller(req);
    if (!caller) return jsonResponse({ error: 'Unauthorized' }, 401);

    const body = await req.json();
    const { action } = body;
    // Unknown/invalid requests are rejected BEFORE metering so they cost no quota.
    if (!['foodSwaps', 'weeklyInsight', 'nutritionQA'].includes(action)) return jsonResponse({ error: 'Unknown action' }, 400);
    // Every action below makes one Claude call: charge it to the AI quota
    // (coach, or the owning coach for a portal client) — same 402 as the generators.
    const blocked = await meterInsightCall(serviceClient(), caller);
    if (blocked) return jsonResponse(blocked.body, blocked.status);

    // ── ACTION: foodSwaps ── 3 macro-matched swap suggestions for a food
    if (action === 'foodSwaps') {
      const { food = {}, mealName } = body;
      const result = await invokeClaude({
        tool: FOOD_SWAPS, system: TOOL_SYSTEM,
        prompt: `Suggest exactly 3 food swap alternatives for "${food.food_name}" (${food.portion || ''}) in a ${mealName} meal. Each swap should have similar macros: ~${food.calories || 0} kcal, ~${food.protein || 0}g protein, ~${food.carbs || 0}g carbs, ~${food.fats || 0}g fats. Be brief and practical.
Return ONLY valid JSON: { "swaps": [ { "name": "...", "portion": "...", "note": "..." } ] }`,
      });
      if (!result.ok) return jsonResponse({ error: result.error }, result.status ?? 500);
      return jsonResponse(result.parsed);
    }

    // ── ACTION: weeklyInsight ── one-sentence motivational dashboard insight
    if (action === 'weeklyInsight') {
      const { doneCount, adherence } = body;
      const result = await invokeClaude({
        prompt: `A fitness client completed ${doneCount} of 7 workouts this week (${adherence}% adherence). Write a 1-sentence motivational insight for their dashboard. Be specific, warm, and emoji-friendly. Max 15 words.`,
      });
      if (!result.ok) return jsonResponse({ error: result.error }, result.status ?? 500);
      return jsonResponse({ text: result.text.trim() });
    }

    // ── ACTION: nutritionQA ── concise answer to a client nutrition question
    if (action === 'nutritionQA') {
      const { macroContext, question } = body;
      const result = await invokeClaude({
        prompt: `You are a helpful nutrition coach assistant. Context: ${macroContext}\n\nClient question: ${question}\n\nGive a concise, practical answer in 2-4 sentences. Be warm and encouraging.`,
      });
      if (!result.ok) return jsonResponse({ error: result.error }, result.status ?? 500);
      return jsonResponse({ text: result.text.trim() });
    }

    return jsonResponse({ error: 'Unknown action' }, 400);
  } catch (error) {
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
