import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, Loader2, Users } from 'lucide-react';
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
    toast.success(`${template.label} template applied to ${client?.name}!`);
    setTimeout(onClose, 1200);
  };

  if (done) {
    return (
      <Dialog open onOpenChange={v => !v && onClose()}>
        <DialogContent className="max-w-xs p-8 flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-full bg-success/10 border border-success flex items-center justify-center">
            <Check className="w-7 h-7 text-success" />
          </div>
          <p className="font-semibold text-foreground">Template applied!</p>
          <p className="text-sm text-muted-foreground">Program, nutrition & automations are ready.</p>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-xs p-0 overflow-hidden rounded-xl">
        <div className="px-4 pt-4 pb-3 border-b border-border">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-lg">{template.emoji}</span>
            <DialogTitle className="text-sm font-semibold">Apply {template.label} template</DialogTitle>
          </div>
          <p className="text-xs text-muted-foreground">Select a client to receive this full coaching setup.</p>
        </div>

        <div className="p-2 max-h-60 overflow-y-auto">
          {clients.length === 0 ? (
            <div className="py-8 text-center">
              <Users className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No clients yet. Add a client first.</p>
            </div>
          ) : (
            clients.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedClientId(c.id)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors',
                  selectedClientId === c.id
                    ? 'bg-primary/10 border border-primary/20'
                    : 'hover:bg-secondary border border-transparent'
                )}
              >
                <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {c.name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                  {c.lifecycle_status && (
                    <p className="text-[11px] text-muted-foreground capitalize">{c.lifecycle_status.replace(/_/g, ' ')}</p>
                  )}
                </div>
                {selectedClientId === c.id && (
                  <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                )}
              </button>
            ))
          )}
        </div>

        <div className="p-3 border-t border-border">
          <Button
            className="w-full gap-2"
            disabled={!selectedClientId || applying}
            onClick={applyTemplate}
          >
            {applying ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Applying…</>
            ) : (
              <>Apply Template</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}