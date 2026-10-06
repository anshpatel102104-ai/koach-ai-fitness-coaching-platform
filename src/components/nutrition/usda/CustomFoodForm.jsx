import React, { useState } from 'react';
import { db } from '@/api/supabaseClient';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function CustomFoodForm({ onAdd, onSave, onCancel }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', brand: '', serving_size: '100', serving_unit: 'g',
    calories: '', protein: '', carbs: '', fats: '',
    fiber: '', sugar: '', sodium: '',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const valid = form.name.trim() && form.calories !== '' && form.protein !== '' && form.carbs !== '' && form.fats !== '';

  const toFood = () => ({
    id: `custom_${Date.now()}`,
    name: form.name.trim(),
    brand: form.brand.trim(),
    serving_size: `${form.serving_size}${form.serving_unit}`,
    calories:  Number(form.calories)  || 0,
    protein:   Number(form.protein)   || 0,
    carbs:     Number(form.carbs)     || 0,
    fats:      Number(form.fats)      || 0,
    fiber:     Number(form.fiber)     || 0,
    sugar:     Number(form.sugar)     || 0,
    sodium:    Number(form.sodium)    || 0,
    category:  'Custom',
    source:    'custom',
  });

  const handleSave = async () => {
    if (!valid) return;
    setSaving(true);
    const food = toFood();
    try {
      await db.entities.FoodItem.create({ ...food, serving_size: food.serving_size, source: 'custom' });
      toast.success(`"${food.name}" saved to My Foods`);
      if (onSave) onSave(food);
    } catch {
      toast.error('Failed to save food');
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = () => {
    if (!valid) return;
    onAdd(toFood(), Number(form.serving_size) || 100, form.serving_unit);
  };

  const Field = ({ k, label, required, type = 'text', half = false }) => (
    <div className={half ? '' : 'col-span-2'}>
      <label className="block text-[13px] text-muted-foreground mb-1">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      <input
        type={type} value={form[k]} onChange={e => set(k, e.target.value)}
        className="w-full h-9 px-3 text-sm border border-input rounded-md bg-card focus:outline-none focus:ring-2 focus:ring-ring"
        placeholder={type === 'number' ? '0' : ''}
      />
    </div>
  );

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <p className="text-sm font-semibold text-foreground">Custom food</p>

      <div className="grid grid-cols-2 gap-2">
        <Field k="name" label="Food Name" required />
        <Field k="brand" label="Brand" half />
        <div>
          <label className="block text-[13px] text-muted-foreground mb-1">Serving size <span className="text-destructive">*</span></label>
          <div className="flex gap-1.5">
            <input type="number" value={form.serving_size} onChange={e => set('serving_size', e.target.value)}
              className="flex-1 h-9 px-2 text-sm border border-input rounded-md bg-card focus:outline-none focus:ring-2 focus:ring-ring" />
            <select value={form.serving_unit} onChange={e => set('serving_unit', e.target.value)}
              className="h-9 px-2 text-xs border border-input rounded-md bg-card">
              {['g','oz','cup','tbsp','tsp','piece'].map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>
        <Field k="calories" label="Calories" required type="number" half />
        <Field k="protein"  label="Protein (g)" required type="number" half />
        <Field k="carbs"    label="Carbs (g)" required type="number" half />
        <Field k="fats"     label="Fats (g)" required type="number" half />
        <Field k="fiber"    label="Fiber (g)" type="number" half />
        <Field k="sugar"    label="Sugar (g)" type="number" half />
        <Field k="sodium"   label="Sodium (mg)" type="number" half />
      </div>

      <div className="flex gap-2 pt-1">
        {onCancel && (
          <button onClick={onCancel} className="h-9 px-4 rounded-md border border-input bg-card text-[13px] font-semibold hover:bg-accent transition-colors">
            Cancel
          </button>
        )}
        <button onClick={handleSave} disabled={!valid || saving}
          className="flex-1 h-9 rounded-md border border-input bg-card text-[13px] font-semibold hover:bg-accent transition-colors flex items-center justify-center gap-1 disabled:opacity-40">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
          Save to my foods
        </button>
        <button onClick={handleAdd} disabled={!valid}
          className="flex-1 h-9 rounded-md bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary/85 transition-colors disabled:opacity-40">
          Add to log
        </button>
      </div>
    </div>
  );
}