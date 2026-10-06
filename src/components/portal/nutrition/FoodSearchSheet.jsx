import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Segmented } from '@/components/kit';
import { portalDb } from '@/api/supabaseClient';
import { toast } from 'sonner';
import { addRecentFood } from '@/lib/nutritionUtils';
import { useFoodSearch } from '@/components/nutrition/usda/useFoodSearch';
import FoodSearchBar from '@/components/nutrition/usda/FoodSearchBar';
import FoodDetailSheet from '@/components/nutrition/usda/FoodDetailSheet';
import CustomFoodForm from '@/components/nutrition/usda/CustomFoodForm';
import RecentFoodsSection from '@/components/nutrition/usda/RecentFoodsSection';

function SkeletonRows() {
  return (
    <div className="divide-y divide-border">
      {[1,2,3,4].map(i => (
        <div key={i} className="flex items-start gap-3 px-4 py-3 animate-pulse">
          <div className="flex-1 space-y-2">
            <div className="h-3.5 bg-secondary rounded w-3/4" />
            <div className="h-2.5 bg-secondary rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

function PortalFoodRow({ food, onTap, onAdd }) {
  const [qty, setQty] = useState(100);
  const grams = qty;
  const scale = grams / 100;
  const cal  = Math.round((food.calories || 0) * scale);
  const prot = Math.round((food.protein  || 0) * scale * 10) / 10;
  const carb = Math.round((food.carbs    || 0) * scale * 10) / 10;
  const fat  = Math.round((food.fats     || 0) * scale * 10) / 10;

  return (
    <div className="border-b border-border last:border-0">
      <button onClick={() => onTap(food)}
        className="w-full flex items-start gap-3 px-5 py-3 text-left hover:bg-accent/50 active:bg-accent transition-colors">
        <div className="flex-1 min-w-0">
          <p className="text-foreground font-semibold text-[15px] leading-snug">{food.name}</p>
          {(food.category || food.brand) && (
            <p className="text-muted-foreground text-[13px] truncate">{[food.category, food.brand].filter(Boolean).join(', ')}</p>
          )}
          <p className="mt-1 text-[13px] text-muted-foreground tabular-nums">
            <span className="font-semibold text-foreground">{cal} cal</span>, protein {prot} g, carbs {carb} g, fat {fat} g
          </p>
          <div className="flex items-center gap-1.5 mt-2">
            <input type="number" min={1} step={10} value={qty}
              onChange={e => setQty(Math.max(1, Number(e.target.value)))}
              onClick={e => e.stopPropagation()}
              className="w-16 h-8 text-sm text-center border border-input rounded-md bg-card px-1"
            />
            <span className="text-[13px] text-muted-foreground">g</span>
            <button
              onClick={e => { e.stopPropagation(); onAdd({ ...food, calories: cal, protein: prot, carbs: carb, fats: fat, serving_quantity: qty, serving_unit: 'g' }); }}
              className="touch-compact h-8 px-3 rounded-md text-[13px] font-semibold bg-primary text-primary-foreground hover:bg-primary/85">
              Add
            </button>
          </div>
        </div>
      </button>
    </div>
  );
}

export default function FoodSearchSheet({ isOpen, onClose, onSelectFood, mealName, dailyTargets }) {
  const [tab, setTab]             = useState('search');
  const [detailFood, setDetailFood] = useState(null);

  const {
    query, setQuery, results, isLoading, hasError,
    total, hasMore, loadMore, clear, isSearching, showEmpty,
  } = useFoodSearch();

  // Reset on close
  useEffect(() => {
    if (!isOpen) { clear(); setDetailFood(null); setTab('search'); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleAdd = (food) => {
    onSelectFood({
      food_name:        food.name,
      name:             food.name,
      calories:         food.calories,
      protein:          food.protein,
      carbs:            food.carbs,
      fats:             food.fats,
      fiber:            food.fiber || 0,
      serving_quantity: food.serving_quantity || 100,
      serving_unit:     food.serving_unit || 'g',
      serving:          `${food.serving_quantity || 100}${food.serving_unit || 'g'}`,
    });
    addRecentFood(food);
    onClose();
  };

  const handleSave = async (food) => {
    try {
      await portalDb.entities.FoodItem.create({
        name: food.name, brand: food.brand || '',
        calories: food.calories, protein: food.protein, carbs: food.carbs, fats: food.fats,
        fiber: food.fiber || 0, sodium: food.sodium || 0,
        serving_size: food.serving_size || '100g', source: food.source || 'usda', category: food.category || '',
      });
      toast.success(`"${food.name}" saved`);
    } catch { toast.error('Could not save'); }
  };

  const common  = results.filter(f => !f.brand);
  const branded = results.filter(f => !!f.brand);

  if (!isOpen) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50"
        onClick={onClose}>
        <motion.div
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
          transition={{ type: 'tween', duration: 0.22, ease: 'easeOut' }}
          className="w-full max-w-[480px] bg-card rounded-t-xl max-h-[92vh] flex flex-col"
          onClick={e => e.stopPropagation()}>


          {/* Header */}
          <div className="px-5 pt-5 pb-3 flex-shrink-0 space-y-3">
            <h2 className="text-[22px] text-foreground">
              Add food{mealName ? <span className="text-muted-foreground"> to {mealName.toLowerCase()}</span> : ''}
            </h2>

            {/* Tabs */}
            <Segmented
              className="w-full [&>button]:flex-1 [&>button]:justify-center"
              value={tab}
              onChange={(id) => { setTab(id); if (id !== 'search') clear(); }}
              options={[{ value: 'search', label: 'Search' }, { value: 'recent', label: 'Recent' }, { value: 'custom', label: 'Your own' }]}
            />

            {tab === 'search' && (
              <FoodSearchBar
                query={query} onChange={setQuery} onClear={clear}
                isSearching={isSearching}
                placeholder="Search foods, e.g. greek yogurt"
              />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">

            {/* SEARCH */}
            {tab === 'search' && (
              <>
                {!query || query.length < 2 ? (
                  <div className="px-5 py-8">
                    <p className="text-[15px] font-semibold text-foreground">Type at least two letters</p>
                    <p className="mt-1 text-sm text-muted-foreground">Results come from USDA FoodData Central.</p>
                  </div>
                ) : isLoading && results.length === 0 ? (
                  <SkeletonRows />
                ) : hasError ? (
                  <div className="p-4">
                    <p className="text-[15px] font-semibold text-foreground mb-1">Can't reach the food database</p>
                    <p className="text-sm text-muted-foreground mb-4">Add the food by hand instead.</p>
                    <CustomFoodForm onAdd={handleAdd} onSave={handleSave} />
                  </div>
                ) : showEmpty ? (
                  <div className="p-4">
                    <div className="py-2 mb-4">
                      <p className="text-[15px] font-semibold text-foreground">Nothing for "{query}"</p>
                      <p className="text-sm text-muted-foreground">Try another word, or add it yourself below.</p>
                    </div>
                    <CustomFoodForm onAdd={handleAdd} onSave={handleSave} />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between px-5 py-2 bg-secondary border-y border-border">
                      <p className="text-[13px] text-muted-foreground">{total.toLocaleString()} results</p>
                      <p className="text-[13px] text-muted-foreground">USDA FoodData Central</p>
                    </div>

                    {common.length > 0 && (
                      <>
                        <div className="px-5 py-1.5 border-b border-border">
                          <p className="text-[13px] font-semibold text-muted-foreground">Common foods</p>
                        </div>
                        {common.map(food => (
                          <PortalFoodRow key={food.id} food={food} onTap={setDetailFood} onAdd={handleAdd} />
                        ))}
                      </>
                    )}

                    {branded.length > 0 && (
                      <>
                        <div className="px-5 py-1.5 border-b border-border">
                          <p className="text-[13px] font-semibold text-muted-foreground">Branded foods</p>
                        </div>
                        {branded.map(food => (
                          <PortalFoodRow key={food.id} food={food} onTap={setDetailFood} onAdd={handleAdd} />
                        ))}
                      </>
                    )}

                    {hasMore && (
                      <div className="p-4 text-center">
                        <button onClick={loadMore} disabled={isLoading}
                          className="text-sm font-semibold text-foreground underline underline-offset-4">
                          {isLoading ? 'Loading' : 'Load more'}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* RECENT */}
            {tab === 'recent' && (
              <RecentFoodsSection onAdd={(food, qty, unit) => handleAdd({ ...food, serving_quantity: qty, serving_unit: unit })} />
            )}

            {/* CUSTOM */}
            {tab === 'custom' && (
              <div className="p-4">
                <CustomFoodForm onAdd={handleAdd} onSave={handleSave} />
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Detail sheet */}
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