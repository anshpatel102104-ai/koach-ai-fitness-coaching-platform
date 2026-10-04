import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Plus, Trash2, Edit2, ChevronDown, ChevronUp, Utensils } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const CATEGORY_LABELS = {
  breakfast: '🌅 Breakfast',
  lunch: '☀️ Lunch',
  dinner: '🌙 Dinner',
  snack: '🍎 Snack',
  pre_workout: '⚡ Pre-Workout',
  post_workout: '💪 Post-Workout',
  other: '📋 Other',
};

const defaultForm = { name: '', category: 'other', calories: '', protein_g: '', carbs_g: '', fats_g: '', instructions: '', foods: [] };

function MealTemplateForm({ open, onOpenChange, template, onSubmit }) {
  const [form, setForm] = useState(defaultForm);
  const [newFood, setNewFood] = useState({ food_name: '', portion: '', calories: '', protein: '', carbs: '', fats: '' });

  React.useEffect(() => {
    setForm(template ? { ...defaultForm, ...template } : defaultForm);
  }, [template, open]);

  const addFood = () => {
    if (!newFood.food_name) return;
    setForm(f => ({ ...f, foods: [...(f.foods || []), { ...newFood, calories: Number(newFood.calories) || 0, protein: Number(newFood.protein) || 0, carbs: Number(newFood.carbs) || 0, fats: Number(newFood.fats) || 0 }] }));
    setNewFood({ food_name: '', portion: '', calories: '', protein: '', carbs: '', fats: '' });
  };

  const removeFood = (i) => setForm(f => ({ ...f, foods: f.foods.filter((_, idx) => idx !== i) }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...form, calories: Number(form.calories) || 0, protein_g: Number(form.protein_g) || 0, carbs_g: Number(form.carbs_g) || 0, fats_g: Number(form.fats_g) || 0 });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{template ? 'Edit Meal Template' : 'New Meal Template'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Meal Name *</Label>
              <Input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. High Protein Breakfast" />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Total Calories</Label>
              <Input type="number" value={form.calories} onChange={e => setForm(f => ({ ...f, calories: e.target.value }))} placeholder="kcal" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {['protein_g', 'carbs_g', 'fats_g'].map(k => (
              <div key={k}>
                <Label className="text-xs capitalize">{k.replace('_g', '').replace('_', ' ')} (g)</Label>
                <Input type="number" value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
              </div>
            ))}
          </div>

          {/* Foods list */}
          <div>
            <Label className="mb-2 block">Foods in This Meal</Label>
            {(form.foods || []).map((food, i) => (
              <div key={i} className="flex items-center gap-2 bg-secondary/30 rounded-lg px-3 py-2 mb-1.5">
                <span className="flex-1 text-sm font-medium truncate">{food.food_name}</span>
                <span className="text-xs text-muted-foreground">{food.portion}</span>
                <span className="text-xs text-orange-600">{food.calories} cal</span>
                <button type="button" onClick={() => removeFood(i)} className="text-destructive hover:opacity-70">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <div className="grid grid-cols-12 gap-1.5 mt-2 items-end">
              <div className="col-span-4"><Input placeholder="Food name" value={newFood.food_name} onChange={e => setNewFood(f => ({ ...f, food_name: e.target.value }))} className="h-8 text-xs" /></div>
              <div className="col-span-2"><Input placeholder="Portion" value={newFood.portion} onChange={e => setNewFood(f => ({ ...f, portion: e.target.value }))} className="h-8 text-xs" /></div>
              <div className="col-span-2"><Input type="number" placeholder="Cal" value={newFood.calories} onChange={e => setNewFood(f => ({ ...f, calories: e.target.value }))} className="h-8 text-xs" /></div>
              <div className="col-span-1"><Input type="number" placeholder="P" value={newFood.protein} onChange={e => setNewFood(f => ({ ...f, protein: e.target.value }))} className="h-8 text-xs" /></div>
              <div className="col-span-1"><Input type="number" placeholder="C" value={newFood.carbs} onChange={e => setNewFood(f => ({ ...f, carbs: e.target.value }))} className="h-8 text-xs" /></div>
              <div className="col-span-1"><Input type="number" placeholder="F" value={newFood.fats} onChange={e => setNewFood(f => ({ ...f, fats: e.target.value }))} className="h-8 text-xs" /></div>
              <div className="col-span-1">
                <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={addFood}><Plus className="w-3.5 h-3.5" /></Button>
              </div>
            </div>
          </div>

          <div>
            <Label>Instructions / Notes</Label>
            <Textarea rows={2} value={form.instructions || ''} onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))} placeholder="Prep tips, cooking notes…" />
          </div>

          <div className="flex gap-3 pt-2 border-t border-border">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="flex-1">{template ? 'Update' : 'Save Template'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TemplateCard({ template, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground">{template.name}</p>
            <Badge variant="secondary" className="text-[10px]">{CATEGORY_LABELS[template.category] || template.category}</Badge>
          </div>
          <div className="flex gap-1 mt-1 flex-wrap">
            {template.calories > 0 && <span className="text-[10px] text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full">Cal: {template.calories}</span>}
            {template.protein_g > 0 && <span className="text-[10px] text-primary bg-accent px-1.5 py-0.5 rounded-full">P: {template.protein_g}g</span>}
            {template.carbs_g > 0 && <span className="text-[10px] text-warning bg-warning/10 px-1.5 py-0.5 rounded-full">C: {template.carbs_g}g</span>}
            {template.fats_g > 0 && <span className="text-[10px] text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-full">F: {template.fats_g}g</span>}
            {template.foods?.length > 0 && <span className="text-[10px] text-muted-foreground">{template.foods.length} foods</span>}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onEdit} className="p-1.5 text-muted-foreground hover:bg-secondary rounded-lg"><Edit2 className="w-3.5 h-3.5" /></button>
          <button onClick={onDelete} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-secondary rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
          <button onClick={() => setExpanded(e => !e)} className="p-1.5 text-muted-foreground hover:bg-secondary rounded-lg">
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-border px-4 py-3 bg-secondary/20 space-y-2">
          {template.instructions && <p className="text-xs text-muted-foreground italic">{template.instructions}</p>}
          {(template.foods || []).map((f, i) => (
            <div key={i} className="flex gap-2 text-xs">
              <span className="font-medium flex-1">{f.food_name}</span>
              <span className="text-muted-foreground">{f.portion}</span>
              <span className="text-orange-600">{f.calories} cal</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MealTemplatesSection() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['meal-templates'],
    queryFn: () => db.entities.MealTemplate.list('-created_date', 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => db.entities.MealTemplate.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['meal-templates'] }); toast.success('Template saved!'); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.MealTemplate.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['meal-templates'] }); toast.success('Template updated!'); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.MealTemplate.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['meal-templates'] }); toast.success('Template deleted'); },
  });

  const byCategory = Object.keys(CATEGORY_LABELS).reduce((acc, cat) => {
    acc[cat] = templates.filter(t => t.category === cat);
    return acc;
  }, {});

  if (isLoading) return <div className="py-20 text-center text-muted-foreground">Loading…</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-sm text-muted-foreground">Create reusable meal templates to quickly build client meal plans.</p>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-1" /> New Template
        </Button>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Utensils className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-semibold text-foreground">No meal templates yet</p>
          <p className="text-sm mt-1">Create templates to speed up meal plan building</p>
          <Button size="sm" className="mt-4" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-1" /> Create First Template
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(CATEGORY_LABELS).map(([cat, label]) => {
            const items = byCategory[cat];
            if (!items.length) return null;
            return (
              <div key={cat}>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">{label}</p>
                <div className="space-y-2">
                  {items.map(t => (
                    <TemplateCard
                      key={t.id}
                      template={t}
                      onEdit={() => { setEditing(t); setShowForm(true); }}
                      onDelete={() => deleteMutation.mutate(t.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <MealTemplateForm
        open={showForm}
        onOpenChange={setShowForm}
        template={editing}
        onSubmit={(data) => {
          if (editing) updateMutation.mutate({ id: editing.id, data });
          else createMutation.mutate(data);
          setShowForm(false);
        }}
      />
    </div>
  );
}