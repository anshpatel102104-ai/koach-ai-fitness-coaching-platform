import React from 'react';
import { Plus, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { KeyValue } from '@/components/kit';
import { Bar } from '@/components/portal/PortalUI';

export default function NutritionPanel({ plan, mealsLogged, waterGlasses, onMealsChange, onWaterChange }) {
  const mealGoal = plan?.meals?.length || 4;
  const waterGoal = 8;
  const mealPct = Math.min(100, ((mealsLogged || 0) / mealGoal) * 100);
  const btn = 'touch-compact flex h-8 w-8 items-center justify-center rounded-md border border-input bg-card text-foreground hover:bg-accent';

  return (
    <section className="panel p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] text-muted-foreground">Nutrition</p>
          <h2 className="text-[22px] text-foreground">{plan?.title || 'Your plan'}</h2>
        </div>
        {plan?.calories && (
          <p className="num text-[28px] text-foreground">{plan.calories}<span className="ml-1 text-[13px] text-muted-foreground">kcal</span></p>
        )}
      </div>

      {plan && (
        <div className="mt-2">
          {plan.protein_g ? <KeyValue label="Protein" value={`${plan.protein_g} g`} /> : null}
          {plan.carbs_g ? <KeyValue label="Carbs" value={`${plan.carbs_g} g`} /> : null}
          {plan.fats_g ? <KeyValue label="Fat" value={`${plan.fats_g} g`} /> : null}
        </div>
      )}

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[15px] font-semibold text-foreground">Meals logged</span>
          <div className="flex items-center gap-2">
            <button type="button" aria-label="One meal less" onClick={() => onMealsChange(Math.max(0, (mealsLogged || 0) - 1))} className={btn}><Minus className="h-3.5 w-3.5" /></button>
            <span className="w-12 text-center text-[15px] font-semibold tabular-nums text-foreground">{mealsLogged || 0}<span className="text-muted-foreground">/{mealGoal}</span></span>
            <button type="button" aria-label="One more meal" onClick={() => onMealsChange(Math.min(mealGoal, (mealsLogged || 0) + 1))} className={btn}><Plus className="h-3.5 w-3.5" /></button>
          </div>
        </div>
        <Bar pct={mealPct} />
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[15px] font-semibold text-foreground">Water</span>
          <span className="text-[13px] tabular-nums text-muted-foreground"><span className="font-semibold text-foreground">{waterGlasses || 0}</span> of {waterGoal} glasses</span>
        </div>
        <div className="grid grid-cols-8 gap-1.5">
          {Array.from({ length: waterGoal }, (_, i) => {
            const filled = i < (waterGlasses || 0);
            return (
              <button key={i} type="button" aria-label={`Glass ${i + 1}`} onClick={() => onWaterChange(filled ? i : i + 1)}
                className={cn('touch-compact h-8 rounded-md !p-0 transition-colors', filled ? 'bg-foreground' : 'border border-dashed border-input')} />
            );
          })}
        </div>
      </div>
    </section>
  );
}
