/**
 * Small, pure helpers shared by the meal plan list and the plan detail view.
 * Everything here derives from the plan / client rows the screens already load.
 */

export const fmtInt = (n) => {
  const v = Number(n);
  if (!Number.isFinite(v) || v === 0) return '0';
  return Math.round(v).toLocaleString();
};

const num = (v) => Number(v) || 0;

/** Sum calories / macros across a list of foods. */
export function sumFoods(foods = []) {
  return (foods || []).reduce((acc, f) => ({
    calories: acc.calories + num(f.calories),
    protein:  acc.protein  + num(f.protein),
    carbs:    acc.carbs    + num(f.carbs),
    fats:     acc.fats     + num(f.fats ?? f.fat),
  }), { calories: 0, protein: 0, carbs: 0, fats: 0 });
}

/** Meal totals: prefer the foods, fall back to numbers stored on the meal. */
export function mealTotals(meal = {}) {
  const t = sumFoods(meal.foods);
  return {
    calories: t.calories || num(meal.calories),
    protein:  t.protein  || num(meal.protein),
    carbs:    t.carbs    || num(meal.carbs),
    fats:     t.fats     || num(meal.fats),
  };
}

export function dayTotals(meals = []) {
  return (meals || []).reduce((acc, m) => {
    const t = mealTotals(m);
    return {
      calories: acc.calories + t.calories,
      protein:  acc.protein  + t.protein,
      carbs:    acc.carbs    + t.carbs,
      fats:     acc.fats     + t.fats,
    };
  }, { calories: 0, protein: 0, carbs: 0, fats: 0 });
}

export const foodName = (f = {}) => f.food_name || f.name || f.item || '';

const GOAL_LABELS = {
  fat_loss: 'fat loss',
  weight_loss: 'fat loss',
  muscle_gain: 'muscle gain',
  performance: 'performance',
  maintenance: 'maintenance',
  strength: 'strength',
  endurance: 'endurance',
  flexibility: 'mobility',
  general_fitness: 'general fitness',
};

/** Goal as a lower-case phrase ("fat loss"), from the plan or its client. */
export function goalLabel(plan = {}, client) {
  const text = `${plan.title || ''} ${plan.description || ''}`.toLowerCase();
  const key = plan.goal
    || (text.includes('fat loss') ? 'fat_loss' : text.includes('muscle') ? 'muscle_gain' : null)
    || client?.goal;
  if (!key) return null;
  return GOAL_LABELS[key] || String(key).replace(/_/g, ' ');
}

/** Clients this plan belongs to: its client_id, anyone assigned to it, legacy assigned_clients. */
export function planClients(plan, clients = []) {
  if (!plan) return [];
  const ids = new Set([plan.client_id, ...(plan.assigned_clients || [])].filter(Boolean));
  return clients.filter(c => ids.has(c.id) || c.assigned_nutrition_id === plan.id);
}

/** One status per plan, in the order a coach cares about. */
export function planStatus(plan = {}) {
  if (plan.is_draft || plan.status === 'draft') return { key: 'draft', label: 'Draft', variant: 'warning' };
  if (plan.is_template || plan.status === 'template') return { key: 'template', label: 'Template', variant: 'secondary' };
  if (plan.status === 'inactive') return { key: 'inactive', label: 'Inactive', variant: 'outline' };
  return { key: 'active', label: 'Active', variant: 'success' };
}

/* ── Allergy check ──────────────────────────────────────────────────────────
   Allergies live in a few places depending on how the plan was made (AI
   generator details, coach notes, or a free-text field). We collect what we
   can find and check every food name against a keyword list per allergen. */

const ALLERGEN_KEYWORDS = {
  peanut:    ['peanut'],
  nut:       ['almond', 'walnut', 'cashew', 'pecan', 'pistachio', 'hazelnut', 'macadamia', 'peanut', 'nut butter', 'brazil nut', 'pine nut'],
  dairy:     ['milk', 'yogurt', 'yoghurt', 'cheese', 'whey', 'casein', 'butter', 'cream', 'ghee', 'kefir', 'cottage'],
  gluten:    ['bread', 'pasta', 'wheat', 'flour', 'tortilla', 'bagel', 'barley', 'rye', 'couscous', 'cracker', 'cereal', 'noodle', 'wrap', 'seitan'],
  egg:       ['egg'],
  soy:       ['soy', 'tofu', 'tempeh', 'edamame', 'miso'],
  shellfish: ['shrimp', 'prawn', 'crab', 'lobster', 'scallop', 'mussel', 'clam', 'oyster'],
  fish:      ['salmon', 'tuna', 'cod', 'tilapia', 'mackerel', 'sardine', 'trout', 'halibut', 'fish'],
  sesame:    ['sesame', 'tahini'],
};

