import React, { useMemo } from 'react';
import { Panel } from '@/components/kit';

const STATIC_FOOD_SWAPS = {
  Proteins: [
    { from: 'Chicken Breast (100g)', to: ['Turkey Breast', 'Tilapia Fillet', 'Egg Whites (3 large)', 'Greek Yogurt (150g)'], macros: { cal: 165, p: 31, c: 0, f: 3.6 }, swapMacros: [{ cal: 157, p: 30, c: 0, f: 3.2 }, { cal: 96, p: 20, c: 0, f: 2 }, { cal: 51, p: 11, c: 0.4, f: 0.2 }, { cal: 130, p: 17, c: 7, f: 3.5 }] },
    { from: 'Lean Ground Beef (100g)', to: ['Ground Turkey', 'Bison', 'Tempeh (100g)'], macros: { cal: 215, p: 26, c: 0, f: 12 }, swapMacros: [{ cal: 170, p: 22, c: 0, f: 9 }, { cal: 109, p: 20, c: 0, f: 2.4 }, { cal: 195, p: 20, c: 8, f: 10 }] },
  ],
  Carbs: [
    { from: 'White Rice (100g cooked)', to: ['Sweet Potato (100g)', 'Oats (80g dry)', 'Quinoa (100g cooked)'], macros: { cal: 130, p: 2.7, c: 28, f: 0.3 }, swapMacros: [{ cal: 86, p: 1.6, c: 20, f: 0.1 }, { cal: 303, p: 11, c: 52, f: 5.5 }, { cal: 120, p: 4.4, c: 21, f: 1.9 }] },
    { from: 'White Bread (2 slices)', to: ['Ezekiel Bread', 'Corn Tortilla (2)', 'Rice Cakes (3)'], macros: { cal: 160, p: 5, c: 30, f: 2 }, swapMacros: [{ cal: 160, p: 8, c: 28, f: 1 }, { cal: 110, p: 2.5, c: 23, f: 1.2 }, { cal: 105, p: 2, c: 23, f: 0.7 }] },
  ],
  Fats: [
    { from: 'Almonds (30g)', to: ['Walnuts (30g)', 'Avocado (50g)', 'Olive Oil (1 tbsp)'], macros: { cal: 174, p: 6, c: 6, f: 15 }, swapMacros: [{ cal: 196, p: 4.6, c: 4, f: 19 }, { cal: 80, p: 1, c: 4, f: 7.3 }, { cal: 119, p: 0, c: 0, f: 13.5 }] },
  ],
  Vegetables: [
    { from: 'Broccoli (100g)', to: ['Spinach (100g)', 'Asparagus (100g)', 'Zucchini (100g)'], macros: { cal: 34, p: 2.8, c: 7, f: 0.4 }, swapMacros: [{ cal: 23, p: 2.9, c: 3.6, f: 0.4 }, { cal: 20, p: 2.2, c: 3.9, f: 0.1 }, { cal: 17, p: 1.2, c: 3.1, f: 0.3 }] },
  ],
};

// Per-food swap suggestions for dynamic mode
const DYNAMIC_SWAPS = {
  chicken: ['Turkey breast', 'Tilapia fillet', 'Egg whites (3 large)', 'Greek yogurt (150g)'],
  turkey: ['Chicken breast', 'Lean ground beef', 'Tempeh (100g)'],
  beef: ['Lean ground turkey', 'Bison patty', 'Tofu (firm, 200g)'],
  salmon: ['Mackerel', 'Sardines', 'Tilapia + omega-3 supplement'],
  tuna: ['Salmon', 'Sardines', 'Chicken breast (100g)'],
  egg: ['Egg whites', 'Greek yogurt', 'Cottage cheese (100g)'],
  rice: ['Sweet potato (150g)', 'Oats (80g dry)', 'Quinoa (cooked 150g)'],
  oat: ['Cream of rice', 'Quinoa flakes', 'Buckwheat groats'],
  potato: ['White rice', 'Quinoa', 'Butternut squash'],
  bread: ['Ezekiel bread', 'Corn tortilla', 'Rice cakes'],
  pasta: ['Zucchini noodles', 'Shirataki noodles', 'Brown rice pasta'],
  almond: ['Walnuts (30g)', 'Avocado (50g)', 'Peanut butter (1 tbsp)'],
  avocado: ['Olive oil (1 tbsp)', 'Almonds (30g)', 'Sunflower seeds'],
  broccoli: ['Spinach', 'Asparagus', 'Zucchini'],
  spinach: ['Kale', 'Arugula', 'Swiss chard'],
};

