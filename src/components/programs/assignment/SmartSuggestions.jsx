import React, { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SmartSuggestions({ selectedClients, program, allClients }) {
  const suggestions = useMemo(() => {
    const tips = [];

    if (selectedClients.length === 0) return tips;

    const clientData = allClients.filter((c) => selectedClients.includes(c.id));

    // Check for Lead clients
    const leads = clientData.filter((c) => c.lifecycle_status === 'lead');
    if (leads.length > 0) {
      tips.push({
        id: 'lead-kickoff',
        type: 'tip',
        title: 'Book an onboarding call first',
        message: `${leads.length === 1 ? `${leads[0].name} is` : `${leads.length} of these clients are`} still a lead. A quick call before week 1 sets expectations.`,
      });
    }

    // Check for difficulty mismatch
    if (program.difficulty === 'advanced') {
      const beginnerClients = clientData.filter((c) => c.goal === 'general_fitness' || !c.assigned_program_id);
      if (beginnerClients.length > 0) {
        tips.push({
          id: 'difficulty-mismatch',
          type: 'warning',
          title: 'This is an advanced program',
          message: `${beginnerClients.length === 1 ? beginnerClients[0].name : 'Some of these clients'} may not be ready for it.`,
        });
      }
    }

    // Check for injury notes
    clientData.forEach((client) => {
      if (client.notes && client.notes.toLowerCase().includes('injury')) {
        tips.push({
          id: `injury-${client.id}`,
          type: 'injury',
          title: `${client.name} has an injury on file`,
          message: 'Check the program against it before they start.',
        });
      }
    });

    return tips;
  }, [selectedClients, program, allClients]);

  if (suggestions.length === 0) return null;

  return (
    <div className="mt-6 space-y-2 border-t border-border pt-5">
      {suggestions.map((s) => (
        <div
          key={s.id}
          className={cn(
            'flex gap-3 rounded-lg px-3.5 py-3',
            s.type === 'injury' ? 'bg-destructive/10' : s.type === 'warning' ? 'bg-warning-soft' : 'bg-secondary'
          )}
        >
          {s.type !== 'tip' && (
            <AlertTriangle className={cn('mt-0.5 h-4 w-4 flex-shrink-0', s.type === 'injury' ? 'text-destructive' : 'text-warning')} />
          )}
          <div>
            <p className={cn('text-sm font-semibold', s.type === 'injury' ? 'text-destructive' : 'text-foreground')}>{s.title}</p>
            <p className="mt-0.5 text-[13px] text-foreground/80">{s.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
