import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Loader2, UtensilsCrossed } from 'lucide-react';
import { cn } from '@/lib/utils';

function sum(logs, field) {
  return Math.round(logs.reduce((s, l) => s + (parseFloat(l[field]) || 0), 0) * 10) / 10;
}

function MacroBar({ label, consumed, target, colorClass }) {
  const pct = target > 0 ? Math.min((consumed / target) * 100, 100) : 0;
  const over = target > 0 && consumed > target * 1.1;
  const near = target > 0 && consumed >= target * 0.9;
  const barColor = over ? 'bg-destructive' : near ? 'bg-success' : 'bg-warning';

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-semibold">
        <span className={colorClass}>{label}</span>
        <span className="text-muted-foreground">
          {consumed}g{target > 0 ? ` / ${target}g` : ''}
        </span>
      </div>
      <div className="h-2 rounded-full bg-secondary overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-500', barColor)} style={{ width: `${pct}%` }} />
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
      <div className="flex flex-col items-center justify-center py-14 text-center">
        <UtensilsCrossed className="w-10 h-10 text-muted-foreground/30 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">Client hasn't logged food for this check-in date</p>
      </div>
    );
  }

  const calOver = tCal > 0 && totCal > tCal * 1.1;
  const calNear = tCal > 0 && totCal >= tCal * 0.9;

  return (
    <div className="space-y-4">

      {/* Compliance badge */}
      {calCompliance !== null && (
        <div className={cn(
          'flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-semibold',
          calOver  ? 'bg-destructive/10 border-destructive/20 text-destructive' :
          calNear  ? 'bg-success/10 border-success/20 text-success' :
                     'bg-warning/10 border-warning/20 text-warning'
        )}>
          <span>Calorie compliance</span>
          <span className="text-base font-bold">{calCompliance}% of target</span>
        </div>
      )}

      {/* Summary card */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
        {/* Calories headline */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Total Calories</p>
            <p className="text-3xl font-bold font-heading leading-none mt-0.5">
              {totCal}
              {tCal > 0 && <span className="text-sm font-normal text-muted-foreground ml-1">/ {tCal} kcal</span>}
            </p>
          </div>
        </div>

        {/* Calorie bar */}
        {tCal > 0 && (
          <div className="h-3 rounded-full bg-secondary overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                calOver ? 'bg-destructive' : calNear ? 'bg-success' : 'bg-warning'
              )}
              style={{ width: `${Math.min((totCal / tCal) * 100, 100)}%` }}
            />
          </div>
        )}

        {/* Macro bars */}
        <div className="space-y-3 pt-1">
          <MacroBar label="Protein"  consumed={totPro}  target={tPro}  colorClass="text-primary" />
          <MacroBar label="Carbs"    consumed={totCarb} target={tCarb} colorClass="text-warning" />
          <MacroBar label="Fats"     consumed={totFat}  target={tFat}  colorClass="text-destructive" />
        </div>
      </div>

      {/* Meals */}
      <div className="space-y-3">
        {mealNames.map(mealName => {
          const logs = foodLogs.filter(l => l.meal_name === mealName);
          const mealCal = sum(logs, 'calories');
          return (
            <div key={mealName} className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-secondary/30">
                <span className="text-sm font-bold text-foreground">{mealName}</span>
                <span className="text-xs font-semibold text-muted-foreground">{mealCal} kcal</span>
              </div>
              <div className="divide-y divide-border">
                {logs.map(log => (
                  <div key={log.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{log.food_name}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {log.serving_quantity} × {log.serving_unit ?? 'serving'}
                      </p>
                    </div>
                    <div className="flex gap-2 text-[10px] font-semibold shrink-0">
                      <span className="text-orange-600">{log.calories} kcal</span>
                      <span className="text-primary">P {log.protein}g</span>
                      <span className="text-warning">C {log.carbs}g</span>
                      <span className="text-destructive">F {log.fats}g</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}