import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Segmented } from '@/components/kit';
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
    { id: 'recent',  label: 'Recent and saved' },
    { id: 'custom',  label: 'Custom food' },
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
            <DialogTitle>Add food</DialogTitle>
            {mealName && <p className="text-sm text-muted-foreground">To {mealName}</p>}

            {/* Tabs */}
            <Segmented
              size="sm"
              className="mt-3"
              value={tab}
              onChange={(id) => { setTab(id); if (id !== 'search') clear(); }}
              options={TABS.map(t => ({ value: t.id, label: t.label }))}
            />

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
                  <div className="px-5 py-8">
                    <p className="text-sm font-semibold text-foreground">Type at least two letters to search.</p>
                    <p className="text-sm text-muted-foreground mt-1">Results come from USDA FoodData Central.</p>
                  </div>
                ) : isLoading && results.length === 0 ? (
                  <SkeletonRows />
                ) : hasError ? (
                  <div className="p-6">
                    <p className="text-sm font-semibold mb-1">Couldn't reach the food database.</p>
                    <p className="text-sm text-muted-foreground mb-4">Enter the food by hand below.</p>
                    <CustomFoodForm onAdd={handleAdd} onSave={handleSave} />
                  </div>
                ) : showEmpty ? (
                  <div className="p-6">
                    <div className="pb-4">
                      <p className="text-sm font-semibold">Nothing found for "{query}".</p>
                      <p className="text-sm text-muted-foreground">Try another word, or enter it as a custom food.</p>
                    </div>
                    <CustomFoodForm onAdd={handleAdd} onSave={handleSave} />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between px-4 py-2 border-b border-border">
                      <p className="text-[13px] text-muted-foreground tabular-nums">{total.toLocaleString()} results from USDA</p>
                      <button onClick={() => setShowCustom(v => !v)}
                        className="text-[13px] font-semibold text-foreground underline underline-offset-4">
                        {showCustom ? 'Hide custom food' : 'Add a custom food'}
                      </button>
                    </div>

                    {showCustom && (
                      <div className="px-4 py-3 border-b border-border bg-secondary/40">
                        <CustomFoodForm onAdd={handleAdd} onSave={handleSave} onCancel={() => setShowCustom(false)} />
                      </div>
                    )}

                    {/* Common foods group */}
                    {common.length > 0 && (
                      <>
                        <div className="px-4 pt-3 pb-1 text-[13px] text-muted-foreground border-b border-border">
                          Common foods
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
                        <div className="px-4 pt-3 pb-1 text-[13px] text-muted-foreground border-b border-border">
                          Branded foods
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
                          className="text-sm font-semibold text-foreground underline underline-offset-4 tabular-nums">
                          {isLoading ? 'Loading' : `Show more (${total - results.length} left)`}
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