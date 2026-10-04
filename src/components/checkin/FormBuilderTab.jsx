import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Plus, Edit2, Copy, Trash2, ClipboardList, Calendar, Users } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import CheckInFormEditor from './CheckInFormEditor';

const FREQ_LABELS = {
  daily: 'Daily', weekly: 'Weekly', bi_weekly: 'Bi-weekly',
  monthly: 'Monthly', custom: 'Custom'
};

function FormCard({ form, clients, onEdit, onDuplicate, onDelete }) {
  const assignedCount = form.assign_to === 'all'
    ? clients.filter(c => c.lifecycle_status === 'active' || c.status === 'active').length
    : (form.assigned_client_ids?.length || 0);

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm hover:border-muted-foreground hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm text-foreground truncate">{form.name}</h3>
          {form.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{form.description}</p>}
        </div>
        <span className={cn(
          'text-[10px] font-bold px-2 py-1 rounded-full border flex-shrink-0',
          form.is_active ? 'bg-success/10 text-success border-success' : 'bg-muted text-muted-foreground border-border'
        )}>
          {form.is_active ? 'Active' : 'Inactive'}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-background rounded-lg p-2.5 text-center">
          <ClipboardList className="w-3.5 h-3.5 text-muted-foreground mx-auto mb-1" />
          <p className="text-sm font-bold text-foreground">{form.questions?.length || 0}</p>
          <p className="text-[10px] text-muted-foreground">Questions</p>
        </div>
        <div className="bg-background rounded-lg p-2.5 text-center">
          <Users className="w-3.5 h-3.5 text-muted-foreground mx-auto mb-1" />
          <p className="text-sm font-bold text-foreground">{assignedCount}</p>
          <p className="text-[10px] text-muted-foreground">Clients</p>
        </div>
        <div className="bg-background rounded-lg p-2.5 text-center">
          <Calendar className="w-3.5 h-3.5 text-muted-foreground mx-auto mb-1" />
          <p className="text-sm font-bold text-foreground">{FREQ_LABELS[form.frequency] || 'Weekly'}</p>
          <p className="text-[10px] text-muted-foreground">Frequency</p>
        </div>
      </div>

      {form.last_submission_date && (
        <p className="text-[10px] text-muted-foreground mb-4">
          Last submission: {format(parseISO(form.last_submission_date), 'MMM d, yyyy')}
        </p>
      )}

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => onEdit(form)} className="flex-1 gap-1.5">
          <Edit2 className="w-3 h-3" /> Edit
        </Button>
        <Button variant="outline" size="sm" onClick={() => onDuplicate(form)} className="gap-1.5">
          <Copy className="w-3 h-3" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => onDelete(form)}
          className="gap-1.5 border-destructive text-destructive hover:bg-destructive/10">
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

export default function FormBuilderTab({ clients }) {
  const [editingForm, setEditingForm] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const queryClient = useQueryClient();

  const { data: forms = [], isLoading } = useQuery({
    queryKey: ['checkin-forms'],
    queryFn: () => db.entities.CheckInForm.list('-created_date'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.CheckInForm.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkin-forms'] });
      toast.success('Form deleted');
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (form) => db.entities.CheckInForm.create({
      ...form,
      id: undefined,
      name: `${form.name} (Copy)`,
      created_date: undefined,
      updated_date: undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkin-forms'] });
      toast.success('Form duplicated');
    },
  });

  const handleNew = () => {
    setEditingForm(null);
    setShowEditor(true);
  };

  const handleEdit = (form) => {
    setEditingForm(form);
    setShowEditor(true);
  };

  const handleClose = () => {
    setShowEditor(false);
    setEditingForm(null);
    queryClient.invalidateQueries({ queryKey: ['checkin-forms'] });
  };

  if (showEditor) {
    return (
      <CheckInFormEditor
        form={editingForm}
        clients={clients}
        onClose={handleClose}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-muted-foreground">{forms.length} form{forms.length !== 1 ? 's' : ''}</p>
        <Button onClick={handleNew} className="gap-2" style={{ background: 'linear-gradient(135deg, var(--tc-primary), var(--tc-ai))' }}>
          <Plus className="w-4 h-4" /> New Form
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : forms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
            <ClipboardList className="w-8 h-8 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-foreground mb-1">No check-in forms yet</p>
            <p className="text-sm text-muted-foreground">Create your first form to start collecting client check-ins</p>
          </div>
          <Button onClick={handleNew} className="gap-2 mt-2" style={{ background: 'linear-gradient(135deg, var(--tc-primary), var(--tc-ai))' }}>
            <Plus className="w-4 h-4" /> Create Your First Form
          </Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {forms.map(form => (
            <FormCard
              key={form.id}
              form={form}
              clients={clients}
              onEdit={handleEdit}
              onDuplicate={duplicateMutation.mutate}
              onDelete={(f) => {
                if (confirm(`Delete "${f.name}"?`)) deleteMutation.mutate(f.id);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}