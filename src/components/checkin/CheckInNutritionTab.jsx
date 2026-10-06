import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Loader2 } from 'lucide-react';
import { Panel, EmptyState } from '@/components/kit';
import { cn } from '@/lib/utils';

function sum(logs, field) {
  return Math.round(logs.reduce((s, l) => s + (parseFloat(l[field]) || 0), 0) * 10) / 10;
}

function MacroBar({ label, consumed, target }) {
  const pct = target > 0 ? Math.min((consumed / target) * 100, 100) : 0;
  const over = target > 0 && consumed > target * 1.1;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn('font-semibold tabular-nums', over ? 'text-destructive' : 'text-foreground')}>
          {consumed} g{target > 0 ? <span className="font-normal text-muted-foreground"> of {target} g</span> : ''}
        </span>
      </div>
      <div className="h-2 rounded-full bg-secondary overflow-hidden">
        <div className={cn('h-full rounded-full', over ? 'bg-destructive' : 'bg-primary')} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const MEAL_ORDER = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Pre-Workout', 'Post-Workout'];

export default function CheckInNutritionTab({ clientId, checkInDate, nutritionPlan }) {
  const { data: allLogs = [], isLoading } = useQuery({
    queryKey: ['food-logs-checkin', clientId, checkInDate],
    queryFn: () => db.entities.FoodLog.filter({ client_id: clientId, logged_date: checkInDate }),
    enabled: !!clientId && !!checkInDate,
  });

  const foodLogs = allLogs.filter(l => l.meal_name !== '__coach_notes__');

  const totCal  = sum(foodLogs, 'calories');
  const totPro  = sum(foodLogs, 'protein');
  const totCarb = sum(foodLogs, 'carbs');
  const totFat  = sum(foodLogs, 'fats');

  const tCal  = nutritionPlan?.calories  || 0;
  const tPro  = nutritionPlan?.protein_g || 0;
  const tCarb = nutritionPlan?.carbs_g   || 0;
  const tFat  = nutritionPlan?.fats_g    || 0;

  const calCompliance = tCal > 0 ? Math.round((totCal / tCal) * 100) : null;

  const mealNames = useMemo(() => {
    const logged = [...new Set(foodLogs.map(l => l.meal_name).filter(Boolean))];
    const ordered = MEAL_ORDER.filter(m => logged.includes(m));
    const rest = logged.filter(m => !MEAL_ORDER.includes(m));
    return [...ordered, ...rest];
  }, [foodLogs]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (foodLogs.length === 0) {
    return (
      <Panel>
        <EmptyState title="No food logged that day." body="Nothing was logged on the check-in date, so there is nothing to compare against the plan." />
      </Panel>
    );
  }

  const calOver = tCal > 0 && totCal > tCal * 1.1;
  const calNear = tCal > 0 && totCal >= tCal * 0.9;

  return (
    <div className="space-y-4">
      <Panel className="p-5 space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[13px] text-muted-foreground">Calories on the check-in date</p>
            <p className="mt-1 flex items-baseline gap-1.5">
              <span className="num text-[34px] leading-none text-foreground">{totCal.toLocaleString()}</span>
              <span className="text-[15px] text-muted-foreground">{tCal > 0 ? `of ${tCal.toLocaleString()} kcal` : 'kcal'}</span>
            </p>
          </div>
          {calCompliance !== null && (
            <p className={cn('text-sm font-semibold text-right', calOver ? 'text-destructive' : calNear ? 'text-success' : 'text-warning')}>
              {calCompliance}% of target
            </p>
          )}
        </div>

        {tCal > 0 && (
          <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
            <div
              className={cn('h-full rounded-full', calOver ? 'bg-destructive' : 'bg-primary')}
              style={{ width: `${Math.min((totCal / tCal) * 100, 100)}%` }}
            />
          </div>
        )}

        <div className="space-y-3 pt-1">
          <MacroBar label="Protein" consumed={totPro} target={tPro} />
          <MacroBar label="Carbs" consumed={totCarb} target={tCarb} />
          <MacroBar label="Fat" consumed={totFat} target={tFat} />
        </div>
      </Panel>

      <Panel className="overflow-hidden">
        {mealNames.map(mealName => {
          const logs = foodLogs.filter(l => l.meal_name === mealName);
          const mealCal = sum(logs, 'calories');
          return (
            <div key={mealName} className="border-b border-border last:border-b-0">
              <div className="flex items-baseline justify-between px-5 pt-4 pb-1">
                <span className="text-[15px] font-semibold text-foreground">{mealName}</span>
                <span className="text-sm text-muted-foreground tabular-nums">{mealCal} kcal</span>
              </div>
              {logs.map(log => (
                <div key={log.id} className="flex items-center gap-3 px-5 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{log.food_name}</p>
                    <p className="text-[12px] text-muted-foreground">
                      {log.serving_quantity} × {log.serving_unit ?? 'serving'}
                    </p>
                  </div>
                  <p className="text-[12px] text-muted-foreground tabular-nums shrink-0 text-right">
                    <span className="font-semibold text-foreground">{log.calories} kcal</span> · P {log.protein} · C {log.carbs} · F {log.fats}
                  </p>
                </div>
              ))}
              <div className="h-2" />
            </div>
          );
        })}
      </Panel>
    </div>
  );
}
