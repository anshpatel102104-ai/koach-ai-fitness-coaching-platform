import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { Apple, Utensils, CheckCircle2, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, subDays } from 'date-fns';
import NutritionPlanDetailModal from '@/components/nutrition/NutritionPlanDetailModal';

// ── Helpers ───────────────────────────────────────────────────────────────────
function pct(val, max) {
  if (!max || !val) return 0;
  return Math.min(100, Math.round((val / max) * 100));
}

function MacroChip({ label, value, unit = 'g', color }) {
  return (
    <div className={cn('flex flex-col items-center px-3 py-2 rounded-xl text-center', color)}>
      <span className="text-sm font-bold tabular-nums leading-tight">{value ?? '—'}{unit === 'kcal' ? '' : unit}</span>
      <span className="text-[10px] opacity-70 mt-0.5">{label}{unit === 'kcal' ? ' kcal' : ''}</span>
    </div>
  );
}

function Bar({ value, max, color = 'bg-primary' }) {
  const p = pct(value, max);
  return (
    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
      <motion.div
        className={cn('h-full rounded-full', color)}
        initial={{ width: 0 }}
        animate={{ width: `${p}%` }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
    </div>
  );
}

// ── Assign Plan Dialog ────────────────────────────────────────────────────────
function AssignDialog({ clientId, allPlans, onClose }) {
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  const assign = async () => {
    if (!selected) return;
    setSaving(true);
    // Update the client's assigned_nutrition_id
    await db.entities.Client.update(clientId, { assigned_nutrition_id: selected });
    await qc.invalidateQueries({ queryKey: ['client-nutrition', clientId] });
    await qc.invalidateQueries({ queryKey: ['nutrition'] });
    await qc.invalidateQueries({ queryKey: ['clients'] });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-card rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-bold text-foreground">Assign Nutrition Plan</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-muted-foreground p-1"><X className="w-4 h-4" /></button>
        </div>

        <div className="max-h-64 overflow-y-auto px-3 py-3 space-y-2">
          {allPlans.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">No plans available. Create one first.</p>
          )}
          {allPlans.map(plan => (
            <button
              key={plan.id}
              onClick={() => setSelected(plan.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all',
                selected === plan.id
                  ? 'border-primary bg-accent'
                  : 'border-border hover:border-primary hover:bg-muted'
              )}
            >
              <span className="text-xl">{plan.emoji || '🥗'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{plan.title}</p>
                <p className="text-[10px] text-muted-foreground">
                  {plan.tracking_mode === 'habits' ? 'Habit Mode' : 'Macro Tracking'}
                  {plan.calories ? ` · ${plan.calories} kcal` : ''}
                </p>
              </div>
              {selected === plan.id && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
            </button>
          ))}
        </div>

        <div className="px-3 py-3 border-t border-border flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-3 py-2 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={assign}
            disabled={!selected || saving}
            className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold text-primary-foreground disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, var(--kc-00d4ff), var(--tc-primary))' }}
          >
            {saving ? 'Assigning...' : 'Assign Plan'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Section 1: Assigned Plan ──────────────────────────────────────────────────
function AssignedPlanSection({ client, allPlans, assignedPlan, onRefetch }) {
  const [showDialog, setShowDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showPlanDetail, setShowPlanDetail] = useState(false);
  const qc = useQueryClient();

  const createPlan = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setCreating(true);
    try {
      const newPlan = await db.entities.NutritionPlan.create({
        title: `${client.name}'s Plan`,
        tracking_mode: 'macros',
        calories: 2000,
        protein_g: 150,
        carbs_g: 200,
        fats_g: 60,
      });
      // Assign via client record
      await db.entities.Client.update(client.id, { assigned_nutrition_id: newPlan.id });
      await qc.invalidateQueries({ queryKey: ['nutrition-client', client.id] });
      await qc.invalidateQueries({ queryKey: ['nutrition'] });
      await qc.invalidateQueries({ queryKey: ['clients'] });
    } catch (err) {
      console.error('Create plan failed:', err);
    } finally {
      setCreating(false);
    }
  };

  if (!assignedPlan) return (
    <>
      <div className="bg-card rounded-xl border border-border p-5 flex flex-col items-center text-center gap-3">
        <div className="w-11 h-11 rounded-full bg-muted border border-border flex items-center justify-center">
          <Apple className="w-5 h-5 text-border" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">No nutrition plan assigned yet</p>
          <p className="text-xs text-muted-foreground mt-0.5">Assign an existing plan or create a new one</p>
          <button onClick={onRefetch} className="text-xs text-primary underline mt-1">Refresh</button>
        </div>
        <div className="flex gap-2 flex-wrap justify-center">
          <button
            onClick={() => setShowDialog(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-primary-foreground"
            style={{ background: 'linear-gradient(135deg, var(--kc-00d4ff), var(--tc-primary))' }}
          >
            <Plus className="w-3.5 h-3.5" /> Assign Existing Plan
          </button>
          <button
            onClick={createPlan}
            disabled={creating}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-muted-foreground border border-border hover:bg-muted disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" /> {creating ? 'Creating...' : 'Create New Plan'}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showDialog && (
          <AssignDialog
            clientId={client.id}
            allPlans={allPlans}
            onClose={() => setShowDialog(false)}
          />
        )}
      </AnimatePresence>
    </>
  );

  const isHabits = assignedPlan.tracking_mode === 'habits';

  return (
    <div className="bg-card rounded-xl border border-border p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">{assignedPlan.emoji || '🥗'}</span>
          <div>
            <p className="text-sm font-bold text-foreground leading-tight">{assignedPlan.title}</p>
            {assignedPlan.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{assignedPlan.description}</p>
            )}
          </div>
        </div>
        <span className={cn(
          'text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0',
          isHabits ? 'bg-ai/10 text-ai border-ai' : 'bg-success/10 text-success border-success'
        )}>
          {isHabits ? 'Habit Mode' : 'Macro Tracking'}
        </span>
      </div>

      {!isHabits && (assignedPlan.calories ?? assignedPlan.daily_calories ?? 0) > 0 && (
        <div className="flex gap-2">
          <MacroChip label="Calories" value={assignedPlan.calories ?? assignedPlan.daily_calories} unit="kcal" color="bg-orange-50 text-orange-700" />
          {(assignedPlan.protein_g ?? assignedPlan.protein ?? 0) > 0 && <MacroChip label="Protein" value={assignedPlan.protein_g ?? assignedPlan.protein} color="bg-accent text-primary" />}
          {(assignedPlan.carbs_g   ?? assignedPlan.carbs   ?? 0) > 0 && <MacroChip label="Carbs"   value={assignedPlan.carbs_g   ?? assignedPlan.carbs}   color="bg-warning/10 text-warning" />}
          {(assignedPlan.fats_g    ?? assignedPlan.fats    ?? 0) > 0 && <MacroChip label="Fats"    value={assignedPlan.fats_g    ?? assignedPlan.fats}    color="bg-destructive/10 text-destructive" />}
        </div>
      )}

      {assignedPlan.adherence_rate > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-muted-foreground">Adherence</span>
            <span className="font-semibold text-foreground">{assignedPlan.adherence_rate}%</span>
          </div>
          <Bar
            value={assignedPlan.adherence_rate}
            max={100}
            color={assignedPlan.adherence_rate >= 80 ? 'bg-success' : assignedPlan.adherence_rate >= 60 ? 'bg-warning' : 'bg-destructive'}
          />
        </div>
      )}

      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={() => setShowPlanDetail(true)}
          className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
        >
          View Full Plan
        </button>
        <button
          onClick={() => setShowDialog(true)}
          className="flex-1 py-2 rounded-xl bg-secondary text-foreground text-xs font-semibold hover:bg-secondary/80 transition-colors"
        >
          Edit Plan
        </button>
      </div>

      <NutritionPlanDetailModal
        open={showPlanDetail}
        onOpenChange={setShowPlanDetail}
        plan={assignedPlan}
        onEdit={() => setShowPlanDetail(false)}
        onAssign={() => setShowPlanDetail(false)}
      />
    </div>
  );
}

// ── Section 2: Today's Food Log ───────────────────────────────────────────────
function TodayFoodLog({ client, assignedPlan }) {
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['nutrition', 'food-log', client.id, today],
    queryFn: async () => {
      const all = await db.entities.FoodLog.list();
      return all.filter(l => l.client_id === client.id && l.logged_date === today);
    },
    enabled: !!client?.id,
  });

  const grouped = useMemo(() => {
    const map = {};
    logs.forEach(l => {
      const key = l.meal_name || 'Other';
      if (!map[key]) map[key] = [];
      map[key].push(l);
    });
    return map;
  }, [logs]);

  const totalCals = logs.reduce((s, l) => s + (l.calories || 0), 0);
  const totalProtein = logs.reduce((s, l) => s + (l.protein || 0), 0);
  const targetCals = assignedPlan?.calories ?? assignedPlan?.daily_calories ?? 0;
  const targetProtein = assignedPlan?.protein_g ?? assignedPlan?.protein ?? 0;

  if (isLoading) return <div className="h-20 bg-muted animate-pulse rounded-xl" />;

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <div className="flex items-center gap-2">
          <Utensils className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-bold text-foreground uppercase tracking-wide">Today's Food Log</span>
        </div>
        <span className="text-[10px] text-muted-foreground">{format(new Date(), 'MMM d')}</span>
      </div>

      {/* Totals bar */}
      {logs.length > 0 && targetCals > 0 && (
        <div className="px-4 py-2.5 bg-muted border-b border-border space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Calories</span>
            <span className="font-semibold text-foreground tabular-nums">{totalCals} / {targetCals} kcal</span>
          </div>
          <Bar value={totalCals} max={targetCals} color="bg-orange-400" />
          {targetProtein > 0 && (
            <>
              <div className="flex justify-between text-xs mt-1">
                <span className="text-muted-foreground">Protein</span>
                <span className="font-semibold text-primary tabular-nums">{Math.round(totalProtein)}g / {targetProtein}g</span>
              </div>
              <Bar value={totalProtein} max={targetProtein} color="bg-primary" />
            </>
          )}
        </div>
      )}

      {logs.length === 0 ? (
        <div className="flex flex-col items-center py-8 gap-2">
          <Utensils className="w-7 h-7 text-border" />
          <p className="text-xs text-muted-foreground">No food logged today</p>
        </div>
      ) : (
        <div className="divide-y divide-muted">
          {Object.entries(grouped).map(([mealName, items]) => {
            const mealCals = items.reduce((s, i) => s + (i.calories || 0), 0);
            return (
              <div key={mealName}>
                <div className="flex items-center justify-between px-4 py-2 bg-muted">
                  <span className="text-xs font-semibold text-muted-foreground">{mealName}</span>
                  {mealCals > 0 && <span className="text-[10px] font-semibold text-orange-500 tabular-nums">{mealCals} kcal</span>}
                </div>
                {items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2">
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-foreground font-medium">{item.food_name}</span>
                      {item.serving_quantity && (
                        <span className="text-[10px] text-muted-foreground ml-1.5">{item.serving_quantity}{item.serving_unit || ''}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-semibold shrink-0 ml-2">
                      {item.protein > 0  && <span className="text-primary">{item.protein}P</span>}
                      {item.carbs > 0    && <span className="text-warning">{item.carbs}C</span>}
                      {item.fats > 0     && <span className="text-destructive">{item.fats}F</span>}
                      {item.calories > 0 && <span className="text-muted-foreground font-bold">{item.calories}</span>}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Section 3: Weekly Adherence Grid ─────────────────────────────────────────
function WeeklyAdherenceGrid({ client }) {
  const days = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => subDays(new Date(), 6 - i)),
    []
  );
  const startDate = format(days[0], 'yyyy-MM-dd');
  const endDate   = format(days[6], 'yyyy-MM-dd');

  const { data: logs = [] } = useQuery({
    queryKey: ['nutrition', 'food-log-week', client.id, startDate],
    queryFn: async () => {
      const all = await db.entities.FoodLog.list();
      return all.filter(l => l.client_id === client.id && l.logged_date >= startDate && l.logged_date <= endDate);
    },
    enabled: !!client?.id,
  });

  const dayStatuses = useMemo(() => {
    return days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayLogs = logs.filter(l => l.logged_date === dateStr);
      if (dayLogs.length === 0) return 'none';
      // Use adherence_rate if available on logs, else just "logged"
      const rate = dayLogs.find(l => l.adherence_rate != null)?.adherence_rate;
      if (rate != null) return rate >= 80 ? 'hit' : 'missed';
      return 'logged';
    });
  }, [logs, days]);

  const hitCount = dayStatuses.filter(s => s === 'hit' || s === 'logged').length;
  const adherencePct = Math.round((hitCount / 7) * 100);

  const COLOR = {
    hit:    'bg-success',
    logged: 'bg-success',
    missed: 'bg-warning',
    none:   'bg-border',
  };

  return (
    <div className="bg-card rounded-xl border border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-foreground uppercase tracking-wide">7-Day Adherence</span>
        <span className={cn(
          'text-xs font-bold tabular-nums',
          adherencePct >= 80 ? 'text-success' : adherencePct >= 50 ? 'text-warning' : 'text-muted-foreground'
        )}>
          {hitCount > 0 ? `${adherencePct}%` : '—'}
        </span>
      </div>

      <div className="flex gap-1.5 justify-between">
        {days.map((day, i) => {
          const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
          return (
            <div key={i} className="flex flex-col items-center gap-1 flex-1">
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className={cn(
                  'w-full aspect-square rounded-lg',
                  COLOR[dayStatuses[i]],
                  isToday && 'ring-2 ring-primary ring-offset-1'
                )}
              />
              <span className="text-[9px] text-muted-foreground font-medium">{format(day, 'EEE')}</span>
              <span className="text-[8px] text-border">{format(day, 'd')}</span>
            </div>
          );
        })}
      </div>

      <div className="flex gap-3 text-[10px] text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-success inline-block" /> Logged</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-warning inline-block" /> Missed target</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-border inline-block" /> Nothing logged</span>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function NutritionTab({ client }) {
  const { data: allPlans = [], isLoading, refetch } = useQuery({
    queryKey: ['client-nutrition', client.id],
    queryFn: () => db.entities.NutritionPlan.filter({ client_id: client.id }),
    staleTime: 0,
    refetchOnMount: true,
  });

  // Active plan = the one explicitly assigned to this client with status 'active'
  // Fall back to matching assigned_nutrition_id if status field not set yet
  const assignedPlan = allPlans.find(p => p.status === 'active') 
    || allPlans.find(p => p.id === client.assigned_nutrition_id) 
    || null;

  if (isLoading) return (
    <div className="p-5 space-y-3">
      {[1, 2, 3].map(i => <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />)}
    </div>
  );

  return (
    <div className="h-full overflow-y-auto p-5 space-y-4">
      <AssignedPlanSection client={client} allPlans={allPlans} assignedPlan={assignedPlan} onRefetch={refetch} />
      <TodayFoodLog client={client} assignedPlan={assignedPlan} />
      <WeeklyAdherenceGrid client={client} />
    </div>
  );
}