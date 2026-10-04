import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { BarChart2, TrendingUp, Users, DollarSign, ArrowRight } from 'lucide-react';
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
    { label: 'MRR', value: `$${mrr.toLocaleString()}`, icon: DollarSign, color: 'var(--tc-primary)' },
    { label: 'Active', value: activeClients.length, icon: Users, color: 'var(--tc-success)' },
    { label: 'At Risk', value: atRisk, icon: TrendingUp, color: atRisk > 0 ? 'var(--tc-destructive)' : 'var(--tc-muted-foreground)' },
    { label: 'New', value: `+${newThisMonth}`, icon: TrendingUp, color: 'var(--tc-ai)' },
  ];

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Business Intelligence</h3>
        </div>
        <Link to="/business" className="flex items-center gap-1 text-xs text-primary font-semibold hover:opacity-70 transition-opacity">
          View all <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {metrics.map(m => (
          <div key={m.label} className="text-center p-2 rounded-xl bg-muted">
            <p className="text-sm font-bold" style={{ color: m.color }}>{m.value}</p>
            <p className="text-[9px] text-muted-foreground mt-0.5 font-medium">{m.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}