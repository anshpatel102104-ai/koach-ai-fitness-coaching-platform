import React from 'react';
import { Ring as PortalRing } from '@/components/portal/PortalUI';

function Ring({ value, max, label }) {
  const pct = Math.min(100, ((value || 0) / max) * 100);
  return (
    <div className="flex flex-col items-center gap-1.5">
      <PortalRing pct={pct} size={72} stroke={8}>
        <span className="num text-base text-foreground">{Math.round(pct)}%</span>
      </PortalRing>
      <div className="text-center">
        <p className="text-[13px] font-semibold tabular-nums text-foreground">{(value || 0).toLocaleString()}<span className="font-normal text-muted-foreground">/{max.toLocaleString()}</span></p>
        <p className="text-[12px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export default function DailyRings({ log }) {
  return (
    <div className="flex items-center justify-around px-2 py-4">
      <Ring value={log?.workout_done ? 1 : 0} max={1} label="Workout" />
      <Ring value={log?.meals_logged} max={4} label="Meals" />
      <Ring value={log?.water_glasses} max={8} label="Water" />
      <Ring value={log?.steps} max={10000} label="Steps" />
    </div>
  );
}
