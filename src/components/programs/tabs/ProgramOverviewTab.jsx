import React from 'react';
import { KeyValue, Panel } from '@/components/kit';

const cap = (s = '') => {
  const t = String(s).replace(/_/g, ' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
};

function Section({ title, children }) {
  return (
    <div>
      <h3 className="mb-2 text-[18px] text-foreground">{title}</h3>
      {children}
    </div>
  );
}

export default function ProgramOverviewTab({ program }) {
  const allEquipment = new Set(program.equipment || []);
  program.workouts?.forEach(w => {
    w.exercises?.forEach(e => {
      if (e.equipment) allEquipment.add(cap(e.equipment));
    });
  });

  const tags = program.tags || [];
  const facts = [
    program.progression_model && { label: 'Progression', value: cap(program.progression_model) },
    program.deload_frequency && program.deload_frequency !== 'never' && { label: 'Deload', value: cap(program.deload_frequency) },
    program.estimated_session_length && { label: 'Session length', value: `${program.estimated_session_length} min` },
    program.schedule_mode && { label: 'Schedule', value: program.schedule_mode === 'progress' ? 'Changes week by week' : 'Same every week' },
  ].filter(Boolean);

  const hasAnything = program.description || program.target_audience || program.goals || facts.length || allEquipment.size || tags.length;

  if (!hasAnything) {
    return <p className="text-sm text-muted-foreground">No details for this program yet. Add a description in the builder's program settings.</p>;
  }

  return (
    <div className="max-w-3xl space-y-6">
      {program.description && (
        <p className="text-[15px] leading-relaxed text-foreground">{program.description}</p>
      )}

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map(tag => (
            <span key={tag} className="rounded-md bg-secondary px-2 py-1 text-[13px] font-medium text-foreground">{tag}</span>
          ))}
        </div>
      )}

      {facts.length > 0 && (
        <Panel className="px-5 py-2">
          {facts.map(f => <KeyValue key={f.label} label={f.label} value={f.value} />)}
        </Panel>
      )}

      {allEquipment.size > 0 && (
        <Section title="Equipment">
          <p className="text-[15px] text-foreground">{Array.from(allEquipment).join(', ')}</p>
        </Section>
      )}

      {program.target_audience && (
        <Section title="Who it's for">
          <p className="text-[15px] leading-relaxed text-foreground">{program.target_audience}</p>
        </Section>
      )}

      {program.goals && (
        <Section title="What it should do">
          <p className="text-[15px] leading-relaxed text-foreground">{program.goals}</p>
        </Section>
      )}
    </div>
  );
}
