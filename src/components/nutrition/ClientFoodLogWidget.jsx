import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { Flame, Plus, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import FoodSearchModal from './FoodSearchModal';

/* ─────────────── helpers ─────────────── */
const TODAY = format(new Date(), 'yyyy-MM-dd');

function sumField(logs, field) {
  return Math.round(logs.reduce((s, l) => s + (parseFloat(l[field]) || 0), 0));
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/* ─────────────── Circular Progress Ring ─────────────── */
function MacroRing({ label, consumed, target, color }) {
  const R = 28;
  const circ = 2 * Math.PI * R;
  const pct = target > 0 ? Math.min(consumed / target, 1) : 0;
  const over = target > 0 && consumed > target * 1.05;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-16 h-16">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 72 72">
          {/* track */}
          <circle cx="36" cy="36" r={R} stroke="currentColor" strokeWidth="6"
            className="text-secondary" fill="none" />
          {/* fill */}
          <motion.circle
            cx="36" cy="36" r={R}
            stroke={over ? 'var(--tc-destructive)' : color}
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ - pct * circ }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[11px] font-bold leading-none text-foreground">{consumed}</span>
          {target > 0 && <span className="text-[9px] text-muted-foreground leading-none mt-0.5">/ {target}</span>}
        </div>
      </div>
      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
    </div>
  );
}

