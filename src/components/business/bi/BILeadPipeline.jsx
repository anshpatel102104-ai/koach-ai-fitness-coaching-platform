import React, { useMemo } from 'react';
import { Panel } from '@/components/kit';
import { Meter, money } from '@/components/business/ui';
import { differenceInDays } from 'date-fns';

export default function BILeadPipeline({ leads }) {
  const pipelineLeads = useMemo(() => leads.filter(l => l.stage === 'lead' || l.stage === 'booked'), [leads]);
  const convertedLeads = useMemo(() => leads.filter(l => l.stage === 'active_client'), [leads]);
  const conversionRate = leads.length > 0 ? Math.round((convertedLeads.length / leads.length) * 100) : 0;

  const totalPipelineValue = useMemo(() =>
    pipelineLeads.reduce((s, l) => s + (l.deal_value || 0), 0),
    [pipelineLeads]);

  const stalePipelineLeads = useMemo(() =>
    pipelineLeads.filter(l => {
      const created = l.created_date ? new Date(l.created_date) : null;
      return created && differenceInDays(new Date(), created) >= 14;
    }),
    [pipelineLeads]);

  const avgConversionDays = useMemo(() => {
    const withDates = convertedLeads.filter(l => l.created_date);
    if (!withDates.length) return null;
    const avg = withDates.reduce((s, l) => s + differenceInDays(new Date(), new Date(l.created_date)), 0) / withDates.length;
    return Math.round(avg);
  }, [convertedLeads]);

  const sourceBreakdown = useMemo(() => {
    const map = {};
    leads.forEach(l => {
      const src = l.source || 'other';
      if (!map[src]) map[src] = 0;
      map[src]++;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [leads]);

  const staleValue = stalePipelineLeads.reduce((s, l) => s + (l.deal_value || 0), 0);

  return (
    <Panel className="px-5 py-5 sm:px-6 sm:py-6">
      <h2 className="text-[22px] text-foreground">Lead pipeline</h2>
      <p className="text-sm text-muted-foreground mt-1">
        {leads.length === 0
          ? 'No leads tracked yet. Add them in Sales.'
          : avgConversionDays ? `Leads take about ${avgConversionDays} days to become clients.` : `${leads.length} leads tracked.`}
      </p>

      <div className="grid grid-cols-3 mt-4 border-y border-border divide-x divide-border">
        <div className="py-3.5 pr-3">
          <p className="text-[13px] text-muted-foreground">Open leads</p>
          <p className="num text-[26px] leading-none mt-1 text-foreground">{pipelineLeads.length}</p>
        </div>
        <div className="py-3.5 px-3">
          <p className="text-[13px] text-muted-foreground">Convert</p>
          <p className="num text-[26px] leading-none mt-1 text-foreground">{conversionRate}%</p>
        </div>
        <div className="py-3.5 pl-3">
          <p className="text-[13px] text-muted-foreground">Worth</p>
          <p className="num text-[26px] leading-none mt-1 text-foreground">{money(totalPipelineValue, { compact: true })}</p>
        </div>
      </div>

      {stalePipelineLeads.length > 0 && (
        <p className="mt-4 text-sm text-foreground border-l-2 border-warning pl-3">
          <span className="font-semibold">{stalePipelineLeads.length} lead{stalePipelineLeads.length !== 1 ? 's have' : ' has'} waited 14 days or more.</span>{' '}
          {staleValue > 0 ? `A follow-up today could add ${money(staleValue)} a month.` : 'A short follow-up today keeps them warm.'}
        </p>
      )}

      {sourceBreakdown.length > 0 && (
        <div className="mt-5">
          <p className="text-[13px] text-muted-foreground mb-2">Where they come from</p>
          <div className="space-y-2.5">
            {sourceBreakdown.slice(0, 5).map(([src, count]) => {
              const pct = Math.round((count / leads.length) * 100);
              return (
                <div key={src} className="grid grid-cols-[88px_1fr_28px] items-center gap-3">
                  <p className="text-sm text-foreground capitalize truncate">{src}</p>
                  <Meter value={pct} />
                  <span className="text-sm text-muted-foreground text-right tabular-nums">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Panel>
  );
}
