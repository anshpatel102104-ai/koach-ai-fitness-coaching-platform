import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, BookmarkPlus, Loader2 } from 'lucide-react';
import { scaleMacros, gramsFromServing } from '@/lib/nutritionUtils';
import { toast } from 'sonner';
import { db } from '@/api/supabaseClient';

const UNITS = ['g', 'oz', 'cup', 'tbsp', 'tsp', 'piece', 'serving'];

function MacroBox({ label, value, unit = 'g', pct }) {
  const barPct = Math.min(100, pct || 0);
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-[13px] text-muted-foreground">{label}</p>
      <p className="num text-2xl text-foreground leading-none mt-1">{value}<span className="text-sm ml-0.5">{unit}</span></p>
      {pct !== undefined && (
        <>
          <div className="mt-2 h-1 rounded-full bg-secondary">
            <div className="h-full rounded-full bg-foreground transition-[width]" style={{ width: `${barPct}%` }} />
          </div>
          <p className="text-[13px] text-muted-foreground mt-1 tabular-nums">{Math.round(pct)}% of goal</p>
        </>
      )}
    </div>
  );
}

export default function FoodDetailSheet({ food, mealName, onAdd, onClose, dailyTargets }) {
  const [qty, setQty] = useState(100);
  const [unit, setUnit] = useState('g');
  const [saving, setSaving] = useState(false);

  if (!food) return null;

  const grams = gramsFromServing(qty, unit);
  const m = scaleMacros(food, grams);

  const pct = (val, target) => target > 0 ? (val / target) * 100 : undefined;

  const handleAdd = () => {
    onAdd({ ...food, ...m, serving_quantity: qty, serving_unit: unit });
    onClose();
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await db.entities.FoodItem.create({
        name: food.name, brand: food.brand || '',
        calories: food.calories, protein: food.protein, carbs: food.carbs, fats: food.fats,
        fiber: food.fiber || 0, sodium: food.sodium || 0,
        serving_size: food.serving_size || '100g',
        source: food.source || 'usda', category: food.category || '',
      });
      toast.success(`Saved ${food.name} to your foods`);
    } catch {
      toast.error('Failed to save food');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-end bg-black/50"
      onClick={onClose}>
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="w-full bg-background rounded-t-xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        <div className="px-5 pb-8 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[22px] text-foreground">{food.name}</h2>
              {(food.category || food.brand) && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {[food.category, food.brand].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
            <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-accent shrink-0" aria-label="Close">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Serving adjuster */}
          <div className="rounded-xl bg-card border border-border p-4">
            <p className="text-[13px] text-muted-foreground mb-2">Serving size</p>
            <div className="flex items-center gap-3">
              <input
                type="number" min={1} step={unit === 'g' ? 10 : 0.5}
                value={qty}
                onChange={e => setQty(Math.max(0.1, Number(e.target.value)))}
                className="num flex-1 h-12 text-center text-2xl border border-input rounded-md bg-card focus:outline-none focus:ring-2 focus:ring-ring" aria-label="Quantity"
              />
              <select
                value={unit} onChange={e => setUnit(e.target.value)}
                className="h-12 px-4 text-sm font-semibold border border-input rounded-md bg-card focus:outline-none focus:ring-2 focus:ring-ring" aria-label="Unit">
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <p className="text-[13px] text-muted-foreground mt-2 tabular-nums">About {grams.toFixed(0)} g</p>
          </div>

          {/* Calories */}
          <div className="rounded-xl bg-card border border-border p-4">
            <p className="num text-[44px] leading-none text-foreground">{m.calories}</p>
            <p className="text-sm text-muted-foreground mt-1">
              calories{dailyTargets?.calories ? `, ${Math.round((m.calories / dailyTargets.calories) * 100)}% of the day's target` : ''}
            </p>
          </div>

          {/* Macros */}
          <div className="grid grid-cols-3 gap-2">
            <MacroBox label="Protein" value={m.protein}
              pct={dailyTargets?.protein ? pct(m.protein, dailyTargets.protein) : undefined} />
            <MacroBox label="Carbs" value={m.carbs}
              pct={dailyTargets?.carbs ? pct(m.carbs, dailyTargets.carbs) : undefined} />
            <MacroBox label="Fat" value={m.fats}
              pct={dailyTargets?.fats ? pct(m.fats, dailyTargets.fats) : undefined} />
          </div>

          {(m.fiber > 0 || m.sodium > 0 || m.sugar > 0) && (
            <p className="text-sm text-muted-foreground tabular-nums">
              {[m.fiber > 0 ? `Fibre ${m.fiber} g` : null, m.sugar > 0 ? `Sugar ${m.sugar} g` : null, m.sodium > 0 ? `Sodium ${m.sodium} mg` : null].filter(Boolean).join(' · ')}
            </p>
          )}

          {/* Actions */}
          <div className="space-y-2 pt-2">
            <button onClick={handleAdd}
              className="w-full h-12 rounded-md font-semibold text-[15px] bg-primary text-primary-foreground hover:bg-primary/85 transition-colors">
              Add to {mealName || 'meal'}
            </button>
            <button onClick={handleSave} disabled={saving}
              className="w-full h-11 rounded-md font-semibold text-sm border border-input bg-card hover:bg-accent transition-colors flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookmarkPlus className="w-4 h-4" />}
              Save to my foods
            </button>
          </div>

          <p className="text-[13px] text-muted-foreground">
            Nutrition data from USDA FoodData Central.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}