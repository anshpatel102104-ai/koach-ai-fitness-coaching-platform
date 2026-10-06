import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Plus, Trash2, Edit2, ChevronDown } from 'lucide-react';
import { Panel, EmptyState } from '@/components/kit';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const CATEGORY_LABELS = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
  pre_workout: 'Pre-workout',
  post_workout: 'Post-workout',
  other: 'Other',
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
        <DialogHeader><DialogTitle>{template ? 'Edit meal template' : 'New meal template'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Meal name</Label>
              <Input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="High-protein breakfast" />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Total calories</Label>
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
            <Label className="mb-2 block">Foods in this meal</Label>
            {(form.foods || []).map((food, i) => (
              <div key={i} className="flex items-center gap-2 border-b border-border py-2">
                <span className="flex-1 text-sm font-medium truncate">{food.food_name}</span>
                <span className="text-xs text-muted-foreground">{food.portion}</span>
                <span className="text-xs text-foreground tabular-nums">{food.calories} kcal</span>
                <button type="button" onClick={() => removeFood(i)} className="text-muted-foreground hover:text-destructive" aria-label="Remove food">
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
            <Label>Prep notes</Label>
            <Textarea rows={2} value={form.instructions || ''} onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))} placeholder="Prep tips, cooking notes…" />
          </div>

          <div className="flex gap-3 pt-2 border-t border-border">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="flex-1">{template ? 'Save changes' : 'Save template'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TemplateCard({ template, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const macros = [
    template.protein_g > 0 ? `${template.protein_g} g P` : null,
    template.carbs_g > 0 ? `${template.carbs_g} g C` : null,
    template.fats_g > 0 ? `${template.fats_g} g F` : null,
    template.foods?.length > 0 ? `${template.foods.length} foods` : null,
  ].filter(Boolean).join(' · ');
  return (
    <div className="border-b border-border last:border-b-0">
      <div className="flex items-center gap-3 px-5 py-3">
        <button onClick={() => setExpanded(e => !e)} className="flex-1 min-w-0 text-left" aria-expanded={expanded}>
          <p className="text-[15px] font-semibold text-foreground truncate">{template.name}</p>
          {macros && <p className="text-[13px] text-muted-foreground tabular-nums">{macros}</p>}
        </button>
        {template.calories > 0 && (
          <span className="flex items-baseline gap-1 flex-shrink-0">
            <span className="num text-lg text-foreground">{template.calories}</span>
            <span className="text-[13px] text-muted-foreground">kcal</span>
          </span>
        )}
        <div className="flex items-center gap-0.5 shrink-0">
          <button onClick={onEdit} aria-label="Edit template" className="touch-compact p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md"><Edit2 className="w-4 h-4" /></button>
          <button onClick={onDelete} aria-label="Delete template" className="touch-compact p-1.5 text-muted-foreground hover:text-destructive hover:bg-accent rounded-md"><Trash2 className="w-4 h-4" /></button>
          <button onClick={() => setExpanded(e => !e)} aria-label="Show foods" className="touch-compact p-1.5 text-muted-foreground hover:bg-accent rounded-md">
            <ChevronDown className={cn('w-4 h-4 transition-transform', expanded && 'rotate-180')} />
          </button>
        </div>
      </div>
      {expanded && (
        <div className="px-5 pb-3 space-y-1.5">
          {template.instructions && <p className="text-sm text-muted-foreground">{template.instructions}</p>}
          {(template.foods || []).map((f, i) => (
            <div key={i} className="flex gap-3 text-sm border-t border-border pt-1.5">
              <span className="flex-1 text-foreground">{f.food_name}</span>
              <span className="text-muted-foreground">{f.portion}</span>
              <span className="text-foreground tabular-nums">{f.calories} kcal</span>
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['meal-templates'] }); toast.success('Template saved'); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.MealTemplate.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['meal-templates'] }); toast.success('Template updated'); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.MealTemplate.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['meal-templates'] }); toast.success('Template deleted'); },
  });

  const byCategory = Object.keys(CATEGORY_LABELS).reduce((acc, cat) => {
    acc[cat] = templates.filter(t => t.category === cat);
    return acc;
  }, {});

  if (isLoading) return <Panel className="h-40 animate-pulse" aria-hidden />;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Meals you reuse across plans. Drop one in instead of building it again.</p>
        <Button size="sm" onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus /> New template
        </Button>
      </div>

      {templates.length === 0 ? (
        <Panel>
          <EmptyState
            title="No meal templates yet."
            body="Save a meal you use often, like your standard high-protein breakfast."
            action={<Button size="sm" onClick={() => { setEditing(null); setShowForm(true); }}><Plus /> New template</Button>}
          />
        </Panel>
      ) : (
        Object.entries(CATEGORY_LABELS).map(([cat, label]) => {
          const items = byCategory[cat];
          if (!items.length) return null;
          return (
            <Panel key={cat} className="overflow-hidden">
              <div className="px-5 pt-4 pb-2 flex items-baseline justify-between">
                <h2 className="text-[20px] text-foreground">{label}</h2>
                <span className="text-[13px] text-muted-foreground tabular-nums">{items.length}</span>
              </div>
              <div className="border-t border-border">
                {items.map(t => (
                  <TemplateCard
                    key={t.id}
                    template={t}
                    onEdit={() => { setEditing(t); setShowForm(true); }}
                    onDelete={() => deleteMutation.mutate(t.id)}
                  />
                ))}
              </div>
            </Panel>
          );
        })
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