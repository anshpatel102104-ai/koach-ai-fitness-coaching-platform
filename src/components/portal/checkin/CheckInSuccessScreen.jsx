import React, { useEffect } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FocusScreen, FocusFooter } from '@/components/portal/PortalUI';

export default function CheckInSuccessScreen({ streak, onHome, onMessage }) {
  useEffect(() => {
    if (navigator.vibrate) navigator.vibrate([50, 30, 80, 30, 120]);
  }, []);

  return (
    <FocusScreen>
      <div className="flex-1 overflow-y-auto px-5" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 48px)' }}>
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-success text-white">
          <Check className="h-7 w-7" strokeWidth={3} />
        </span>
        <h1 className="mt-5 text-[36px] text-foreground">Check-in sent</h1>
        <p className="mt-1 text-[15px] text-muted-foreground">Your coach will read it and reply in your messages.</p>
        <div className="mt-6 rounded-xl bg-secondary px-4 py-3.5">
          <p className="text-[13px] text-muted-foreground">Check-ins in a row</p>
          <p className="num mt-1 text-[36px] text-foreground">{streak}<span className="ml-1.5 text-lg text-muted-foreground">week{streak !== 1 ? 's' : ''}</span></p>
        </div>
      </div>
      <FocusFooter>
        <Button size="lg" className="h-[52px] w-full text-base font-bold" onClick={onHome}>Back to today</Button>
        <Button variant="outline" size="lg" className="mt-2 w-full" onClick={onMessage}>Message your coach</Button>
      </FocusFooter>
    </FocusScreen>
  );
}