function allergenKey(raw) {
  const s = String(raw || '').toLowerCase();
  if (!s || /^(none|no|n\/a)$/.test(s.trim())) return null;
  if (s.includes('peanut')) return 'peanut';
  if (s.includes('nut')) return 'nut';
  if (s.includes('dairy') || s.includes('lactose') || s.includes('milk')) return 'dairy';
  if (s.includes('gluten') || s.includes('wheat') || s.includes('celiac') || s.includes('coeliac')) return 'gluten';
  if (s.includes('egg')) return 'egg';
  if (s.includes('soy')) return 'soy';
  if (s.includes('shellfish') || s.includes('shrimp')) return 'shellfish';
  if (s.includes('fish')) return 'fish';
  if (s.includes('sesame')) return 'sesame';
  return null;
}

const ALLERGEN_LABEL = {
  peanut: 'peanuts', nut: 'tree nuts', dairy: 'dairy', gluten: 'gluten', egg: 'eggs',
  soy: 'soy', shellfish: 'shellfish', fish: 'fish', sesame: 'sesame',
};

function toList(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.flatMap(toList);
  if (typeof v === 'string') return v.split(/[,;/]/).map(s => s.trim()).filter(Boolean);
  return [];
}

// Pull "peanut-free", "peanut allergy", "allergic to shellfish" out of free text.
function allergensFromText(text) {
  const t = String(text || '').toLowerCase();
  if (!t) return [];
  const found = [];
  const patterns = [/([a-z]+)[\s_-]free\b/g, /([a-z]+) allerg/g, /allergic to ([a-z]+)/g];
  patterns.forEach(re => { let m; while ((m = re.exec(t))) found.push(m[1]); });
  return found;
}

export function planAllergies(plan = {}) {
  const notes = plan.coach_notes;
  const raw = [
    ...toList(plan.allergies),
    ...toList(plan.restrictions),
    ...toList(notes?.allergies),
    ...allergensFromText(plan.diet),
    ...allergensFromText(typeof notes === 'string' ? notes : notes?.text),
    ...allergensFromText(plan.description),
    ...allergensFromText(plan.title),
  ];
  const keys = [...new Set(raw.map(allergenKey).filter(Boolean))];
  return keys;
}

/**
 * Returns { allergens: ['peanut'], labels: ['peanuts'], conflicts: [{ food, meal, allergen }] }.
 * `meals` should include every day type on the plan.
 */
export function allergyCheck(plan = {}, meals = []) {
  const allergens = planAllergies(plan);
  const conflicts = [];
  allergens.forEach(a => {
    const words = ALLERGEN_KEYWORDS[a] || [];
    (meals || []).forEach((meal, mi) => {
      (meal.foods || []).forEach(f => {
        const name = foodName(f);
        const lower = name.toLowerCase();
        // "Peanut-free", "dairy free" etc. are fine.
        if (/free\b/.test(lower)) return;
        if (words.some(w => lower.includes(w))) {
          conflicts.push({ food: name, meal: meal.name || meal.meal_name || `Meal ${mi + 1}`, allergen: ALLERGEN_LABEL[a] });
        }
      });
    });
  });
  return { allergens, labels: allergens.map(a => ALLERGEN_LABEL[a]), conflicts };
}

export function joinWords(list = []) {
  if (list.length <= 1) return list[0] || '';
  return `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`;
}

export const firstName = (name = '') => String(name).trim().split(/\s+/)[0] || '';

/** "1:00 PM" -> "13:00", "7:30am" -> "7:30"; anything else passes through. */
export function displayTime(t) {
  if (!t) return '';
  const m = String(t).trim().match(/^(\d{1,2})(?::(\d{2}))?\s*([ap])\.?m\.?$/i);
  if (!m) return String(t);
  let h = Number(m[1]) % 12;
  if (m[3].toLowerCase() === 'p') h += 12;
  return `${h}:${m[2] || '00'}`;
}
