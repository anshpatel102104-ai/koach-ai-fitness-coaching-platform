import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import HabitCard from './HabitCard';
import HabitFormModal from './HabitFormModal';

export default function HabitsSection({ client }) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const qc = useQueryClient();

  // All habits for this client
  const { data: habits = [], isLoading: habitsLoading } = useQuery({
    queryKey: ['habits', client.id],
    queryFn: () => db.entities.Habit.filter({ client_id: client.id }),
    enabled: !!client?.id,
    select: d => [...d].sort((a, b) => {
      // Active first, then by created date
      if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
      return new Date(a.created_date) - new Date(b.created_date);
    }),
  });

  // All completions for this client (covers last 30 days + any existing)
  const { data: completions = [], isLoading: completionsLoading } = useQuery({
    queryKey: ['habit-completions', client.id],
    queryFn: () => db.entities.HabitCompletion.filter({ client_id: client.id }),
    enabled: !!client?.id,
  });

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ['habits', client.id] });
    qc.invalidateQueries({ queryKey: ['habit-completions', client.id] });
  };

  const handleSaved = () => {
    setFormOpen(false);
    setEditingHabit(null);
    refreshAll();
  };

  const handleEdit = (habit) => { setEditingHabit(habit); setFormOpen(true); };
  const handleAdd  = ()      => { setEditingHabit(null); setFormOpen(true); };

  const handleDelete = async (habit) => {
    if (!confirm(`Delete habit "${habit.name}"?`)) return;
    await db.entities.Habit.delete(habit.id);
    // Also remove completions for this habit
    const toDelete = completions.filter(c => c.habit_id === habit.id);
    await Promise.all(toDelete.map(c => db.entities.HabitCompletion.delete(c.id)));
    toast.success('Habit deleted');
    refreshAll();
  };

  // Toggle a day: if completion exists → delete it; if not → create it
  const handleToggleDay = async (habit, dateStr, currentlyDone) => {
    if (currentlyDone) {
      // Find and delete the completion record
      const existing = completions.find(c => c.habit_id === habit.id && c.date === dateStr);
      if (existing) {
        await db.entities.HabitCompletion.delete(existing.id);
      }
    } else {
      await db.entities.HabitCompletion.create({
        habit_id: habit.id,
        client_id: client.id,
        date: dateStr,
        completed: true,
      });
    }
    qc.invalidateQueries({ queryKey: ['habit-completions', client.id] });
  };

  // Group completions by habit_id for efficient lookup
  const completionsByHabit = {};
  completions.forEach(c => {
    if (!completionsByHabit[c.habit_id]) completionsByHabit[c.habit_id] = [];
    completionsByHabit[c.habit_id].push(c);
  });

  const active   = habits.filter(h => h.is_active !== false);
  const inactive = habits.filter(h => h.is_active === false);
  const isLoading = habitsLoading || completionsLoading;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-foreground">Habits</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {active.length} active · {inactive.length} inactive
            </p>
          </div>
          <button
            onClick={handleAdd}
            className="flex items-center gap-1.5 text-sm font-semibold text-ai-foreground bg-ai hover:bg-ai px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" /> Add habit
          </button>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="text-center py-12 text-sm text-muted-foreground">Loading habits…</div>
        )}

        {/* Empty state */}
        {!isLoading && habits.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-xl bg-card border border-border flex items-center justify-center mx-auto mb-4">
              
            </div>
            <p className="text-sm font-bold text-foreground mb-1">No habits yet</p>
            <p className="text-xs text-muted-foreground mb-5">
              Add daily or weekly habits to track for this client.
              <br />Common examples: Morning vitamins, Drink 3L water, 10k steps.
            </p>
            <button
              onClick={handleAdd}
              className="flex items-center gap-1.5 text-sm font-semibold text-ai-foreground bg-ai hover:bg-ai px-5 py-2.5 rounded-xl transition-colors mx-auto"
            >
              <Plus className="w-4 h-4" /> Add first habit
            </button>
          </div>
        )}

        {/* Active habits */}
        {active.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold text-muted-foreground">Active</p>
              <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-ai/10 text-ai">{active.length}</span>
            </div>
            {active.map(h => (
              <HabitCard
                key={h.id}
                habit={h}
                completions={completionsByHabit[h.id] || []}
                onToggleDay={handleToggleDay}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {/* Inactive habits */}
        {inactive.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold text-muted-foreground">Inactive</p>
            </div>
            {inactive.map(h => (
              <HabitCard
                key={h.id}
                habit={h}
                completions={completionsByHabit[h.id] || []}
                onToggleDay={handleToggleDay}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal portal — z-[200] ensures it floats above the client dashboard modal */}
      {formOpen && (
        <HabitFormModal
          clientId={client.id}
          habit={editingHabit}
          onSaved={handleSaved}
          onClose={() => { setFormOpen(false); setEditingHabit(null); }}
        />
      )}
    </div>
  );
}