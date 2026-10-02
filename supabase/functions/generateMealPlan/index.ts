// Supabase Edge Function: generateMealPlan  (Migration Step 5d)
//
// Re-platform of base44/functions/generateMealPlan: metering via the shared
// guard, prompt + macro math + standard supplement protocol verbatim,
// InvokeLLM → shared Anthropic client. No DB writes beyond the meter.
import { getCaller, serviceClient, cors, jsonResponse } from '../_shared/edgeClients.js';
import { meterAiGeneration } from '../_shared/aiMetering.js';
import { invokeClaude } from '../_shared/anthropic.js';
import { collectFoodNames, findAllergenViolations } from '../_shared/aiSafety.js';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
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
    const restCalories = Math.round(Number(calories) * 0.9);
    const restCarbs = Math.round(Number(carbs) * 0.8);
    const restFats = Math.round(Number(fats) * 1.15);

    const goalFoods: Record<string, string> = {
      fat_loss:    'Use: chicken breast, egg whites, tuna, tilapia, ground turkey, sweet potato (small), oats, broccoli, spinach, peppers, cucumber. High protein, moderate carbs, vegs at every meal.',
      muscle_gain: 'Use: chicken breast, ground beef 90/10, salmon, whole eggs, Greek yogurt, white rice, sweet potato, oats, banana, bread, avocado, peanut butter. More carbs for energy.',
      recomp:      'Use: chicken breast, eggs, cottage cheese, Greek yogurt, sweet potato, white rice (around training), oats, broccoli, spinach. Balance protein and carbs.',
      performance: 'Use: chicken, salmon, eggs, white rice, pasta, oats, banana, sweet potato, olive oil. Carbs as primary fuel, high carb pre/post workout.',
      maintenance: 'Use: chicken, fish, eggs, lean beef, rice, potatoes, oats, olive oil, nuts, vegetables. Balanced variety.',
    };

    const supplementNote = supplements && supplements.filter((s: string) => s !== 'None').length > 0
      ? `Supplements to include in instructions: ${supplements.filter((s: string) => s !== 'None').join(', ')}`
      : '';

    const prompt = `Generate a meal plan as JSON only. No markdown, no text outside JSON.

Client: ${age}yr ${sex}, ${weightKg}kg, goal: ${goal}, diet: ${diet || 'Standard'}
Targets (training day): ${calories} kcal | P:${protein}g | C:${carbs}g | F:${fats}g
Targets (rest day): ${restCalories} kcal | P:${protein}g | C:${restCarbs}g | F:${restFats}g
Meals: ${numMeals} per day | Wake: ${wakeTime || '07:00'} | Sleep: ${sleepTime || '22:00'}
Training time: ${trainingTime || 'Morning'}, ${trainingDaysPerWeek || 4} days/week
Pre-workout meal: ${preWorkout ? 'yes' : 'no'} | Post-workout: ${postWorkout ? 'yes' : 'no'}
Avoid: ${allergies || 'none'}, ${dislikedFoods || 'none'}
Preferred: ${lovedFoods || 'any'}
Food guide: ${goalFoods[goal] || goalFoods.maintenance}
${supplementNote}

Return this exact JSON (fill in all numbers accurately):
{"training_day":{"meals":[{"id":"meal_1","name":"Breakfast","time":"8:00 AM","calories":0,"protein":0,"carbs":0,"fats":0,"instructions":"","why_this_meal":"","option_b":"","foods":[{"name":"","amount":0,"unit":"g","amount_household":"","prep_method":"","calories":0,"protein":0,"carbs":0,"fats":0}]}]},"rest_day":{"meals":[]},"hydration":{"daily_oz":80,"morning":"16 oz before eating","post_workout":"24 oz after training","electrolytes":"Add electrolytes on hard training days"},"coach_notes":{"why_these_calories":"","key_priorities":"","first_2_weeks":""},"client_notes":"","shopping_list":[],"macro_flexibility_rules":["Hit protein first","Adjust carbs/fats as needed"],"weekly_overview":{"training_days":${trainingDaysPerWeek || 4},"rest_days":${7 - (trainingDaysPerWeek || 4)},"avg_daily_calories":${Math.round((Number(calories) * (trainingDaysPerWeek || 4) + restCalories * (7 - (trainingDaysPerWeek || 4))) / 7)},"weekly_protein_target":${Number(protein) * 7},"estimated_weekly_cost_usd":75}}

Rules:
- ${numMeals} meals in training_day.meals, ${numMeals} meals in rest_day.meals
- Each food: amount is grams (number), amount_household is "1 cup / 4 oz" style string
- Food macros must sum to meal totals; meal totals must sum to daily targets ±5%
- Real food names only (e.g. "Chicken Breast", "White Rice cooked", "Broccoli")
- Keep each meal's foods list to 3-4 items max to stay within token limit`;

    const llm = await invokeClaude({ prompt, maxTokens: 8192, expectJson: true });
    if (!llm.ok) return jsonResponse({ error: llm.error }, llm.status ?? 500);
    const parsed = llm.parsed;

    if (!parsed || !parsed.training_day) {
      return jsonResponse({ error: 'AI returned an invalid meal plan structure' }, 500);
    }

    // Deterministic allergen check across both day plans (B-SAFETY). Prompting
    // ("Avoid: ...") is not sufficient for a health-safety constraint.
    const allergenViolations = findAllergenViolations(
      [...collectFoodNames(parsed.training_day), ...collectFoodNames(parsed.rest_day)],
      allergies,
    );
    if (allergenViolations.length) {
      return jsonResponse({ error: 'allergen_violation', violations: allergenViolations }, 422);
    }

    const trainingMeals = parsed.training_day?.meals || [];
    const restMeals = parsed.rest_day?.meals || [];
    console.log(`Generated ${trainingMeals.length} training meals, ${restMeals.length} rest meals`);

    // Append the standard supplement protocol to every generated plan (verbatim)
    const defaultSupplements = [
      { name: 'Multivitamin',           dosage: '1 serving',        timing: 'Morning', purpose: 'Micronutrient insurance' },
      { name: 'Vitamin D3',             dosage: '2,000–5,000 IU',   timing: 'Morning', purpose: 'Testosterone, immunity, bone health' },
      { name: 'Omega-3 Fish Oil',       dosage: '2–3g EPA+DHA',     timing: 'Morning', purpose: 'Inflammation, joints, recovery' },
      { name: 'Creatine Monohydrate',   dosage: '5g daily',         timing: 'Morning', purpose: 'Strength, power, muscle retention' },
      { name: 'Vitamin C',              dosage: '500–1,000mg',      timing: 'Morning', purpose: 'Immune support, collagen synthesis' },
      { name: 'Magnesium Glycinate',    dosage: '200–400mg',        timing: 'Night',   purpose: 'Sleep, muscle recovery, stress' },
      { name: 'Zinc',                   dosage: '15–30mg',          timing: 'Night',   purpose: 'Testosterone, immune health, protein synthesis' },
      { name: 'Ashwagandha KSM-66',     dosage: '300–600mg',        timing: 'Night',   purpose: 'Cortisol, sleep quality, testosterone' },
    ];
    parsed.supplements = defaultSupplements;

    return jsonResponse({ meals: trainingMeals, plan: parsed });
  } catch (error) {
    console.error('generateMealPlan error:', error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
