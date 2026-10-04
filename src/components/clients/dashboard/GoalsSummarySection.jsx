import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Plus, Target, CheckCircle2, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import GoalFormModal from './goals/GoalFormModal';

// ── Mini progress bar ──────────────────────────────────────
function Bar({ pct, color = 'var(--tc-primary)' }) {
  const p = Math.max(0, Math.min(100, pct || 0));
  return (
    <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${p}%`, background: color }} />
    </div>
  );
}

// ── Single goal card ───────────────────────────────────────
function GoalItem({ goal, onEdit, onDelete, onToggle }) {
  const isComplete = goal.status === 'completed';

  // Compute display based on type
  let progress = null;
  let progressLabel = null;

  if (goal.goal_type === 'numeric' && goal.target_value) {
    const cur = goal.current_value ?? 0;
    const pct = Math.round((cur / goal.target_value) * 100);
    progress = pct;
    progressLabel = `${cur} / ${goal.target_value} ${goal.unit || ''}`.trim();
  } else if (goal.goal_type === 'simple') {
    progress = goal.progress_pct ?? 0;
    progressLabel = `${progress}%`;
  } else if (goal.goal_type === 'nutrition') {
    const calPct = goal.calories_target ? Math.round(((goal.calories_current ?? 0) / goal.calories_target) * 100) : null;
    progress = calPct;
    const parts = [];
    if (goal.calories_target) parts.push(`${goal.calories_current ?? 0}/${goal.calories_target} kcal`);
    if (goal.protein_target)  parts.push(`${goal.protein_current ?? 0}/${goal.protein_target}g P`);
    progressLabel = parts.join(' · ');
  }

  return (
    <div className={`bg-card rounded-xl border shadow-sm p-3.5 transition-all ${isComplete ? 'opacity-60 border-border' : 'border-border hover:border-accent'}`}>
      <div className="flex items-start gap-3">
        {/* Complete toggle */}
        <button onClick={() => onToggle(goal)} className="mt-0.5 flex-shrink-0">
          {isComplete
            ? <CheckCircle2 className="w-4 h-4 text-success" />
            : <Target className="w-4 h-4 text-primary" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className={`text-sm font-semibold leading-tight ${isComplete ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
              {goal.name}
            </p>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <button onClick={() => onEdit(goal)}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-muted-foreground">
                <Pencil className="w-3 h-3" />
              </button>
              <button onClick={() => onDelete(goal)}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>

          {progress !== null && (
            <div className="space-y-1">
              <Bar pct={progress} color={isComplete ? 'var(--tc-success)' : 'var(--tc-primary)'} />
              <p className="text-[10px] text-muted-foreground">{progressLabel}</p>
            </div>
          )}

          {goal.goal_type === 'nutrition' && goal.protein_target && (
            <div className="grid grid-cols-3 gap-1 mt-2">
              {[
                { label: 'Protein', cur: goal.protein_current, tgt: goal.protein_target, color: 'var(--tc-primary)' },
                { label: 'Carbs',   cur: goal.carbs_current,   tgt: goal.carbs_target,   color: 'var(--tc-warning)' },
                { label: 'Fat',     cur: goal.fat_current,     tgt: goal.fat_target,     color: 'var(--tc-success)' },
              ].map(m => (
                <div key={m.label}>
                  <Bar pct={m.tgt ? Math.round(((m.cur ?? 0) / m.tgt) * 100) : 0} color={m.color} />
                  <p className="text-[9px] text-muted-foreground mt-0.5">{m.label} {m.cur ?? 0}/{m.tgt ?? 0}g</p>
                </div>
              ))}
            </div>
          )}

          {goal.notes && (
            <p className="text-[10px] text-muted-foreground mt-1 italic">{goal.notes}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main exported section ──────────────────────────────────
export default function GoalsSummarySection({ client }) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const qc = useQueryClient();

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['goals', client.id],
    queryFn: () => db.entities.Goal.filter({ client_id: client.id }),
    enabled: !!client?.id,
    select: d => [...d].sort((a, b) => {
      if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
      return new Date(b.created_date) - new Date(a.created_date);
    }),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['goals', client.id] });

  const handleEdit   = (g) => { setEditingGoal(g); setFormOpen(true); };
  const handleAdd    = ()  => { setEditingGoal(null); setFormOpen(true); };
  const handleSaved  = ()  => { setFormOpen(false); setEditingGoal(null); refresh(); };

  const handleDelete = async (g) => {
    if (!confirm(`Delete goal "${g.name}"?`)) return;
    await db.entities.Goal.delete(g.id);
    toast.success('Goal deleted');
    refresh();
  };

  const handleToggle = async (g) => {
    const next = g.status === 'completed' ? 'active' : 'completed';
    await db.entities.Goal.update(g.id, { status: next });
    toast.success(next === 'completed' ? 'Goal completed!' : 'Goal reactivated');
    refresh();
  };

  const active    = goals.filter(g => g.status !== 'completed');
  const completed = goals.filter(g => g.status === 'completed');

  return (
    <>
      <div className="bg-card rounded-xl border border-border shadow-sm p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-0.5 h-3.5 rounded-full bg-primary" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Goals</p>
            {goals.length > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-accent text-primary">
                {active.length} active
              </span>
            )}
          </div>
          <button
            onClick={handleAdd}
            className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary px-2.5 py-1.5 rounded-lg bg-accent hover:bg-accent transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Goal
          </button>
        </div>

        {/* Loading */}
        {isLoading && <p className="text-xs text-muted-foreground py-2">Loading…</p>}

        {/* Empty state */}
        {!isLoading && goals.length === 0 && (
          <div className="text-center py-5">
            <Target className="w-7 h-7 text-border mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No goals yet — <button onClick={handleAdd} className="text-primary font-semibold hover:underline">add one</button></p>
          </div>
        )}

        {/* Active goals */}
        {active.length > 0 && (
          <div className="space-y-2">
            {active.map(g => (
              <GoalItem key={g.id} goal={g} onEdit={handleEdit} onDelete={handleDelete} onToggle={handleToggle} />
            ))}
          </div>
        )}

        {/* Completed */}
        {completed.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-border flex items-center gap-1.5">
              <span className="w-0.5 h-3 rounded-full bg-success inline-block" />Completed
            </p>
            {completed.map(g => (
              <GoalItem key={g.id} goal={g} onEdit={handleEdit} onDelete={handleDelete} onToggle={handleToggle} />
            ))}
          </div>
        )}
      </div>

      {/* Modal — rendered at this level so it's outside the overflow scroll container */}
      {formOpen && (
        <GoalFormModal
          clientId={client.id}
          goal={editingGoal}
          onSaved={handleSaved}
          onClose={() => { setFormOpen(false); setEditingGoal(null); }}
        />
      )}
    </>
  );
}