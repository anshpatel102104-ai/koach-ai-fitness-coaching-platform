import React from 'react';
import { Panel, PanelHeader } from '@/components/kit';

const PRIORITIZE_BY_GOAL = {
  fat_loss:    ['Lean proteins (chicken, fish, egg whites)', 'Leafy greens and cruciferous vegetables', 'High-fibre foods (beans, oats)', 'Low-calorie, high-volume foods', 'Water-rich fruit and vegetables'],
  muscle_gain: ['Red meat and lean beef', 'Whole milk and dairy', 'Oats, rice and other starches', 'Whole eggs', 'Calorie-dense whole foods'],
  performance: ['Starchy carbs (oats, rice, potato)', 'Lean protein (chicken, turkey, fish)', 'Fruit for quick energy (banana, berries)', 'Electrolyte-rich foods', 'Anti-inflammatory foods'],
  maintenance: ['Lean meats (chicken, turkey, fish)', 'Leafy greens and cruciferous vegetables', 'Whole grains (rice, oats, quinoa)', 'Legumes and beans', 'Healthy fats (avocado, olive oil, nuts)'],
};

const AVOID_BY_GOAL = {
  fat_loss:    ['Sugary drinks and soda', 'Alcohol and other liquid calories', 'Fried and fast food', 'Processed snacks and pastries', 'High-sodium convenience meals'],
  muscle_gain: ['Low-calorie filler foods', 'Lots of cardio without eating it back', 'Skipping meals', 'Diet and zero-calorie products', 'Highly processed junk food'],
  performance: ['Heavy fats before training', 'Alcohol on training days', 'Simple sugars mid-session', 'Skipping the post-workout meal', 'High-fibre foods before competition'],
  maintenance: ['Processed, packaged snacks', 'Sugary drinks and soda', 'Fried and fast food', 'Too much alcohol', 'High-sodium convenience meals'],
};

const MEAL_TIMING = [
  'Eat every 3 to 4 hours to keep energy steady and protein coming in.',
  'Have the pre-workout meal 1 to 2 hours before training: starchy carbs and protein.',
  'Get protein in within an hour after training.',
  'Avoid large meals in the 90 minutes before bed.',
];

const DEFAULT_MORNING = [
  { name: 'Multivitamin',         dosage: '1 serving',       timing: 'Morning', purpose: 'Micronutrient insurance' },
  { name: 'Vitamin D3',           dosage: '2,000–5,000 IU',  timing: 'Morning', purpose: 'Testosterone, immunity, bone health' },
  { name: 'Omega-3 fish oil',     dosage: '2–3 g EPA+DHA',   timing: 'Morning', purpose: 'Inflammation, joints, recovery' },
  { name: 'Creatine monohydrate', dosage: '5 g daily',       timing: 'Morning', purpose: 'Strength, power, muscle retention' },
  { name: 'Vitamin C',            dosage: '500–1,000 mg',    timing: 'Morning', purpose: 'Immune support, collagen synthesis' },
];
const DEFAULT_NIGHT = [
  { name: 'Magnesium glycinate',  dosage: '200–400 mg',      timing: 'Night', purpose: 'Sleep, muscle recovery, stress' },
  { name: 'Zinc',                 dosage: '15–30 mg',        timing: 'Night', purpose: 'Testosterone, immune health, protein synthesis' },
  { name: 'Ashwagandha KSM-66',   dosage: '300–600 mg',      timing: 'Night', purpose: 'Cortisol, sleep quality, testosterone' },
];

function List({ items }) {
  return (
    <ul>
      {items.map((t, i) => (
        <li key={i} className="py-2.5 border-b border-border last:border-b-0 text-[15px] text-foreground">{t}</li>
      ))}
    </ul>
  );
}

