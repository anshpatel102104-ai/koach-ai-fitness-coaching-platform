import React, { useState } from 'react';
import { db } from '@/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, RefreshCw, Trash2, ChevronDown, ChevronUp, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import WorkoutMealPanel from './WorkoutMealPanel';

// ── Tag config ─────────────────────────────────────────
const MEAL_TAGS = [
  { key: 'simple',       label: 'Simple',       color: 'bg-muted text-muted-foreground border-border' },
  { key: 'high_protein', label: 'High Protein',  color: 'bg-destructive/10 text-destructive border-destructive' },
  { key: 'high_volume',  label: 'High Volume',   color: 'bg-warning/10 text-warning border-warning' },
  { key: 'quick_prep',   label: 'Quick Prep',    color: 'bg-success/10 text-success border-success' },
];

const TAG_MAP = Object.fromEntries(MEAL_TAGS.map(t => [t.key, t]));

function distributeToMeals(count) {
  const order = ['Breakfast', 'Lunch', 'Dinner', 'Pre-Workout', 'Post-Workout', 'Snack'];
  return order.slice(0, count);
}

function MacroBar({ p, c, f }) {
  const total = p * 4 + c * 4 + f * 9 || 1;
  return (
    <div className="flex h-1 rounded-full overflow-hidden bg-secondary mt-1.5">
      <div className="bg-destructive" style={{ width: `${(p * 4 / total) * 100}%` }} />
      <div className="bg-warning" style={{ width: `${(c * 4 / total) * 100}%` }} />
      <div className="bg-primary" style={{ width: `${(f * 9 / total) * 100}%` }} />
    </div>
  );
}

