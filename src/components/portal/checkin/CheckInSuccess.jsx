import React, { useEffect } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FocusScreen, FocusFooter } from '@/components/portal/PortalUI';

const MILESTONES = [1, 5, 10, 15, 20, 25, 50, 100];

export default function CheckInSuccess({ checkIn, totalCheckIns, streak, onDashboard, onMessage }) {
  const milestone = MILESTONES.find(m => totalCheckIns === m);

  useEffect(() => {
    if (navigator.vibrate) navigator.vibrate([50, 30, 80, 30, 50]);
  }, []);

  return (
    <FocusScreen>
      <div className="flex-1 overflow-y-auto px-5" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 48px)' }}>
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-success text-white">
          <Check className="h-7 w-7" strokeWidth={3} />
        </span>
        <h1 className="mt-5 text-[36px] text-foreground">Check-in sent</h1>
        <p className="mt-1 text-[15px] text-muted-foreground">
          Your coach will read it and reply in your messages.
          {milestone ? ` That's check-in number ${milestone}.` : ''}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-border shadow-[0_0_0_1px_rgb(var(--border))]">
          <div className="bg-card px-4 py-3.5">
            <p className="text-[13px] text-muted-foreground">In a row</p>
            <p className="num mt-1 text-[30px] text-foreground">{streak}<span className="ml-1 text-[15px] text-muted-foreground">wk</span></p>
          </div>
          <div className="bg-card px-4 py-3.5">
            <p className="text-[13px] text-muted-foreground">All time</p>
            <p className="num mt-1 text-[30px] text-foreground">{totalCheckIns}</p>
          </div>
        </div>
        {checkIn?.weight ? (
          <p className="mt-4 text-[15px] text-muted-foreground">Logged at <span className="font-semibold text-foreground">{checkIn.weight} lb</span>.</p>
        ) : null}
      </div>

      <FocusFooter>
        <Button size="lg" className="h-[52px] w-full text-base font-bold" onClick={onDashboard}>Back to today</Button>
        <Button variant="outline" size="lg" className="mt-2 w-full" onClick={onMessage}>Message your coach</Button>
      </FocusFooter>
    </FocusScreen>
  );
}
