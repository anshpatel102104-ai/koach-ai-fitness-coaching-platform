import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, BookmarkPlus, Loader2 } from 'lucide-react';
import { scaleMacros, gramsFromServing } from '@/lib/nutritionUtils';
import { toast } from 'sonner';
import { db } from '@/api/supabaseClient';

const UNITS = ['g', 'oz', 'cup', 'tbsp', 'tsp', 'piece', 'serving'];

function MacroBox({ label, value, unit = 'g', color, pct }) {
  const barPct = Math.min(100, pct || 0);
  return (
    <div className="rounded-xl p-3 text-center" style={{ background: color + '10', border: `1px solid ${color}22` }}>
      <p className="text-xl font-black" style={{ color }}>{value}<span className="text-xs font-bold ml-0.5">{unit}</span></p>
      <p className="text-[10px] text-muted-foreground font-semibold mt-0.5 uppercase tracking-wide">{label}</p>
      {pct !== undefined && (
        <div className="mt-1.5 h-1 rounded-full bg-border">
          <div className="h-full rounded-full transition-all" style={{ width: `${barPct}%`, background: color }} />
        </div>
      )}
      {pct !== undefined && <p className="text-[9px] text-muted-foreground mt-0.5">{Math.round(pct)}% of goal</p>}
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
      toast.success(`"${food.name}" saved to My Foods`);
    } catch {
      toast.error('Failed to save food');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-end"
      style={{ background: 'color-mix(in srgb, black 50%, transparent)' }}
      onClick={onClose}>
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="w-full bg-background rounded-t-[24px] max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        <div className="px-5 pb-8 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-foreground leading-tight">{food.name}</h2>
              {(food.category || food.brand) && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {[food.category, food.brand].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
            <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full bg-secondary shrink-0">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Serving adjuster */}
          <div className="bg-secondary/40 rounded-2xl p-4">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Serving Size</p>
            <div className="flex items-center gap-3">
              <input
                type="number" min={1} step={unit === 'g' ? 10 : 0.5}
                value={qty}
                onChange={e => setQty(Math.max(0.1, Number(e.target.value)))}
                className="flex-1 h-14 text-center text-2xl font-black border border-input rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <select
                value={unit} onChange={e => setUnit(e.target.value)}
                className="h-14 px-4 text-sm font-semibold border border-input rounded-xl bg-background focus:outline-none">
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">≈ {grams.toFixed(0)}g</p>
          </div>

          {/* Calories — large */}
          <div className="rounded-2xl p-5 text-center" style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--tc-primary) 3.13725%, transparent), color-mix(in srgb, var(--tc-ai) 3.13725%, transparent))', border: '1px solid color-mix(in srgb, var(--tc-primary) 13.3333%, transparent)' }}>
            <p className="text-5xl font-black text-foreground">{m.calories}</p>
            <p className="text-sm text-muted-foreground font-semibold mt-1">calories</p>
            {dailyTargets?.calories && (
              <p className="text-xs text-muted-foreground mt-1">{Math.round((m.calories / dailyTargets.calories) * 100)}% of daily goal</p>
            )}
          </div>

          {/* Macro grid */}
          <div className="grid grid-cols-3 gap-2">
            <MacroBox label="Protein" value={m.protein} color="var(--tc-primary)"
              pct={dailyTargets?.protein ? pct(m.protein, dailyTargets.protein) : undefined} />
            <MacroBox label="Carbs" value={m.carbs} color="var(--tc-warning)"
              pct={dailyTargets?.carbs ? pct(m.carbs, dailyTargets.carbs) : undefined} />
            <MacroBox label="Fats" value={m.fats} color="var(--tc-success)"
              pct={dailyTargets?.fats ? pct(m.fats, dailyTargets.fats) : undefined} />
          </div>

          {/* Secondary macros */}
          {(m.fiber > 0 || m.sodium > 0 || m.sugar > 0) && (
            <div className="flex gap-3 text-sm text-muted-foreground">
              {m.fiber > 0 && <span>🌿 Fiber <strong className="text-foreground">{m.fiber}g</strong></span>}
              {m.sugar > 0 && <span>🍬 Sugar <strong className="text-foreground">{m.sugar}g</strong></span>}
              {m.sodium > 0 && <span>🧂 Sodium <strong className="text-foreground">{m.sodium}mg</strong></span>}
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-2 pt-2">
            <button onClick={handleAdd}
              className="w-full h-14 rounded-2xl font-black text-base text-primary-foreground"
              style={{ background: 'linear-gradient(135deg, var(--tc-primary), var(--tc-ai))', boxShadow: '0 4px 16px color-mix(in srgb, var(--tc-primary) 30%, transparent)' }}>
              Add to {mealName || 'Meal'}
            </button>
            <button onClick={handleSave} disabled={saving}
              className="w-full h-11 rounded-2xl font-bold text-sm border border-border hover:bg-secondary transition-colors flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookmarkPlus className="w-4 h-4" />}
              Save to My Foods
            </button>
          </div>

          <p className="text-center text-[9px] text-muted-foreground">
            Data sourced from USDA FoodData Central
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}