function OptionFoods({ foods }) {
  return (
    <div className="divide-y divide-border">
      {(foods || []).map((food, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-2.5">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{food.food_name}</p>
            <p className="text-[11px] text-muted-foreground">{food.portion}</p>
          </div>
          <div className="flex items-center gap-1 text-[11px] shrink-0">
            <span className="bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded font-medium">{food.calories}cal</span>
            <span className="bg-destructive/10 text-destructive px-1.5 py-0.5 rounded font-medium">{food.protein}P</span>
            <span className="bg-warning/10 text-warning px-1.5 py-0.5 rounded font-medium">{food.carbs}C</span>
            <span className="bg-accent text-primary px-1.5 py-0.5 rounded font-medium">{food.fats}F</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function MealCard({ meal, mIdx, onRemove, onRegenerateMeal, onTagToggle }) {
  const [expanded, setExpanded] = useState(true);
  const [activeOption, setActiveOption] = useState(0);
  const [regenLoading, setRegenLoading] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);

  const options = meal.options || [];
  const current = options[activeOption] || {};
  const totalCals = (current.foods || []).reduce((s, f) => s + (f.calories || 0), 0);
  const totalP = (current.foods || []).reduce((s, f) => s + (f.protein || 0), 0);
  const totalC = (current.foods || []).reduce((s, f) => s + (f.carbs || 0), 0);
  const totalF = (current.foods || []).reduce((s, f) => s + (f.fats || 0), 0);
  const mealTags = meal.tags || [];

  const handleRegen = async () => {
    setRegenLoading(true);
    await onRegenerateMeal(mIdx);
    setActiveOption(0);
    setRegenLoading(false);
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-secondary/30 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-foreground">{meal.meal_name}</span>
            <span className="text-xs text-muted-foreground">{meal.time}</span>
            {/* Tag badges */}
            {mealTags.map(tk => {
              const t = TAG_MAP[tk];
              return t ? (
                <span key={tk} className={cn('text-[10px] px-1.5 py-0.5 rounded-full border font-medium', t.color)}>
                  {t.label}
                </span>
              ) : null;
            })}
          </div>
          <div className="flex items-center gap-3 text-[11px] mt-0.5">
            <span className="font-medium text-foreground">{totalCals} cal</span>
            <span className="text-destructive">{totalP}g P</span>
            <span className="text-warning">{totalC}g C</span>
            <span className="text-primary">{totalF}g F</span>
          </div>
          <MacroBar p={totalP} c={totalC} f={totalF} />
        </div>
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          {/* Tag toggle button */}
          <button
            onClick={() => setTagsOpen(o => !o)}
            className={cn('w-7 h-7 flex items-center justify-center rounded-lg transition-colors',
              tagsOpen ? 'bg-primary/10 text-primary' : 'hover:bg-secondary text-muted-foreground hover:text-foreground')}
            title="Tag this meal"
          >
            <Tag className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleRegen}
            disabled={regenLoading}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary transition-colors"
          >
            {regenLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => onRemove(mIdx)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </div>

      {/* Tag picker (inline, minimal) */}
      {tagsOpen && (
        <div className="px-4 py-2 border-t border-border bg-secondary/20 flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-muted-foreground mr-1">Tags:</span>
          {MEAL_TAGS.map(t => {
            const active = mealTags.includes(t.key);
            return (
              <button
                key={t.key}
                onClick={() => onTagToggle(mIdx, t.key)}
                className={cn(
                  'text-[11px] px-2 py-0.5 rounded-full border font-medium transition-all',
                  active ? t.color : 'bg-card text-muted-foreground border-border hover:border-primary/30'
                )}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Options + Foods */}
      {expanded && (
        <div className="border-t border-border">
          {/* Option tabs */}
          <div className="flex items-center gap-1 px-4 pt-3 pb-0">
            {options.map((opt, oIdx) => {
              const optCals = (opt.foods || []).reduce((s, f) => s + (f.calories || 0), 0);
              const optP = (opt.foods || []).reduce((s, f) => s + (f.protein || 0), 0);
              const isActive = oIdx === activeOption;
              return (
                <button
                  key={oIdx}
                  onClick={() => setActiveOption(oIdx)}
                  className={cn(
                    'flex flex-col items-start px-3 py-2 rounded-lg border text-left transition-all flex-1',
                    isActive
                      ? 'bg-primary/5 border-primary/30'
                      : 'border-border text-muted-foreground hover:border-primary/20 hover:bg-secondary/50'
                  )}
                >
                  <span className={cn('text-[11px] font-semibold', isActive ? 'text-primary' : 'text-muted-foreground')}>
                    Option {oIdx + 1}
                  </span>
                  <span className="text-[11px] font-medium text-foreground">{optCals} cal · {optP}g P</span>
                  <span className="text-[10px] text-muted-foreground truncate w-full">{opt.label || ''}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-3">
            <OptionFoods foods={current.foods} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Schema ──────────────────────────────────────────────
const FOOD_ITEM_SCHEMA = {
  type: 'object',
  properties: {
    food_name: { type: 'string' },
    portion: { type: 'string' },
    calories: { type: 'number' },
    protein: { type: 'number' },
    carbs: { type: 'number' },
    fats: { type: 'number' },
  },
};

const OPTION_SCHEMA = {
  type: 'object',
  properties: {
    label: { type: 'string' },
    foods: { type: 'array', items: FOOD_ITEM_SCHEMA },
  },
};

const MEAL_SCHEMA = {
  type: 'object',
  properties: {
    meal_name: { type: 'string' },
    time: { type: 'string' },
    options: { type: 'array', items: OPTION_SCHEMA },
  },
};

export default function SmartNutritionGenerator({ initialMeals, targets, onMealsChange }) {
  const [generating, setGenerating] = useState(false);
  const [params, setParams] = useState({
    calories: targets?.calories || '',
    protein_g: targets?.protein_g || '',
    carbs_g: targets?.carbs_g || '',
    fats_g: targets?.fats_g || '',
    meal_count: 4,
    options_count: 2,
  });
  const [meals, setMeals] = useState(initialMeals || []);
  const [activeFilter, setActiveFilter] = useState(null);
  const [workoutMeals, setWorkoutMeals] = useState({});
  const hasGenerated = meals.length > 0;

  const syncUp = (updated) => {
    setMeals(updated);
    onMealsChange(updated.map(m => ({
      meal_name: m.meal_name,
      time: m.time,
      tags: m.tags || [],
      foods: (m.options?.[0]?.foods || []),
      options: m.options,
    })));
  };

  const handleTagToggle = (mIdx, tagKey) => {
    const updated = meals.map((m, i) => {
      if (i !== mIdx) return m;
      const tags = m.tags || [];
      return { ...m, tags: tags.includes(tagKey) ? tags.filter(t => t !== tagKey) : [...tags, tagKey] };
    });
    syncUp(updated);
  };

  const generateMeals = async () => {
    if (!params.calories || !params.protein_g) {
      toast.error('Set calories and protein first');
      return;
    }
    setGenerating(true);
    try {
      const response = await db.functions.invoke('generateSmartMeals', {
        calories: params.calories,
        protein_g: params.protein_g,
        carbs_g: params.carbs_g,
        fats_g: params.fats_g,
        meal_count: params.meal_count,
        options_count: params.options_count,
      });

      if (response.data?.error === 'monthly_ai_limit_reached') {
        toast.error(response.data.message || 'Monthly AI generation limit reached. Upgrade your plan.');
        return;
      }

      if (response.data?.error) {
        toast.error(response.data.error);
        return;
      }

      const generated = (response.data?.meals || []).map(m => ({ ...m, tags: [] }));
      syncUp(generated);
      toast.success('Meal plan generated!');
    } catch (err) {
      toast.error('Failed to generate meal plan. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const regenerateMeal = async (mIdx) => {
    const meal = meals[mIdx];
    try {
      const response = await db.functions.invoke('generateSmartMeals', {
        mode: 'regenerate',
        meal: { ...meal, total_meals: meals.length },
        calories: params.calories,
        protein_g: params.protein_g,
        carbs_g: params.carbs_g,
        fats_g: params.fats_g,
        options_count: params.options_count,
      });

      if (response.data?.error === 'monthly_ai_limit_reached') {
        toast.error(response.data.message || 'Monthly AI generation limit reached.');
        return;
      }

      if (response.data?.error) {
        toast.error(response.data.error);
        return;
      }

      const result = response.data?.meal;
      if (result?.meal_name) {
        syncUp(meals.map((m, i) => i === mIdx ? { ...result, tags: m.tags || [] } : m));
      }
    } catch (err) {
      toast.error('Failed to regenerate meal. Please try again.');
    }
  };

  const removeMeal = (mIdx) => syncUp(meals.filter((_, i) => i !== mIdx));

  const filteredMeals = activeFilter
    ? meals.filter(m => (m.tags || []).includes(activeFilter))
    : meals;

  const totalCals = meals.reduce((s, m) => s + (m.options?.[0]?.foods || m.foods || []).reduce((fs, f) => fs + (f.calories || 0), 0), 0);
  const totalP = meals.reduce((s, m) => s + (m.options?.[0]?.foods || m.foods || []).reduce((fs, f) => fs + (f.protein || 0), 0), 0);
  const totalC = meals.reduce((s, m) => s + (m.options?.[0]?.foods || m.foods || []).reduce((fs, f) => fs + (f.carbs || 0), 0), 0);
  const totalF = meals.reduce((s, m) => s + (m.options?.[0]?.foods || m.foods || []).reduce((fs, f) => fs + (f.fats || 0), 0), 0);

  return (
    <div className="space-y-4">
      {/* Generator panel */}
      <div className="bg-secondary/40 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Auto-Generate Meal Plan</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
          <div>
            <Label className="text-[11px]">Calories</Label>
            <Input type="number" placeholder="2000" value={params.calories}
              onChange={e => setParams(p => ({ ...p, calories: e.target.value }))} className="h-8 text-sm" />
          </div>
          <div>
            <Label className="text-[11px]">Protein (g)</Label>
            <Input type="number" placeholder="180" value={params.protein_g}
              onChange={e => setParams(p => ({ ...p, protein_g: e.target.value }))} className="h-8 text-sm" />
          </div>
          <div>
            <Label className="text-[11px]">Carbs (g)</Label>
            <Input type="number" placeholder="200" value={params.carbs_g}
              onChange={e => setParams(p => ({ ...p, carbs_g: e.target.value }))} className="h-8 text-sm" />
          </div>
          <div>
            <Label className="text-[11px]">Fats (g)</Label>
            <Input type="number" placeholder="60" value={params.fats_g}
              onChange={e => setParams(p => ({ ...p, fats_g: e.target.value }))} className="h-8 text-sm" />
          </div>
          <div>
            <Label className="text-[11px]">Meals</Label>
            <select value={params.meal_count} onChange={e => setParams(p => ({ ...p, meal_count: Number(e.target.value) }))}
              className="h-8 w-full rounded-md border border-input bg-card px-2 text-sm">
              {[3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-[11px]">Options / meal</Label>
            <select value={params.options_count} onChange={e => setParams(p => ({ ...p, options_count: Number(e.target.value) }))}
              className="h-8 w-full rounded-md border border-input bg-card px-2 text-sm">
              {[2, 3].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        <Button onClick={generateMeals} disabled={generating} className="gap-2 w-full sm:w-auto">
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {generating ? 'Generating…' : hasGenerated ? 'Regenerate All' : 'Generate Meal Plan'}
        </Button>
      </div>

      {hasGenerated && (
        <>
          {/* Totals + Filter bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="text-muted-foreground">Totals:</span>
              <span className="font-semibold text-foreground">{totalCals} kcal</span>
              {params.calories && (
                <span className={cn('font-medium', Math.abs(totalCals - Number(params.calories)) < 80 ? 'text-success' : 'text-warning')}>
                  {totalCals > Number(params.calories) ? '+' : ''}{totalCals - Number(params.calories)} vs target
                </span>
              )}
              <span className="text-destructive">{totalP}g P</span>
              <span className="text-warning">{totalC}g C</span>
              <span className="text-primary">{totalF}g F</span>
            </div>

            {/* Filter toggles */}
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[11px] text-muted-foreground mr-0.5">Filter:</span>
              <button
                onClick={() => setActiveFilter(null)}
                className={cn('text-[11px] px-2 py-0.5 rounded-full border font-medium transition-all',
                  activeFilter === null ? 'bg-foreground text-background border-foreground' : 'bg-card text-muted-foreground border-border hover:border-foreground/30'
                )}
              >
                All
              </button>
              {MEAL_TAGS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setActiveFilter(activeFilter === t.key ? null : t.key)}
                  className={cn('text-[11px] px-2 py-0.5 rounded-full border font-medium transition-all',
                    activeFilter === t.key ? t.color : 'bg-card text-muted-foreground border-border hover:border-primary/30'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Workout meals */}
          <WorkoutMealPanel value={workoutMeals} onChange={setWorkoutMeals} />

          {/* Meal cards */}
          <div className="space-y-3">
            {filteredMeals.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No meals tagged with "{TAG_MAP[activeFilter]?.label}". Tag meals using the <Tag className="inline w-3 h-3" /> icon.</p>
            ) : (
              filteredMeals.map((meal, visIdx) => {
                const realIdx = meals.indexOf(meal);
                return (
                  <MealCard
                    key={realIdx}
                    meal={meal}
                    mIdx={realIdx}
                    onRemove={removeMeal}
                    onRegenerateMeal={regenerateMeal}
                    onTagToggle={handleTagToggle}
                  />
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}