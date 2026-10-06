import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Panel, EmptyState } from '@/components/kit';
import { SignedImg } from '@/components/shared/SignedImage';
import { cn } from '@/lib/utils';
import { fmtInt, mealTotals, dayTotals, foodName, displayTime } from '../planUtils';

const SWAP_SUGGESTIONS = {
  chicken: ['Turkey breast (same macros)', 'Tilapia fillet', 'Egg whites (3 large)'],
  rice: ['Sweet potato (150g)', 'Oats (80g dry)', 'Quinoa (cooked 150g)'],
  almonds: ['Walnuts (same weight)', 'Avocado (50g)', 'Peanut butter (1 tbsp)'],
  beef: ['Lean ground turkey', 'Bison patty', 'Tofu (firm, 200g)'],
  salmon: ['Mackerel', 'Sardines', 'Tilapia + omega-3 supplement'],
};

function getSwaps(name) {
  const lower = (name || '').toLowerCase();
  for (const [key, swaps] of Object.entries(SWAP_SUGGESTIONS)) {
    if (lower.includes(key)) return swaps;
  }
  return null;
}

// Slot label under the time: explicit type, else inferred from the clock.
function slotFor(meal, index, title) {
  if (meal.meal_type || meal.slot) return meal.meal_type || meal.slot;
  if (/breakfast|lunch|dinner|supper|snack|workout/i.test(title)) return `Meal ${index + 1}`;
  const hhmm = displayTime(meal.time).match(/^(\d{1,2}):(\d{2})$/);
  if (!hhmm) return `Meal ${index + 1}`;
  const h = Number(hhmm[1]) + Number(hhmm[2]) / 60;
  if (h >= 4 && h < 10.5) return 'Breakfast';
  if (h >= 11.5 && h < 14.5) return 'Lunch';
  if (h >= 17.5 && h < 21.5) return 'Dinner';
  return 'Snack';
}

function portionOf(food) {
  return food.amount_household || food.portion || (food.amount_grams ? `${food.amount_grams}g` : '') || food.amount || '';
}

/* ── Calorie headline + stacked macro bar ─────────────────────────────────── */

/**
 * "1,850 calories, 400 under maintenance" with an ink / grey stacked macro bar.
 * `meals` are the meals for the selected day type; their totals show when they
 * drift from the plan target.
 */
