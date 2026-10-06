import React from 'react';
import { Panel, PanelHeader } from '@/components/kit';

const TIERS = [
  { key: 'one_on_one', label: '1:1 coaching', desc: 'Fully personalised', typical: '$300–$800/mo' },
  { key: 'group', label: 'Group coaching', desc: 'Community, scales well', typical: '$49–$197/mo' },
  { key: 'low_ticket', label: 'Low ticket', desc: 'Programs, plans, courses', typical: '$27–$97 once' },
];

export default function OfferTiers({ leads }) {
  const countByTier = (key) => leads.filter(l => l.offer_tier === key).length;
  const closedByTier = (key) => leads.filter(l => l.offer_tier === key && l.stage === 'active_client').length;
  const revenueByTier = (key) => leads.filter(l => l.offer_tier === key && l.stage === 'active_client').reduce((s, l) => s + (l.deal_value || 0), 0);

  return (
    <Panel>
      <PanelHeader title="Offers" subtitle="Leads and closed revenue by what you sold them." />
      <div className="px-5 sm:px-6 pb-2">
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-6 text-[13px] text-muted-foreground pb-2 border-b border-border">
          <span>Offer</span><span className="text-right w-14">Leads</span><span className="text-right w-20">Closed</span>
        </div>
        <ul className="divide-y divide-border">
          {TIERS.map(tier => (
            <li key={tier.key} className="grid grid-cols-[1fr_auto_auto] gap-x-6 items-center py-3">
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-foreground">{tier.label}</p>
                <p className="text-[13px] text-muted-foreground">{tier.desc}, usually {tier.typical}</p>
              </div>
              <span className="num text-lg text-right w-14">{countByTier(tier.key)}</span>
              <span className="text-right w-20">
                <span className="num text-lg block">${revenueByTier(tier.key).toLocaleString()}</span>
                <span className="text-[13px] text-muted-foreground">{closedByTier(tier.key)} clients</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  );
}