function categorizeFood(name) {
  const n = (name || '').toLowerCase();
  if (n.match(/chicken|beef|turkey|fish|salmon|tuna|egg|protein|shrimp|pork|lamb|tempeh|tofu/)) return 'Proteins';
  if (n.match(/rice|oat|bread|pasta|potato|quinoa|tortilla|corn|grain/)) return 'Carbs';
  if (n.match(/broccoli|spinach|kale|asparagus|zucchini|pepper|onion|lettuce|tomato|vegetable/)) return 'Vegetables';
  if (n.match(/almond|walnut|avocado|olive oil|peanut|butter|oil|nut|fat|seed/)) return 'Fats';
  return 'Other';
}

function getSwapsForFood(name) {
  const lower = (name || '').toLowerCase();
  for (const [key, swaps] of Object.entries(DYNAMIC_SWAPS)) {
    if (lower.includes(key)) return swaps;
  }
  return null;
}

const CATEGORY_LABEL = { Proteins: 'Protein', Carbs: 'Carbs', Fats: 'Fats', Vegetables: 'Vegetables', Other: 'Everything else' };
const CATEGORY_ORDER = ['Proteins', 'Carbs', 'Fats', 'Vegetables', 'Other'];

function macroLine({ cal, p, c, f }) {
  return `${cal} kcal · ${p} g P · ${c} g C · ${f} g F`;
}

function SwapRow({ name, detail, swaps }) {
  return (
    <li className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] gap-1 sm:gap-6 py-3.5 border-b border-border last:border-b-0">
      <div className="min-w-0">
        <p className="text-[15px] font-semibold text-foreground">{name}</p>
        {detail && <p className="text-[13px] text-muted-foreground tabular-nums">{detail}</p>}
      </div>
      <div className="min-w-0">
        {swaps ? (
          <ul>
            {swaps.map((s, i) => (
              <li key={i} className="flex items-baseline justify-between gap-3 text-[15px] text-foreground/90">
                <span>{typeof s === 'string' ? s : s.name}</span>
                {typeof s !== 'string' && s.macros && <span className="text-[13px] text-muted-foreground tabular-nums whitespace-nowrap">{macroLine(s.macros)}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No standard swap. Pick something with similar macros.</p>
        )}
      </div>
    </li>
  );
}

function Group({ title, children }) {
  return (
    <div>
      <p className="text-[13px] text-muted-foreground px-5 sm:px-6 pt-4">{title}</p>
      <ul className="px-5 sm:px-6">{children}</ul>
    </div>
  );
}

/** "Swaps" view: each food on the plan with what it can be traded for. */
export default function AlternativesTab({ plan }) {
  // Extract unique foods from plan meals
  const planFoods = useMemo(() => {
    if (!plan?.meals?.length) return [];
    const seen = new Set();
    const foods = [];
    plan.meals.forEach(m => {
      (m.foods || []).forEach(f => {
        const name = f.food_name ?? f.name ?? '';
        if (name && !seen.has(name.toLowerCase())) {
          seen.add(name.toLowerCase());
          foods.push({ name, calories: f.calories ?? 0, protein: f.protein ?? 0, carbs: f.carbs ?? 0, fats: f.fats ?? 0, portion: f.portion ?? f.amount ?? '' });
        }
      });
    });
    return foods;
  }, [plan]);

  if (planFoods.length > 0) {
    const grouped = {};
    planFoods.forEach(food => {
      const cat = categorizeFood(food.name);
      (grouped[cat] = grouped[cat] || []).push(food);
    });

    return (
      <Panel className="pb-2">
        <div className="px-5 sm:px-6 pt-5">
          <h2 className="text-[22px] text-foreground">Swaps</h2>
          <p className="text-sm text-muted-foreground mt-1">Every food on this plan and what it can be traded for.</p>
        </div>
        {CATEGORY_ORDER.filter(c => grouped[c]).map(category => (
          <Group key={category} title={CATEGORY_LABEL[category]}>
            {grouped[category].map((food, fi) => (
              <SwapRow
                key={fi}
                name={food.name}
                detail={[food.portion, (food.calories > 0 || food.protein > 0) ? macroLine({ cal: food.calories, p: food.protein, c: food.carbs, f: food.fats }) : null].filter(Boolean).join(' · ')}
                swaps={getSwapsForFood(food.name)}
              />
            ))}
          </Group>
        ))}
      </Panel>
    );
  }

  // No foods yet: a general swap guide.
  return (
    <Panel className="pb-2">
      <div className="px-5 sm:px-6 pt-5">
        <h2 className="text-[22px] text-foreground">Swap guide</h2>
        <p className="text-sm text-muted-foreground mt-1">General swaps. Add foods to the meals to see swaps for this plan.</p>
      </div>
      {Object.entries(STATIC_FOOD_SWAPS).map(([category, swaps]) => (
        <Group key={category} title={CATEGORY_LABEL[category] || category}>
          {swaps.map((swap, si) => (
            <SwapRow
              key={si}
              name={swap.from}
              detail={macroLine(swap.macros)}
              swaps={swap.to.map((name, ai) => ({ name, macros: swap.swapMacros[ai] }))}
            />
          ))}
        </Group>
      ))}
    </Panel>
  );
}
