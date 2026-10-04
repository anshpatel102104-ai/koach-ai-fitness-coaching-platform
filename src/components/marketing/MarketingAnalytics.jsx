import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

export default function MarketingAnalytics({ coachId }) {
  const [timeRange, setTimeRange] = useState('30d');

  const { data: links = [] } = useQuery({
    queryKey: ['marketing-links', coachId],
    queryFn: () => db.entities.MarketingLink.filter({ coach_id: coachId }),
    enabled: !!coachId,
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ['marketing-campaigns', coachId],
    queryFn: () => db.entities.MarketingCampaign.filter({ coach_id: coachId }),
    enabled: !!coachId,
  });

  // Demo data
  const trafficData = [
    { source: 'Instagram', clicks: 450, signups: 45 },
    { source: 'Email', clicks: 320, signups: 48 },
    { source: 'YouTube', clicks: 280, signups: 42 },
    { source: 'Direct', clicks: 150, signups: 30 },
    { source: 'Other', clicks: 100, signups: 15 },
  ];

  const sourceColors = {
    Instagram: 'var(--kc-e1306c)',
    Email: 'var(--kc-0078ff)',
    YouTube: 'var(--kc-ff0000)',
    Direct: 'var(--kc-999999)',
    Other: 'var(--kc-cccccc)',
  };

  const funnelData = [
    { stage: 'Visits', value: 1300 },
    { stage: 'Clicks', value: 1100 },
    { stage: 'Signups', value: 180 },
    { stage: 'Trial', value: 120 },
    { stage: 'Paid', value: 85 },
  ];

  const totalClicks = links.reduce((sum, l) => sum + (l.clicks || 0), 0);
  const totalConversions = links.reduce((sum, l) => sum + (l.conversions || 0), 0);
  const conversionRate = totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(1) : 0;
  const campaignRevenue = campaigns.reduce((sum, c) => sum + (c.revenue || 0), 0);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Clicks', value: totalClicks, color: 'var(--tc-primary)' },
          { label: 'Conversions', value: totalConversions, color: 'var(--tc-success)' },
          { label: 'Conversion Rate', value: `${conversionRate}%`, color: 'var(--tc-warning)' },
          { label: 'Campaign Revenue', value: `$${campaignRevenue.toFixed(2)}`, color: 'var(--tc-ai)' },
        ].map((kpi, i) => (
          <div key={i} className="p-4 rounded-lg bg-card border border-border">
            <p className="text-xs text-muted-foreground font-bold">{kpi.label}</p>
            <p className="text-2xl font-black mt-2" style={{ color: kpi.color }}>
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* Traffic Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-2xl border border-border p-6">
          <h3 className="font-bold text-foreground mb-4">Traffic by Source</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={trafficData} dataKey="clicks" cx="50%" cy="50%" outerRadius={100}>
                {trafficData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={sourceColors[entry.source]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6">
          <h3 className="font-bold text-foreground mb-4">Conversion by Source</h3>
          <div className="space-y-3">
            {trafficData.map((source, i) => {
              const rate = ((source.signups / source.clicks) * 100).toFixed(1);
              return (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1">
                    <div className="w-3 h-3 rounded-full" style={{ background: sourceColors[source.source] }} />
                    <span className="text-sm font-semibold text-foreground">{source.source}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground">{rate}%</p>
                    <p className="text-xs text-muted-foreground">{source.signups} of {source.clicks}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Conversion Funnel */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <h3 className="font-bold text-foreground mb-4">Conversion Funnel</h3>
        <div className="space-y-4">
          {funnelData.map((item, i) => {
            const pct = (item.value / funnelData[0].value) * 100;
            const nextPct = i < funnelData.length - 1 ? (funnelData[i + 1].value / item.value) * 100 : 100;
            return (
              <div key={i}>
                <div className="flex items-center justify-between mb-2">
                  <p className="font-bold text-foreground">{item.stage}</p>
                  <div className="text-right">
                    <p className="font-bold text-foreground">{item.value.toLocaleString()}</p>
                    {i < funnelData.length - 1 && (
                      <p className="text-xs text-muted-foreground">{nextPct.toFixed(0)}% conversion</p>
                    )}
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                  <div className="h-full rounded-full transition-all bg-primary" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Links */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <h3 className="font-bold text-foreground mb-4">Top Performing Links</h3>
        {links.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr>
                  <th className="text-left py-2 px-2 font-bold text-foreground">Name</th>
                  <th className="text-right py-2 px-2 font-bold text-foreground">Clicks</th>
                  <th className="text-right py-2 px-2 font-bold text-foreground">Rate</th>
                </tr>
              </thead>
              <tbody>
                {[...links].sort((a, b) => (b.clicks || 0) - (a.clicks || 0)).slice(0, 5).map((link) => {
                  const rate = link.clicks > 0 ? ((link.conversions || 0) / link.clicks * 100).toFixed(1) : 0;
                  return (
                    <tr key={link.id} className="border-b border-border hover:bg-muted">
                      <td className="py-2 px-2 text-foreground font-semibold">{link.link_name}</td>
                      <td className="py-2 px-2 text-right text-foreground">{link.clicks || 0}</td>
                      <td className="py-2 px-2 text-right text-foreground font-bold">{rate}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">No links yet</p>
        )}
      </div>
    </div>
  );
}