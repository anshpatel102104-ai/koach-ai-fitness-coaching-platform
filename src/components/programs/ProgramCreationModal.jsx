import React, { useState, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import AIBuilder from './builder/AIBuilder';
import ManualBuilder from './builder/ManualBuilder';

const ModeRow = ({ title, description, onClick }) => (
  <button
    onClick={onClick}
    className="group flex w-full items-center gap-4 border-b border-border py-4 text-left last:border-b-0"
  >
    <span className="min-w-0 flex-1">
      <span className="block text-[17px] font-semibold text-foreground">{title}</span>
      <span className="mt-0.5 block text-sm text-muted-foreground">{description}</span>
    </span>
    <ChevronRight className="h-5 w-5 flex-shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
  </button>
);

export default function ProgramCreationModal({ open, onOpenChange, onProgramCreated, initialMode = null }) {
  const [mode, setMode] = useState(null);

  // When opened with a pre-selected mode, jump straight to it
  useEffect(() => {
    if (open) setMode(initialMode);
    else setMode(null);
  }, [open, initialMode]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={mode
          ? 'flex w-full flex-col gap-0 overflow-hidden p-0 sm:flex sm:max-w-[860px] sm:p-0 h-[92dvh] sm:h-[85dvh] sm:max-h-[85dvh]'
          : 'sm:max-w-lg'}
      >
        {!mode ? (
          <div>
            <DialogTitle className="text-[26px]">New program</DialogTitle>
            <DialogDescription className="mt-1">Either way you can edit every day and set afterwards.</DialogDescription>
            <div className="mt-4">
              <ModeRow
                title="Generate with AI"
                description="Answer a few questions about the client. AI drafts the weeks for you to check."
                onClick={() => setMode('ai')}
              />
              <ModeRow
                title="Build it yourself"
                description="Start from a blank program and add days and exercises."
                onClick={() => setMode('manual')}
              />
            </div>
          </div>
        ) : mode === 'ai' ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <AIBuilder
              onBack={() => setMode(null)}
              onProgramCreated={(program) => {
                onProgramCreated(program);
                onOpenChange(false);
              }}
            />
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <ManualBuilder
              onBack={() => setMode(null)}
              onProgramCreated={(program) => {
                onProgramCreated(program);
                onOpenChange(false);
              }}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
