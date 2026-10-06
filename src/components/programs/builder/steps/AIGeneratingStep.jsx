import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { InkPanel } from '@/components/kit';

const MESSAGES = [
  'Reading the client profile.',
  'Laying out the week.',
  'Choosing exercises for the equipment they have.',
  'Setting sets, reps and progression.',
  'Checking every exercise against their limitations.',
];

export default function AIGeneratingStep({ error, onRetry, onBack }) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (error) return;
    const interval = setInterval(() => {
      setMessageIndex(i => Math.min(i + 1, MESSAGES.length - 1));
    }, 2500);
    return () => clearInterval(interval);
  }, [error]);

  if (error) {
    return (
      <div className="max-w-md py-6">
        <h3 className="text-[22px] text-foreground">The draft didn't come through</h3>
        <p className="mt-1 text-sm text-destructive">{error}</p>
        <div className="mt-5 flex gap-2">
          <Button variant="outline" onClick={onBack}>Change the answers</Button>
          <Button onClick={onRetry}>Try again</Button>
        </div>
      </div>
    );
  }

  return (
    <InkPanel title="Drafting the program" className="max-w-xl">
      <p aria-live="polite">{MESSAGES[messageIndex]}</p>
      <div className="mt-5 flex gap-1.5" aria-hidden>
        {MESSAGES.map((_, i) => (
          <span key={i} className={`h-1 flex-1 rounded-full ${i <= messageIndex ? 'bg-ai-foreground' : 'bg-ai-foreground/20'}`} />
        ))}
      </div>
      <p className="mt-4 text-[13px] text-ai-foreground/60">You'll see every day and set before anything is saved.</p>
    </InkPanel>
  );
}
