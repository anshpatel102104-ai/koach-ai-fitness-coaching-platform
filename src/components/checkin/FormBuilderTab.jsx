import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Plus, Edit2, Copy, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Panel, EmptyState } from '@/components/kit';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import CheckInFormEditor from './CheckInFormEditor';

const FREQ_LABELS = {
  daily: 'Daily', weekly: 'Weekly', bi_weekly: 'Bi-weekly',
  monthly: 'Monthly', custom: 'Custom'
};

function FormRow({ form, clients, onEdit, onDuplicate, onDelete }) {
  const assignedCount = form.assign_to === 'all'
    ? clients.filter(c => c.lifecycle_status === 'active' || c.status === 'active').length
    : (form.assigned_client_ids?.length || 0);
  const qCount = form.questions?.length || 0;

  return (
    <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-6 sm:px-6 border-b border-border last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-[15px] font-semibold text-foreground truncate">{form.name}</p>
          {!form.is_active && <span className="text-[13px] text-muted-foreground">Paused</span>}
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          {qCount} question{qCount !== 1 ? 's' : ''} · {FREQ_LABELS[form.frequency] || 'Weekly'} · {assignedCount} client{assignedCount !== 1 ? 's' : ''}
          {form.last_submission_date && <> · last answered {format(parseISO(form.last_submission_date), 'MMM d')}</>}
        </p>
        {form.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{form.description}</p>}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button variant="outline" size="sm" onClick={() => onEdit(form)}>
          <Edit2 /> Edit
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onDuplicate(form)} aria-label="Duplicate form">
          <Copy />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onDelete(form)} aria-label="Delete form" className="text-destructive hover:text-destructive">
          <Trash2 />
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
      name: `${form.name} (copy)`,
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
      <div className="flex items-center justify-between gap-3 mb-4">
        <p className="text-sm text-muted-foreground">{forms.length} form{forms.length !== 1 ? 's' : ''}</p>
        <Button onClick={handleNew}>
          <Plus /> New form
        </Button>
      </div>

      <Panel className="overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-5 h-5 border-2 border-border border-t-foreground rounded-full animate-spin" />
          </div>
        ) : forms.length === 0 ? (
          <EmptyState
            title="No check-in forms yet."
            body="Make one form with the questions you ask every week. Clients get it on the day you choose."
            action={<Button onClick={handleNew}><Plus /> Create a form</Button>}
          />
        ) : (
          forms.map(form => (
            <FormRow
              key={form.id}
              form={form}
              clients={clients}
              onEdit={handleEdit}
              onDuplicate={duplicateMutation.mutate}
              onDelete={(f) => {
                if (confirm(`Delete "${f.name}"?`)) deleteMutation.mutate(f.id);
              }}
            />
          ))
        )}
      </Panel>
    </div>
  );
}
