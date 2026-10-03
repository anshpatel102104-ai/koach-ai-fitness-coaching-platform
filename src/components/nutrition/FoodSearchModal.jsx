import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { UtensilsCrossed } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { db } from '@/api/supabaseClient';
import { toast } from 'sonner';
import { addRecentFood } from '@/lib/nutritionUtils';
import { useFoodSearch } from '@/components/nutrition/usda/useFoodSearch';
import FoodSearchBar from '@/components/nutrition/usda/FoodSearchBar';
import FoodResultCard from '@/components/nutrition/usda/FoodResultCard';
import FoodDetailSheet from '@/components/nutrition/usda/FoodDetailSheet';
import CustomFoodForm from '@/components/nutrition/usda/CustomFoodForm';
import RecentFoodsSection from '@/components/nutrition/usda/RecentFoodsSection';

function SkeletonRows({ count = 4 }) {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 px-4 py-3 animate-pulse">
          <div className="flex-1 space-y-2">
            <div className="h-3.5 bg-secondary rounded w-3/4" />
            <div className="h-2.5 bg-secondary rounded w-1/3" />
            <div className="flex gap-1">
              {[1,2,3,4].map(j => <div key={j} className="h-5 w-16 bg-secondary rounded-full" />)}
            </div>
          </div>
          <div className="space-y-1.5 shrink-0">
            <div className="h-8 w-14 bg-secondary rounded-lg" />
            <div className="h-8 w-8 bg-secondary rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function FoodSearchModal({ open, onOpenChange, mealName, onAddFood, dailyTargets }) {
  const [tab, setTab]               = useState('search');
  const [showCustom, setShowCustom] = useState(false);
  const [detailFood, setDetailFood] = useState(null);

  const {
    query, setQuery, results, isLoading, hasError,
    total, hasMore, loadMore, clear, isSearching, showEmpty,
  } = useFoodSearch();

  // Reset on close
  useEffect(() => {
    if (!open) { clear(); setShowCustom(false); setDetailFood(null); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleAdd = (food) => {
    onAddFood({
      food_name:        food.name,
      calories:         food.calories,
      protein:          food.protein,
      carbs:            food.carbs,
      fats:             food.fats,
      fiber:            food.fiber || 0,
      serving_quantity: food.serving_quantity || 100,
      serving_unit:     food.serving_unit || 'g',
    });
    addRecentFood(food);
    onOpenChange(false);
  };

  const handleSave = async (food) => {
    try {
      await db.entities.FoodItem.create({
        name: food.name, brand: food.brand || '',
        calories: food.calories, protein: food.protein, carbs: food.carbs, fats: food.fats,
        fiber: food.fiber || 0, sodium: food.sodium || 0,
        serving_size: food.serving_size || '100g', source: food.source || 'usda', category: food.category || '',
      });
      toast.success(`"${food.name}" saved`);
    } catch { toast.error('Could not save food'); }
  };

  const TABS = [
    { id: 'search',  label: 'Search' },
    { id: 'recent',  label: 'Recent / Saved' },
    { id: 'custom',  label: '+ Custom' },
  ];

  // Group results into common vs branded
  const common   = results.filter(f => !f.brand);
  const branded  = results.filter(f => !!f.brand);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[88vh] flex flex-col p-0 gap-0">

          {/* Header */}
          <DialogHeader className="px-5 pt-5 pb-3 border-b border-border flex-shrink-0">
            <DialogTitle className="text-base font-bold">
              Add Food{mealName ? <span className="text-muted-foreground font-normal"> → {mealName}</span> : ''}
            </DialogTitle>

            {/* Tabs */}
            <div className="flex gap-0 mt-3 bg-secondary rounded-lg p-0.5">
              {TABS.map(t => (
                <button key={t.id}
                  onClick={() => { setTab(t.id); if (t.id !== 'search') clear(); }}
                  className={cn('flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors',
                    tab === t.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  )}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Search bar — only on search tab */}
            {tab === 'search' && (
              <div className="mt-3">
                <FoodSearchBar
                  query={query} onChange={setQuery} onClear={clear}
                  isSearching={isSearching}
                />
              </div>
            )}
          </DialogHeader>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">

            {/* SEARCH TAB */}
            {tab === 'search' && (
              <>
                {!query || query.length < 2 ? (
                  <div className="flex flex-col items-center gap-3 py-12 px-6 text-center">
                    <UtensilsCrossed className="w-10 h-10 text-muted-foreground/20" />
                    <p className="text-sm font-semibold">Search USDA FoodData Central</p>
                    <p className="text-xs text-muted-foreground">Accurate nutrient data for 600k+ foods. Type 2+ characters.</p>
                  </div>
                ) : isLoading && results.length === 0 ? (
                  <SkeletonRows />
                ) : hasError ? (
                  <div className="p-6">
                    <p className="text-center text-sm font-semibold mb-1">Couldn't reach food database</p>
                    <p className="text-center text-xs text-muted-foreground mb-4">Add your food manually below.</p>
                    <CustomFoodForm onAdd={handleAdd} onSave={handleSave} />
                  </div>
                ) : showEmpty ? (
                  <div className="p-6">
                    <div className="flex flex-col items-center gap-2 py-6">
                      <UtensilsCrossed className="w-8 h-8 text-muted-foreground/20" />
                      <p className="text-sm font-semibold">No results for "{query}"</p>
                      <p className="text-xs text-muted-foreground mb-2">Try a different term or create a custom food.</p>
                    </div>
                    <CustomFoodForm onAdd={handleAdd} onSave={handleSave} />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between px-4 py-2 bg-secondary/30 border-b border-border">
                      <p className="text-xs text-muted-foreground">{total.toLocaleString()} results · USDA FoodData Central</p>
                      <button onClick={() => setShowCustom(v => !v)}
                        className="text-xs font-semibold text-primary">
                        {showCustom ? 'Hide Custom' : '+ Custom Food'}
                      </button>
                    </div>

                    {showCustom && (
                      <div className="px-4 py-3 border-b border-border bg-secondary/10">
                        <CustomFoodForm onAdd={handleAdd} onSave={handleSave} onCancel={() => setShowCustom(false)} />
                      </div>
                    )}

                    {/* Common foods group */}
                    {common.length > 0 && (
                      <>
                        <div className="px-4 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-secondary/20 border-b border-border">
                          Common Foods
                        </div>
                        {common.map(food => (
                          <FoodResultCard key={food.id} food={food}
                            onAdd={handleAdd} onSave={handleSave} onTap={setDetailFood} />
                        ))}
                      </>
                    )}

                    {/* Branded foods group */}
                    {branded.length > 0 && (
                      <>
                        <div className="px-4 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-secondary/20 border-b border-border">
                          Branded Foods
                        </div>
                        {branded.map(food => (
                          <FoodResultCard key={food.id} food={food}
                            onAdd={handleAdd} onSave={handleSave} onTap={setDetailFood} />
                        ))}
                      </>
                    )}

                    {/* Load more */}
                    {hasMore && (
                      <div className="p-4 text-center">
                        <button onClick={loadMore} disabled={isLoading}
                          className="text-xs font-semibold text-primary flex items-center gap-1.5 mx-auto">
                          {isLoading ? 'Loading...' : `Load more (${total - results.length} remaining)`}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* RECENT / SAVED TAB */}
            {tab === 'recent' && (
              <RecentFoodsSection onAdd={(food, qty, unit) => {
                handleAdd({ ...food, serving_quantity: qty, serving_unit: unit });
              }} />
            )}

            {/* CUSTOM TAB */}
            {tab === 'custom' && (
              <div className="p-4">
                <CustomFoodForm onAdd={handleAdd} onSave={handleSave} />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Food detail sheet */}
      <AnimatePresence>
        {detailFood && (
          <FoodDetailSheet
            food={detailFood}
            mealName={mealName}
            onAdd={handleAdd}
            onClose={() => setDetailFood(null)}
            dailyTargets={dailyTargets}
          />
        )}
      </AnimatePresence>
    </>
  );
}