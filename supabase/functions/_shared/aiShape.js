/**
 * Strict shape checks run AFTER the lenient JSON repair / schema coercion.
 * A repaired value can be well-formed JSON yet incomplete (a missing day, a meal
 * without foods, an exercise without sets). These return a list of problems;
 * callers reject (never save or return) when the list is non-empty.
 */
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isStr = (v) => typeof v === 'string' && v.trim().length > 0;

function checkMeal(meal, where, problems) {
  if (!meal || typeof meal !== 'object') { problems.push(`${where}: not an object`); return; }
  if (!isStr(meal.name)) problems.push(`${where}: missing name`);
  for (const k of ['calories', 'protein', 'carbs', 'fats']) {
    if (!isNum(meal[k]) || meal[k] < 0) problems.push(`${where}: missing/invalid ${k}`);
  }
  if (isNum(meal.calories) && meal.calories <= 0) problems.push(`${where}: calories must be > 0`);
  if (!Array.isArray(meal.foods) || meal.foods.length === 0) { problems.push(`${where}: no foods`); return; }
  meal.foods.forEach((f, i) => {
    const w = `${where}.foods[${i}]`;
    if (!f || !isStr(f.name)) problems.push(`${w}: missing name`);
    for (const k of ['calories', 'protein', 'carbs', 'fats']) {
      if (!f || !isNum(f[k]) || f[k] < 0) problems.push(`${w}: missing/invalid ${k}`);
    }
  });
}

/** plan = { training_day:{meals}, rest_day:{meals} }; returns string[] of problems. */
export function validateMealPlan(plan, { numMeals, calories, restCalories, tolerance = 0.2 } = {}) {
  const problems = [];
  for (const [key, target] of [['training_day', calories], ['rest_day', restCalories]]) {
    const meals = plan?.[key]?.meals;
    if (!Array.isArray(meals) || meals.length === 0) { problems.push(`${key}: no meals`); continue; }
    if (numMeals && meals.length !== numMeals) problems.push(`${key}: expected ${numMeals} meals, got ${meals.length}`);
    meals.forEach((m, i) => checkMeal(m, `${key}.meals[${i}]`, problems));
    if (target && meals.every((m) => isNum(m?.calories))) {
      const sum = meals.reduce((s, m) => s + m.calories, 0);
      if (Math.abs(sum - target) > target * tolerance) problems.push(`${key}: meals total ${Math.round(sum)} kcal vs target ${Math.round(target)} (±${tolerance * 100}%)`);
    }
  }
  return problems;
}

/** program = { title, workouts:[{day_name, exercises:[{name,sets,reps}]}] }; returns string[]. */
export function validateProgram(program, { daysPerWeek } = {}) {
  const problems = [];
  if (!isStr(program?.title)) problems.push('missing title');
  const workouts = program?.workouts;
  if (!Array.isArray(workouts) || workouts.length === 0) return [...problems, 'no workouts'];
  if (daysPerWeek && workouts.length !== daysPerWeek) problems.push(`expected ${daysPerWeek} training days, got ${workouts.length}`);
  workouts.forEach((w, i) => {
    const where = `workouts[${i}]`;
    if (!isStr(w?.day_name)) problems.push(`${where}: missing day_name`);
    const ex = w?.exercises;
    if (!Array.isArray(ex) || ex.length === 0) { problems.push(`${where}: no exercises`); return; }
    ex.forEach((e, j) => {
      const x = `${where}.exercises[${j}]`;
      if (!isStr(e?.name)) problems.push(`${x}: missing name`);
      if (!isNum(e?.sets) || e.sets <= 0) problems.push(`${x}: missing/invalid sets`);
      if (!isStr(e?.reps) && !(isNum(e?.reps) && e.reps > 0)) problems.push(`${x}: missing reps`);
    });
  });
  return problems;
}
