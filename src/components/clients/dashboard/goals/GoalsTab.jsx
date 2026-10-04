import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Plus, LayoutTemplate } from 'lucide-react';
import { toast } from 'sonner';
import GoalCard from './GoalCard';
import GoalFormModal from './GoalFormModal';
import TemplatePickerSheet from './TemplatePickerSheet';

export default function GoalsTab({ client }) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [prefilledTemplate, setPrefilledTemplate] = useState(null);
  const queryClient = useQueryClient();

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['goals', client.id],
    queryFn: () => db.entities.Goal.filter({ client_id: client.id }),
    enabled: !!client?.id,
    select: d => [...d].sort((a, b) => {
      // Active first, then by created date desc
      if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
      return new Date(b.created_date) - new Date(a.created_date);
    }),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['goals', client.id] });

  const handleEdit = (goal) => { setEditingGoal(goal); setPrefilledTemplate(null); setFormOpen(true); };
  const handleAdd  = ()     => { setEditingGoal(null); setPrefilledTemplate(null); setFormOpen(true); };

  const handleTemplateSelected = (tmpl) => {
    setShowTemplatePicker(false);
    setEditingGoal(null);
    setPrefilledTemplate(tmpl);
    setFormOpen(true);
  };

  const handleDelete = async (goal) => {
    if (!confirm(`Delete goal "${goal.name}"?`)) return;
    await db.entities.Goal.delete(goal.id);
    toast.success('Goal deleted');
    refresh();
  };

  const handleToggleComplete = async (goal) => {
    const newStatus = goal.status === 'completed' ? 'active' : 'completed';
    await db.entities.Goal.update(goal.id, { status: newStatus });
    toast.success(newStatus === 'completed' ? 'Goal marked complete!' : 'Goal reactivated');
    refresh();
  };

  const handleSaved = () => {
    setFormOpen(false);
    setEditingGoal(null);
    setPrefilledTemplate(null);
    refresh();
  };

  const active    = goals.filter(g => g.status === 'active');
  const completed = goals.filter(g => g.status === 'completed');

  return (
    <div className="h-full overflow-y-auto" style={{ background: 'var(--tc-muted)' }}>
      <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-foreground">Client Goals</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{active.length} active · {completed.length} completed</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTemplatePicker(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary px-3 py-2 rounded-lg border border-border hover:border-primary transition-colors"
            >
              <LayoutTemplate className="w-3.5 h-3.5" /> Templates
            </button>
            <button
              onClick={handleAdd}
              className="flex items-center gap-1.5 text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary px-4 py-2 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Goal
            </button>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="text-center py-12 text-sm text-muted-foreground">Loading goals…</div>
        )}

        {/* Empty state */}
        {!isLoading && goals.length === 0 && (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-card border border-border flex items-center justify-center mx-auto mb-4 shadow-sm">
              <span className="text-2xl">🎯</span>
            </div>
            <p className="text-sm font-semibold text-muted-foreground mb-1">No goals yet</p>
            <p className="text-xs text-muted-foreground mb-4">Create custom goals to track this client's progress.</p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={handleAdd}
                className="flex items-center gap-1.5 text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary px-5 py-2.5 rounded-xl transition-colors"
              >
                <Plus className="w-4 h-4" /> Add First Goal
              </button>
              <button
                onClick={() => setShowTemplatePicker(true)}
                className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-primary px-4 py-2.5 rounded-xl border border-border bg-card hover:border-primary transition-colors"
              >
                <LayoutTemplate className="w-4 h-4" /> Browse Templates
              </button>
            </div>
          </div>
        )}

        {/* Active goals */}
        {active.length > 0 && (
          <div className="space-y-3">
            {active.map(g => (
              <GoalCard
                key={g.id}
                goal={g}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggleComplete={handleToggleComplete}
              />
            ))}
          </div>
        )}

        {/* Completed goals */}
        {completed.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-0.5 h-3 rounded-full bg-success" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Completed</p>
            </div>
            {completed.map(g => (
              <GoalCard
                key={g.id}
                goal={g}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggleComplete={handleToggleComplete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Portals */}
      {showTemplatePicker && ReactDOM.createPortal(
        <TemplatePickerSheet
          onSelect={handleTemplateSelected}
          onClose={() => setShowTemplatePicker(false)}
        />,
        document.body
      )}
      {formOpen && ReactDOM.createPortal(
        <GoalFormModal
          clientId={client.id}
          goal={editingGoal}
          prefilledTemplate={prefilledTemplate}
          onSaved={handleSaved}
          onClose={() => { setFormOpen(false); setEditingGoal(null); setPrefilledTemplate(null); }}
        />,
        document.body
      )}
    </div>
  );
}