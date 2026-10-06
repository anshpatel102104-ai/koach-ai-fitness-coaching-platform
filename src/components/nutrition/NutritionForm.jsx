import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Plus, ChevronUp, ChevronDown, Loader2, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import FoodSearchModal from './FoodSearchModal';
import MealImageUpload from './MealImageUpload';

const EMOJIS = ['🥗', '🔥', '💪', '🥦', '🍗', '⚡', '🏆', '🌿'];

function normalizeFood(f) {
  return {
    name:     f?.food_name ?? f?.name     ?? '',
    amount:   f?.portion   ?? f?.amount   ?? '',
    calories: f?.calories  ?? 0,
    protein:  f?.protein   ?? 0,
    carbs:    f?.carbs     ?? 0,
    fats:     f?.fats      ?? 0,
  };
}

function defaultMeal(m) {
  return {
    name:      m?.meal_name     ?? m?.name   ?? '',
    calories:  m?.calories                   ?? '',
    notes:     m?.habit_description ?? m?.notes ?? '',
    foods:     (m?.foods ?? []).map(normalizeFood),
    image_url: m?.image_url ?? null,
  };
}

function defaultForm(plan, initialMeals) {
  return {
    title:           plan?.title            ?? '',
    description:     plan?.description      ?? '',
    emoji:           plan?.emoji            ?? '🥗',
    tracking_mode:   plan?.tracking_mode    ?? 'macros',
    is_template:     plan?.is_template      ?? false,
    // AI result uses plain calories/protein/carbs/fats; saved plans use protein_g etc.
    calories:        plan?.calories         ?? '',
    protein:         plan?.protein_g        ?? plan?.protein ?? '',
    carbs:           plan?.carbs_g          ?? plan?.carbs   ?? '',
    fats:            plan?.fats_g           ?? plan?.fats    ?? '',
    meals:           plan?.meals?.length
      ? plan.meals.map(defaultMeal)
      : (initialMeals?.map(defaultMeal) ?? []),
    assigned_clients: plan?.assigned_clients ?? [],
    supplements:      plan?.supplements     ?? [],
  };
}

// ─── Macro Ratio Bar ─────────────────────────────────────────────────────────
function MacroRatioBar({ protein, carbs, fats }) {
  const p = parseFloat(protein) || 0;
  const c = parseFloat(carbs)   || 0;
  const f = parseFloat(fats)    || 0;
  const totalCal = p * 4 + c * 4 + f * 9;
  if (totalCal === 0) return null;

  const pPct = Math.round((p * 4 / totalCal) * 100);
  const cPct = Math.round((c * 4 / totalCal) * 100);
  const fPct = Math.max(100 - pPct - cPct, 0);

  return (
    <div className="mt-3 space-y-1.5">
      <div className="flex h-2.5 rounded-full overflow-hidden bg-secondary">
        <div className="bg-foreground transition-[width] duration-300" style={{ width: `${pPct}%` }} />
        <div className="bg-muted-foreground/70 transition-[width] duration-300" style={{ width: `${cPct}%` }} />
        <div className="bg-input transition-[width] duration-300"  style={{ width: `${fPct}%` }} />
      </div>
      <div className="flex justify-between text-[13px] text-muted-foreground tabular-nums">
        <span>Protein {pPct}%</span>
        <span>Carbs {cPct}%</span>
        <span>Fat {fPct}%</span>
      </div>
    </div>
  );
}

// ─── Client Picker ────────────────────────────────────────────────────────────
function ClientPicker({ selected, onChange }) {
  const [search, setSearch] = useState('');
  const { data: clients = [] } = useQuery({
    queryKey: ['clients-picker'],
    queryFn: () => db.entities.Client.list(),
  });

  const filtered = clients.filter(c => c.name?.toLowerCase().includes(search.toLowerCase()));
  const selectedClients = clients.filter(c => selected.includes(c.id));
  const overflow = Math.max(selectedClients.length - 6, 0);

  function toggle(id) {
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
  }

  return (
    <div className="space-y-3">
      {selectedClients.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedClients.slice(0, 6).map(c => (
            <span key={c.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary text-foreground text-xs font-semibold">
              {c.name}
              <button onClick={() => toggle(c.id)} className="opacity-60 hover:opacity-100 leading-none" aria-label={`Remove ${c.name}`}><X className="w-3 h-3" /></button>
            </span>
          ))}
          {overflow > 0 && (
            <span className="px-2.5 py-1 rounded-md bg-secondary text-muted-foreground text-xs font-semibold">+{overflow} more</span>
          )}
        </div>
      )}
      <Input placeholder="Search clients" value={search} onChange={e => setSearch(e.target.value)} className="text-sm" />
      <div className="max-h-40 overflow-y-auto space-y-0.5 pr-1">
        {filtered.map(c => (
          <label key={c.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-secondary cursor-pointer">
            <input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggle(c.id)} className="rounded border-input accent-primary" />
            <span className="text-sm font-medium text-foreground">{c.name}</span>
            {c.lifecycle_status && <span className="ml-auto text-xs text-muted-foreground capitalize">{c.lifecycle_status}</span>}
          </label>
        ))}
        {filtered.length === 0 && <p className="text-sm text-muted-foreground py-3">No clients match that search.</p>}
      </div>
    </div>
  );
}

