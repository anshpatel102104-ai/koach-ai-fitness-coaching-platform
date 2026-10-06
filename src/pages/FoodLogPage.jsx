import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { format, addDays } from 'date-fns';
import {
  ChevronLeft, ChevronRight, Trash2, Plus, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Page, PageHeader, Panel, EmptyState } from '@/components/kit';
import FoodSearchModal from '@/components/nutrition/FoodSearchModal';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function sum(logs, field) {
  return Math.round(logs.reduce((s, l) => s + (parseFloat(l[field]) || 0), 0) * 10) / 10;
}

function MacroBar({ label, consumed, target }) {
  const pct = target > 0 ? Math.min((consumed / target) * 100, 100) : 0;
  const over = target > 0 && consumed > target * 1.1;

  return (
    <div className="py-2.5 border-b border-border last:border-b-0">
      <div className="flex items-baseline justify-between gap-3 mb-1.5">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-sm tabular-nums">
          <span className={cn('font-semibold', over ? 'text-destructive' : 'text-foreground')}>{consumed} g</span>
          {target > 0 && <span className="text-muted-foreground"> of {target} g</span>}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
        <div className={cn('h-full rounded-full transition-[width] duration-300', over ? 'bg-destructive' : 'bg-foreground')} style={{ width: `${pct}%` }} />
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
  const calBarColor = calOver ? 'bg-destructive' : calNear ? 'bg-success' : 'bg-foreground';

  return (
    <Panel className="p-5 sm:p-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="num text-[44px] leading-none text-foreground">{Math.round(totCal).toLocaleString()}</p>
          <p className="text-sm text-muted-foreground mt-1.5">
            {tCal > 0 ? `of ${Math.round(tCal).toLocaleString()} calories` : 'calories logged, no plan target'}
          </p>
        </div>
        {tCal > 0 && (
          <span className={cn('text-sm font-semibold', calOver ? 'text-destructive' : calNear ? 'text-success' : 'text-muted-foreground')}>
            {calOver ? 'Over target' : calNear ? 'On target' : `${Math.round(tCal - totCal).toLocaleString()} to go`}
          </span>
        )}
      </div>

      <div className="h-2.5 rounded-full bg-secondary overflow-hidden mt-4">
        <div className={cn('h-full rounded-full transition-[width] duration-300', calBarColor)} style={{ width: `${calPct}%` }} />
      </div>

      <div className="mt-4">
        <MacroBar label="Protein" consumed={totPro}  target={tPro} />
        <MacroBar label="Carbs"   consumed={totCarb} target={tCarb} />
        <MacroBar label="Fat"     consumed={totFat}  target={tFat} />
      </div>
      {plan?.title && <p className="text-[13px] text-muted-foreground mt-3">Targets from {plan.title}.</p>}
    </Panel>
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
    <section className="border-b border-border last:border-b-0">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-5 sm:px-6 pt-4 pb-2">
        <div className="flex items-baseline gap-2">
          <h2 className="text-[20px] text-foreground">{mealName}</h2>
          {logs.length > 0 && (
            <span className="text-[13px] text-muted-foreground tabular-nums">{mealCal} kcal</span>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={() => setFoodSearchOpen(true)}>
          <Plus /> Log food
        </Button>
      </div>

      {/* Entries */}
      <div className="px-5 sm:px-6 pb-3">
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">Nothing logged.</p>
        ) : (
          logs.map(log => (
            <div key={log.id} className="flex items-center gap-3 py-2.5 border-b border-border last:border-b-0">
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-semibold text-foreground truncate">{log.food_name}</p>
                <p className="text-[13px] text-muted-foreground tabular-nums">
                  {log.serving_quantity} × {log.serving_unit ?? 'serving'} · {log.protein} g P · {log.carbs} g C · {log.fats} g F
                </p>
              </div>
              <span className="num text-lg text-foreground shrink-0">{log.calories}</span>
              <button
                onClick={() => onDelete(log.id)}
                className="touch-compact p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-accent transition-colors shrink-0"
                aria-label={`Remove ${log.food_name}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>

      <FoodSearchModal
        open={foodSearchOpen}
        onOpenChange={setFoodSearchOpen}
        mealName={mealName}
        onAddFood={handleAddFood}
      />
    </section>
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
    <Panel className="p-5 sm:p-6 space-y-3">
      <div>
        <h2 className="text-[22px] text-foreground">Coach note</h2>
        <p className="text-sm text-muted-foreground mt-1">The client sees this on their food log for the day.</p>
      </div>
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="Protein was short again. Add the shake after training."
        rows={3}
        className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
      />
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={() => saveNotes.mutate()}
          disabled={saveNotes.isPending}
        >
          {saveNotes.isPending
            ? <><Loader2 className="animate-spin" /> Saving</>
            : saved
            ? 'Saved'
            : 'Save note'
          }
        </Button>
      </div>
    </Panel>
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

  const dateLabel = format(new Date(date + 'T12:00:00'), 'EEEE, MMMM d');

  return (
    <Page>
      <PageHeader
        eyebrow={selectedClient ? selectedClient.name : null}
        title="Food log"
        subtitle={selectedClient
          ? `${dateLabel}. ${foodLogs.length} item${foodLogs.length === 1 ? '' : 's'} logged.`
          : 'Pick a client to see what they ate, log food for them, and leave a note.'}
        actions={
          <>
            <select
              value={clientId}
              onChange={e => setClientId(e.target.value)}
              className="h-10 rounded-md border border-input bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring min-w-[180px]"
              aria-label="Client"
            >
              <option value="">Select a client</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="icon" onClick={() => changeDay(-1)} aria-label="Previous day">
                <ChevronLeft />
              </Button>
              <Input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-40 text-sm"
                aria-label="Date"
              />
              <Button variant="outline" size="icon" onClick={() => changeDay(1)} aria-label="Next day">
                <ChevronRight />
              </Button>
            </div>
          </>
        }
      />

      {!clientId && (
        <Panel>
          <EmptyState
            title="No client selected."
            body="Choose a client above to open their log for the day."
          />
        </Panel>
      )}

      {clientId && (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-5 items-start">
          <Panel className="overflow-hidden lg:order-1 order-2">
            {logsLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              mealNames.map(mealName => (
                <MealGroup
                  key={mealName}
                  mealName={mealName}
                  logs={foodLogs.filter(l => l.meal_name === mealName)}
                  clientId={clientId}
                  date={date}
                  onDelete={id => deleteLog.mutate(id)}
                />
              ))
            )}
          </Panel>

          <div className="space-y-5 lg:order-2 order-1">
            <DailySummary logs={foodLogs} plan={assignedPlan} />
            <CoachNotes
              clientId={clientId}
              date={date}
              existingNote={notesEntry?.coach_daily_notes}
            />
          </div>
        </div>
      )}
    </Page>
  );
}
