import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const CATEGORIES = ['Protein', 'Carbs', 'Fats', 'Vegetables', 'Dairy', 'Fruits', 'Other'];
const UNITS = ['g', 'ml', 'oz', 'cup', 'tbsp', 'tsp', 'piece'];

function defaultForm(food) {
  return {
    name:         food?.name         ?? '',
    brand:        food?.brand        ?? '',
    serving_size: food?.serving_size ?? '',
    serving_unit: food?.serving_unit ?? 'g',
    calories:     food?.calories     ?? '',
    protein:      food?.protein      ?? '',
    carbs:        food?.carbs        ?? '',
    fats:         food?.fats         ?? '',
    fiber:        food?.fiber        ?? '',
    sugar:        food?.sugar        ?? '',
    category:     food?.category     ?? 'Protein',
  };
}

function MacroBar({ protein, carbs, fats }) {
  const p = parseFloat(protein) || 0;
  const c = parseFloat(carbs)   || 0;
  const f = parseFloat(fats)    || 0;
  const totalCal = p * 4 + c * 4 + f * 9;
  if (totalCal === 0) return null;

  const pPct = Math.round((p * 4 / totalCal) * 100);
  const cPct = Math.round((c * 4 / totalCal) * 100);
  const fPct = Math.max(100 - pPct - cPct, 0);

  return (
    <div className="space-y-1.5 mt-1">
      <div className="flex h-2.5 rounded-full overflow-hidden bg-secondary">
        <div className="bg-foreground transition-[width] duration-300" style={{ width: `${pPct}%` }} />
        <div className="bg-muted-foreground/70 transition-[width] duration-300" style={{ width: `${cPct}%` }} />
        <div className="bg-input transition-[width] duration-300" style={{ width: `${fPct}%` }} />
      </div>
      <div className="flex justify-between text-[13px] text-muted-foreground tabular-nums">
        <span>Protein {pPct}%</span>
        <span>Carbs {cPct}%</span>
        <span>Fat {fPct}%</span>
      </div>
    </div>
  );
}

export default function FoodItemFormModal({ open, onOpenChange, food, onSubmit }) {
  const [form, setForm] = useState(() => defaultForm(food));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(defaultForm(food));
  }, [open, food]);

  function set(field, val) { setForm(f => ({ ...f, [field]: val })); }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    await onSubmit({
      ...form,
      serving_size: form.serving_size ? Number(form.serving_size) : undefined,
      calories:     form.calories     ? Number(form.calories)     : undefined,
      protein:      form.protein      ? Number(form.protein)      : undefined,
      carbs:        form.carbs        ? Number(form.carbs)        : undefined,
      fats:         form.fats         ? Number(form.fats)         : undefined,
      fiber:        form.fiber        ? Number(form.fiber)        : undefined,
      sugar:        form.sugar        ? Number(form.sugar)        : undefined,
    });
    setSaving(false);
  }

  const labelClass = 'text-sm font-semibold text-foreground block mb-1';
  const isEdit = !!food;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit food' : 'Add food'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Name & Brand */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className={labelClass}>Name</Label>
              <Input placeholder="e.g. Chicken Breast" value={form.name} onChange={e => set('name', e.target.value)} />
            </div>
            <div>
              <Label className={labelClass}>Brand <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <Input placeholder="e.g. Myprotein" value={form.brand} onChange={e => set('brand', e.target.value)} />
            </div>
          </div>

          {/* Serving */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className={labelClass}>Serving size</Label>
              <Input type="number" placeholder="100" value={form.serving_size} onChange={e => set('serving_size', e.target.value)} />
            </div>
            <div>
              <Label className={labelClass}>Unit</Label>
              <select
                value={form.serving_unit}
                onChange={e => set('serving_unit', e.target.value)}
                className="w-full h-9 rounded-lg border border-input bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          {/* Category */}
          <div>
            <Label className={labelClass}>Category</Label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => set('category', cat)}
                  className={cn(
                    'px-3 h-8 rounded-md text-[13px] font-medium border transition-colors',
                    form.category === cat
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card border-input text-foreground hover:bg-accent'
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Main macros */}
          <div>
            <Label className={labelClass}>Macros per serving</Label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { field: 'calories', label: 'Calories', unit: 'kcal', color: '' },
                { field: 'protein',  label: 'Protein',  unit: 'g',    color: '' },
                { field: 'carbs',    label: 'Carbs',    unit: 'g',    color: '' },
                { field: 'fats',     label: 'Fats',     unit: 'g',    color: '' },
              ].map(({ field, label, unit, color }) => (
                <div key={field} className="text-center">
                  <p className={cn('text-[13px] text-muted-foreground mb-1', color)}>{label}<br /><span className="text-muted-foreground font-normal">{unit}</span></p>
                  <Input
                    type="number"
                    placeholder="0"
                    value={form[field]}
                    onChange={e => set(field, e.target.value)}
                    className="text-center text-sm"
                  />
                </div>
              ))}
            </div>
            <MacroBar protein={form.protein} carbs={form.carbs} fats={form.fats} />
          </div>

          {/* Optional macros */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className={labelClass}>Fiber <span className="font-normal text-muted-foreground">(g, optional)</span></Label>
              <Input type="number" placeholder="0" value={form.fiber} onChange={e => set('fiber', e.target.value)} />
            </div>
            <div>
              <Label className={labelClass}>Sugar <span className="font-normal text-muted-foreground">(g, optional)</span></Label>
              <Input type="number" placeholder="0" value={form.sugar} onChange={e => set('sugar', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t border-border mt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !form.name.trim()} className="gap-2 min-w-[100px]">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving</> : isEdit ? 'Save changes' : 'Add food'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}