// ─── Single Meal Card ─────────────────────────────────────────────────────────
function MealCard({ meal, index, total, onUpdate, onRemove, onMoveUp, onMoveDown }) {
  const [foodSearchOpen, setFoodSearchOpen] = useState(false);

  const mealCalTotal = useMemo(() =>
    meal.foods.reduce((sum, f) => sum + (parseFloat(f.calories) || 0), 0),
    [meal.foods]
  );

  function addFood(food) {
    onUpdate('foods', [...meal.foods, food]);
  }
  function removeFood(fi) {
    onUpdate('foods', meal.foods.filter((_, idx) => idx !== fi));
  }

  return (
    <div className="p-4 rounded-xl border border-border bg-card space-y-3">
      {/* Top row */}
      <div className="flex items-center gap-2">
        <div className="flex flex-col gap-0.5">
          <button onClick={onMoveUp}   disabled={index === 0}       className="p-0.5 hover:text-foreground text-muted-foreground disabled:opacity-30" aria-label="Move up"><ChevronUp   className="w-3.5 h-3.5" /></button>
          <button onClick={onMoveDown} disabled={index === total-1} className="p-0.5 hover:text-foreground text-muted-foreground disabled:opacity-30" aria-label="Move down"><ChevronDown className="w-3.5 h-3.5" /></button>
        </div>
        <Input
          placeholder="Meal name (e.g. Breakfast)"
          value={meal.name}
          onChange={e => onUpdate('name', e.target.value)}
          className="flex-1 text-sm"
        />
        {/* calories: manual OR auto-summed from foods */}
        <div className="flex items-center gap-1">
          <Input
            type="number"
            placeholder="kcal"
            value={mealCalTotal > 0 ? mealCalTotal : meal.calories}
            onChange={e => onUpdate('calories', e.target.value)}
            readOnly={mealCalTotal > 0}
            className={cn('w-20 text-sm text-center', mealCalTotal > 0 && 'bg-secondary text-foreground font-semibold')}
          />
        </div>
        <button onClick={onRemove} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Meal image */}
      <MealImageUpload
        imageUrl={meal.image_url}
        onChange={url => onUpdate('image_url', url)}
        className="w-full"
      />

      {/* Notes */}
      <textarea
        value={meal.notes}
        onChange={e => onUpdate('notes', e.target.value)}
        placeholder="What to eat, or how to make it"
        rows={1}
        className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
      />

      {/* Added foods */}
      {meal.foods.length > 0 && (
        <div className="space-y-1">
          <AnimatePresence initial={false}>
            {meal.foods.map((food, fi) => (
              <motion.div
                key={fi}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/60">
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold text-foreground block truncate">{food.name || '—'}</span>
                    {food.amount && (
                      <span className="text-xs text-muted-foreground">{food.amount}</span>
                    )}
                  </div>
                  <div className="flex gap-1.5 text-xs text-muted-foreground tabular-nums shrink-0">
                    <span className="font-semibold text-foreground">{food.calories} kcal</span>
                    <span>{food.protein} P</span>
                    <span>{food.carbs} C</span>
                    <span>{food.fats} F</span>
                  </div>
                  <button onClick={() => removeFood(fi)} className="p-0.5 text-muted-foreground hover:text-destructive transition-colors shrink-0" aria-label="Remove food">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Add Food button */}
      <Button
        size="sm"
        variant="outline"
        className="w-full border-dashed"
        onClick={() => setFoodSearchOpen(true)}
      >
        <Plus /> Add food
      </Button>

      <FoodSearchModal
        open={foodSearchOpen}
        onOpenChange={setFoodSearchOpen}
        mealName={meal.name}
        onAddFood={addFood}
      />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function NutritionForm({ open, onOpenChange, onSubmit, plan, initialMeals }) {
  const isEdit = !!plan;
  const [form, setForm] = useState(() => defaultForm(plan, initialMeals));
  const [selectedClientIds, setSelectedClientIds] = useState(plan?.assigned_clients || []);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(defaultForm(plan, initialMeals));
      setSelectedClientIds(plan?.assigned_clients || []);
    }
  }, [open, plan, initialMeals]);

  const toggleClient = (id) => {
    setSelectedClientIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  function set(field, value) { setForm(f => ({ ...f, [field]: value })); }

  // Auto-sum calories across all meals from their food lists
  const totalFoodCalories = useMemo(() =>
    form.meals.reduce((sum, m) =>
      sum + m.foods.reduce((s, f) => s + (parseFloat(f.calories) || 0), 0), 0),
    [form.meals]
  );
  const totalFoodProtein = useMemo(() =>
    form.meals.reduce((sum, m) =>
      sum + m.foods.reduce((s, f) => s + (parseFloat(f.protein) || 0), 0), 0),
    [form.meals]
  );
  const totalFoodCarbs = useMemo(() =>
    form.meals.reduce((sum, m) =>
      sum + m.foods.reduce((s, f) => s + (parseFloat(f.carbs) || 0), 0), 0),
    [form.meals]
  );
  const totalFoodFats = useMemo(() =>
    form.meals.reduce((sum, m) =>
      sum + m.foods.reduce((s, f) => s + (parseFloat(f.fats) || 0), 0), 0),
    [form.meals]
  );

  const hasFoodTotals = totalFoodCalories > 0;

  // Meals
  function addMeal() {
    setForm(f => ({ ...f, meals: [...f.meals, { name: '', calories: '', notes: '', foods: [], image_url: null }] }));
  }
  function updateMeal(i, field, val) {
    setForm(f => {
      const meals = [...f.meals];
      meals[i] = { ...meals[i], [field]: val };
      return { ...f, meals };
    });
  }
  function removeMeal(i) {
    setForm(f => ({ ...f, meals: f.meals.filter((_, idx) => idx !== i) }));
  }
  function moveMeal(i, dir) {
    setForm(f => {
      const meals = [...f.meals];
      const j = i + dir;
      if (j < 0 || j >= meals.length) return f;
      [meals[i], meals[j]] = [meals[j], meals[i]];
      return { ...f, meals };
    });
  }

  async function handleSubmit() {
    if (!form.title.trim()) {
      toast.error('Give the plan a name first');
      return;
    }
    setSaving(true);
    try {
      const cleanClientIds = selectedClientIds
        .map(id => typeof id === 'object' ? id?.id : id)
        .filter(Boolean);

      const formData = {
        title:         form.title,
        description:   form.description,
        emoji:         form.emoji,
        tracking_mode: form.tracking_mode,
        is_template:   form.is_template,
        calories:      hasFoodTotals ? totalFoodCalories : (form.calories ? Number(form.calories) : undefined),
        protein_g:     hasFoodTotals ? totalFoodProtein  : (form.protein  ? Number(form.protein)  : undefined),
        carbs_g:       hasFoodTotals ? totalFoodCarbs    : (form.carbs    ? Number(form.carbs)    : undefined),
        fats_g:        hasFoodTotals ? totalFoodFats     : (form.fats     ? Number(form.fats)     : undefined),
        meals: form.meals.map(m => ({
          name:              m.name,
          meal_name:         m.name,
          image_url:         m.image_url || null,
          calories:          m.foods.length > 0
            ? m.foods.reduce((s, f) => s + (parseFloat(f.calories) || 0), 0)
            : (m.calories ? Number(m.calories) : undefined),
          habit_description: m.notes,
          instructions:      m.notes,
          notes:             m.notes,
          foods:             m.foods.map(f => ({
            name:      f.name || f.food_name || '',
            food_name: f.name || f.food_name || '',
            amount:    f.amount || f.portion || '',
            portion:   f.amount || f.portion || '',
            calories:  f.calories || 0,
            protein:   f.protein  || 0,
            carbs:     f.carbs    || 0,
            fats:      f.fats     || 0,
          })),
        })),
        supplements:      form.supplements || [],
        assigned_clients: cleanClientIds,
      };

      // 1. Save the plan (via parent handler)
      const savedPlan = await onSubmit(formData);

      // 2. Update each selected client's assigned_nutrition_id
      if (cleanClientIds.length > 0 && savedPlan?.id) {
        await Promise.all(
          cleanClientIds.map(clientId =>
            db.entities.Client.update(clientId, { assigned_nutrition_id: savedPlan.id })
          )
        );
      }

      onOpenChange(false);
    } catch (err) {
      console.error('Form submit error:', err);
      toast.error('Failed to save plan');
    } finally {
      setSaving(false);
    }
  }

  const sectionClass = "space-y-4 pb-6 border-b border-border";
  const labelClass   = "text-sm font-semibold text-foreground block mb-1.5";

  // Effective macro values for the ratio bar (food-derived takes priority)
  const eff = {
    calories: hasFoodTotals ? totalFoodCalories : (form.calories || ''),
    protein:  hasFoodTotals ? totalFoodProtein  : (form.protein  || ''),
    carbs:    hasFoodTotals ? totalFoodCarbs    : (form.carbs    || ''),
    fats:     hasFoodTotals ? totalFoodFats     : (form.fats     || ''),
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col overflow-hidden">
        <SheetHeader className="px-6 py-5 border-b border-border flex-shrink-0">
          <SheetTitle className="text-2xl">
            {isEdit
              ? plan?.title?.includes('AI Generated') ? 'Review the AI draft' : 'Edit plan'
              : 'New meal plan'}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* SECTION 1 — Basics */}
          <div className={sectionClass}>
            <h3 className="text-xl text-foreground">Basics</h3>

            <div>
              <label className={labelClass}>Plan name</label>
              <Input placeholder="Fat loss, phase 1" value={form.title} onChange={e => set('title', e.target.value)} />
            </div>

            <div>
              <label className={labelClass}>Description</label>
              <textarea
                value={form.description}
                onChange={e => set('description', e.target.value)}
                placeholder="Who it's for and what it aims to do"
                rows={2}
                className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>

            <div>
              <label className={labelClass}>Plan icon</label>
              <div className="flex gap-2 flex-wrap">
                {EMOJIS.map(e => (
                  <button
                    key={e}
                    onClick={() => set('emoji', e)}
                    className={cn(
                      'w-9 h-9 rounded-md text-lg flex items-center justify-center border transition-colors',
                      form.emoji === e ? 'border-foreground bg-accent' : 'border-input bg-card hover:bg-accent'
                    )}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={labelClass}>Tracking</label>
              <div className="flex rounded-lg border border-input overflow-hidden w-fit text-sm font-semibold">
                {[{ id: 'macros', label: 'Macros' }, { id: 'habits', label: 'Habits' }].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => set('tracking_mode', opt.id)}
                    className={cn(
                      'px-4 py-2 transition-colors',
                      form.tracking_mode === opt.id ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground hover:bg-accent'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={form.is_template} onChange={e => set('is_template', e.target.checked)} className="rounded border-input accent-primary" />
              <span className="text-sm font-medium text-foreground">Save as reusable template</span>
            </label>
          </div>

          {/* SECTION 2 — Macros */}
          {form.tracking_mode === 'macros' && (
            <div className={sectionClass}>
              <div className="flex items-center justify-between">
                <h3 className="text-xl text-foreground">Daily targets</h3>
                {hasFoodTotals && (
                  <span className="text-[13px] text-muted-foreground">
                    Added up from the meals below
                  </span>
                )}
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { field: 'calories', label: 'Calories', unit: 'kcal', val: eff.calories, color: '' },
                  { field: 'protein',  label: 'Protein',  unit: 'g',    val: eff.protein,  color: '' },
                  { field: 'carbs',    label: 'Carbs',    unit: 'g',    val: eff.carbs,    color: '' },
                  { field: 'fats',     label: 'Fat',      unit: 'g',    val: eff.fats,     color: '' },
                ].map(({ field, label, unit, val, color }) => (
                  <div key={field}>
                    <label className={cn(labelClass, color)}>{label} <span className="font-normal text-muted-foreground">({unit})</span></label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={val}
                      onChange={e => set(field, e.target.value)}
                      readOnly={hasFoodTotals}
                      className={cn('text-center', hasFoodTotals && 'bg-secondary font-semibold cursor-default')}
                    />
                  </div>
                ))}
              </div>
              <MacroRatioBar protein={eff.protein} carbs={eff.carbs} fats={eff.fats} />
            </div>
          )}

          {/* SECTION 3 — Meals */}
          <div className={sectionClass}>
            <div className="flex items-center justify-between">
              <h3 className="text-xl text-foreground">Meals</h3>
              <Button size="sm" variant="outline" onClick={addMeal}>
                <Plus /> Add meal
              </Button>
            </div>

            <AnimatePresence initial={false}>
              {form.meals.map((meal, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <MealCard
                    meal={meal}
                    index={i}
                    total={form.meals.length}
                    onUpdate={(field, val) => updateMeal(i, field, val)}
                    onRemove={() => removeMeal(i)}
                    onMoveUp={() => moveMeal(i, -1)}
                    onMoveDown={() => moveMeal(i, 1)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>

            {form.meals.length === 0 && (
              <p className="text-sm text-muted-foreground py-2">No meals yet. Add the first one, like breakfast.</p>
            )}
          </div>

          {/* SECTION 4 — Assign Clients */}
          <div className="space-y-4 pb-6">
            <div>
              <h3 className="text-xl text-foreground">Clients</h3>
              <p className="text-sm text-muted-foreground mt-0.5">Optional. Ticked clients see this plan in their app once you save.</p>
            </div>
            <ClientPicker selected={selectedClientIds} onChange={setSelectedClientIds} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-border px-6 py-4 flex items-center justify-end gap-3 bg-card">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving || !form.title.trim()} className="gap-2 min-w-[110px]">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving</> : 'Save plan'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}