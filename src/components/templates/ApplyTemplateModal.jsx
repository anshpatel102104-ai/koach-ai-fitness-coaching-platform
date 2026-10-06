import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Initials } from '@/components/kit';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function ApplyTemplateModal({ template, onClose }) {
  const [selectedClientId, setSelectedClientId] = useState('');
  const [applying, setApplying] = useState(false);
  const [done, setDone] = useState(false);
  const queryClient = useQueryClient();

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => db.entities.Client.list('-created_date'),
  });

  const applyTemplate = async () => {
    if (!selectedClientId) return;
    setApplying(true);

    const client = clients.find(c => c.id === selectedClientId);

    // 1. Create workout program
    const program = await db.entities.WorkoutProgram.create(template.program);

    // 2. Create nutrition plan
    const nutrition = await db.entities.NutritionPlan.create(template.nutrition);

    // 3. Assign both to client
    await db.entities.Client.update(selectedClientId, {
      assigned_program_id: program.id,
      assigned_nutrition_id: nutrition.id,
      goal: template.clientGoal,
      tags: [...new Set([...(client?.tags || []), ...template.tags])],
    });

    // 4. Create automation rules (skip duplicates by name)
    const existingRules = await db.entities.AutomationRule.list();
    const existingNames = new Set(existingRules.map(r => r.name));
    for (const rule of template.automationRules) {
      if (!existingNames.has(rule.name)) {
        await db.entities.AutomationRule.create(rule);
      }
    }

    queryClient.invalidateQueries({ queryKey: ['clients'] });
    queryClient.invalidateQueries({ queryKey: ['programs'] });
    queryClient.invalidateQueries({ queryKey: ['automation-rules'] });

    setApplying(false);
    setDone(true);
    toast.success(`${template.label} template applied to ${client?.name}`);
    setTimeout(onClose, 1200);
  };

  const selectedClient = clients.find(c => c.id === selectedClientId);

  if (done) {
    return (
      <Dialog open onOpenChange={v => !v && onClose()}>
        <DialogContent className="sm:max-w-sm">
          <DialogTitle className="text-[22px]">Template applied</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {selectedClient ? `${selectedClient.name} has` : 'They have'} the program, nutrition plan and automation rules now.
          </p>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent className="flex flex-col gap-0 overflow-hidden p-0 sm:max-w-md sm:p-0 sm:flex">
        <div className="px-5 pt-5 pb-3 sm:px-6 sm:pt-6">
          <DialogTitle className="pr-8 text-[22px]">Apply {template.label}</DialogTitle>
          <DialogDescription className="mt-1">Sets up the program, nutrition plan, tags and automation rules for one client. Their current program and plan are replaced.</DialogDescription>
        </div>

        <div className="max-h-72 overflow-y-auto px-3 pb-2 sm:px-4">
          {clients.length === 0 ? (
            <p className="px-2 py-6 text-sm text-muted-foreground">No clients yet. Add one first.</p>
          ) : (
            clients.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedClientId(c.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors',
                  selectedClientId === c.id ? 'bg-accent' : 'hover:bg-accent/60'
                )}
              >
                <Initials name={c.name} size={32} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold text-foreground">{c.name}</span>
                  {c.lifecycle_status && (
                    <span className="block text-[13px] text-muted-foreground">{c.lifecycle_status.replace(/_/g, ' ').replace(/^./, ch => ch.toUpperCase())}</span>
                  )}
                </span>
                {selectedClientId === c.id && <Check className="h-4 w-4 flex-shrink-0 text-foreground" />}
              </button>
            ))
          )}
        </div>

        <div className="flex gap-2 border-t border-border px-5 py-4 sm:px-6">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" disabled={!selectedClientId || applying} onClick={applyTemplate}>
            {applying ? 'Applying…' : selectedClient ? `Apply to ${selectedClient.name.split(' ')[0]}` : 'Apply'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
