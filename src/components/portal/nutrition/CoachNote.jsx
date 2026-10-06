import React from 'react';
import { Initials } from '@/components/kit';

export default function CoachNote({ note, coachName }) {
  if (!note) return null;
  return (
    <section className="panel flex items-start gap-3 p-4">
      <Initials name={coachName || 'Coach'} tone="ink" size={40} />
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold text-foreground">{coachName || 'Your coach'}</p>
        <p className="text-[13px] text-muted-foreground">Note on your meal plan</p>
        <p className="mt-1.5 text-[15px] leading-relaxed text-foreground">{note}</p>
      </div>
    </section>
  );
}
