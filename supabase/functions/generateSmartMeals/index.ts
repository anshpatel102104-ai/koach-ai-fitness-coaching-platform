// Supabase Edge Function: generateSmartMeals  (Migration Step 5d)
//
// Re-platform of base44/functions/generateSmartMeals: shared metering, the
// two-parallel-batch prompt strategy verbatim, and draft persistence to
// nutrition_plans. Two multi-tenant corrections vs Base44:
//   - the draft is created with created_by = caller (Base44 used the user
//     context implicitly),
//   - the nutrition_plan_id UPDATE path verifies the plan belongs to the
//     caller (Base44 updated any client-supplied id asServiceRole).
import { getCaller, serviceClient, cors, jsonResponse } from '../_shared/edgeClients.js';
import { ownsClient } from '../_shared/edgeClients.js';
import { meterAiGeneration } from '../_shared/aiMetering.js';
import { invokeClaude } from '../_shared/anthropic.js';
import { collectFoodNames, findAllergenViolations } from '../_shared/aiSafety.js';

const MEAL_ORDER = ['Breakfast', 'Lunch', 'Dinner', 'Pre-Workout', 'Post-Workout', 'Snack'];

function avoidLine(allergies?: string, dislikedFoods?: string, diet?: string) {
  const parts = [];
  if (diet) parts.push(`Diet: ${diet}.`);
  if (allergies) parts.push(`ALLERGIES (never include, non-negotiable): ${allergies}.`);
  if (dislikedFoods) parts.push(`Avoid disliked: ${dislikedFoods}.`);
  return parts.join(' ');
}

