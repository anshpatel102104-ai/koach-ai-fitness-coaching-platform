import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Check, EyeOff, Eye, ChevronDown, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Panel, EmptyState } from '@/components/kit';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CustomFoodForm from '@/components/nutrition/CustomFoodForm';

const CATEGORIES = [
  { id: 'proteins',    label: 'Proteins' },
  { id: 'carbs',       label: 'Carbs' },
  { id: 'fats',        label: 'Fats' },
  { id: 'fruits',      label: 'Fruit' },
  { id: 'vegetables',  label: 'Vegetables' },
  { id: 'dairy',       label: 'Dairy' },
  { id: 'supplements', label: 'Supplements' },
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
    toast.success(food.coach_approved ? 'Removed from approved list' : 'Approved for clients');
  };
  const toggleHidden = () => {
    update.mutate({ coach_hidden: !food.coach_hidden, coach_approved: false });
    toast.success(food.coach_hidden ? 'Unhidden' : 'Hidden from clients');
  };
  const setCategory = (cat) => {
    update.mutate({ approved_category: cat });
  };

  const macros = [
    food.protein_g > 0 ? `${food.protein_g} g P` : null,
    food.carbs_g > 0 ? `${food.carbs_g} g C` : null,
    food.fats_g > 0 ? `${food.fats_g} g F` : null,
    food.serving_size || null,
  ].filter(Boolean).join(' · ');

  return (
    <>
      <div className={cn('border-b border-border last:border-b-0', food.coach_hidden && 'opacity-60')}>
        <div className="flex items-center gap-3 px-5 py-3">
          {/* Approval toggle */}
          <button
            onClick={toggleApproved}
            aria-label={food.coach_approved ? 'Remove approval' : 'Approve for clients'}
            title={food.coach_approved ? 'Remove approval' : 'Approve for clients'}
            className={cn('touch-compact shrink-0 w-5 h-5 rounded-[5px] border flex items-center justify-center transition-colors',
              food.coach_approved ? 'border-success bg-success' : 'border-input hover:border-foreground'
            )}
          >
            {food.coach_approved && <Check className="w-3 h-3 text-card" />}
          </button>

          {/* Food info */}
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-semibold text-foreground truncate">{food.name}</p>
            {macros && <p className="text-[13px] text-muted-foreground tabular-nums truncate">{macros}</p>}
          </div>

          {food.calories > 0 && (
            <span className="flex items-baseline gap-1 flex-shrink-0">
              <span className="num text-lg text-foreground">{food.calories}</span>
              <span className="text-[13px] text-muted-foreground">kcal</span>
            </span>
          )}

          {/* Actions */}
          <button
            onClick={() => setShowActions(a => !a)}
            aria-label="Food options"
            aria-expanded={showActions}
            className="touch-compact p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground rounded-md"
          >
            <ChevronDown className={cn('w-4 h-4 transition-transform', showActions && 'rotate-180')} />
          </button>
        </div>

        {showActions && (
          <div className="px-5 pb-3 pl-[52px] flex items-center gap-2 flex-wrap">
            <Select value={food.approved_category || ''} onValueChange={setCategory}>
              <SelectTrigger className="h-8 text-[13px] w-40">
                <SelectValue placeholder="Set aisle" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={toggleHidden}>
              {food.coach_hidden ? <Eye /> : <EyeOff />}
              {food.coach_hidden ? 'Show to clients' : 'Hide from clients'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Edit2 /> Edit macros
            </Button>
          </div>
        )}
      </div>

      <CustomFoodForm
        open={editing}
        onOpenChange={setEditing}
        food={food}
        onSubmit={(data) => { update.mutate(data); setEditing(false); toast.success('Food updated'); }}
      />
    </>
  );
}

function Group({ title, sub, items }) {
  return (
    <Panel className="overflow-hidden">
      <div className="px-5 pt-4 pb-2 flex items-baseline justify-between gap-3">
        <h2 className="text-[20px] text-foreground">{title}</h2>
        <span className="text-[13px] text-muted-foreground tabular-nums">{items.length}</span>
      </div>
      {sub && <p className="px-5 -mt-1 pb-2 text-[13px] text-muted-foreground">{sub}</p>}
      <div className="border-t border-border">{items.map(f => <FoodRow key={f.id} food={f} />)}</div>
    </Panel>
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
      <Panel>
        <EmptyState
          title="No foods saved yet."
          body="Search the food database above and save the foods you want clients to pick from."
        />
      </Panel>
    );
  }

  return (
    <div className="space-y-5">
      {/* Approved, grouped by aisle */}
      {CATEGORIES.map(cat => {
        const items = byCategory[cat.id];
        if (!items.length) return null;
        return <Group key={cat.id} title={cat.label} items={items} />;
      })}
      {uncategorized.length > 0 && (
        <Group title={approvedFoods.length === uncategorized.length ? 'Approved' : 'Approved, no aisle yet'} items={uncategorized} />
      )}

      {/* Saved but not yet approved */}
      {unapproved.length > 0 && (
        <Group title="Not reviewed yet" sub="Tick a food to approve it for clients." items={unapproved} />
      )}

      {/* Hidden */}
      {hiddenFoods.length > 0 && (
        <Group title="Hidden from clients" items={hiddenFoods} />
      )}
    </div>
  );
}
