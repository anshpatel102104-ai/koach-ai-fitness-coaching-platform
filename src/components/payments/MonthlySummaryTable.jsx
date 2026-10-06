import React, { useMemo } from 'react';
import { Download } from 'lucide-react';
import { Panel, PanelHeader } from '@/components/kit';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { money } from '@/components/business/ui';
import { format, subMonths, startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';

export default function MonthlySummaryTable({ invoices = [], payments = [] }) {
  const months = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const d = subMonths(new Date(), 11 - i);
      const start = startOfMonth(d);
      const end = endOfMonth(d);
      const inRange = (dateStr) => {
        try { return isWithinInterval(parseISO(dateStr), { start, end }); } catch { return false; }
      };

      const paid = invoices.filter(inv => inv.status === 'paid' && inv.paid_date && inRange(inv.paid_date));
      const recurring = paid.filter(inv => inv.type === 'recurring');
      const oneTime = paid.filter(inv => inv.type !== 'recurring');
      const refunds = payments.filter(p => p.status === 'refunded' && p.paid_date && inRange(p.paid_date));

      const newRev = oneTime.reduce((s, i) => s + Number(i.amount || 0), 0);
      const recRev = recurring.reduce((s, i) => s + Number(i.amount || 0), 0);
      const refundAmt = refunds.reduce((s, p) => s + Number(p.amount || 0), 0);
      const net = newRev + recRev - refundAmt;
      const clients = new Set(paid.map(i => i.client_id)).size;

      return { month: format(d, 'MMM yyyy'), newRev, recRev, refundAmt, net, clients };
    });
  }, [invoices, payments]);

  const totals = months.reduce((acc, m) => ({
    newRev: acc.newRev + m.newRev,
    recRev: acc.recRev + m.recRev,
    refundAmt: acc.refundAmt + m.refundAmt,
    net: acc.net + m.net,
    clients: acc.clients + m.clients,
  }), { newRev: 0, recRev: 0, refundAmt: 0, net: 0, clients: 0 });

  const exportCSV = () => {
    const headers = ['Month', 'New Revenue', 'Recurring Revenue', 'Refunds', 'Net Revenue', 'Client Count'];
    const rows = months.map(m => [m.month, m.newRev.toFixed(2), m.recRev.toFixed(2), m.refundAmt.toFixed(2), m.net.toFixed(2), m.clients]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'monthly_summary.csv'; a.click();
  };

  const fmt = (n) => money(n);
  const th = 'px-3 py-2.5 text-[13px] font-normal text-muted-foreground text-right whitespace-nowrap';
  const td = 'px-3 py-2.5 text-sm text-foreground text-right whitespace-nowrap tabular-nums';
  const recent = [...months].reverse();

  return (
    <Panel className="overflow-hidden">
      <PanelHeader
        title="Month by month"
        subtitle="Paid invoices for the last 12 months, newest first."
        right={<Button variant="outline" size="sm" onClick={exportCSV}><Download /> Export CSV</Button>}
      />
      <div className="overflow-x-auto px-2 sm:px-3 pb-3">
        <table className="w-full border-collapse min-w-[560px]">
          <thead>
            <tr className="border-b border-border">
              <th className={cn(th, 'text-left pl-3 sm:pl-3')}>Month</th>
              <th className={th}>One-off</th>
              <th className={th}>Recurring</th>
              <th className={th}>Refunds</th>
              <th className={th}>Net</th>
              <th className={th}>Clients</th>
            </tr>
          </thead>
          <tbody>
            {recent.map(m => (
              <tr key={m.month} className="border-b border-border last:border-b-0">
                <td className={cn(td, 'text-left font-medium')}>{m.month}</td>
                <td className={td}>{fmt(m.newRev)}</td>
                <td className={td}>{fmt(m.recRev)}</td>
                <td className={cn(td, m.refundAmt > 0 ? 'text-foreground' : 'text-muted-foreground')}>
                  {m.refundAmt > 0 ? `−${fmt(m.refundAmt)}` : '—'}
                </td>
                <td className={cn(td, 'font-semibold', m.net < 0 && 'text-destructive')}>{fmt(m.net)}</td>
                <td className={td}>{m.clients}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-foreground/80">
              <td className={cn(td, 'text-left font-semibold')}>12 months</td>
              <td className={cn(td, 'font-semibold')}>{fmt(totals.newRev)}</td>
              <td className={cn(td, 'font-semibold')}>{fmt(totals.recRev)}</td>
              <td className={cn(td, 'font-semibold')}>{totals.refundAmt > 0 ? `−${fmt(totals.refundAmt)}` : '—'}</td>
              <td className={cn(td, 'num text-[17px]')}>{fmt(totals.net)}</td>
              <td className={cn(td, 'font-semibold')}>{totals.clients}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Panel>
  );
}
