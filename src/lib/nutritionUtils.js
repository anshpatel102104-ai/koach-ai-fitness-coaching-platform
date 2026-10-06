// ── Nutrition utility helpers shared across coach + portal ─────────────────

export const MEAL_DEFINITIONS = [
  { id: 'breakfast',    name: 'Breakfast',    time: '7:00 AM',  targetCal: 400 },
  { id: 'lunch',        name: 'Lunch',        time: '12:30 PM', targetCal: 600 },
  { id: 'dinner',       name: 'Dinner',       time: '6:30 PM',  targetCal: 700 },
  { id: 'snacks',       name: 'Snacks',       time: 'Anytime',  targetCal: 200 },
  { id: 'pre_workout',  name: 'Pre-workout',  time: 'Pre',      targetCal: 200 },
  { id: 'post_workout', name: 'Post-workout', time: 'Post',     targetCal: 300 },
];

export const UNIT_MULTIPLIERS = {
  g:       1,
  oz:      28.35,
  cup:     240,
  tbsp:    15,
  tsp:     5,
  piece:   100,
  serving: 100,
};

export function gramsFromServing(qty, unit) {
  return qty * (UNIT_MULTIPLIERS[unit] || 100);
}

export function scaleMacros(food, grams) {
  const scale = grams / 100;
  return {
    calories: Math.round((food.calories || 0) * scale),
    protein:  Math.round((food.protein  || 0) * scale * 10) / 10,
    carbs:    Math.round((food.carbs    || 0) * scale * 10) / 10,
    fats:     Math.round((food.fats     || 0) * scale * 10) / 10,
    fiber:    Math.round((food.fiber    || 0) * scale * 10) / 10,
    sugar:    Math.round((food.sugar    || 0) * scale * 10) / 10,
    sodium:   Math.round((food.sodium   || 0) * scale),
  };
}

export function calcDayTotals(foodLogs) {
  return foodLogs.reduce((acc, f) => ({
    calories: acc.calories + (f.calories || 0),
    protein:  acc.protein  + (f.protein  || 0),
    carbs:    acc.carbs    + (f.carbs    || 0),
    fats:     acc.fats     + (f.fats     || 0),
    fiber:    acc.fiber    + (f.fiber    || 0),
  }), { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 });
}

// `label` values are compared by callers (e.g. 'Over Target') — keep them stable.
export function getMealStatus(loggedCal, targetCal) {
  const pct = targetCal > 0 ? (loggedCal / targetCal) * 100 : 0;
  if (pct === 0)   return { color: 'rgb(var(--border))',      label: 'Not Started', badge: 'bg-secondary text-muted-foreground' };
  if (pct > 110)   return { color: 'rgb(var(--destructive))', label: 'Over Target', badge: 'bg-destructive/10 text-destructive' };
  if (pct >= 80)   return { color: 'rgb(var(--success))',     label: 'Complete',    badge: 'bg-success-soft text-success' };
  if (pct >= 40)   return { color: 'rgb(var(--partial))',     label: 'In Progress', badge: 'bg-warning-soft text-warning' };
  return { color: 'rgb(var(--muted-foreground))', label: 'Started', badge: 'bg-secondary text-foreground' };
}

export function getMacroColor(pct) {
  if (pct > 110) return 'rgb(var(--destructive))';
  if (pct >= 80) return 'rgb(var(--success))';
  if (pct >= 50) return 'rgb(var(--partial))';
  return 'rgb(var(--muted-foreground))';
}

// Local search cache — last 50 queries
const CACHE_KEY = 'usda_search_cache_v2';
export function readSearchCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch { return {}; }
}
export function writeSearchCache(key, value) {
  const cache = readSearchCache();
  const keys = Object.keys(cache);
  if (keys.length >= 50) delete cache[keys[0]];
  cache[key] = value;
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch {}
}

// Recent foods log — last 10 unique
const RECENT_KEY = 'nutrition_recent_foods';
export function getRecentFoods() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
}
export function addRecentFood(food) {
  const current = getRecentFoods();
  const filtered = current.filter(f => f.id !== food.id && f.name !== food.name);
  const updated = [food, ...filtered].slice(0, 10);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(updated)); } catch {}
}