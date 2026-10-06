import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Panel, PanelHeader, Stat, EmptyState } from '@/components/kit';

const sourceName = (s) => {
  if (!s) return 'Direct';
  const v = String(s).trim();
  return v.charAt(0).toUpperCase() + v.slice(1);
};

export default function MarketingAnalytics({ coachId }) {
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

  const totalClicks = links.reduce((sum, l) => sum + (l.clicks || 0), 0);
  const totalConversions = links.reduce((sum, l) => sum + (l.conversions || 0), 0);
  const conversionRate = totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(1) : 0;
  const campaignRevenue = campaigns.reduce((sum, c) => sum + (c.revenue || 0), 0);

  // Clicks and conversions by utm_source, from the coach's real links.
  const bySource = Object.values(links.reduce((acc, l) => {
    const key = sourceName(l.utm_source);
    acc[key] = acc[key] || { source: key, clicks: 0, conversions: 0 };
    acc[key].clicks += l.clicks || 0;
    acc[key].conversions += l.conversions || 0;
    return acc;
  }, {})).sort((a, b) => b.clicks - a.clicks);
  const maxClicks = Math.max(1, ...bySource.map(s => s.clicks));

  return (
    <div className="space-y-5">
      <Panel className="grid grid-cols-2 lg:grid-cols-4 gap-px overflow-hidden bg-border [&>*]:bg-card [&>*]:px-5 [&>*]:py-4 sm:[&>*]:px-6">
        <Stat label="Clicks" value={totalClicks.toLocaleString()} sub="all tracked links" />
        <Stat label="Conversions" value={totalConversions.toLocaleString()} />
        <Stat label="Conversion rate" value={`${conversionRate}%`} />
        <Stat label="Campaign revenue" value={`$${campaignRevenue.toFixed(2)}`} />
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        <Panel>
          <PanelHeader title="By source" subtitle="Grouped by the source you set on each link." />
          {bySource.length === 0 ? (
            <EmptyState title="No traffic yet" body="Create a tracked link and share it to see where people come from." />
          ) : (
            <ul className="px-5 sm:px-6 pb-5 space-y-3">
              {bySource.map(s => {
                const rate = s.clicks > 0 ? ((s.conversions / s.clicks) * 100).toFixed(1) : '0.0';
                return (
                  <li key={s.source}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-sm font-semibold text-foreground">{s.source}</span>
                      <span className="text-[13px] text-muted-foreground">{s.conversions} of {s.clicks.toLocaleString()} converted, {rate}%</span>
                    </div>
                    <div className="h-2 mt-1.5 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round((s.clicks / maxClicks) * 100)}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel>
          <PanelHeader title="Top links" />
          {links.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="border-y border-border">
                <tr className="text-[13px] text-muted-foreground">
                  <th className="text-left font-medium py-2.5 pl-5 sm:pl-6 pr-3">Link</th>
                  <th className="text-right font-medium py-2.5 px-3">Clicks</th>
                  <th className="text-right font-medium py-2.5 pr-5 sm:pr-6 pl-3">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[...links].sort((a, b) => (b.clicks || 0) - (a.clicks || 0)).slice(0, 5).map((link) => {
                  const rate = link.clicks > 0 ? ((link.conversions || 0) / link.clicks * 100).toFixed(1) : 0;
                  return (
                    <tr key={link.id}>
                      <td className="py-3 pl-5 sm:pl-6 pr-3 font-semibold text-foreground">{link.link_name}</td>
                      <td className="py-3 px-3 text-right"><span className="num text-base">{link.clicks || 0}</span></td>
                      <td className="py-3 pr-5 sm:pr-6 pl-3 text-right"><span className="num text-base">{rate}%</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <EmptyState title="No links yet" body="Your best-performing links will be listed here." />
          )}
        </Panel>
      </div>
    </div>
  );
}
