import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { COACHING_TEMPLATES } from '@/lib/coachingTemplates';
import ApplyTemplateModal from '@/components/templates/ApplyTemplateModal';
import { Button } from '@/components/ui/button';
import { Page, PageHeader, Panel, Segmented, EmptyState } from '@/components/kit';
import { cn } from '@/lib/utils';

// Map template tags to filter categories
const FILTERS = [
  { key: 'all',         label: 'All' },
  { key: 'fat_loss',    label: 'Fat loss' },
  { key: 'muscle_gain', label: 'Muscle gain' },
  { key: 'performance', label: 'Performance' },
  { key: 'maintenance', label: 'Maintenance' },
  { key: 'custom',      label: 'Custom' },
];

function matchesFilter(template, filter) {
  if (filter === 'all') return true;
  if (filter === 'performance') return (template.tags || []).some(t => ['hybrid', 'athletic', 'performance'].includes(t));
  return (template.tags || []).includes(filter);
}

/** Shared grid template for the header + rows. */
const COLS = 'md:grid md:grid-cols-[minmax(0,2.2fr)_minmax(0,1.3fr)_minmax(0,1.1fr)_minmax(0,0.7fr)_auto] md:items-center md:gap-4';

function TemplateRow({ template, onApply, open, onToggle }) {
  const workouts = template.program.workouts || [];
  const n = template.nutrition || {};
  const rules = template.automationRules || [];
  const dayNames = workouts.map(w => (w.day_name || '').replace(/^Day \d+\s*[–-]\s*/, ''));

  return (
    <div className="border-b border-border last:border-b-0">
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={e => { if (e.key === 'Enter') onToggle(); }}
        aria-expanded={open}
        className={cn('flex cursor-pointer items-center gap-3 px-5 py-3.5 transition-colors hover:bg-accent/50 focus-visible:bg-accent/60 focus-visible:outline-none sm:px-6', COLS)}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-foreground">{template.label}</p>
          <p className="truncate text-sm text-muted-foreground">{template.description}</p>
        </div>
        <p className="hidden truncate text-[15px] text-foreground md:block">
          {template.program.days_per_week} days a week{template.program.duration_weeks ? `, ${template.program.duration_weeks} weeks` : ''}
        </p>
        <p className="hidden text-[15px] text-foreground md:block">
          <span className="num text-[17px]">{Number(n.calories || 0).toLocaleString()}</span> kcal
          {n.protein_g ? <span className="text-muted-foreground">, {n.protein_g} g protein</span> : null}
        </p>
        <p className="hidden text-[15px] text-foreground md:block">{rules.length} rule{rules.length !== 1 ? 's' : ''}</p>
        <div className="flex flex-shrink-0 items-center justify-end gap-1 md:w-[104px]" onClick={e => e.stopPropagation()}>
          <Button size="sm" variant="outline" onClick={() => onApply(template)}>Apply</Button>
          <button
            onClick={onToggle}
            className="touch-compact flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label={open ? 'Hide details' : 'Show details'}
          >
            <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
          </button>
        </div>
      </div>

      {open && (
        <div className="grid gap-6 px-5 pb-5 sm:px-6 md:grid-cols-3">
          <div>
            <p className="mb-2 text-[13px] text-muted-foreground">{template.program.title || 'Program'}</p>
            <div className="space-y-1.5">
              {dayNames.map((d, i) => (
                <div key={i} className="rounded-lg bg-secondary px-3 py-2">
                  <p className="text-[13px] text-muted-foreground">Day {i + 1}</p>
                  <p className="text-[15px] font-semibold text-foreground">{d || `Day ${i + 1}`}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-[13px] text-muted-foreground">Daily targets</p>
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-[13px] text-muted-foreground">Calories</p><p className="num text-xl text-foreground">{Number(n.calories || 0).toLocaleString()}</p></div>
              <div><p className="text-[13px] text-muted-foreground">Protein</p><p className="num text-xl text-foreground">{n.protein_g} g</p></div>
              <div><p className="text-[13px] text-muted-foreground">Carbs</p><p className="num text-xl text-foreground">{n.carbs_g} g</p></div>
              <div><p className="text-[13px] text-muted-foreground">Fat</p><p className="num text-xl text-foreground">{n.fats_g} g</p></div>
            </div>
            {template.stats?.length > 0 && (
              <p className="mt-4 text-sm text-muted-foreground">{template.stats.join(', ')}.</p>
            )}
          </div>
          <div>
            <p className="mb-2 text-[13px] text-muted-foreground">Automation rules</p>
            <ul className="space-y-1.5">
              {rules.map((r, i) => (
                <li key={i} className="border-b border-border pb-1.5 text-sm text-foreground last:border-b-0">
                  {r.name.replace(/^[^–]+–\s*/, '')}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CoachingTemplates() {
  const [applyingTemplate, setApplyingTemplate] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [openId, setOpenId] = useState(null);

  const filteredTemplates = COACHING_TEMPLATES.filter(t => matchesFilter(t, activeFilter));

  const countFor = (key) => key === 'all'
    ? COACHING_TEMPLATES.length
    : COACHING_TEMPLATES.filter(t => matchesFilter(t, key)).length;

  const filterOptions = FILTERS
    .map(f => ({ value: f.key, label: f.label, count: countFor(f.key) }))
    .filter(o => o.value === 'all' || o.count > 0);

  return (
    <Page>
      <PageHeader
        title="Coaching templates"
        subtitle="Each one sets up a program, a nutrition plan, check-ins and automation rules for a client in one step."
        actions={<Button variant="outline">Create template</Button>}
      />

      <Segmented options={filterOptions} value={activeFilter} onChange={setActiveFilter} className="mb-4" />

      <Panel className="overflow-hidden">
        {filteredTemplates.length === 0 ? (
          <EmptyState title="No templates here yet" body="Nothing is tagged for this goal." />
        ) : (
          <>
            <div className={cn('hidden border-b border-border px-6 pb-3 pt-4 text-[13px] text-muted-foreground', COLS)}>
              <span>Template</span>
              <span>Training</span>
              <span>Nutrition</span>
              <span>Automations</span>
              <span className="w-[104px]" aria-hidden />
            </div>
            {filteredTemplates.map(t => (
              <TemplateRow
                key={t.id}
                template={t}
                onApply={setApplyingTemplate}
                open={openId === t.id}
                onToggle={() => setOpenId(id => (id === t.id ? null : t.id))}
              />
            ))}
          </>
        )}
      </Panel>

      {applyingTemplate && (
        <ApplyTemplateModal
          template={applyingTemplate}
          onClose={() => setApplyingTemplate(null)}
        />
      )}
    </Page>
  );
}
