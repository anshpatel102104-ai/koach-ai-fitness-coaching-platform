import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Plus, X, Check, UtensilsCrossed } from 'lucide-react';
import { getMealStatus } from '@/lib/nutritionUtils';
import { SignedImg } from '@/components/shared/SignedImage';

function MealMacroBar({ logged, target }) {
  const pct = target > 0 ? Math.min(110, (logged / target) * 100) : 0;
  const color = pct > 100 ? 'rgb(var(--destructive))' : pct >= 80 ? 'rgb(var(--success))' : pct >= 40 ? 'rgb(var(--warning))' : 'rgb(var(--border))';
  return (
    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
      <motion.div
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.5 }}
        className="h-full rounded-full"
        style={{ background: color }}
      />
    </div>
  );
}

function FoodLogItem({ food, onRemove, index }) {
  const [editing, setEditing] = useState(false);
  const [localQty, setLocalQty] = useState(food.serving_quantity || 100);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
      className="flex items-center gap-2 py-2 px-2 rounded-xl bg-accent group">
      <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" strokeWidth={3} />
      <div className="flex-1 min-w-0">
        <p className="text-foreground text-xs font-semibold truncate">{food.food_name || food.name}</p>
        <p className="text-muted-foreground text-[10px]">
          {food.serving_quantity}{food.serving_unit || 'g'} · {food.calories}cal
          {food.protein > 0 ? ` · P${food.protein}g` : ''}
        </p>
      </div>
      <button onClick={() => onRemove(index)}
        className="w-6 h-6 flex items-center justify-center rounded-full text-border hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0">
        <X className="w-3 h-3" />
      </button>
    </motion.div>
  );
}

export default function MealCard({ meal, loggedFoods = [], mealTarget = 500, onAddFood, onRemoveFood }) {
  const [expanded, setExpanded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const mealTotal   = loggedFoods.reduce((s, f) => s + (f.calories || 0), 0);
  const mealProtein = loggedFoods.reduce((s, f) => s + (f.protein  || 0), 0);
  const mealCarbs   = loggedFoods.reduce((s, f) => s + (f.carbs    || 0), 0);
  const mealFats    = loggedFoods.reduce((s, f) => s + (f.fats     || 0), 0);
  const status = getMealStatus(mealTotal, mealTarget);

  return (
    <motion.div layout
      className="mx-4 mb-3 bg-card rounded-[18px] overflow-hidden"
      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.05)', border: '1px solid rgb(var(--muted))' }}>

      {/* Meal hero image */}
      {meal.image_url && !imgError ? (
        <SignedImg
          src={meal.image_url}
          alt={meal.name}
          loading="lazy"
          className="w-full object-cover"
          style={{ height: 120 }}
          onError={() => setImgError(true)}
        />
      ) : meal.image_url && imgError ? (
        <div className="w-full flex items-center justify-center bg-muted" style={{ height: 80 }}>
          <UtensilsCrossed className="w-6 h-6 text-border" />
        </div>
      ) : null}

      {/* Header */}
      <button onClick={() => setExpanded(v => !v)}
        className="w-full px-4 py-3.5 flex items-center gap-3 active:bg-muted transition-colors">
        <span className="text-xl flex-shrink-0">{meal.emoji}</span>

        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <p className="text-foreground font-bold text-sm">{meal.name}</p>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${status.badge}`}>
              {status.label}
            </span>
          </div>
          <p className="text-muted-foreground text-xs mt-0.5">{meal.time}</p>
        </div>

        <div className="text-right shrink-0">
          <p className="text-foreground font-bold text-sm">{mealTotal}<span className="text-muted-foreground text-xs font-normal">cal</span></p>
          {loggedFoods.length > 0 && (
            <p className="text-muted-foreground text-[10px]">{loggedFoods.length} item{loggedFoods.length !== 1 ? 's' : ''}</p>
          )}
        </div>

        <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-4 h-4 text-border" />
        </motion.div>
      </button>

      {/* Macro bar */}
      <div className="px-4 pb-3">
        <MealMacroBar logged={mealTotal} target={mealTarget} />
      </div>

      {/* Expanded */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
            className="border-t border-border px-4 py-3 space-y-2">

            {/* Logged foods */}
            {loggedFoods.length > 0 ? (
              <div className="space-y-1.5">
                <AnimatePresence>
                  {loggedFoods.map((food, i) => (
                    <FoodLogItem key={i} food={food} index={i} onRemove={onRemoveFood} />
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <p className="text-muted-foreground text-xs text-center py-2">Nothing logged yet</p>
            )}

            {/* Meal subtotal */}
            {loggedFoods.length > 0 && (
              <div className="flex gap-3 pt-1 px-2 text-xs font-semibold text-muted-foreground border-t border-border">
                <span>🔥 {mealTotal}cal</span>
                <span>💪 {Math.round(mealProtein)}g</span>
                <span>🌾 {Math.round(mealCarbs)}g</span>
                <span>🥑 {Math.round(mealFats)}g</span>
              </div>
            )}

            {/* Add food button */}
            <button onClick={onAddFood}
              className="w-full py-3 rounded-xl font-bold text-sm text-primary border border-primary bg-accent flex items-center justify-center gap-1.5 active:opacity-70 transition-opacity mt-1">
              <Plus className="w-4 h-4" /> Add Food
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}