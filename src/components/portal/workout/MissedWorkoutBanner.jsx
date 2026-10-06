import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function MissedWorkoutBanner({ workoutName, onDoNow, onSkip }) {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;

  return (
    <section className="panel relative overflow-hidden py-4 pl-5 pr-4">
      <span className="absolute inset-y-0 left-0 w-1 bg-destructive" aria-hidden />
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg text-foreground">Yesterday's session was missed</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {workoutName ? <>Make up <span className="font-semibold text-foreground">{workoutName}</span> now, or skip it and stay on schedule.</> : 'Make it up now, or skip it and stay on schedule.'}
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={onDoNow}>Do it now</Button>
            <Button size="sm" variant="outline" onClick={() => { setVisible(false); onSkip?.(); }}>Skip it</Button>
          </div>
        </div>
        <button type="button" aria-label="Dismiss" onClick={() => setVisible(false)} className="touch-compact text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