/* ─────────────── Meal Row ─────────────── */
function MealRow({ meal, logs, onLog }) {
  const mealLogs = logs.filter(l => l.meal_name === meal.meal_name);
  const mealCal = sumField(mealLogs, 'calories');

  return (
    <div className="bg-secondary/30 rounded-xl overflow-hidden">
      {/* header */}
      <div className="flex items-center justify-between px-4 py-2.5">
        <div>
          <p className="text-sm font-bold text-foreground">{meal.meal_name}</p>
          {meal.time && <p className="text-[10px] text-muted-foreground">{meal.time}</p>}
        </div>
        <div className="flex items-center gap-2">
          {mealLogs.length > 0 && (
            <span className="text-xs font-semibold text-muted-foreground">{mealCal} kcal</span>
          )}
          <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs gap-1" onClick={onLog}>
            <Plus className="w-3 h-3" /> Log
          </Button>
        </div>
      </div>

      {/* logged items */}
      {mealLogs.length > 0 && (
        <div className="border-t border-border divide-y divide-border">
          {mealLogs.map(log => (
            <div key={log.id} className="flex items-center justify-between px-4 py-2">
              <p className="text-xs font-medium text-foreground truncate flex-1 mr-2">{log.food_name}</p>
              <div className="flex gap-2 text-[10px] font-semibold shrink-0">
                <span className="text-orange-500">{log.calories} kcal</span>
                <span className="text-primary">P{log.protein}g</span>
                <span className="text-warning">C{log.carbs}g</span>
                <span className="text-destructive">F{log.fats}g</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────── Main Widget ─────────────── */
export default function ClientFoodLogWidget({ client, nutritionPlanId }) {
  const queryClient = useQueryClient();
  const [logModal, setLogModal] = useState(null); // meal_name string or null

  const { data: nutritionPlan } = useQuery({
    queryKey: ['nutrition-plan', nutritionPlanId],
    queryFn: () => db.entities.NutritionPlan.filter({ id: nutritionPlanId }).then(r => r[0]),
    enabled: !!nutritionPlanId,
  });

  const { data: allLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['food-logs-widget', client?.id, TODAY],
    queryFn: () => db.entities.FoodLog.filter({ client_id: client.id, logged_date: TODAY }),
    enabled: !!client?.id,
  });

  // Streak: count consecutive days with at least one log entry
  const { data: recentLogs = [] } = useQuery({
    queryKey: ['food-logs-streak', client?.id],
    queryFn: () => db.entities.FoodLog.filter({ client_id: client.id }, '-logged_date', 100),
    enabled: !!client?.id,
  });

  const streak = useMemo(() => {
    if (!recentLogs.length) return 0;
    const days = [...new Set(recentLogs.map(l => l.logged_date))].sort().reverse();
    let count = 0;
    let cursor = new Date();
    for (const day of days) {
      const expected = format(cursor, 'yyyy-MM-dd');
      if (day === expected) {
        count++;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }
    return count;
  }, [recentLogs]);

  const addLogMutation = useMutation({
    mutationFn: (entry) => db.entities.FoodLog.create(entry),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['food-logs-widget', client?.id, TODAY] });
      queryClient.invalidateQueries({ queryKey: ['food-logs-streak', client?.id] });
    },
  });

  const foodLogs = allLogs.filter(l => l.meal_name !== '__coach_notes__');

  const totCal  = sumField(foodLogs, 'calories');
  const totPro  = sumField(foodLogs, 'protein');
  const totCarb = sumField(foodLogs, 'carbs');
  const totFat  = sumField(foodLogs, 'fats');

  const tCal  = nutritionPlan?.calories  || 0;
  const tPro  = nutritionPlan?.protein_g || 0;
  const tCarb = nutritionPlan?.carbs_g   || 0;
  const tFat  = nutritionPlan?.fats_g    || 0;

  const macrosHit = tCal > 0 && totCal >= tCal * 0.9 && totPro >= tPro * 0.9;

  const meals = nutritionPlan?.meals?.length
    ? nutritionPlan.meals
    : [{ meal_name: 'Breakfast' }, { meal_name: 'Lunch' }, { meal_name: 'Dinner' }, { meal_name: 'Snack' }];

  function handleAddFood(food) {
    if (!logModal) return;
    addLogMutation.mutate({
      client_id:        client.id,
      logged_date:      TODAY,
      meal_name:        logModal,
      food_name:        food.name,
      serving_quantity: food.qty?.[food.food_id] ?? 1,
      serving_unit:     food.serving_unit,
      calories:         food.calories,
      protein:          food.protein,
      carbs:            food.carbs,
      fats:             food.fats,
      logged_by:        'client',
    });
  }

  return (
    <div className="space-y-4">
      {/* Greeting */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground leading-snug">
            {greeting()} {client?.name?.split(' ')[0]} 👋
          </h2>
          <p className="text-xs text-muted-foreground">{format(new Date(), 'EEEE, MMMM d')}</p>
        </div>
        {streak > 0 && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/20 text-orange-600 px-3 py-1.5 rounded-full text-xs font-bold"
          >
            <Flame className="w-3.5 h-3.5" />
            {streak} day streak
          </motion.div>
        )}
      </div>

      {/* Macro rings */}
      {nutritionPlan && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-card border border-border rounded-2xl p-5"
        >
          {/* Calorie headline */}
          <div className="text-center mb-4">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Calories Today</p>
            <p className="text-3xl font-bold font-heading leading-none">
              {totCal}
              {tCal > 0 && <span className="text-base font-normal text-muted-foreground ml-1">/ {tCal} kcal</span>}
            </p>
            {tCal > 0 && (
              <div className="mt-3 h-2.5 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  className={cn('h-full rounded-full', totCal > tCal * 1.05 ? 'bg-destructive' : totCal >= tCal * 0.9 ? 'bg-success' : 'bg-primary')}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((totCal / tCal) * 100, 100)}%` }}
                  transition={{ duration: 0.7, ease: 'easeOut' }}
                />
              </div>
            )}
          </div>

          {/* Macro rings row */}
          <div className="flex justify-around pt-2">
            <MacroRing label="Protein"  consumed={totPro}  target={tPro}  color="var(--tc-primary)" />
            <MacroRing label="Carbs"    consumed={totCarb} target={tCarb} color="var(--tc-warning)" />
            <MacroRing label="Fats"     consumed={totFat}  target={tFat}  color="var(--tc-destructive)" />
          </div>

          {/* Macros hit banner */}
          {macrosHit && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-4 flex items-center justify-center gap-2 bg-success/10 border border-success/20 rounded-xl py-2.5 text-sm font-bold text-success"
            >
              <CheckCircle2 className="w-4 h-4" />
              💪 Macros hit today!
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Meals list */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-0.5">Today's Meals</p>
        {logsLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-2">
            {meals.map((meal, i) => (
              <motion.div
                key={meal.meal_name || i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <MealRow
                  meal={meal}
                  logs={foodLogs}
                  onLog={() => setLogModal(meal.meal_name)}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Food Search Modal */}
      <FoodSearchModal
        open={!!logModal}
        onOpenChange={(v) => { if (!v) setLogModal(null); }}
        mealName={logModal}
        onAddFood={handleAddFood}
      />
    </div>
  );
}