function buildBatchPrompt(mealNames: string[], calories: number, protein_g: number, carbs_g: number, fats_g: number, options_count: number, totalMeals: number, avoid = '') {
  const perMealCal = Math.round(calories / totalMeals);
  return `You are a sports dietitian. Generate exactly ${mealNames.length} meal(s): ${mealNames.join(', ')}.
Each meal must have ${options_count} distinct options.
Per-meal target: ~${perMealCal} kcal, proportional protein/carbs/fats from daily totals of ${protein_g}g P / ${carbs_g || 'balanced'} C / ${fats_g || 'balanced'} F.
${avoid ? avoid + '\n' : ''}Each option: 2-4 foods with accurate macros. Give each a short label (e.g. "High Protein", "Quick & Easy").
Return ONLY valid JSON with a "meals" array (${mealNames.length} item${mealNames.length > 1 ? 's' : ''}); each meal: {"meal_name":"...","time":"...","options":[{"label":"...","foods":[{"food_name":"...","portion":"...","calories":0,"protein":0,"carbs":0,"fats":0}]}]}.`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const caller = await getCaller(req);
    if (!caller) return jsonResponse({ error: 'Unauthorized' }, 401);
    const svc = serviceClient();
    const userId = caller.auth.id;

    let body;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: 'invalid_request_body' }, 400);
    }
    const {
      calories, protein_g, carbs_g, fats_g,
      meal_count, options_count,
      mode, meal,
      client_id,
      nutrition_plan_id,
      allergies, disliked_foods, diet,
    } = body;

    const avoid = avoidLine(allergies, disliked_foods, diet);

    const meter = await meterAiGeneration(svc, caller.profile);
    if (!meter.allowed) return jsonResponse(meter.body, meter.status);

    // ── Single-meal regeneration ────────────────────────────────────────────
    if (mode === 'regenerate' && meal) {
      const prompt = `Regenerate the "${meal.meal_name}" meal with ${options_count} distinct options.
Daily targets: ${calories}kcal, ${protein_g}g protein, ${carbs_g || 'balanced'}g carbs, ${fats_g || 'balanced'}g fats.
This meal = roughly 1/${meal.total_meals || 4} of daily totals.
Each option should have similar calories/macros. Give each option a short label.
Return ONLY a single meal JSON object: {"meal_name":"...","time":"...","options":[{"label":"...","foods":[{"food_name":"...","portion":"...","calories":0,"protein":0,"carbs":0,"fats":0}]}]}.`;

      const promptWithAvoid = avoid ? `${prompt}\n${avoid}` : prompt;
      const llm = await invokeClaude({ prompt: promptWithAvoid, maxTokens: 2048, expectJson: true });
      if (!llm.ok) return jsonResponse({ error: llm.error }, llm.status ?? 500);
      // Deterministic allergen check on the regenerated meal (B-SAFETY).
      const violations = findAllergenViolations(collectFoodNames(llm.parsed), allergies);
      if (violations.length) {
        return jsonResponse({ error: 'allergen_violation', violations }, 422);
      }
      return jsonResponse({ meal: llm.parsed });
    }

    // ── Full plan generation — two parallel batches (verbatim strategy) ─────
    const totalMeals = Number(meal_count);
    const allMealNames = MEAL_ORDER.slice(0, totalMeals);
    const midpoint = Math.ceil(allMealNames.length / 2);
    const firstHalf = allMealNames.slice(0, midpoint);
    const secondHalf = allMealNames.slice(midpoint);

    const batchPromises = [
      invokeClaude({ prompt: buildBatchPrompt(firstHalf, calories, protein_g, carbs_g, fats_g, options_count, totalMeals, avoid), maxTokens: 4096, expectJson: true }),
    ];
    if (secondHalf.length > 0) {
      batchPromises.push(
        invokeClaude({ prompt: buildBatchPrompt(secondHalf, calories, protein_g, carbs_g, fats_g, options_count, totalMeals, avoid), maxTokens: 4096, expectJson: true }),
      );
    }

    const [firstResult, secondResult] = await Promise.all(batchPromises);
    for (const r of [firstResult, secondResult]) {
      if (r && !r.ok) return jsonResponse({ error: r.error }, r.status ?? 500);
    }

    const meals = [
      ...(firstResult?.parsed?.meals || []),
      ...(secondResult?.parsed?.meals || []),
    ];

    // Deterministic allergen check BEFORE any persistence (B-SAFETY). The main
    // meal generator previously had no allergy input at all and wrote plans to
    // nutrition_plans with zero allergen checking.
    const violations = findAllergenViolations(collectFoodNames({ meals }), allergies);
    if (violations.length) {
      return jsonResponse({ error: 'allergen_violation', violations }, 422);
    }

    // ── Persist to nutrition_plans (draft) before returning ─────────────────
    if (meals.length > 0) {
      // ownership checks on client-supplied ids
      if (client_id && !(await ownsClient(svc, userId, client_id))) {
        return jsonResponse({ error: 'Forbidden: client not owned by you' }, 403);
      }

      if (nutrition_plan_id) {
        const { data: plan } = await svc.from('nutrition_plans')
          .select('id, created_by, client_id').eq('id', nutrition_plan_id).maybeSingle();
        const owned = plan && (plan.created_by === userId
          || (plan.client_id && await ownsClient(svc, userId, plan.client_id)));
        if (!owned) return jsonResponse({ error: 'Forbidden: plan not owned by you' }, 403);
        await svc.from('nutrition_plans').update({ meals, status: 'draft' }).eq('id', plan.id);
        return jsonResponse({ meals, draft_plan_id: plan.id });
      }

      const planData: Record<string, unknown> = {
        title: `AI Smart Plan — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        status: 'draft',
        is_draft: true,
        ai_generated: true,
        calories: Number(calories) || 0,
        protein_g: Number(protein_g) || 0,
        carbs_g: Number(carbs_g) || 0,
        fats_g: Number(fats_g) || 0,
        meals,
        created_by: userId,
      };
      if (client_id) planData.client_id = client_id;

      const { data: savedPlan } = await svc.from('nutrition_plans')
        .insert(planData).select('id').single();
      return jsonResponse({ meals, draft_plan_id: savedPlan?.id || null });
    }

    return jsonResponse({ meals });
  } catch (error) {
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
