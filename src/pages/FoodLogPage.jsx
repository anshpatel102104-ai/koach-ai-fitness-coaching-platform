import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addDays } from 'date-fns';
import {
  ChevronLeft, ChevronRight, Trash2, Plus, Save, Loader2, UtensilsCrossed,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import FoodSearchModal from '@/components/nutrition/FoodSearchModal';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function sum(logs, field) {
  return Math.round(logs.reduce((s, l) => s + (parseFloat(l[field]) || 0), 0) * 10) / 10;
}

function MacroBar({ label, consumed, target, color }) {
  const pct = target > 0 ? Math.min((consumed / target) * 100, 100) : 0;
  const over = target > 0 && consumed > target * 1.1;
  const near = target > 0 && consumed >= target * 0.9 && consumed <= target * 1.1;
  const barColor = over ? 'bg-destructive' : near ? 'bg-success' : 'bg-warning';

  return (
    <div className="flex-1 min-w-0">
      <div className="flex justify-between text-[10px] font-semibold mb-1">
        <span className={color}>{label}</span>
        <span className="text-muted-foreground">{consumed}g {target > 0 ? `/ ${target}g` : ''}</span>
      </div>
      <div className="h-2 rounded-full bg-secondary overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Daily Summary ─────────────────────────────────────────────────────────────
function DailySummary({ logs, plan }) {
  const totCal  = sum(logs, 'calories');
  const totPro  = sum(logs, 'protein');
  const totCarb = sum(logs, 'carbs');
  const totFat  = sum(logs, 'fats');

  const tCal  = plan?.calories  || 0;
  const tPro  = plan?.protein_g || 0;
  const tCarb = plan?.carbs_g   || 0;
  const tFat  = plan?.fats_g    || 0;

  const calPct  = tCal > 0 ? Math.min((totCal / tCal) * 100, 100) : 0;
  const calOver = tCal > 0 && totCal > tCal * 1.1;
  const calNear = tCal > 0 && totCal >= tCal * 0.9 && totCal <= tCal * 1.1;
  const calBarColor = calOver ? 'bg-destructive' : calNear ? 'bg-success' : 'bg-warning';

  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
      {/* Calories */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Calories</p>
          <p className="text-3xl font-bold text-foreground leading-none mt-0.5">
            {totCal}
            {tCal > 0 && <span className="text-base font-normal text-muted-foreground ml-1">/ {tCal} kcal</span>}
          </p>
        </div>
        {tCal > 0 && (
          <span className={cn(
            'text-xs font-bold px-2.5 py-1 rounded-full',
            calOver ? 'bg-destructive/10 text-destructive' : calNear ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
          )}>
            {calOver ? 'Over target' : calNear ? 'On target' : 'Under target'}
          </span>
        )}
      </div>

      <div className="h-3 rounded-full bg-secondary overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-500', calBarColor)} style={{ width: `${calPct}%` }} />
      </div>

      {/* Macros */}
      <div className="flex gap-4">
        <MacroBar label="Protein"  consumed={totPro}  target={tPro}  color="text-primary" />
        <MacroBar label="Carbs"    consumed={totCarb} target={tCarb} color="text-warning" />
        <MacroBar label="Fats"     consumed={totFat}  target={tFat}  color="text-destructive" />
      </div>
    </div>
  );
}

// ─── Meal Group ────────────────────────────────────────────────────────────────
function MealGroup({ mealName, logs, clientId, date, onDelete }) {
  const [foodSearchOpen, setFoodSearchOpen] = useState(false);
  const qc = useQueryClient();

  const createLog = useMutation({
    mutationFn: (data) => db.entities.FoodLog.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['food-logs'] }),
  });

  const mealCal = sum(logs, 'calories');

  function handleAddFood(food) {
    createLog.mutate({
      client_id:       clientId,
      logged_date:     date,
      meal_name:       mealName,
      food_item_id:    food.food_id,
      food_name:       food.name,
      serving_quantity: food.qty?.[food.food_id] ?? 1,
      serving_unit:    food.serving_unit,
      calories:        food.calories,
      protein:         food.protein,
      carbs:           food.carbs,
      fats:            food.fats,
      logged_by:       'coach',
    });
  }

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-secondary/30">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-foreground">{mealName}</span>
          {logs.length > 0 && (
            <span className="text-xs font-semibold text-muted-foreground">{mealCal} kcal</span>
          )}
        </div>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setFoodSearchOpen(true)}>
          <Plus className="w-3 h-3" /> Log Food
        </Button>
      </div>

      {/* Entries */}
      <div className="divide-y divide-border">
        <AnimatePresence initial={false}>
          {logs.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No foods logged yet</p>
          ) : (
            logs.map(log => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-3 px-5 py-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{log.food_name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {log.serving_quantity} × {log.serving_unit ?? 'serving'}
                  </p>
                </div>
                <div className="flex gap-3 text-[10px] font-semibold shrink-0">
                  <span className="text-orange-600">{log.calories} kcal</span>
                  <span className="text-primary">P {log.protein}g</span>
                  <span className="text-warning">C {log.carbs}g</span>
                  <span className="text-destructive">F {log.fats}g</span>
                </div>
                <button
                  onClick={() => onDelete(log.id)}
                  className="p-1 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      <FoodSearchModal
        open={foodSearchOpen}
        onOpenChange={setFoodSearchOpen}
        mealName={mealName}
        onAddFood={handleAddFood}
      />
    </div>
  );
}

// ─── Coach Notes ───────────────────────────────────────────────────────────────
function CoachNotes({ clientId, date, existingNote }) {
  const [notes, setNotes] = useState(existingNote ?? '');
  const [saved, setSaved] = useState(false);
  const qc = useQueryClient();

  const saveNotes = useMutation({
    mutationFn: async () => {
      // Store as a sentinel FoodLog entry with just coach_daily_notes
      const existing = await db.entities.FoodLog.filter({
        client_id: clientId,
        logged_date: date,
        meal_name: '__coach_notes__',
      });
      if (existing.length > 0) {
        return db.entities.FoodLog.update(existing[0].id, { coach_daily_notes: notes });
      }
      return db.entities.FoodLog.create({
        client_id: clientId,
        logged_date: date,
        meal_name: '__coach_notes__',
        coach_daily_notes: notes,
        logged_by: 'coach',
      });
    },
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      qc.invalidateQueries({ queryKey: ['food-logs'] });
    },
  });

  // Sync when prop changes (different client/date)
  React.useEffect(() => { setNotes(existingNote ?? ''); }, [existingNote]);

  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
      <h3 className="text-sm font-bold text-foreground">Coach Notes</h3>
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="Leave daily nutrition feedback for this client..."
        rows={3}
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
      />
      <div className="flex justify-end">
        <Button
          size="sm"
          className="gap-2"
          onClick={() => saveNotes.mutate()}
          disabled={saveNotes.isPending}
        >
          {saveNotes.isPending
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : saved
            ? '✓ Saved'
            : <><Save className="w-3.5 h-3.5" /> Save Notes</>
          }
        </Button>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
const DEFAULT_MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

export default function FoodLogPage() {
  const [clientId, setClientId] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const qc = useQueryClient();

  const { data: clients = [] } = useQuery({
    queryKey: ['clients-foodlog'],
    queryFn: () => db.entities.Client.list(),
  });

  const { data: allLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['food-logs', clientId, date],
    queryFn: () => db.entities.FoodLog.filter({ client_id: clientId, logged_date: date }),
    enabled: !!clientId,
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['nutrition-plans-foodlog', clientId],
    queryFn: () => db.entities.NutritionPlan.list(),
    enabled: !!clientId,
    select: (all) => all.filter(p => !p.is_template),
  });

  const selectedClient = clients.find(c => c.id === clientId);
  const assignedPlan   = plans.find(p => p.id === selectedClient?.assigned_nutrition_id);

  // Separate real food logs from sentinel notes entry
  const foodLogs  = allLogs.filter(l => l.meal_name !== '__coach_notes__');
  const notesEntry = allLogs.find(l => l.meal_name === '__coach_notes__');

  // Group by meal_name; also show default meals
  const mealNames = useMemo(() => {
    const logged = [...new Set(foodLogs.map(l => l.meal_name).filter(Boolean))];
    const all = [...DEFAULT_MEALS];
    logged.forEach(n => { if (!all.includes(n)) all.push(n); });
    return all;
  }, [foodLogs]);

  const deleteLog = useMutation({
    mutationFn: (id) => db.entities.FoodLog.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['food-logs'] }),
  });

  function changeDay(delta) {
    const d = addDays(new Date(date + 'T12:00:00'), delta);
    setDate(format(d, 'yyyy-MM-dd'));
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-foreground font-heading flex-1">Food Log</h1>

        {/* Client selector */}
        <select
          value={clientId}
          onChange={e => setClientId(e.target.value)}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring min-w-[180px]"
        >
          <option value="">Select client…</option>
          {clients.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {/* Date navigator */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => changeDay(-1)}
            className="p-1.5 rounded-lg border border-input bg-background hover:bg-secondary transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <Input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-40 text-sm text-center"
          />
          <button
            onClick={() => changeDay(1)}
            className="p-1.5 rounded-lg border border-input bg-background hover:bg-secondary transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* No client selected */}
      {!clientId && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <UtensilsCrossed className="w-12 h-12 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Select a client to view their food log</p>
        </div>
      )}

      {clientId && (
        <>
          {/* Daily Summary */}
          <DailySummary logs={foodLogs} plan={assignedPlan} />

          {/* Meals */}
          {logsLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              {mealNames.map(mealName => (
                <MealGroup
                  key={mealName}
                  mealName={mealName}
                  logs={foodLogs.filter(l => l.meal_name === mealName)}
                  clientId={clientId}
                  date={date}
                  onDelete={id => deleteLog.mutate(id)}
                />
              ))}
            </div>
          )}

          {/* Coach Notes */}
          <CoachNotes
            clientId={clientId}
            date={date}
            existingNote={notesEntry?.coach_daily_notes}
          />
        </>
      )}
    </div>
  );
}