import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const OPTIONS = [
  {
    id: 'ai',
    title: 'Draft it with AI',
    description: 'Answer a few questions about the client. The AI drafts meals to their macros and allergies, and you edit before anything is sent.',
    ink: true,
  },
  {
    id: 'manual',
    title: 'Build it by hand',
    description: 'Start from a blank plan and set the meals, foods and macros yourself.',
    ink: false,
  },
];

export default function NewPlanLaunchModal({ open, onOpenChange, onSelectAI, onSelectManual }) {
  function handleSelect(id) {
    if (id === 'ai') onSelectAI?.();
    else onSelectManual?.();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New meal plan</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Pick a starting point. You can change anything afterwards.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-3">
          {OPTIONS.map(opt => (
            <button
              key={opt.id}
              onClick={() => handleSelect(opt.id)}
              className={
                opt.ink
                  ? 'w-full flex items-center gap-4 rounded-xl bg-ai text-ai-foreground p-5 text-left hover:bg-ai/90 transition-colors'
                  : 'w-full flex items-center gap-4 rounded-xl border border-input bg-card p-5 text-left hover:bg-accent transition-colors'
              }
            >
              <span className="flex-1 min-w-0">
                <span className="block text-[15px] font-semibold">{opt.title}</span>
                <span className={opt.ink ? 'block text-sm mt-1 text-ai-foreground/75' : 'block text-sm mt-1 text-muted-foreground'}>
                  {opt.description}
                </span>
              </span>
              <ChevronRight className="w-4 h-4 flex-shrink-0 opacity-70" />
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
