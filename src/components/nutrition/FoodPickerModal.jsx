import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { CheckCircle2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import FoodSearchResults from './FoodSearchResults';

const CATEGORIES = [
  { id: 'proteins', label: '🥩 Proteins' },
  { id: 'carbs', label: '🍞 Carbs' },
  { id: 'fats', label: '🥑 Fats' },
  { id: 'fruits', label: '🍎 Fruits' },
  { id: 'vegetables', label: '🥦 Vegetables' },
  { id: 'supplements', label: '💊 Supplements' },
];

function MacroPill({ label, value, color }) {
  if (!value) return null;
  return <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full', color)}>{label}: {value}</span>;
}

export default function FoodPickerModal({ open, onOpenChange, onSelect }) {
  const [tab, setTab] = useState('approved');

  const { data: savedFoods = [] } = useQuery({
    queryKey: ['food-items'],
    queryFn: () => db.entities.FoodItem.list('-created_date', 200),
    enabled: open,
  });

  // Only show approved, non-hidden foods to clients
  const approvedFoods = savedFoods.filter(f => f.coach_approved && !f.coach_hidden);

  const byCategory = CATEGORIES.reduce((acc, cat) => {
    acc[cat.id] = approvedFoods.filter(f => f.approved_category === cat.id);
    return acc;
  }, {});
  const uncategorized = approvedFoods.filter(f => !f.approved_category);

  const handleSelect = (food) => {
    onSelect({
      food_name: food.name,
      portion: food.serving_size || '100g',
      calories: food.calories || 0,
      protein: food.protein_g || 0,
      carbs: food.carbs_g || 0,
      fats: food.fats_g || 0,
      swap_options: [],
    });
    onOpenChange(false);
  };

  const FoodButton = ({ food }) => (
    <button
      onClick={() => handleSelect(food)}
      className="w-full text-left bg-card border border-border rounded-xl px-4 py-3 hover:border-primary/40 hover:bg-primary/5 transition-all"
    >
      <p className="text-sm font-semibold text-foreground">{food.name}</p>
      <div className="flex gap-1 mt-1 flex-wrap">
        <MacroPill label="Cal" value={food.calories} color="bg-orange-50 text-orange-600" />
        <MacroPill label="P" value={food.protein_g ? `${food.protein_g}g` : null} color="bg-accent text-primary" />
        <MacroPill label="C" value={food.carbs_g ? `${food.carbs_g}g` : null} color="bg-warning/10 text-warning" />
        <MacroPill label="F" value={food.fats_g ? `${food.fats_g}g` : null} color="bg-destructive/10 text-destructive" />
        {food.serving_size && <span className="text-[10px] text-muted-foreground">per {food.serving_size}</span>}
      </div>
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Food</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 bg-secondary/40 rounded-lg p-1 shrink-0">
          <button
            onClick={() => setTab('approved')}
            className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-semibold transition-all',
              tab === 'approved' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-success" /> Coach Approved ({approvedFoods.length})
          </button>
          <button
            onClick={() => setTab('search')}
            className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-semibold transition-all',
              tab === 'search' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Search className="w-3.5 h-3.5" /> All Foods
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Approved tab — organized by category */}
          {tab === 'approved' && (
            <div>
              {approvedFoods.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">No approved foods yet</p>
                  <p className="text-xs mt-1">Your coach hasn't approved any foods yet.<br />Use "All Foods" to search manually.</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {CATEGORIES.map(cat => {
                    const items = byCategory[cat.id];
                    if (!items.length) return null;
                    return (
                      <div key={cat.id}>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{cat.label}</p>
                        <div className="space-y-1.5">
                          {items.map(food => <FoodButton key={food.id} food={food} />)}
                        </div>
                      </div>
                    );
                  })}
                  {uncategorized.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Other</p>
                      <div className="space-y-1.5">
                        {uncategorized.map(food => <FoodButton key={food.id} food={food} />)}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* All foods search */}
          {tab === 'search' && (
            <FoodSearchResults selectMode onSelect={handleSelect} isSaved={() => false} onSave={() => {}} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}