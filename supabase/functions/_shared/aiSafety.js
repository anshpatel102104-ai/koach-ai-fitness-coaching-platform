// Deterministic AI-output safety validators (B-SAFETY).
//
// Health-safety constraints (allergens, injury contraindications) must NOT be
// enforced by prompting alone — models comply inconsistently. These functions
// run AFTER generation, in code, so unsafe output is rejected before it is
// returned or persisted. They are intentionally conservative: they over-flag
// rather than let an allergen/contraindicated movement through.

/** Split a free-text "peanuts, shellfish; dairy" list into normalized terms. */
export function parseTermList(text) {
  if (Array.isArray(text)) text = text.join(',');
  if (!text || typeof text !== 'string') return [];
  return text
    .toLowerCase()
    .split(/[,;\n/]+/)
    .map((t) => t.trim())
    .filter((t) => t && t !== 'none' && t !== 'n/a' && t !== 'na');
}

// Common allergen → member/synonym foods, so "shellfish" catches "shrimp" etc.
const ALLERGEN_SYNONYMS = {
  peanut: ['peanut', 'peanuts', 'groundnut', 'arachis'],
  'tree nut': ['almond', 'cashew', 'walnut', 'pecan', 'pistachio', 'hazelnut', 'macadamia', 'brazil nut', 'pine nut'],
  nut: ['almond', 'cashew', 'walnut', 'pecan', 'pistachio', 'hazelnut', 'macadamia', 'peanut'],
  shellfish: ['shrimp', 'prawn', 'crab', 'lobster', 'crawfish', 'crayfish', 'scallop', 'clam', 'mussel', 'oyster', 'squid', 'calamari'],
  crustacean: ['shrimp', 'prawn', 'crab', 'lobster', 'crawfish', 'crayfish'],
  fish: ['salmon', 'tuna', 'cod', 'tilapia', 'halibut', 'trout', 'sardine', 'anchovy', 'mackerel', 'haddock', 'bass'],
  dairy: ['milk', 'cheese', 'butter', 'yogurt', 'yoghurt', 'cream', 'whey', 'casein', 'ghee', 'cottage cheese'],
  lactose: ['milk', 'cheese', 'cream', 'yogurt', 'whey'],
  egg: ['egg', 'eggs', 'albumen', 'mayonnaise', 'mayo'],
  soy: ['soy', 'soya', 'tofu', 'edamame', 'tempeh', 'miso'],
  gluten: ['wheat', 'barley', 'rye', 'bread', 'pasta', 'flour', 'couscous', 'seitan'],
  wheat: ['wheat', 'bread', 'pasta', 'flour', 'couscous'],
  sesame: ['sesame', 'tahini'],
};

/** Expand a client's allergy terms to concrete food terms to scan for. */
function expandAllergens(terms) {
  const out = new Set();
  for (const term of terms) {
    out.add(term);
    for (const [key, members] of Object.entries(ALLERGEN_SYNONYMS)) {
      if (term.includes(key) || key.includes(term)) members.forEach((m) => out.add(m));
    }
  }
  return [...out];
}

/** Recursively collect food names from any `foods: [{name|food_name}]` arrays. */
export function collectFoodNames(node, acc = []) {
  if (!node || typeof node !== 'object') return acc;
  if (Array.isArray(node)) { node.forEach((n) => collectFoodNames(n, acc)); return acc; }
  for (const [key, val] of Object.entries(node)) {
    if (key === 'foods' && Array.isArray(val)) {
      for (const f of val) {
        const name = f?.food_name ?? f?.name;
        if (typeof name === 'string' && name.trim()) acc.push(name.trim());
      }
    } else if (val && typeof val === 'object') {
      collectFoodNames(val, acc);
    }
  }
  return acc;
}

/** Collect exercise names from a generated program (workouts[].exercises[].name). */
export function collectExerciseNames(program) {
  const out = [];
  for (const w of program?.workouts ?? []) {
    for (const ex of w?.exercises ?? []) {
      const name = ex?.name;
      if (typeof name === 'string' && name.trim()) out.push(name.trim());
    }
  }
  return out;
}

function matchesTerm(haystack, term) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  try { return new RegExp(`\\b${escaped}\\b`, 'i').test(haystack); }
  catch { return haystack.toLowerCase().includes(term); }
}

/**
 * Return [{ food, allergen }] for any generated food that matches an allergen
 * the client declared. Empty array = safe.
 */
export function findAllergenViolations(foodNames, allergyText) {
  const declared = parseTermList(allergyText);
  if (!declared.length) return [];
  const scanTerms = expandAllergens(declared);
  const violations = [];
  for (const food of foodNames) {
    for (const term of scanTerms) {
      if (matchesTerm(food, term)) { violations.push({ food, allergen: term }); break; }
    }
  }
  return violations;
}

/**
 * Return [{ exercise, avoid }] for any generated exercise that matches a
 * movement the client must avoid (injury contraindication). Empty = safe.
 */
export function findInjuryViolations(exerciseNames, avoidText) {
  const avoid = parseTermList(avoidText);
  if (!avoid.length) return [];
  const violations = [];
  for (const exercise of exerciseNames) {
    for (const term of avoid) {
      if (term.length < 3) continue;
      if (matchesTerm(exercise, term)) { violations.push({ exercise, avoid: term }); break; }
    }
  }
  return violations;
}
