// Supabase Edge Function: generateMealPlan  (Migration Step 5d; structured output)
//
// Metering via the shared guard, macro math + standard supplement protocol
// verbatim. The plan is generated as TWO parallel structured tool calls (training
// day + plan-level notes; rest day) instead of one free-text JSON blob:
//   - the tool schema gives schema-shaped structured output (no prose/fences/
//     invalid JSON; a reply that does not call the tool is rejected), and a response cut off at max_tokens is rejected, so a
//     plan can never be silently truncated;
//   - two small calls in parallel keep each response far below the token cap
//     and the wall-clock well inside the edge function request limit.
// The deterministic allergen check runs on the assembled plan before it is
// returned. No DB writes beyond the meter.
import { getCaller, serviceClient, cors, jsonResponse } from '../_shared/edgeClients.js';
import { meterAiGeneration } from '../_shared/aiMetering.js';
import { invokeClaude } from '../_shared/anthropic.js';
import { collectFoodNames, findAllergenViolations, parseTermList } from '../_shared/aiSafety.js';

const num = { type: 'number' };
const str = { type: 'string' };
const FOOD = {
  type: 'object',
  required: ['name', 'amount', 'unit', 'amount_household', 'prep_method', 'calories', 'protein', 'carbs', 'fats'],
  properties: { name: str, amount: num, unit: str, amount_household: str, prep_method: str, calories: num, protein: num, carbs: num, fats: num },
};
const MEAL = {
  type: 'object',
  required: ['id', 'name', 'time', 'calories', 'protein', 'carbs', 'fats', 'instructions', 'why_this_meal', 'option_b', 'foods'],
  properties: {
    id: str, name: str, time: str, calories: num, protein: num, carbs: num, fats: num,
    instructions: str, why_this_meal: str, option_b: str, foods: { type: 'array', items: FOOD },
  },
};
const TRAINING_TOOL = {
  name: 'submit_training_day_plan',
  description: 'Submit the training-day meals plus the plan-level notes.',
  input_schema: {
    type: 'object',
    required: ['training_day', 'hydration', 'coach_notes', 'client_notes', 'shopping_list', 'macro_flexibility_rules'],
    properties: {
      training_day: { type: 'object', required: ['meals'], properties: { meals: { type: 'array', items: MEAL } } },
      hydration: {
        type: 'object', required: ['daily_oz', 'morning', 'post_workout', 'electrolytes'],
        properties: { daily_oz: num, morning: str, post_workout: str, electrolytes: str },
      },
      coach_notes: {
        type: 'object', required: ['why_these_calories', 'key_priorities', 'first_2_weeks'],
        properties: { why_these_calories: str, key_priorities: str, first_2_weeks: str },
      },
      client_notes: str,
      shopping_list: { type: 'array', items: str },
      macro_flexibility_rules: { type: 'array', items: str },
    },
  },
};
const REST_TOOL = {
  name: 'submit_rest_day_plan',
  description: 'Submit the rest-day meals.',
  input_schema: {
    type: 'object',
    required: ['rest_day', 'shopping_list_additions'],
    properties: {
      rest_day: { type: 'object', required: ['meals'], properties: { meals: { type: 'array', items: MEAL } } },
      shopping_list_additions: { type: 'array', items: str },
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const t0 = Date.now();
    const caller = await getCaller(req);
    if (!caller) return jsonResponse({ error: 'Unauthorized' }, 401);

    const meter = await meterAiGeneration(serviceClient(), caller.profile);
    if (!meter.allowed) return jsonResponse(meter.body, meter.status);

    const body = await req.json();
    const {
      age, sex, weightKg, goal, diet, allergies, dislikedFoods, lovedFoods,
      calories, protein, carbs, fats,
      trainingDaysPerWeek, trainingTime, mealsPerDay, preWorkout, postWorkout,
      wakeTime, sleepTime, supplements,
    } = body;

    const numMeals = Math.min(Number(mealsPerDay) || 4, 5);
    const trainDays = Number(trainingDaysPerWeek) || 4;
    const restCalories = Math.round(Number(calories) * 0.9);
    const restCarbs = Math.round(Number(carbs) * 0.8);
    const restFats = Math.round(Number(fats) * 1.15);

    const goalFoods: Record<string, string[]> = {
      fat_loss: ['chicken breast', 'egg whites', 'tuna', 'tilapia', 'ground turkey', 'sweet potato (small)', 'oats', 'broccoli', 'spinach', 'peppers', 'cucumber'],
      muscle_gain: ['chicken breast', 'ground beef 90/10', 'salmon', 'whole eggs', 'Greek yogurt', 'white rice', 'sweet potato', 'oats', 'banana', 'bread', 'avocado', 'peanut butter'],
      recomp: ['chicken breast', 'eggs', 'cottage cheese', 'Greek yogurt', 'sweet potato', 'white rice (around training)', 'oats', 'broccoli', 'spinach'],
      performance: ['chicken', 'salmon', 'eggs', 'white rice', 'pasta', 'oats', 'banana', 'sweet potato', 'olive oil'],
      maintenance: ['chicken', 'fish', 'eggs', 'lean beef', 'rice', 'potatoes', 'oats', 'olive oil', 'nuts', 'vegetables'],
    };
    const goalHint: Record<string, string> = {
      fat_loss: 'High protein, moderate carbs, vegs at every meal.',
      muscle_gain: 'More carbs for energy.',
      recomp: 'Balance protein and carbs.',
      performance: 'Carbs as primary fuel, high carb pre/post workout.',
      maintenance: 'Balanced variety.',
    };
    // The suggested-foods guide must never contradict a declared allergy
    // (e.g. "peanut butter" for a peanut-allergic muscle-gain client).
    const guideFoods = (goalFoods[goal] || goalFoods.maintenance)
      .filter((f) => findAllergenViolations([f], allergies).length === 0);
    const foodGuide = `Use: ${guideFoods.join(', ')}. ${goalHint[goal] || goalHint.maintenance}`;

    const supplementNote = supplements && supplements.filter((s: string) => s !== 'None').length > 0
      ? `Supplements to include in instructions: ${supplements.filter((s: string) => s !== 'None').join(', ')}`
      : '';
    const declared = parseTermList(allergies);
    const allergyLine = declared.length
      ? `ALLERGIES (hard rule — never include these or foods containing them, including sauces/oils/butters): ${declared.join(', ')}`
      : '';

    const header = `Client: ${age}yr ${sex}, ${weightKg}kg, goal: ${goal}, diet: ${diet || 'Standard'}
Meals: ${numMeals} per day | Wake: ${wakeTime || '07:00'} | Sleep: ${sleepTime || '22:00'}
Training time: ${trainingTime || 'Morning'}, ${trainDays} days/week
Pre-workout meal: ${preWorkout ? 'yes' : 'no'} | Post-workout: ${postWorkout ? 'yes' : 'no'}
Avoid: ${allergies || 'none'}, ${dislikedFoods || 'none'}
${allergyLine}
Preferred: ${lovedFoods || 'any'}
Food guide: ${foodGuide}
${supplementNote}`;

    const rules = `Rules:
- Each food: amount is grams (number), amount_household is "1 cup / 4 oz" style string
- Food macros must sum to meal totals; meal totals must sum to the daily targets ±5%
- Real food names only (e.g. "Chicken Breast", "White Rice cooked", "Broccoli")
- 3-4 foods per meal
- Keep text fields brief: instructions ≤ 25 words, why_this_meal ≤ 15 words, option_b ≤ 15 words
- Tool arguments must be real JSON objects/arrays — never JSON encoded inside a string`;

    const trainingPrompt = `Generate the TRAINING-DAY meal plan and plan-level notes by calling the submit_training_day_plan tool (respond with that tool call only).

${header}
Targets (training day): ${calories} kcal | P:${protein}g | C:${carbs}g | F:${fats}g
Produce exactly ${numMeals} meals for the training day. Also fill hydration, coach_notes, client_notes, shopping_list (for the training-day meals) and macro_flexibility_rules.
${rules}`;

    const restPrompt = `Generate the REST-DAY meals by calling the submit_rest_day_plan tool (respond with that tool call only).

${header}
Targets (rest day): ${restCalories} kcal | P:${protein}g | C:${restCarbs}g | F:${restFats}g
Produce exactly ${numMeals} meals for the rest day. shopping_list_additions = only items needed for the rest day that a training-day shopping list would not already cover.
${rules}`;

    // Two small structured calls in parallel (each far below the token cap).
    const [trainRes, restRes] = await Promise.all([
      invokeClaude({ prompt: trainingPrompt, tool: TRAINING_TOOL, maxTokens: 12000, timeoutMs: 125_000 }),
      invokeClaude({ prompt: restPrompt, tool: REST_TOOL, maxTokens: 12000, timeoutMs: 125_000 }),
    ]);
    for (const r of [trainRes, restRes]) {
      if (!r.ok) return jsonResponse({ error: r.error, diagnostics: r.diagnostics }, r.status ?? 500);
    }
    const train = trainRes.parsed;
    const rest = restRes.parsed;

    if (!train?.training_day?.meals?.length || !rest?.rest_day?.meals?.length) {
      const preview = (o: unknown) => JSON.stringify(o ?? null)?.slice(0, 300);
      console.error('generateMealPlan: invalid structure', preview(train), preview(rest));
      return jsonResponse({
        error: 'AI returned an invalid meal plan structure',
        diagnostics: { coerce_notes: [...(trainRes.coerceNotes ?? []), ...(restRes.coerceNotes ?? [])], train_keys: Object.keys(train ?? {}), rest_keys: Object.keys(rest ?? {}), train_preview: preview(train), rest_preview: preview(rest), stop_reasons: [trainRes.stopReason, restRes.stopReason], output_tokens: [trainRes.outputTokens, restRes.outputTokens] },
      }, 500);
    }

    const parsed = {
      training_day: train.training_day,
      rest_day: rest.rest_day,
      hydration: train.hydration,
      coach_notes: train.coach_notes,
      client_notes: train.client_notes,
      shopping_list: [...(train.shopping_list || []), ...(rest.shopping_list_additions || [])],
      macro_flexibility_rules: train.macro_flexibility_rules,
      weekly_overview: {
        training_days: trainDays,
        rest_days: 7 - trainDays,
        avg_daily_calories: Math.round((Number(calories) * trainDays + restCalories * (7 - trainDays)) / 7),
        weekly_protein_target: Number(protein) * 7,
        estimated_weekly_cost_usd: 75,
      },
      supplements: [] as unknown[],
    };

    // Deterministic allergen check across both day plans (B-SAFETY). Prompting
    // is not sufficient for a health-safety constraint; reject before returning.
    const allergenViolations = findAllergenViolations(
      [...collectFoodNames(parsed.training_day), ...collectFoodNames(parsed.rest_day)],
      allergies,
    );
    if (allergenViolations.length) {
      return jsonResponse({ error: 'allergen_violation', violations: allergenViolations }, 422);
    }

    const trainingMeals = parsed.training_day.meals;
    console.log(`Generated ${trainingMeals.length} training meals, ${parsed.rest_day.meals.length} rest meals`);

    // Append the standard supplement protocol to every generated plan (verbatim)
    parsed.supplements = [
      { name: 'Multivitamin',           dosage: '1 serving',        timing: 'Morning', purpose: 'Micronutrient insurance' },
      { name: 'Vitamin D3',             dosage: '2,000–5,000 IU',   timing: 'Morning', purpose: 'Testosterone, immunity, bone health' },
      { name: 'Omega-3 Fish Oil',       dosage: '2–3g EPA+DHA',     timing: 'Morning', purpose: 'Inflammation, joints, recovery' },
      { name: 'Creatine Monohydrate',   dosage: '5g daily',         timing: 'Morning', purpose: 'Strength, power, muscle retention' },
      { name: 'Vitamin C',              dosage: '500–1,000mg',      timing: 'Morning', purpose: 'Immune support, collagen synthesis' },
      { name: 'Magnesium Glycinate',    dosage: '200–400mg',        timing: 'Night',   purpose: 'Sleep, muscle recovery, stress' },
      { name: 'Zinc',                   dosage: '15–30mg',          timing: 'Night',   purpose: 'Testosterone, immune health, protein synthesis' },
      { name: 'Ashwagandha KSM-66',     dosage: '300–600mg',        timing: 'Night',   purpose: 'Cortisol, sleep quality, testosterone' },
    ];

    return jsonResponse({
      meals: trainingMeals, plan: parsed,
      _meta: { calls: 2, elapsed_ms: Date.now() - t0, output_tokens: [trainRes.outputTokens, restRes.outputTokens], stop_reasons: [trainRes.stopReason, restRes.stopReason] },
    });
  } catch (error) {
    console.error('generateMealPlan error:', error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
