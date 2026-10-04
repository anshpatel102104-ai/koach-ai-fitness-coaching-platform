import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Loader2, ArrowLeftRight } from 'lucide-react';
import { db } from '@/api/supabaseClient';

function gramsToOz(g) {
  return g ? `${(g * 0.03527).toFixed(1)}oz` : null;
}

function MacroChip({ label, value, unit = 'g', cls }) {
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${cls}`}>
      {value}{unit} <span className="font-normal opacity-70">{label}</span>
    </span>
  );
}

function FoodSwapButton({ food, mealName }) {
  const [open, setOpen] = useState(false);
  const [swaps, setSwaps] = useState(food.swap_options || []);
  const [loading, setLoading] = useState(false);

  const fetchSwaps = async () => {
    if (swaps.length > 0 && !loading) { setOpen(o => !o); return; }
    setOpen(true);
    setLoading(true);
    const res = await db.functions.invoke('aiNutritionInsights', {
      action: 'foodSwaps', food, mealName,
    });
    const result = res.data;
    if (result?.swaps) setSwaps(result.swaps.map(s => `${s.name} · ${s.portion}${s.note ? ` (${s.note})` : ''}`));
    setLoading(false);
  };

  return (
    <div className="relative">
      <button
        onClick={fetchSwaps}
        className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/70 font-semibold transition-colors px-2 py-0.5 rounded-lg hover:bg-primary/10"
      >
        <ArrowLeftRight className="w-2.5 h-2.5" />
        Swap
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-xl shadow-lg p-3 w-64 space-y-2">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[11px] font-bold text-foreground">Alternative Foods</p>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground text-xs">✕</button>
          </div>
          {loading ? (
            <div className="flex items-center gap-2 py-2">
              <Loader2 className="w-3 h-3 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">Finding swaps…</span>
            </div>
          ) : swaps.map((s, i) => (
            <div key={i} className="flex items-start gap-2 text-xs p-2 bg-secondary/40 rounded-lg">
              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1 flex-shrink-0" />
              <span className="text-foreground leading-snug">{s}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MealRow({ meal }) {
  const [expanded, setExpanded] = useState(false);
  const foods = meal.foods || [];
  const totalCals = foods.reduce((s, f) => s + (f.calories || 0), 0);
  const totalP = foods.reduce((s, f) => s + (f.protein || 0), 0);
  const totalC = foods.reduce((s, f) => s + (f.carbs || 0), 0);
  const totalF = foods.reduce((s, f) => s + (f.fats || 0), 0);

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card">
      {/* Header row */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-foreground">{meal.meal_name}</p>
            {meal.time && (
              <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 bg-secondary rounded-md">{meal.time}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <MacroChip label="kcal" value={totalCals} unit="" cls="bg-orange-50 text-orange-600" />
            <MacroChip label="P" value={totalP} cls="bg-destructive/10 text-destructive" />
            <MacroChip label="C" value={totalC} cls="bg-warning/10 text-warning" />
            <MacroChip label="F" value={totalF} cls="bg-accent text-primary" />
          </div>
        </div>
        <span className="text-xs text-muted-foreground flex-shrink-0">{foods.length} foods</span>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
      </button>

      {/* Expanded food list */}
      {expanded && foods.length > 0 && (
        <div className="border-t border-[var(--kc-f1f4fa)] divide-y divide-muted">
          {foods.map((food, i) => (
            <div key={i} className="px-4 py-2.5 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{food.food_name}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {food.portion}
                  {food.weight_g ? ` · ${food.weight_g}g / ${gramsToOz(food.weight_g)}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0 flex-wrap justify-end">
                <MacroChip label="kcal" value={food.calories || 0} unit="" cls="bg-orange-50 text-orange-600" />
                <MacroChip label="P" value={food.protein || 0} cls="bg-destructive/10 text-destructive" />
                <MacroChip label="C" value={food.carbs || 0} cls="bg-warning/10 text-warning" />
                <MacroChip label="F" value={food.fats || 0} cls="bg-accent text-primary" />
                <FoodSwapButton food={food} mealName={meal.meal_name} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MealPlanViewer({ plan }) {
  const meals = plan?.meals || [];
  if (!meals.length) return <p className="text-sm text-muted-foreground">No meals configured.</p>;

  const totalCals = meals.reduce((s, m) => s + (m.foods || []).reduce((fs, f) => fs + (f.calories || 0), 0), 0);
  const totalP = meals.reduce((s, m) => s + (m.foods || []).reduce((fs, f) => fs + (f.protein || 0), 0), 0);
  const totalC = meals.reduce((s, m) => s + (m.foods || []).reduce((fs, f) => fs + (f.carbs || 0), 0), 0);
  const totalF = meals.reduce((s, m) => s + (m.foods || []).reduce((fs, f) => fs + (f.fats || 0), 0), 0);

  return (
    <div className="space-y-3">
      {/* Daily summary */}
      <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-primary/5 to-accent rounded-xl border border-primary/10 flex-wrap">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Daily Total</span>
        <MacroChip label="kcal" value={totalCals} unit="" cls="bg-orange-100 text-orange-700" />
        <MacroChip label="Protein" value={totalP} cls="bg-destructive/10 text-destructive" />
        <MacroChip label="Carbs" value={totalC} cls="bg-warning/10 text-warning" />
        <MacroChip label="Fats" value={totalF} cls="bg-accent text-primary" />
      </div>

      {/* Meal rows */}
      {meals.map((meal, i) => <MealRow key={i} meal={meal} />)}
    </div>
  );
}