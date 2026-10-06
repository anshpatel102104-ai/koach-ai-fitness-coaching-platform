import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Panel } from '@/components/kit';
import { money } from '@/components/business/ui';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { parseISO, startOfMonth } from 'date-fns';

export default function BIDashboardCard() {
  const { data: clients = [] } = useQuery({
    queryKey: ['clients-bi-dash'],
    queryFn: () => db.entities.Client.list('-created_date', 100),
  });

  const activeClients = useMemo(() => clients.filter(c => c.lifecycle_status === 'active' || c.status === 'active'), [clients]);
  const mrr = useMemo(() => activeClients.reduce((s, c) => s + (c.monthly_rate || 0), 0), [activeClients]);
  const atRisk = useMemo(() => clients.filter(c => c.lifecycle_status === 'at_risk').length, [clients]);
  const newThisMonth = clients.filter(c => {
    const sd = c.start_date ? parseISO(c.start_date) : c.created_date ? new Date(c.created_date) : null;
    return sd && sd >= startOfMonth(new Date());
  }).length;

  const metrics = [
    { label: 'Monthly recurring', value: money(mrr) },
    { label: 'Active', value: activeClients.length },
    { label: 'At risk', value: atRisk, danger: atRisk > 0 },
    { label: 'New this month', value: newThisMonth },
  ];

  return (
    <Panel className="px-5 py-5 sm:px-6">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h2 className="text-[22px] text-foreground">Business</h2>
        <Link to="/business" className="text-sm font-semibold text-foreground underline underline-offset-4 decoration-1 hover:decoration-2">
          Open insights
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-3 sm:divide-x divide-border">
        {metrics.map((m, i) => (
          <div key={m.label} className={cn('min-w-0', i > 0 && 'sm:pl-4')}>
            <p className="text-[13px] text-muted-foreground truncate">{m.label}</p>
            <p className={cn('num text-[24px] leading-none mt-1', m.danger ? 'text-destructive' : 'text-foreground')}>{m.value}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}
