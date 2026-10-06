import React from 'react';
import { Button } from '@/components/ui/button';
import { Initials } from '@/components/kit';

export default function ProfileCoachCard({ client, onMessage }) {
  return (
    <section className="panel flex items-center gap-3 p-4">
      <Initials name="Coach" size={44} tone="ink" />
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold text-foreground">Your coach</p>
        <p className="text-[13px] text-muted-foreground">Questions about your plan go here</p>
      </div>
      <Button size="sm" onClick={onMessage}>Message</Button>
    </section>
  );
}