function SupTable({ title, items }) {
  return (
    <div>
      <p className="text-[13px] text-muted-foreground mb-1">{title}</p>
      <table className="w-full text-sm">
        <tbody>
          {items.map((s, i) => (
            <tr key={i} className="border-b border-border last:border-b-0 align-top">
              <td className="py-2.5 pr-3 font-semibold text-foreground">{s.name}</td>
              <td className="py-2.5 pr-3 text-foreground tabular-nums whitespace-nowrap">{s.dosage || s.dose || '—'}</td>
              <td className="py-2.5 text-muted-foreground hidden sm:table-cell">{s.purpose || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SupplementSection({ supplements }) {
  // Split by timing, or show a general starting stack when the plan has none.
  const real = supplements.filter(s => typeof s === 'object' && s);
  const hasTiming = real.some(s => s.timing);
  const usingDefaults = !hasTiming;
  const morning = hasTiming ? real.filter(s => /morning/i.test(s.timing)) : DEFAULT_MORNING;
  const night = hasTiming ? real.filter(s => /night|bed/i.test(s.timing)) : DEFAULT_NIGHT;
  const other = hasTiming ? real.filter(s => !/morning|night|bed/i.test(s.timing || '')) : [];

  return (
    <Panel>
      <PanelHeader
        title={usingDefaults ? 'A general starting stack' : 'Supplement timing'}
        subtitle={usingDefaults
          ? 'Not on this plan. A common baseline to adjust per client, shown for reference.'
          : 'When each supplement on this plan is taken.'}
      />
      <div className="px-5 sm:px-6 pb-5 space-y-4">
        {morning.length > 0 && <SupTable title="Morning" items={morning} />}
        {night.length > 0 && <SupTable title="Night" items={night} />}
        {other.length > 0 && <SupTable title="Any time" items={other} />}
      </div>
    </Panel>
  );
}

/** "Guidance" view: what to eat more of, what to cut, timing, hydration. */
export default function OverviewTab({ plan }) {
  const isHabits = plan.tracking_mode === 'habits';
  const supplements = plan.supplements || [];
  const goalKey = plan.goal || (
    ((plan.title || '') + ' ' + (plan.description || '')).toLowerCase().includes('fat loss') ? 'fat_loss' :
    ((plan.title || '') + ' ' + (plan.description || '')).toLowerCase().includes('muscle') ? 'muscle_gain' : null
  );
  const prioritize = PRIORITIZE_BY_GOAL[goalKey] || PRIORITIZE_BY_GOAL.maintenance;
  const avoid = AVOID_BY_GOAL[goalKey] || AVOID_BY_GOAL.maintenance;
  const condiments = plan.condiments || [];

  return (
    <div className="space-y-5">
      {plan.description && (
        <Panel className="px-5 py-5 sm:px-6">
          <p className="text-[13px] text-muted-foreground mb-1">About this plan</p>
          <p className="text-[15px] text-foreground leading-relaxed">{plan.description}</p>
        </Panel>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Panel>
          <PanelHeader title="Eat more of" />
          <div className="px-5 sm:px-6 pb-4"><List items={prioritize} /></div>
        </Panel>
        <Panel>
          <PanelHeader title="Cut back on" />
          <div className="px-5 sm:px-6 pb-4"><List items={avoid} /></div>
        </Panel>
      </div>

      <Panel>
        <PanelHeader title="Meal timing" />
        <ol className="px-5 sm:px-6 pb-4">
          {MEAL_TIMING.map((tip, i) => (
            <li key={i} className="flex gap-3 py-2.5 border-b border-border last:border-b-0">
              <span className="num text-lg leading-6 text-muted-foreground w-4 flex-shrink-0">{i + 1}</span>
              <span className="text-[15px] text-foreground">{tip}</span>
            </li>
          ))}
        </ol>
      </Panel>

      <Panel className="px-5 py-5 sm:px-6">
        <p className="text-[15px] font-semibold text-foreground">Water</p>
        <p className="text-sm text-muted-foreground mt-0.5">3 to 4 litres a day. Add electrolytes on hard training days.</p>
      </Panel>

      {condiments.length > 0 && (
        <Panel className="px-5 py-5 sm:px-6">
          <p className="text-[15px] font-semibold text-foreground">Approved seasonings</p>
          <p className="text-sm text-foreground/80 mt-1">{condiments.join(', ')}</p>
        </Panel>
      )}

      {!isHabits && <SupplementSection supplements={supplements} />}
    </div>
  );
}