export function CalorieSummary({ plan, meals = [] }) {
  const isHabits = plan.tracking_mode === 'habits';
  const totals = dayTotals(meals);
  const calories = Number(plan.calories) || totals.calories;
  const protein = Number(plan.protein_g) || totals.protein;
  const carbs = Number(plan.carbs_g) || totals.carbs;
  const fats = Number(plan.fats_g) || totals.fats;

  if (isHabits) {
    return (
      <Panel className="px-5 py-5 sm:px-6 sm:py-6 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-10">
        <div className="sm:w-[180px] flex-shrink-0">
          <p className="num text-[44px] sm:text-[52px] leading-none text-foreground">{meals.length}</p>
          <p className="text-sm text-muted-foreground mt-1">habit{meals.length === 1 ? '' : 's'}, no calorie target</p>
        </div>
        <p className="text-[15px] text-foreground/80 max-w-xl">
          {plan.description || 'This plan coaches habits instead of numbers. Clients check off each habit instead of logging macros.'}
        </p>
      </Panel>
    );
  }

  const maintenance = Number(plan.tdee) || null;
  const deficit = Number(plan.daily_deficit) || (maintenance && calories ? maintenance - calories : null);
  let caption = 'calories a day';
  if (deficit && Math.round(deficit) > 0) caption = `calories, ${fmtInt(deficit)} under maintenance`;
  else if (deficit && Math.round(deficit) < 0) caption = `calories, ${fmtInt(-deficit)} over maintenance`;
  else if (maintenance && calories) caption = 'calories, at maintenance';

  const kcalP = protein * 4, kcalC = carbs * 4, kcalF = fats * 9;
  const kcalSum = kcalP + kcalC + kcalF;
  const pct = (v) => (kcalSum ? (v / kcalSum) * 100 : 0);
  const driftKcal = totals.calories && calories ? totals.calories - calories : 0;
  const showDrift = Math.abs(driftKcal) >= 50;

  const legend = [
    { key: 'protein', grams: protein, label: 'protein', swatch: 'bg-foreground' },
    { key: 'carbs', grams: carbs, label: 'carbs', swatch: 'bg-muted-foreground/70' },
    { key: 'fat', grams: fats, label: 'fat', swatch: 'bg-input' },
  ];

  return (
    <Panel className="px-5 py-5 sm:px-6 sm:py-6 flex flex-col md:flex-row md:items-center gap-5 md:gap-10">
      <div className="md:w-[180px] flex-shrink-0">
        <p className="num text-[44px] sm:text-[52px] leading-none text-foreground">{calories ? fmtInt(calories) : '—'}</p>
        <p className="text-sm text-muted-foreground mt-1.5 leading-snug">{calories ? caption : 'No calorie target set'}</p>
      </div>

      <div className="flex-1 min-w-0">
        {kcalSum > 0 ? (
          <>
            <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-secondary" role="img" aria-label={`${fmtInt(protein)} g protein, ${fmtInt(carbs)} g carbs, ${fmtInt(fats)} g fat`}>
              <span className="h-full bg-foreground" style={{ width: `${pct(kcalP)}%` }} />
              <span className="h-full bg-muted-foreground/70" style={{ width: `${pct(kcalC)}%` }} />
              <span className="h-full bg-input" style={{ width: `${pct(kcalF)}%` }} />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {legend.map(l => (
                <div key={l.key} className="min-w-0 sm:flex sm:items-baseline sm:gap-2">
                  <span className="flex items-baseline gap-2">
                    <span className={cn('h-2.5 w-2.5 rounded-[2px] flex-shrink-0 self-center', l.swatch)} />
                    <span className="num text-[24px] sm:text-[26px] leading-none text-foreground whitespace-nowrap">{fmtInt(l.grams)} g</span>
                  </span>
                  <span className="block pl-[18px] sm:pl-0 text-[13px] text-muted-foreground">{l.label}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No macro targets yet. Edit the plan to set protein, carbs and fat.</p>
        )}
        {showDrift && (
          <p className="text-[13px] text-muted-foreground mt-3">
            The meals below add up to <span className="font-semibold text-foreground tabular-nums">{fmtInt(totals.calories)}</span> calories, {fmtInt(Math.abs(driftKcal))} {driftKcal > 0 ? 'over' : 'under'} target.
          </p>
        )}
      </div>
    </Panel>
  );
}

/* ── Timeline ─────────────────────────────────────────────────────────────── */

function SwapPopover({ meal, foods }) {
  const options = [meal.option_b, meal.option_c].filter(Boolean);
  const foodSwaps = foods
    .map(f => ({ name: foodName(f), swaps: getSwaps(foodName(f)) }))
    .filter(f => f.name && f.swaps);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs">Swap</Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="end">
        <div className="px-4 pt-3.5 pb-2">
          <p className="text-sm font-semibold text-foreground">Swaps for {meal.name || meal.meal_name || 'this meal'}</p>
          <p className="text-[13px] text-muted-foreground">Same slot, close to the same macros.</p>
        </div>
        <div className="px-4 pb-3.5 space-y-3 max-h-72 overflow-y-auto">
          {options.length > 0 && (
            <div>
              <p className="text-[13px] text-muted-foreground mb-1">Other meal options</p>
              {options.map((o, i) => (
                <p key={i} className="text-sm text-foreground py-1.5 border-b border-border last:border-b-0">{o}</p>
              ))}
            </div>
          )}
          {foodSwaps.map(f => (
            <div key={f.name}>
              <p className="text-[13px] text-muted-foreground mb-1">Instead of {f.name.toLowerCase()}</p>
              {f.swaps.map((s, i) => (
                <p key={i} className="text-sm text-foreground py-1.5 border-b border-border last:border-b-0">{s}</p>
              ))}
            </div>
          ))}
          {options.length === 0 && foodSwaps.length === 0 && (
            <p className="text-sm text-muted-foreground">No saved swaps for this meal. Edit the plan to add a second option.</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function MealRow({ meal, index }) {
  const [open, setOpen] = useState(false);
  const foods = meal.foods || [];
  const title = meal.name || meal.meal_name || `Meal ${index + 1}`;
  const slot = slotFor(meal, index, title);
  const t = mealTotals(meal);
  const ingredients = foods.map(foodName).filter(Boolean);
  const instructions = meal.instructions || meal.notes || meal.habit_description || '';
  const isHabit = foods.length === 0 && !t.calories;
  const hasDetail = foods.length > 0 || meal.image_url || meal.why_this_meal || (instructions && !isHabit);
  const macroLine = [
    t.protein ? `${fmtInt(t.protein)} g protein` : null,
    t.carbs ? `${fmtInt(t.carbs)} g carbs` : null,
    t.fats ? `${fmtInt(t.fats)} g fat` : null,
  ].filter(Boolean).join(', ');

  return (
    <li className="py-4 sm:py-5 border-b border-border last:border-b-0">
      <div className="flex gap-6">
        {/* Time + slot (desktop column) */}
        <div className="hidden sm:block w-[76px] flex-shrink-0">
          <p className="num text-[22px] leading-none text-foreground whitespace-nowrap">{displayTime(meal.time) || index + 1}</p>
          <p className="text-[13px] text-muted-foreground mt-1 truncate">{slot}</p>
        </div>

        {/* Meal */}
        <div className="flex-1 min-w-0">
          {/* Mobile: time, slot and kcal share one line */}
          <div className="sm:hidden flex items-baseline gap-2 mb-1.5">
            <span className="num text-[20px] leading-none text-foreground">{displayTime(meal.time) || index + 1}</span>
            <span className="text-[13px] text-muted-foreground truncate">{slot}</span>
            {!isHabit && <span className="num text-[20px] leading-none text-foreground ml-auto">{fmtInt(t.calories)}</span>}
          </div>
          <p className="text-[16px] font-semibold text-foreground leading-snug">{title}</p>
          {ingredients.length > 0 && (
            <p className="text-[15px] text-foreground/80 mt-0.5">{ingredients.join(', ')}</p>
          )}
          {isHabit && instructions && (
            <p className="text-[15px] text-foreground/80 mt-0.5">{instructions}</p>
          )}
          {macroLine && <p className="text-[13px] text-muted-foreground mt-0.5 tabular-nums">{macroLine}</p>}
          {meal.prepTime && <p className="text-[13px] text-muted-foreground mt-0.5">Prep {meal.prepTime}</p>}
          <div className="flex items-center gap-3 mt-2 sm:mt-1.5">
            {hasDetail && (
              <button
                onClick={() => setOpen(o => !o)}
                className="touch-compact inline-flex items-center gap-1 text-[13px] font-semibold text-foreground underline underline-offset-4 decoration-1 hover:decoration-2"
                aria-expanded={open}
              >
                {open ? 'Hide portions' : 'Portions and prep'}
                <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', open && 'rotate-180')} />
              </button>
            )}
            {!isHabit && <span className="sm:hidden ml-auto"><SwapPopover meal={meal} foods={foods} /></span>}
          </div>
        </div>

        {/* kcal + swap (desktop column) */}
        <div className={cn('hidden flex-col items-end gap-2 flex-shrink-0', !isHabit && 'sm:flex')}>
          <p className="num text-[22px] leading-none text-foreground">{t.calories ? fmtInt(t.calories) : '—'}</p>
          <SwapPopover meal={meal} foods={foods} />
        </div>
      </div>

      {open && (
        <div className="mt-3 sm:ml-[100px] rounded-lg bg-secondary/60 p-3 sm:p-4 space-y-3">
          {meal.image_url && (
            <SignedImg
              src={meal.image_url}
              alt={title}
              loading="lazy"
              className="w-full max-w-sm h-36 rounded-md object-cover"
              onError={e => { e.target.style.display = 'none'; }}
            />
          )}
          {foods.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[13px] text-muted-foreground">
                  <th className="text-left font-normal pb-1.5">Food</th>
                  <th className="text-left font-normal pb-1.5 hidden sm:table-cell">Portion</th>
                  <th className="text-right font-normal pb-1.5">kcal</th>
                  <th className="text-right font-normal pb-1.5 hidden sm:table-cell">P / C / F</th>
                </tr>
              </thead>
              <tbody>
                {foods.map((f, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="py-1.5 pr-2 text-foreground">
                      {foodName(f) || 'Unknown food'}
                      <span className="sm:hidden block text-[13px] text-muted-foreground">{portionOf(f)}</span>
                    </td>
                    <td className="py-1.5 pr-2 text-muted-foreground hidden sm:table-cell">{portionOf(f)}</td>
                    <td className="py-1.5 text-right tabular-nums text-foreground">{fmtInt(f.calories)}</td>
                    <td className="py-1.5 pl-2 text-right tabular-nums text-muted-foreground hidden sm:table-cell whitespace-nowrap">
                      {fmtInt(f.protein)} / {fmtInt(f.carbs)} / {fmtInt(f.fats ?? f.fat)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {meal.why_this_meal && (
            <p className="text-[13px] text-muted-foreground"><span className="font-semibold text-foreground">Why this meal. </span>{meal.why_this_meal}</p>
          )}
          {instructions && (
            <div>
              <p className="text-[13px] text-muted-foreground">How to prepare</p>
              <p className="text-sm text-foreground leading-relaxed">{instructions}</p>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

/** The day's meals as a timeline: time, meal, ingredients, macros, kcal, Swap. */
export default function MealPlanTab({ plan, meals: mealsProp }) {
  const meals = mealsProp || plan.meals || [];

  return (
    <Panel className="px-5 sm:px-6 py-1">
      {meals.length === 0 ? (
        <EmptyState
          className="px-0 sm:px-0"
          title="No meals on this day yet."
          body="Edit the plan to add meals and foods. Calories and macros fill in as you go."
        />
      ) : (
        <ol>
          {meals.map((meal, i) => <MealRow key={i} meal={meal} index={i} />)}
        </ol>
      )}
    </Panel>
  );
}
