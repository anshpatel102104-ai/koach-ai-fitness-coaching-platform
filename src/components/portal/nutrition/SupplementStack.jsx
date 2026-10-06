import React from 'react';
import { DisclosureCard } from '@/components/portal/PortalUI';

const DEFAULT_MORNING = [
  { name: 'Multivitamin',           dose: '1 serving with breakfast',    why: 'Fills micronutrient gaps from reduced food intake' },
  { name: 'Vitamin D3',             dose: '2,000–5,000 IU',              why: 'Testosterone, immune function, bone health' },
  { name: 'Omega-3 Fish Oil',       dose: '2–3g EPA+DHA',                why: 'Inflammation, joints, brain health, recovery' },
  { name: 'Creatine Monohydrate',   dose: '5g daily (any time)',         why: 'Strength, power output, muscle retention' },
  { name: 'Vitamin C',              dose: '500–1,000mg',                 why: 'Immune support, antioxidant, collagen synthesis' },
];

const DEFAULT_NIGHT = [
  { name: 'Magnesium Glycinate',    dose: '200–400mg before bed',        why: 'Sleep quality, muscle recovery, stress reduction' },
  { name: 'Zinc',                   dose: '15–30mg with food',           why: 'Testosterone, immune health, protein synthesis' },
  { name: 'Ashwagandha KSM-66',     dose: '300–600mg before bed',        why: 'Cortisol reduction, sleep quality, testosterone support' },
];

function normalizeSupplements(raw) {
  if (!raw || raw.length === 0) return { morning: DEFAULT_MORNING, night: DEFAULT_NIGHT };
  const hasTiming = raw.some(s => s.timing || s.time_of_day);
  if (!hasTiming) return { morning: DEFAULT_MORNING, night: DEFAULT_NIGHT };

  const morning = raw
    .filter(s => ['Morning','morning'].includes(s.timing || s.time_of_day))
    .map(s => ({ name: s.name, dose: s.dosage || s.dose || '', why: s.purpose || s.why || '' }));
  const night = raw
    .filter(s => ['Night','night','Before Bed'].includes(s.timing || s.time_of_day))
    .map(s => ({ name: s.name, dose: s.dosage || s.dose || '', why: s.purpose || s.why || '' }));

  return {
    morning: morning.length > 0 ? morning : DEFAULT_MORNING,
    night:   night.length > 0   ? night   : DEFAULT_NIGHT,
  };
}

function StackSection({ title, items }) {
  return (
    <div className="mb-3 last:mb-0">
      <h3 className="text-[15px] font-semibold text-foreground">{title}</h3>
      <ul className="mt-1 divide-y divide-border">
        {items.map(item => (
          <li key={item.name} className="py-2.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-semibold text-foreground">{item.name}</span>
              <span className="text-right text-[13px] text-muted-foreground">{item.dose}</span>
            </div>
            {item.why && <p className="mt-0.5 text-[13px] text-muted-foreground">{item.why}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function SupplementStack({ customSupplements }) {
  const { morning, night } = normalizeSupplements(customSupplements);

  return (
    <DisclosureCard title="Supplements" sub={`${morning.length} in the morning, ${night.length} at night`}>
      <p className="mb-3 rounded-lg bg-secondary px-3 py-2 text-[13px] text-muted-foreground">
        General guidance. Your coach may change these for you.
      </p>
      <StackSection title="Morning" items={morning} />
      <StackSection title="Night" items={night} />
    </DisclosureCard>
  );
}
