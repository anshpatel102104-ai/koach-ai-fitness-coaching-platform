import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { CheckCircle2, EyeOff, Eye, ChevronDown, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CustomFoodForm from '@/components/nutrition/CustomFoodForm';

const CATEGORIES = [
  { id: 'proteins',    label: '🥩 Proteins' },
  { id: 'carbs',       label: '🍞 Carbs' },
  { id: 'fats',        label: '🥑 Fats' },
  { id: 'fruits',      label: '🍎 Fruits' },
  { id: 'vegetables',  label: '🥦 Vegetables' },
  { id: 'dairy',       label: '🥛 Dairy' },
  { id: 'supplements', label: '💊 Supplements' },
];

function FoodRow({ food }) {
  const qc = useQueryClient();
  const [showActions, setShowActions] = useState(false);
  const [editing, setEditing] = useState(false);

  const update = useMutation({
    mutationFn: (data) => db.entities.FoodItem.update(food.id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['food-items'] }),
  });

  const toggleApproved = () => {
    update.mutate({ coach_approved: !food.coach_approved, coach_hidden: false });
    toast.success(food.coach_approved ? 'Removed from approved list' : '✅ Approved!');
  };
  const toggleHidden = () => {
    update.mutate({ coach_hidden: !food.coach_hidden, coach_approved: false });
    toast.success(food.coach_hidden ? 'Unhidden' : 'Hidden from clients');
  };
  const setCategory = (cat) => {
    update.mutate({ approved_category: cat });
  };

  return (
    <>
      <div className={cn(
        'bg-card border rounded-xl overflow-hidden transition-all',
        food.coach_hidden ? 'opacity-50 border-border' : food.coach_approved ? 'border-success' : 'border-border'
      )}>
        <div className="flex items-center gap-3 px-3 py-2.5">
          {/* Approval toggle */}
          <button
            onClick={toggleApproved}
            className={cn('shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
              food.coach_approved ? 'border-success bg-success' : 'border-muted-foreground/30 hover:border-success'
            )}
          >
            {food.coach_approved && <CheckCircle2 className="w-3 h-3 text-white" />}
          </button>

          {/* Food info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{food.name}</p>
            <div className="flex gap-2 text-[11px] text-muted-foreground mt-0.5 flex-wrap">
              {food.calories > 0 && <span className="text-orange-600 font-medium">{food.calories} cal</span>}
              {food.protein_g > 0 && <span>P {food.protein_g}g</span>}
              {food.carbs_g > 0 && <span>C {food.carbs_g}g</span>}
              {food.fats_g > 0 && <span>F {food.fats_g}g</span>}
              {food.serving_size && <span>· {food.serving_size}</span>}
              {food.approved_category && (
                <span className="text-primary font-medium capitalize">
                  · {food.approved_category}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <button
            onClick={() => setShowActions(a => !a)}
            className="p-1.5 text-muted-foreground hover:bg-secondary rounded-lg"
          >
            <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', showActions && 'rotate-180')} />
          </button>
        </div>

        {showActions && (
          <div className="border-t border-border px-3 py-2.5 bg-secondary/20 flex items-center gap-2 flex-wrap">
            <Select value={food.approved_category || ''} onValueChange={setCategory}>
              <SelectTrigger className="h-7 text-xs w-36 bg-card">
                <SelectValue placeholder="Set category…" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c.id} value={c.id} className="text-xs">{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <button
              onClick={toggleHidden}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-lg hover:bg-card border border-border bg-card"
            >
              {food.coach_hidden ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              {food.coach_hidden ? 'Unhide' : 'Hide from clients'}
            </button>
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-lg hover:bg-card border border-border bg-card"
            >
              <Edit2 className="w-3 h-3" /> Edit macros
            </button>
          </div>
        )}
      </div>

      <CustomFoodForm
        open={editing}
        onOpenChange={setEditing}
        food={food}
        onSubmit={(data) => { update.mutate(data); setEditing(false); toast.success('Updated!'); }}
      />
    </>
  );
}

export default function ApprovedFoodsSection({ foods }) {
  const approvedFoods = foods.filter(f => f.coach_approved && !f.coach_hidden);
  const hiddenFoods   = foods.filter(f => f.coach_hidden);
  const unapproved    = foods.filter(f => !f.coach_approved && !f.coach_hidden);

  const byCategory = CATEGORIES.reduce((acc, cat) => {
    acc[cat.id] = approvedFoods.filter(f => f.approved_category === cat.id);
    return acc;
  }, {});
  const uncategorized = approvedFoods.filter(f => !f.approved_category);

  if (foods.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <CheckCircle2 className="w-10 h-10 mx-auto mb-3 opacity-20" />
        <p className="font-semibold text-foreground text-sm">No foods saved yet</p>
        <p className="text-sm mt-1">Use "Search Food Database" above to find and save foods</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Approved by category — the main focus */}
      {approvedFoods.length > 0 && (
        <div className="space-y-5">
          {CATEGORIES.map(cat => {
            const items = byCategory[cat.id];
            if (!items.length) return null;
            return (
              <div key={cat.id}>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">{cat.label}</p>
                <div className="space-y-1.5">{items.map(f => <FoodRow key={f.id} food={f} />)}</div>
              </div>
            );
          })}
          {uncategorized.length > 0 && (
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">📦 Uncategorized</p>
              <div className="space-y-1.5">{uncategorized.map(f => <FoodRow key={f.id} food={f} />)}</div>
            </div>
          )}
        </div>
      )}

      {/* Saved but not yet approved — secondary */}
      {unapproved.length > 0 && (
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">🕐 Not Yet Reviewed ({unapproved.length})</p>
          <p className="text-xs text-muted-foreground mb-2">Click the circle to approve these foods for clients.</p>
          <div className="space-y-1.5">{unapproved.map(f => <FoodRow key={f.id} food={f} />)}</div>
        </div>
      )}

      {/* Hidden — lowest priority */}
      {hiddenFoods.length > 0 && (
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <EyeOff className="w-3 h-3" /> Hidden ({hiddenFoods.length})
          </p>
          <div className="space-y-1.5">{hiddenFoods.map(f => <FoodRow key={f.id} food={f} />)}</div>
        </div>
      )}
    </div>
  );
}