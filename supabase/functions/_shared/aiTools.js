/**
 * Tool (structured-output) schemas for the JSON-returning AI actions.
 *
 * invokeClaude({ tool }) makes the model return these as a schema-shaped
 * object (no prose / code fences / invalid JSON, nested string-encoded values
 * coerced back) instead of free text that is regex-parsed. Response shapes are
 * IDENTICAL to what the prompts previously asked for, so callers/frontends are
 * unchanged. Used together with TOOL_SYSTEM.
 */
const str = { type: 'string' };
const num = { type: 'number' };
const nnum = { type: ['number', 'null'] };
const strs = { type: 'array', items: str };
const obj = (properties, required = Object.keys(properties)) => ({ type: 'object', properties, required });
const tool = (name, description, properties, required) => ({ name, description, input_schema: obj(properties, required) });

export const TOOL_SYSTEM = 'Respond only by calling the provided tool with the requested data. Do not write any other text.';

// ── aiBusinessInsights ──
export const INTERVENTION_PLAN = tool('submit_intervention_plan', 'Submit the intervention plan.', {
  immediate_action: str, message_script: str, program_adjustment: str, follow_up_timeline: str, followup: str,
});
export const BUSINESS_INSIGHTS = tool('submit_business_insights', 'Submit the business insights.', {
  insights: { type: 'array', items: obj({ category: str, headline: str, body: str, action: str, impact: str }) },
});
export const CLIENT_ALERTS = tool('submit_client_alerts', 'Submit up to 5 client alerts.', {
  alerts: { type: 'array', items: obj({ client_name: str, alert_type: str, message: str, severity: { type: 'string', enum: ['high', 'medium', 'low'] } }) },
});

// ── aiCheckInInsights ──
export const REVIEW_CHECKIN = tool('submit_checkin_review', 'Submit the check-in review.', {
  summary: str, suggested_response: str, flags: strs,
});
export const PROGRAM_SUGGESTIONS = tool('submit_program_suggestions', 'Submit program adjustment suggestions.', {
  suggestions: {
    type: 'array',
    items: obj({
      title: str, rationale: str,
      category: { type: 'string', enum: ['calories', 'cardio', 'intensity', 'nutrition', 'recovery'] },
      impact: { type: 'string', enum: ['high', 'medium', 'low'] },
      action_type: { type: 'string', enum: ['increase_calories', 'decrease_calories', 'increase_cardio', 'decrease_cardio', 'increase_intensity', 'decrease_intensity', 'add_rest_day', 'adjust_macros', 'other'] },
      action_value: nnum,
    }),
  },
});

// ── aiNutritionInsights ──
export const FOOD_SWAPS = tool('submit_food_swaps', 'Submit exactly 3 food swaps.', {
  swaps: { type: 'array', items: obj({ name: str, portion: str, note: str }) },
});

// ── aiProgressInsights ──
export const CHECKIN_SUMMARY = tool('submit_checkin_summary', 'Submit the check-in summary.', {
  summary: str, week_vs_prev: str, coaching_focus: str,
  sentiment: { type: 'string', enum: ['great', 'good', 'okay', 'concerning'] },
  key_wins: strs, red_flags: strs,
});
export const PROGRESS_CLIENT = tool('submit_client_progress', 'Submit the client-facing progress insights.', {
  headline: str, summary: str, insights: strs, prediction: str, tip: str,
});
export const PROGRESS_COACH = tool('submit_coach_progress', 'Submit the coach progress analysis.', {
  summary: str, coaching_priority: str,
  trends: { type: 'array', items: obj({ type: { type: 'string', enum: ['positive', 'negative', 'neutral'] }, text: str }) },
  pace_analysis: str, recommendations: strs,
  readiness: { type: 'string', enum: ['progress', 'maintain', 'deload', 'switch_program'] },
  readiness_reason: str, churn_insight: str, plateau_warning: str,
});

// ── aiInBodyScan ── (every metric nullable: "null for any field not visible")
const INBODY_NUMERIC = [
  'weight_lbs', 'weight_kg', 'body_fat_percent', 'fat_mass_lbs', 'lean_mass_lbs', 'muscle_mass_lbs', 'bmi', 'bmr',
  'visceral_fat_level', 'total_body_water', 'protein_kg', 'minerals_kg', 'right_arm_muscle', 'left_arm_muscle',
  'trunk_muscle', 'right_leg_muscle', 'left_leg_muscle', 'right_arm_fat', 'left_arm_fat', 'trunk_fat',
  'right_leg_fat', 'left_leg_fat', 'inbody_score',
];
export const INBODY_SCAN = tool('submit_inbody_scan', 'Submit the metrics extracted from the InBody scan (null when not visible).', {
  scan_date: { type: ['string', 'null'] },
  ...Object.fromEntries(INBODY_NUMERIC.map((k) => [k, nnum])),
  raw_text: str,
});

// ── generateSmartMeals ──
const FOOD_OPT = obj({ food_name: str, portion: str, calories: num, protein: num, carbs: num, fats: num });
const MEAL_OPTS = obj({ meal_name: str, time: str, options: { type: 'array', items: obj({ label: str, foods: { type: 'array', items: FOOD_OPT } }) } });
export const SMART_MEALS_BATCH = tool('submit_meals', 'Submit the generated meals.', { meals: { type: 'array', items: MEAL_OPTS } });
export const SMART_MEAL_SINGLE = {
  name: 'submit_meal', description: 'Submit the regenerated meal.', input_schema: MEAL_OPTS,
};

// ── generateExerciseLibrary ──
export const EXERCISE_LIBRARY = tool('submit_exercises', 'Submit the exercise library entries.', {
  exercises: {
    type: 'array',
    items: obj({
      name: str,
      muscle_group: { type: 'string', enum: ['legs', 'back', 'chest', 'shoulders', 'biceps', 'triceps', 'core', 'cardio', 'full_body'] },
      secondary_muscles: strs,
      equipment: { type: 'string', enum: ['barbell', 'dumbbell', 'cable', 'machine', 'bodyweight', 'kettlebell', 'resistance_band', 'trx', 'other'] },
      movement_pattern: { type: 'string', enum: ['push', 'pull', 'hinge', 'squat', 'carry', 'rotation', 'isometric', 'cardio'] },
      difficulty: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
      description: str, form_cues: strs, common_mistakes: strs, video_url: str, thumbnail_url: str, default_rest_seconds: num,
    }),
  },
});
