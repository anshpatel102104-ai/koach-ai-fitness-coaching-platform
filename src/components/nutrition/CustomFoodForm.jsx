import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

const defaults = {
  name: '', brand: '', serving_size: '100g', serving_weight_g: 100,
  calories: '', protein_g: '', carbs_g: '', fats_g: '',
  fiber_g: '', sugar_g: '', sodium_mg: '', notes: '',
  micronutrients: { vitamin_c_mg: '', iron_mg: '', calcium_mg: '', potassium_mg: '', vitamin_d_iu: '' },
};

export default function CustomFoodForm({ open, onOpenChange, food, onSubmit }) {
  const [form, setForm] = useState(defaults);
  const [showMicros, setShowMicros] = useState(false);

  useEffect(() => {
    if (food) {
      setForm({
        ...defaults, ...food,
        micronutrients: { ...defaults.micronutrients, ...(food.micronutrients || {}) },
      });
    } else {
      setForm(defaults);
    }
  }, [food, open]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setMicro = (k, v) => setForm(f => ({ ...f, micronutrients: { ...f.micronutrients, [k]: v } }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const toNum = (v) => v === '' || v == null ? null : Number(v);
    onSubmit({
      ...form,
      calories: toNum(form.calories) || 0,
      protein_g: toNum(form.protein_g),
      carbs_g: toNum(form.carbs_g),
      fats_g: toNum(form.fats_g),
      fiber_g: toNum(form.fiber_g),
      sugar_g: toNum(form.sugar_g),
      sodium_mg: toNum(form.sodium_mg),
      serving_weight_g: toNum(form.serving_weight_g),
      micronutrients: {
        vitamin_c_mg: toNum(form.micronutrients?.vitamin_c_mg),
        iron_mg: toNum(form.micronutrients?.iron_mg),
        calcium_mg: toNum(form.micronutrients?.calcium_mg),
        potassium_mg: toNum(form.micronutrients?.potassium_mg),
        vitamin_d_iu: toNum(form.micronutrients?.vitamin_d_iu),
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{food ? 'Edit food' : 'Custom food'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Food Name *</Label>
              <Input required value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Homemade Protein Bar" />
            </div>
            <div>
              <Label>Brand / Source</Label>
              <Input value={form.brand || ''} onChange={e => set('brand', e.target.value)} placeholder="Optional" />
            </div>
            <div>
              <Label>Serving Size</Label>
              <Input value={form.serving_size || ''} onChange={e => set('serving_size', e.target.value)} placeholder="e.g. 1 bar, 100g" />
            </div>
          </div>

          {/* Main macros */}
          <div>
            <Label className="mb-2 block">Nutrition per serving</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { key: 'calories', label: 'Calories', placeholder: 'kcal' },
                { key: 'protein_g', label: 'Protein (g)', placeholder: 'g' },
                { key: 'carbs_g', label: 'Carbs (g)', placeholder: 'g' },
                { key: 'fats_g', label: 'Fats (g)', placeholder: 'g' },
              ].map(f => (
                <div key={f.key}>
                  <Label className="text-xs">{f.label}</Label>
                  <Input type="number" min="0" step="0.1"
                    value={form[f.key] ?? ''}
                    onChange={e => set(f.key, e.target.value)}
                    placeholder={f.placeholder}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Secondary macros */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { key: 'fiber_g', label: 'Fiber (g)' },
              { key: 'sugar_g', label: 'Sugar (g)' },
              { key: 'sodium_mg', label: 'Sodium (mg)' },
            ].map(f => (
              <div key={f.key}>
                <Label className="text-xs">{f.label}</Label>
                <Input type="number" min="0" step="0.1"
                  value={form[f.key] ?? ''}
                  onChange={e => set(f.key, e.target.value)}
                />
              </div>
            ))}
          </div>

          {/* Micronutrients (collapsible) */}
          <button
            type="button"
            onClick={() => setShowMicros(s => !s)}
            className="text-xs text-primary font-medium hover:underline"
          >
            {showMicros ? '▲ Hide' : '▼ Add'} Micronutrients (optional)
          </button>
          {showMicros && (
            <div className="grid grid-cols-3 gap-2 pt-1">
              {[
                { key: 'vitamin_c_mg', label: 'Vitamin C (mg)' },
                { key: 'iron_mg', label: 'Iron (mg)' },
                { key: 'calcium_mg', label: 'Calcium (mg)' },
                { key: 'potassium_mg', label: 'Potassium (mg)' },
                { key: 'vitamin_d_iu', label: 'Vitamin D (IU)' },
              ].map(f => (
                <div key={f.key}>
                  <Label className="text-xs">{f.label}</Label>
                  <Input type="number" min="0" step="0.1"
                    value={form.micronutrients?.[f.key] ?? ''}
                    onChange={e => setMicro(f.key, e.target.value)}
                  />
                </div>
              ))}
            </div>
          )}

          <div>
            <Label>Notes</Label>
            <Textarea rows={2} value={form.notes || ''} onChange={e => set('notes', e.target.value)} placeholder="Optional notes" />
          </div>

          <div className="flex gap-3 pt-2 border-t border-border">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="flex-1">{food ? 'Save changes' : 'Save food'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}