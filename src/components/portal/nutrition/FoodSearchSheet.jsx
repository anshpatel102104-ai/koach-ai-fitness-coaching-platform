import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UtensilsCrossed } from 'lucide-react';
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
    <div className="space-y-0 divide-y divide-muted">
      {[1,2,3,4].map(i => (
        <div key={i} className="flex items-start gap-3 px-4 py-3 animate-pulse">
          <div className="flex-1 space-y-2">
            <div className="h-3.5 bg-muted rounded w-3/4" />
            <div className="h-2.5 bg-muted rounded w-1/4" />
            <div className="flex gap-1">
              {[1,2,3,4].map(j => <div key={j} className="h-5 w-16 bg-muted rounded-full" />)}
            </div>
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
        className="w-full flex items-start gap-3 px-4 py-3 text-left active:bg-accent transition-colors">
        <div className="flex-1 min-w-0">
          <p className="text-foreground font-bold text-sm leading-snug">{food.name}</p>
          {(food.category || food.brand) && (
            <p className="text-muted-foreground text-xs truncate">{[food.category, food.brand].filter(Boolean).join(' · ')}</p>
          )}
          <div className="flex flex-wrap gap-1 mt-1.5">
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-orange-600">🔥 {cal}cal</span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-accent text-primary">💪 {prot}g</span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-warning/10 text-warning">🌾 {carb}g</span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-success/10 text-success">🥑 {fat}g</span>
          </div>
          <div className="flex items-center gap-1.5 mt-2">
            <input type="number" min={1} step={10} value={qty}
              onChange={e => setQty(Math.max(1, Number(e.target.value)))}
              onClick={e => e.stopPropagation()}
              className="w-16 h-7 text-xs text-center border border-border rounded-lg bg-card px-1"
            />
            <span className="text-xs text-muted-foreground">g</span>
            <button
              onClick={e => { e.stopPropagation(); onAdd({ ...food, calories: cal, protein: prot, carbs: carb, fats: fat, serving_quantity: qty, serving_unit: 'g' }); }}
              className="h-7 px-3 rounded-lg text-xs font-semibold text-white active:opacity-80"
              style={{ background: 'rgb(var(--primary))' }}>
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
        className="fixed inset-0 z-[60] flex items-end"
        style={{ background: 'rgba(0,0,0,0.45)' }}
        onClick={onClose}>
        <motion.div
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="w-full bg-card rounded-t-[24px] max-h-[92vh] flex flex-col"
          onClick={e => e.stopPropagation()}>

          {/* Handle */}
          <div className="flex justify-center py-2.5 flex-shrink-0">
            <div className="w-10 h-1 rounded-full bg-border" />
          </div>

          {/* Header */}
          <div className="px-4 pb-3 flex-shrink-0 space-y-3">
            <p className="text-sm font-black text-foreground">
              Add Food{mealName ? <span className="font-normal text-muted-foreground"> → {mealName}</span> : ''}
            </p>

            {/* Tabs */}
            <div className="flex gap-1 bg-muted rounded-xl p-1">
              {[['search','Search'],['recent','Recent'],['custom','+ Custom']].map(([id, label]) => (
                <button key={id} onClick={() => { setTab(id); if (id !== 'search') clear(); }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
                    tab === id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                  }`}>
                  {label}
                </button>
              ))}
            </div>

            {tab === 'search' && (
              <FoodSearchBar
                query={query} onChange={setQuery} onClear={clear}
                isSearching={isSearching}
                placeholder="Search 600,000+ foods..."
              />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">

            {/* SEARCH */}
            {tab === 'search' && (
              <>
                {!query || query.length < 2 ? (
                  <div className="flex flex-col items-center gap-3 py-10 px-6 text-center">
                    <UtensilsCrossed className="w-10 h-10 text-border" />
                    <p className="text-sm font-semibold text-foreground">USDA FoodData Central</p>
                    <p className="text-xs text-muted-foreground">Accurate data for 600k+ foods. Type 2+ characters.</p>
                  </div>
                ) : isLoading && results.length === 0 ? (
                  <SkeletonRows />
                ) : hasError ? (
                  <div className="p-4">
                    <p className="text-center text-sm font-semibold text-foreground mb-1">Can't reach food database</p>
                    <p className="text-center text-xs text-muted-foreground mb-4">Add your food manually.</p>
                    <CustomFoodForm onAdd={handleAdd} onSave={handleSave} />
                  </div>
                ) : showEmpty ? (
                  <div className="p-4">
                    <div className="text-center py-4 mb-4">
                      <UtensilsCrossed className="w-8 h-8 text-border mx-auto mb-2" />
                      <p className="text-sm font-semibold text-foreground">No results for "{query}"</p>
                      <p className="text-xs text-muted-foreground">Try a different term or add custom.</p>
                    </div>
                    <CustomFoodForm onAdd={handleAdd} onSave={handleSave} />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between px-4 py-2 bg-muted border-b border-border">
                      <p className="text-xs text-muted-foreground">{total.toLocaleString()} results</p>
                      <p className="text-[10px] text-muted-foreground">USDA FoodData Central</p>
                    </div>

                    {common.length > 0 && (
                      <>
                        <div className="px-4 py-1.5 bg-muted border-b border-border">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Common Foods</p>
                        </div>
                        {common.map(food => (
                          <PortalFoodRow key={food.id} food={food} onTap={setDetailFood} onAdd={handleAdd} />
                        ))}
                      </>
                    )}

                    {branded.length > 0 && (
                      <>
                        <div className="px-4 py-1.5 bg-muted border-b border-border">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Branded Foods</p>
                        </div>
                        {branded.map(food => (
                          <PortalFoodRow key={food.id} food={food} onTap={setDetailFood} onAdd={handleAdd} />
                        ))}
                      </>
                    )}

                    {hasMore && (
                      <div className="p-4 text-center">
                        <button onClick={loadMore} disabled={isLoading}
                          className="text-sm font-semibold text-primary">
                          {isLoading ? 'Loading...' : `Load more`}
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