import React, { useState, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { InkPanel } from '@/components/kit';
import { Button } from '@/components/ui/button';
import { db } from '@/api/supabaseClient';
import { differenceInDays, parseISO, startOfMonth } from 'date-fns';


export default function BIAIInsights({ clients, checkIns, leads, payments }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);

  const activeClients = useMemo(() => clients.filter(c => c.lifecycle_status === 'active' || c.status === 'active'), [clients]);
  const mrr = useMemo(() => activeClients.reduce((s, c) => s + (c.monthly_rate || 0), 0), [activeClients]);
  const atRiskClients = useMemo(() => clients.filter(c => c.lifecycle_status === 'at_risk'), [clients]);
  const pipelineLeads = useMemo(() => leads.filter(l => l.stage === 'lead' || l.stage === 'booked'), [leads]);
  const staleLeads = useMemo(() => pipelineLeads.filter(l => l.created_date && differenceInDays(new Date(), new Date(l.created_date)) >= 14), [pipelineLeads]);

  const generateInsights = async () => {
    setLoading(true);
    const avgRate = activeClients.length > 0 ? Math.round(mrr / activeClients.length) : 0;
    const avgAdherence = checkIns.length > 0
      ? Math.round(checkIns.reduce((s, ci) => s + ((ci.compliance_training || 0) + (ci.compliance_nutrition || 0)) / 2, 0) / checkIns.length)
      : 0;
    const convertedLeads = leads.filter(l => l.stage === 'active_client').length;
    const convRate = leads.length > 0 ? Math.round((convertedLeads / leads.length) * 100) : 0;
    const reviewedPct = checkIns.length > 0
      ? Math.round((checkIns.filter(ci => ci.review_status === 'reviewed').length / checkIns.length) * 100) : 0;
    const newThisMonth = clients.filter(c => {
      const sd = c.start_date ? parseISO(c.start_date) : c.created_date ? new Date(c.created_date) : null;
      return sd && sd >= startOfMonth(new Date());
    }).length;

    const res = await db.functions.invoke('aiBusinessInsights', {
      action: 'businessInsights',
      metrics: {
        mrr,
        activeClients: activeClients.length,
        avgRate,
        atRiskClients: atRiskClients.length,
        pipelineLeads: pipelineLeads.length,
        staleLeads: staleLeads.length,
        convRate,
        avgAdherence,
        reviewedPct,
        newThisMonth,
        staleValue: staleLeads.reduce((s, l) => s + (l.deal_value || avgRate || 0), 0),
      },
    });
    setInsights(res.data?.insights || []);
    setLoading(false);
  };

  const basis = `Based on ${activeClients.length} active clients, ${checkIns.length} check-ins and ${leads.length} leads.`;

  return (
    <InkPanel
      title="What the AI sees in the business"
      footer={(
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={generateInsights}
            disabled={loading}
            className="bg-ai-foreground text-ai hover:bg-ai-foreground/90"
          >
            {loading && <Loader2 className="animate-spin" />}
            {loading ? 'Reading your numbers…' : insights ? 'Run it again' : 'Read my numbers'}
          </Button>
          <span className="text-[13px] text-ai-foreground/60">{basis}</span>
        </div>
      )}
    >
      {!insights && !loading && (
        <p>
          {atRiskClients.length || staleLeads.length
            ? `${atRiskClients.length} client${atRiskClients.length === 1 ? ' is' : 's are'} at risk and ${staleLeads.length} lead${staleLeads.length === 1 ? ' has' : 's have'} waited two weeks or more. Ask for a read on where the money is.`
            : 'Ask for a read on revenue, retention and pricing. You get a few specific suggestions, not a report.'}
        </p>
      )}

      {loading && <p className="text-ai-foreground/70">Looking at revenue, retention, pipeline and check-ins.</p>}

      {!loading && insights && (
        insights.length === 0 ? (
          <p>Nothing stands out right now.</p>
        ) : (
          <div className="divide-y divide-ai-foreground/10">
            {insights.map((ins, i) => (
              <div key={i} className="py-4 first:pt-0 last:pb-0">
                <p className="text-[15px] font-semibold text-ai-foreground">{ins.headline}</p>
                <p className="mt-1 text-ai-foreground/85">{ins.body}</p>
                {ins.action && <p className="mt-2 text-[15px] text-ai-foreground">Next: {ins.action}</p>}
                <p className="mt-2 text-[13px] text-ai-foreground/55 capitalize">
                  {ins.category}{ins.impact ? ` · ${ins.impact}` : ''}
                </p>
              </div>
            ))}
          </div>
        )
      )}
    </InkPanel>
  );
}
