import React, { useMemo } from 'react';
import { Panel } from '@/components/kit';
import { Meter, money } from '@/components/business/ui';

const PLAN_LIMITS = { starter: 10, pro: 25, elite: 50, enterprise: 150 };

export default function BICapacity({ clients, user }) {
  const activeClients = useMemo(() => clients.filter(c => c.lifecycle_status === 'active' || c.status === 'active'), [clients]);
  const mrr = useMemo(() => activeClients.reduce((s, c) => s + (c.monthly_rate || 0), 0), [activeClients]);

  const planLimit = PLAN_LIMITS[user?.subscription?.plan] || 25;
  const utilizationPct = Math.min(100, Math.round((activeClients.length / planLimit) * 100));
  const revenuePerSlot = planLimit > 0 ? Math.round(mrr / planLimit) : 0;
  const availableSlots = Math.max(0, planLimit - activeClients.length);

  const tone = utilizationPct >= 90 ? 'danger' : utilizationPct >= 70 ? 'warning' : 'ink';

  // Project weeks to capacity (assume ~2 new clients/month)
  const weeksToCapacity = availableSlots > 0 ? Math.round((availableSlots / 2) * 4.33) : 0;

  const sentence = utilizationPct >= 90
    ? `You're at ${utilizationPct}% of your plan. At about two sign-ups a month you'll be full in ${weeksToCapacity} weeks.`
    : utilizationPct >= 80
      ? `At about two sign-ups a month you'll be full in ${weeksToCapacity} weeks.`
      : utilizationPct < 60
        ? `Room for ${availableSlots} more clients on your plan.`
        : `${availableSlots} spots left on your plan.`;

  return (
    <Panel className="px-5 py-5 sm:px-6 sm:py-6">
      <h2 className="text-[22px] text-foreground">Capacity</h2>
      <p className={utilizationPct >= 90 ? 'text-sm text-destructive mt-1' : 'text-sm text-muted-foreground mt-1'}>{sentence}</p>

      <div className="mt-4">
        <Meter value={utilizationPct} tone={tone} />
        <p className="text-[13px] text-muted-foreground mt-2">{activeClients.length} of {planLimit} client spots used</p>
      </div>

      <div className="grid grid-cols-2 mt-5 pt-4 border-t border-border divide-x divide-border">
        <div>
          <p className="text-[13px] text-muted-foreground">Open spots</p>
          <p className="num text-[26px] leading-none mt-1 text-foreground">{availableSlots}</p>
        </div>
        <div className="pl-5">
          <p className="text-[13px] text-muted-foreground">Revenue per spot</p>
          <p className="num text-[26px] leading-none mt-1 text-foreground">{money(revenuePerSlot)}</p>
        </div>
      </div>
    </Panel>
  );
}
