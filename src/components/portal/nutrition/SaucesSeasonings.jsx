import React from 'react';
import { DisclosureCard } from '@/components/portal/PortalUI';

const SAUCES = [
  { name: 'Hot Sauce (Cholula / Tabasco)', cal: '~0 cal', note: 'Use freely on everything' },
  { name: 'Salsa (fresh or jarred)', cal: '~10 cal', note: 'Per 2 tbsp' },
  { name: 'Mustard (yellow or Dijon)', cal: '~5 cal', note: 'Per tsp' },
  { name: 'Lite Soy Sauce', cal: '~10 cal', note: 'Per tbsp' },
  { name: 'Coconut Aminos', cal: '~10 cal', note: 'Per tbsp' },
  { name: 'Sugar-Free Ketchup', cal: '~5 cal', note: 'Per tbsp' },
  { name: 'Lemon / Lime Juice', cal: '~5 cal', note: 'Squeeze freely' },
];

const SEASONINGS = [
  'Garlic powder', 'Onion powder', 'Smoked paprika', 'Cumin',
  'Chili powder', 'Oregano', 'Lemon pepper', 'Everything bagel seasoning',
  'Salt + black pepper', 'cinnamon (good on oats and sweet potato)',
];

export default function SaucesSeasonings() {
  return (
    <DisclosureCard title="Sauces and seasonings" sub="Flavour without spending your calories">
      <h3 className="text-[15px] font-semibold text-foreground">Sauces</h3>
      <ul className="mt-1 divide-y divide-border">
        {SAUCES.map(s => (
          <li key={s.name} className="flex items-baseline justify-between gap-3 py-2">
            <span>
              <span className="block text-sm font-semibold text-foreground">{s.name}</span>
              <span className="block text-[13px] text-muted-foreground">{s.note}</span>
            </span>
            <span className="flex-shrink-0 text-[13px] font-semibold tabular-nums text-foreground">{s.cal.replace('~', 'about ')}</span>
          </li>
        ))}
      </ul>
      <h3 className="mt-4 text-[15px] font-semibold text-foreground">Seasonings <span className="font-normal text-muted-foreground">(no calories, use freely)</span></h3>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{SEASONINGS.join(', ')}.</p>
    </DisclosureCard>
  );
}
