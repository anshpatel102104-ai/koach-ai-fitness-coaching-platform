import React from 'react';
import { DisclosureCard } from '@/components/portal/PortalUI';

const RULES = [
  { label: 'Morning', text: '16–20 oz before anything else, to rehydrate after sleep.' },
  { label: 'Before training', text: '16–20 oz with electrolytes, 30 minutes before.' },
  { label: 'Through the day', text: 'Sip steadily. If you feel thirsty you are already behind.' },
  { label: 'Evening', text: 'Taper off 1–2 hours before bed so sleep is not broken.' },
];

export default function HydrationProtocol({ weightLbs }) {
  const ozTarget = weightLbs ? Math.round(weightLbs / 2) : null;

  return (
    <DisclosureCard
      title="Hydration"
      sub={ozTarget ? `Daily target ${ozTarget} oz, about ${Math.round(ozTarget * 0.0296)} L` : 'When and how much to drink'}
    >
      {ozTarget && (
        <p className="num mb-3 text-[28px] text-foreground">{ozTarget} oz<span className="ml-2 text-[13px] text-muted-foreground" style={{ fontFamily: 'var(--font-body)' }}>bodyweight ÷ 2</span></p>
      )}
      <ul className="divide-y divide-border">
        {RULES.map(r => (
          <li key={r.label} className="grid grid-cols-[110px_1fr] gap-3 py-2.5">
            <span className="text-sm font-semibold text-foreground">{r.label}</span>
            <span className="text-sm text-muted-foreground">{r.text}</span>
          </li>
        ))}
      </ul>
    </DisclosureCard>
  );
}
