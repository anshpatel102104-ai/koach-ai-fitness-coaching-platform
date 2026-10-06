import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { format, subMonths, startOfMonth, isSameMonth } from 'date-fns';
import { Panel, PanelHeader } from '@/components/kit';

// Built from the affiliate's real numbers: profile totals for the funnel and
// commission rows (one per referred coach) for sign-ups per month.
export default function AffiliatePerformanceChart({ profile }) {
  const { data: referrals = [] } = useQuery({
    queryKey: ['affiliate-commissions', profile.coach_id],
    queryFn: () => db.entities.AffiliateCommission.filter({ affiliate_id: profile.coach_id }, '-signup_date'),
  });

  const months = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const m = startOfMonth(subMonths(now, 5 - i));
      const rows = referrals.filter(r => r.signup_date && isSameMonth(new Date(r.signup_date), m));
      return { label: format(m, 'MMM'), signups: rows.length, value: rows.reduce((s, r) => s + (r.monthly_commission || 0), 0), current: i === 5 };
    });
  }, [referrals]);
  const max = Math.max(1, ...months.map(m => m.signups));

  const funnel = [
    { stage: 'Clicks', value: profile.total_clicks || 0 },
    { stage: 'Sign-ups', value: profile.total_signups || 0 },
    { stage: 'Paying now', value: profile.active_referrals || 0 },
  ];
  const top = Math.max(1, funnel[0].value);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">
      <Panel className="lg:col-span-3">
        <PanelHeader title="Sign-ups by month" subtitle="Coaches who joined through your link, last six months." />
        <div className="px-5 sm:px-6 pb-6">
          <div className="flex items-end gap-3 h-44">
            {months.map(m => (
              <div key={m.label} className="flex-1 flex flex-col items-center justify-end h-full gap-2">
                <span className="num text-base text-foreground">{m.signups}</span>
                <div className={m.current ? 'w-full max-w-[40px] rounded-[4px] bg-brand' : 'w-full max-w-[40px] rounded-[4px] bg-primary'} style={{ height: `${Math.max(m.signups ? 6 : 2, (m.signups / max) * 100)}%`, opacity: m.signups ? 1 : 0.15 }} />
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-2">
            {months.map(m => <span key={m.label} className="flex-1 text-center text-[13px] text-muted-foreground">{m.label}</span>)}
          </div>
        </div>
      </Panel>

      <Panel className="lg:col-span-2">
        <PanelHeader title="From click to paying" />
        <ul className="px-5 sm:px-6 pb-6 space-y-4">
          {funnel.map((f, i) => (
            <li key={f.stage}>
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold text-foreground">{f.stage}</span>
                <span>
                  <span className="num text-lg">{f.value.toLocaleString()}</span>
                  {i > 0 && funnel[i - 1].value > 0 && (
                    <span className="text-[13px] text-muted-foreground ml-2">{Math.round((f.value / funnel[i - 1].value) * 100)}%</span>
                  )}
                </span>
              </div>
              <div className="h-2 mt-1.5 rounded-full bg-secondary overflow-hidden">
                <div className="h-full rounded-full bg-primary" style={{ width: `${(f.value / top) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
