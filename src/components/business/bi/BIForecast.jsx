import React, { useState, useMemo } from 'react';
import { Panel, PanelHeader, Segmented } from '@/components/kit';
import { money } from '@/components/business/ui';
import { cn } from '@/lib/utils';

const SCENARIOS = [
  { key: 'conservative', label: 'Cautious', churnMult: 1.5, convMult: 0.5 },
  { key: 'base', label: 'Likely', churnMult: 1.0, convMult: 1.0 },
  { key: 'optimistic', label: 'Hopeful', churnMult: 0.5, convMult: 1.5 },
];

export default function BIForecast({ clients, leads }) {
  const [activeScenario, setActiveScenario] = useState('base');
  const [whatIfLeads, setWhatIfLeads] = useState(0);
  const [whatIfChurn, setWhatIfChurn] = useState(0);
  const [whatIfPriceIncrease, setWhatIfPriceIncrease] = useState(0);

  const activeClients = useMemo(() => clients.filter(c => c.lifecycle_status === 'active' || c.status === 'active'), [clients]);
  const mrr = useMemo(() => activeClients.reduce((s, c) => s + (c.monthly_rate || 0), 0), [activeClients]);
  const avgRate = activeClients.length > 0 ? mrr / activeClients.length : 0;

  const pipelineLeads = leads.filter(l => l.stage === 'lead' || l.stage === 'booked');
  const convertedLeads = leads.filter(l => l.stage === 'active_client');
  const conversionRate = leads.length > 0 ? convertedLeads.length / leads.length : 0.3;
  const avgLeadValue = pipelineLeads.length > 0
    ? pipelineLeads.reduce((s, l) => s + (l.deal_value || avgRate), 0) / pipelineLeads.length
    : avgRate;

  const scenario = SCENARIOS.find(s => s.key === activeScenario);

  const forecast = useMemo(() => {
    const months = [30, 60, 90];
    return months.map(days => {
      const monthFraction = days / 30;
      const expectedChurnCount = Math.max(0, (activeClients.length * 0.05 * scenario.churnMult * monthFraction));
      const expectedNewClients = pipelineLeads.length * conversionRate * scenario.convMult * Math.min(monthFraction, 1);
      const whatIfNew = whatIfLeads * (avgLeadValue || avgRate);
      const whatIfChurnLoss = whatIfChurn * avgRate;
      const priceBoost = mrr * (whatIfPriceIncrease / 100);

      const projectedMrr = mrr
        + (expectedNewClients * avgRate)
        - (expectedChurnCount * avgRate)
        + whatIfNew
        - whatIfChurnLoss
        + priceBoost;

      return {
        label: `${days} days`,
        mrr: Math.max(0, Math.round(projectedMrr)),
        change: Math.round(projectedMrr - mrr),
      };
    });
  }, [activeScenario, whatIfLeads, whatIfChurn, whatIfPriceIncrease, mrr, activeClients, pipelineLeads, conversionRate, avgRate, avgLeadValue]);

  return (
    <Panel>
      <PanelHeader
        title="Forecast"
        subtitle={`Recurring revenue in 30, 60 and 90 days. ${money(mrr)} today.`}
        right={<Segmented className="hidden sm:inline-flex" size="sm" value={activeScenario} onChange={setActiveScenario} options={SCENARIOS.map(s => ({ value: s.key, label: s.label }))} />}
      />
      <Segmented className="sm:hidden mx-5 mb-3" size="sm" value={activeScenario} onChange={setActiveScenario} options={SCENARIOS.map(s => ({ value: s.key, label: s.label }))} />

      <div className="grid grid-cols-3 mx-5 sm:mx-6 border-y border-border divide-x divide-border">
        {forecast.map(f => (
          <div key={f.label} className="py-4 px-3 first:pl-0">
            <p className="text-[13px] text-muted-foreground">In {f.label}</p>
            <p className="num text-[26px] leading-none mt-1 text-foreground">{money(f.mrr)}</p>
            <p className={cn('text-[13px] mt-1', f.change < 0 ? 'text-destructive' : 'text-muted-foreground')}>
              {f.change >= 0 ? '+' : '−'}{money(Math.abs(f.change))}
            </p>
          </div>
        ))}
      </div>

      <div className="px-5 sm:px-6 pt-4 pb-5">
        <p className="text-sm font-semibold text-foreground mb-3">What if</p>
        <div className="space-y-3">
          {[
            { label: 'Extra leads converted', value: whatIfLeads, setter: setWhatIfLeads, max: 10, unit: '', hint: `+${money(whatIfLeads * avgLeadValue)}/mo` },
            { label: 'Clients lost', value: whatIfChurn, setter: setWhatIfChurn, max: 10, unit: '', hint: `−${money(whatIfChurn * avgRate)}/mo`, negative: true },
            { label: 'Price increase', value: whatIfPriceIncrease, setter: setWhatIfPriceIncrease, max: 50, unit: '%', hint: `+${money(mrr * (whatIfPriceIncrease / 100))}/mo` },
          ].map(item => (
            <div key={item.label} className="grid grid-cols-[1fr_auto] sm:grid-cols-[150px_1fr_36px_88px] items-center gap-x-3 gap-y-1">
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <span className="sm:hidden text-sm font-semibold text-foreground text-right tabular-nums">{item.value}{item.unit}</span>
              <input
                type="range" min={0} max={item.max} value={item.value}
                onChange={e => item.setter(Number(e.target.value))}
                className="col-span-2 sm:col-span-1 w-full h-1 accent-[rgb(var(--foreground))]"
                aria-label={item.label}
              />
              <span className="hidden sm:block text-sm font-semibold text-foreground text-right tabular-nums">{item.value}{item.unit}</span>
              <span className={cn('hidden sm:block text-[13px] text-right tabular-nums', item.negative && item.value > 0 ? 'text-destructive' : 'text-muted-foreground')}>{item.hint}</span>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}
