import React, { useState, useMemo } from 'react';
import { Sparkles, Loader2, TrendingUp, Users, DollarSign, Clock, Target, RefreshCw } from 'lucide-react';
import { db } from '@/api/supabaseClient';
import { differenceInDays, parseISO, startOfMonth } from 'date-fns';

const INSIGHT_ICONS = { revenue: DollarSign, retention: Users, pricing: TrendingUp, efficiency: Clock, growth: Target };
const INSIGHT_COLORS = { revenue: 'var(--tc-primary)', retention: 'var(--tc-ai)', pricing: 'var(--tc-warning)', efficiency: 'var(--kc-06b6d4)', growth: 'var(--tc-success)' };

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

  return (
    <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> AI Business Insights
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">AI-generated recommendations based on your data</p>
        </div>
        <button onClick={generateInsights} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-xl text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          {insights ? 'Refresh' : 'Generate Insights'}
        </button>
      </div>

      {loading && (
        <div className="py-8 flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm">Analyzing your business data…</p>
        </div>
      )}

      {!loading && !insights && (
        <div className="py-8 text-center">
          <Sparkles className="w-10 h-10 text-border mx-auto mb-3" />
          <p className="text-sm text-muted-foreground font-medium">Generate AI-powered insights</p>
          <p className="text-xs text-muted-foreground mt-1">Click "Generate Insights" to get personalized recommendations</p>
        </div>
      )}

      {!loading && insights && (
        <div className="space-y-3">
          {insights.map((ins, i) => {
            const Icon = INSIGHT_ICONS[ins.category] || TrendingUp;
            const color = INSIGHT_COLORS[ins.category] || 'var(--tc-muted-foreground)';
            return (
              <div key={i} className="p-3.5 rounded-xl border" style={{ borderColor: `${color}20`, background: `${color}05` }}>
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `${color}15` }}>
                    <Icon className="w-3.5 h-3.5" style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md" style={{ background: `${color}15`, color }}>
                        {ins.category}
                      </span>
                      {ins.impact && <span className="text-[9px] text-muted-foreground">{ins.impact}</span>}
                    </div>
                    <p className="text-xs font-bold text-foreground mb-1">{ins.headline}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{ins.body}</p>
                    {ins.action && (
                      <p className="text-xs font-semibold mt-2" style={{ color }}>→ {ins.action}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}