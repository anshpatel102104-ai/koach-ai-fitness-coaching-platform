import React, { useState } from 'react';
import { Plus, BookmarkPlus, Loader2, ChevronDown } from 'lucide-react';
import { scaleMacros, gramsFromServing } from '@/lib/nutritionUtils';

const UNITS = ['g', 'oz', 'cup', 'tbsp', 'tsp', 'piece', 'serving'];

// Plain source line: "My food", brand, category or generic.
function getSourceTag(food) {
  if (food.source === 'custom') return { label: 'My food' };
  if (food.brand)               return { label: food.brand };
  if (food.category)            return { label: food.category };
  return { label: 'Generic' };
}

export default function FoodResultCard({ food, onAdd, onSave, onTap }) {
  const [qty, setQty]           = useState(100);
  const [unit, setUnit]         = useState('g');
  const [saving, setSaving]     = useState(false);
  const [showServing, setShowServing] = useState(false);

  const grams = gramsFromServing(qty, unit);
  const m     = scaleMacros(food, grams);
  const sourceTag = getSourceTag(food);

  const handleAdd = (e) => {
    e.stopPropagation();
    onAdd({ ...food, ...m, serving_quantity: qty, serving_unit: unit });
  };

  const handleSave = async (e) => {
    e.stopPropagation();
    setSaving(true);
    await onSave(food);
    setSaving(false);
  };

  const source = [sourceTag.label, food.category && food.brand ? food.category : null, food.source !== 'custom' ? 'USDA' : null].filter(Boolean).join(' · ');

  return (
    <div className="px-4 py-3.5 hover:bg-accent/50 transition-colors border-b border-border last:border-0">
      <div className="flex items-start gap-3">
        {/* Food info */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onTap && onTap(food)}>
          <p className="text-[15px] font-semibold text-foreground leading-snug">{food.name}</p>
          <p className="text-[13px] text-muted-foreground mt-0.5 truncate">{source}</p>
          <p className="text-[13px] text-muted-foreground tabular-nums mt-0.5">
            Per 100 g: <span className="text-foreground font-semibold">{food.calories} kcal</span> · {food.protein} g P · {food.carbs} g C · {food.fats} g F
          </p>
          {food.serving_size && (
            <p className="text-[13px] text-muted-foreground">Usual serving {food.serving_size}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={handleSave} disabled={saving}
            className="h-8 w-8 flex items-center justify-center rounded-md border border-input bg-card hover:bg-accent transition-colors text-muted-foreground"
            title="Save to my foods" aria-label="Save to my foods">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookmarkPlus className="w-4 h-4" />}
          </button>
          <button onClick={handleAdd}
            className="flex items-center gap-1 h-8 px-3 rounded-md bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary/85 transition-colors">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </div>

      {/* Serving adjuster */}
      <button
        onClick={() => setShowServing(v => !v)}
        className="touch-compact flex items-center gap-1 mt-2 text-[13px] text-muted-foreground hover:text-foreground transition-colors tabular-nums">
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showServing ? 'rotate-180' : ''}`} />
        Serving: {qty} {unit}, {m.calories} kcal
      </button>

      {showServing && (
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <input
            type="number" min={1} step={unit === 'g' ? 10 : 0.5}
            value={qty}
            onChange={e => setQty(Math.max(0.1, Number(e.target.value)))}
            className="w-20 h-8 text-sm text-center border border-input rounded-md bg-card tabular-nums"
            aria-label="Quantity"
          />
          <select
            value={unit} onChange={e => { setUnit(e.target.value); setQty(unit === 'g' ? 100 : 1); }}
            className="h-8 px-2 text-sm border border-input rounded-md bg-card" aria-label="Unit">
            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
          <span className="text-sm text-muted-foreground tabular-nums">
            <span className="font-semibold text-foreground">{m.calories} kcal</span> · {m.protein} g P · {m.carbs} g C · {m.fats} g F
          </span>
        </div>
      )}
    </div>
  );
}
