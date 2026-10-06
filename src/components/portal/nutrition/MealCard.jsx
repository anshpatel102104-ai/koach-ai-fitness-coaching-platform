import React, { useState } from 'react';
import { ChevronDown, Plus, X } from 'lucide-react';
import { getMealStatus } from '@/lib/nutritionUtils';
import { SignedImg } from '@/components/shared/SignedImage';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function FoodLogItem({ food, onRemove, index }) {
  return (
    <li className="flex items-center gap-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{food.food_name || food.name}</p>
        <p className="text-[13px] text-muted-foreground">
          {food.serving_quantity}{food.serving_unit || 'g'}
          {food.protein > 0 ? `, ${food.protein} g protein` : ''}
        </p>
      </div>
      <span className="text-sm font-semibold tabular-nums text-foreground">{food.calories}</span>
      <button type="button" onClick={() => onRemove(index)} aria-label={`Remove ${food.food_name || food.name}`}
        className="touch-compact flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
        <X className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}

/**
 * Meal timeline row (time, meal, what's logged, kcal). Tap to open the foods,
 * remove items, or add one. Rendered inside a divided list panel.
 */
export default function MealCard({ meal, loggedFoods = [], mealTarget = 500, onAddFood, onRemoveFood }) {
  const [expanded, setExpanded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const mealTotal   = loggedFoods.reduce((s, f) => s + (f.calories || 0), 0);
  const mealProtein = loggedFoods.reduce((s, f) => s + (f.protein  || 0), 0);
  const mealCarbs   = loggedFoods.reduce((s, f) => s + (f.carbs    || 0), 0);
  const mealFats    = loggedFoods.reduce((s, f) => s + (f.fats     || 0), 0);
  const status = getMealStatus(mealTotal, mealTarget);
  const over = status.label === 'Over Target';

  const summary = loggedFoods.length
    ? loggedFoods.map(f => f.food_name || f.name).slice(0, 3).join(', ') + (loggedFoods.length > 3 ? ` +${loggedFoods.length - 3}` : '')
    : `Nothing yet. Aim for about ${mealTarget} cal.`;

  return (
    <div>
      <button type="button" onClick={() => setExpanded(v => !v)} aria-expanded={expanded}
        className="flex w-full items-center gap-3 py-3.5 text-left">
        <span className="w-16 flex-shrink-0 text-[13px] text-muted-foreground">{meal.time}</span>
        {meal.image_url && !imgError && (
          <SignedImg src={meal.image_url} alt="" loading="lazy" onError={() => setImgError(true)}
            className="h-10 w-10 flex-shrink-0 rounded-md object-cover" />
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold text-foreground">{meal.name}</span>
          <span className={cn('block truncate text-[13px]', over ? 'text-destructive' : 'text-muted-foreground')}>
            {over ? `Over by ${Math.round(mealTotal - mealTarget)} cal. ` : ''}{summary}
          </span>
        </span>
        <span className="num text-xl text-foreground">{mealTotal}<span className="ml-0.5 text-[12px] text-muted-foreground" style={{ fontFamily: 'var(--font-body)' }}>cal</span></span>
        <ChevronDown className={cn('h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform', expanded && 'rotate-180')} />
      </button>

      {expanded && (
        <div className="pb-3 pl-[76px]">
          {loggedFoods.length > 0 && (
            <>
              <ul className="divide-y divide-border">
                {loggedFoods.map((food, i) => (
                  <FoodLogItem key={food.id || i} food={food} index={i} onRemove={onRemoveFood} />
                ))}
              </ul>
              <p className="mt-1 text-[13px] text-muted-foreground tabular-nums">
                Protein {Math.round(mealProtein)} g, carbs {Math.round(mealCarbs)} g, fat {Math.round(mealFats)} g
              </p>
            </>
          )}
          <Button variant="outline" size="sm" className="mt-2" onClick={onAddFood}>
            <Plus /> Add food
          </Button>
        </div>
      )}
    </div>
  );
}
