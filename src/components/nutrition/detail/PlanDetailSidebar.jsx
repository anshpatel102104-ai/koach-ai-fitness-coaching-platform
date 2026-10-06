import React from 'react';
import { ShieldCheck, ShieldAlert, Shield } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Panel, InkPanel, KeyValue, Initials, TextLink } from '@/components/kit';
import { cn } from '@/lib/utils';
import { allergyCheck, joinWords, firstName } from '../planUtils';

const COMPLEXITY_LABELS = {
  very_basic: 'Very basic',
  simple: 'Simple',
  moderate: 'Moderate',
  upscale: 'Upscale',
  gourmet: 'Gourmet',
};

const LIFECYCLE_LABEL = {
  active: 'Active', lead: 'Lead', at_risk: 'At risk', completed: 'Completed', alumni: 'Alumni',
};

/* ── Allergy check ────────────────────────────────────────────────────────── */

export function AllergyCard({ plan, meals, clientName }) {
  const { labels, conflicts } = allergyCheck(plan, meals);
  const who = clientName ? firstName(clientName) : 'This client';

  if (labels.length === 0) {
    return (
      <Panel className="p-5 flex gap-3">
        <Shield className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-[15px] font-semibold text-foreground">No allergies on file</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            Nothing to check this plan against. If {clientName ? who : 'the client'} has allergies, add them when you generate or edit the plan.
          </p>
        </div>
      </Panel>
    );
  }

  if (conflicts.length > 0) {
    const shown = conflicts.slice(0, 4);
    return (
      <section className="rounded-xl border-[1.5px] border-destructive bg-card p-5 flex gap-3" role="alert">
        <ShieldAlert className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-destructive">Allergy conflict</p>
          <p className="text-sm text-foreground/80 mt-0.5">
            {who} avoids {joinWords(labels)}. {conflicts.length === 1 ? 'One ingredient needs' : `${conflicts.length} ingredients need`} a swap before this plan goes out.
          </p>
          <ul className="mt-2 space-y-1">
            {shown.map((c, i) => (
              <li key={i} className="text-sm text-foreground">
                <span className="font-semibold">{c.food}</span>
                <span className="text-muted-foreground"> in {c.meal}, {c.allergen}</span>
              </li>
            ))}
            {conflicts.length > shown.length && (
              <li className="text-[13px] text-muted-foreground">and {conflicts.length - shown.length} more</li>
            )}
          </ul>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border-[1.5px] border-success bg-card p-5 flex gap-3">
      <ShieldCheck className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-[15px] font-semibold text-foreground">Allergy check passed</p>
        <p className="text-sm text-muted-foreground mt-0.5">
          {who} avoids {joinWords(labels)}. Every ingredient on this plan was checked against it.
        </p>
      </div>
    </section>
  );
}

/* ── Supplements ──────────────────────────────────────────────────────────── */

function supplementValue(s) {
  if (typeof s === 'string') return '';
  return [s.dosage || s.dose, s.timing ? String(s.timing).toLowerCase() : null].filter(Boolean).join(', ');
}

export function SupplementsPanel({ supplements = [] }) {
  return (
    <Panel className="px-5 pt-5 pb-3">
      <h2 className="text-[22px] text-foreground mb-1">Supplements</h2>
      {supplements.length === 0 ? (
        <p className="text-sm text-muted-foreground pb-2">None on this plan.</p>
      ) : (
        <div>
          {supplements.map((s, i) => (
            <KeyValue
              key={i}
              label={<span className="font-semibold text-foreground">{typeof s === 'string' ? s : s.name}</span>}
              value={<span className="font-normal text-foreground/80">{supplementValue(s) || '—'}</span>}
            />
          ))}
        </div>
      )}
    </Panel>
  );
}

/* ── Right column ─────────────────────────────────────────────────────────── */

export default function PlanDetailSidebar({ plan, meals = [], assignedClients = [], groceryCount = 0, onAssign, onOpenGrocery }) {
  const supplements = plan?.supplements || [];
  const client = assignedClients[0];

  const facts = [
    { label: 'Meals a day', value: `${(plan.meals || []).length}` },
    (plan.rest_day_meals || []).length ? { label: 'Rest day meals', value: `${plan.rest_day_meals.length}` } : null,
    plan.bmr ? { label: 'BMR', value: `${Math.round(plan.bmr).toLocaleString()} kcal` } : null,
    plan.tdee ? { label: 'Maintenance', value: `${Math.round(plan.tdee).toLocaleString()} kcal` } : null,
    plan.weekly_loss_rate ? { label: 'Weekly loss target', value: `${plan.weekly_loss_rate} lb` } : null,
    plan.meal_complexity ? { label: 'Meal complexity', value: COMPLEXITY_LABELS[plan.meal_complexity] || plan.meal_complexity } : null,
    plan.diet ? { label: 'Diet', value: String(plan.diet).replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()) } : null,
    plan.created_date ? { label: 'Created', value: format(new Date(plan.created_date), 'MMM d, yyyy') } : null,
  ].filter(Boolean);

  return (
    <div className="space-y-5">
      <AllergyCard plan={plan} meals={meals} clientName={client?.name} />

      <SupplementsPanel supplements={supplements} />

      <InkPanel
        title={groceryCount > 0 ? 'Grocery list ready' : 'Grocery list'}
        footer={
          <Button
            size="sm"
            onClick={onOpenGrocery}
            disabled={groceryCount === 0}
            className="bg-ai-foreground text-ai hover:bg-ai-foreground/90"
          >
            Open grocery list
          </Button>
        }
      >
        {groceryCount > 0
          ? `${groceryCount} item${groceryCount === 1 ? '' : 's'} for the week, grouped by store aisle.`
          : 'Add foods to the meals and the list builds itself, grouped by store aisle.'}
      </InkPanel>

      <Panel className="px-5 pt-5 pb-4">
        <div className="flex items-baseline justify-between gap-3 mb-1">
          <h2 className="text-[22px] text-foreground">On this plan</h2>
          <span className="text-sm text-muted-foreground tabular-nums">{assignedClients.length}</span>
        </div>
        {assignedClients.length === 0 ? (
          <p className="text-sm text-muted-foreground py-1">No clients yet.</p>
        ) : (
          <ul>
            {assignedClients.map(c => (
              <li key={c.id} className="flex items-center gap-3 py-2.5 border-b border-border last:border-b-0">
                <Initials name={c.name} src={c.avatar_url} size={32} tone={c.lifecycle_status === 'at_risk' ? 'alert' : 'default'} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-foreground truncate">{c.name}</span>
                  {c.lifecycle_status && (
                    <span className={cn('block text-[13px]', c.lifecycle_status === 'at_risk' ? 'text-destructive' : 'text-muted-foreground')}>
                      {LIFECYCLE_LABEL[c.lifecycle_status] || c.lifecycle_status}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
        <TextLink onClick={onAssign} className="mt-3 inline-block">Assign to a client</TextLink>
      </Panel>

      {facts.length > 0 && (
        <Panel className="px-5 pt-5 pb-3">
          <h2 className="text-[22px] text-foreground mb-1">Plan details</h2>
          {facts.map(f => <KeyValue key={f.label} label={f.label} value={<span className="tabular-nums">{f.value}</span>} />)}
        </Panel>
      )}
    </div>
  );
}
