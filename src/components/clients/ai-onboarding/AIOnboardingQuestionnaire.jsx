import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const EQUIPMENT_OPTIONS = ['Full gym', 'Dumbbells only', 'Barbell + rack', 'Home gym', 'Bodyweight only', 'Cables & machines'];
const SPLIT_OPTIONS = ['Let AI decide', 'Full body', 'Upper/Lower', 'Push/Pull/Legs', 'Body part split', 'Hybrid'];
const DIET_OPTIONS = ['Balanced', 'High protein', 'Low carb', 'Carb cycling', 'Vegetarian', 'Vegan', 'Keto'];
const FITNESS_LEVELS = [
  { key: 'beginner', label: 'Beginner', desc: '< 1 year training' },
  { key: 'intermediate', label: 'Intermediate', desc: '1–3 years' },
  { key: 'advanced', label: 'Advanced', desc: '3+ years' },
];
const GOAL_OPTIONS = [
  { key: 'weight_loss', label: 'Fat loss' },
  { key: 'muscle_gain', label: 'Muscle gain' },
  { key: 'strength', label: 'Strength' },
  { key: 'endurance', label: 'Endurance' },
  { key: 'general_fitness', label: 'General fitness' },
];

export default function AIOnboardingQuestionnaire({ client, onGenerate, error }) {
  const [form, setForm] = useState({
    goal: client.goal || 'general_fitness',
    fitness_level: 'intermediate',
    days_per_week: 4,
    session_length: 60,
    preferred_split: 'Let AI decide',
    equipment: ['Full gym'],
    injuries: '',
    movements_to_avoid: '',
    include_cardio: false,
    diet_style: 'Balanced',
    daily_calories: '',
    meals_per_day: 4,
    allergies: '',
    extra_notes: '',
  });
  const [loading, setLoading] = useState(false);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const toggleEquipment = (item) => {
    setForm(f => ({
      ...f,
      equipment: f.equipment.includes(item)
        ? f.equipment.filter(e => e !== item)
        : [...f.equipment, item],
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    await onGenerate(form);
    setLoading(false);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-6 space-y-7">

        {error && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/40">
            <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Client context */}
        <p className="text-[15px] text-muted-foreground">
          The AI combines these answers with what&apos;s already on {client.name}&apos;s profile
          {client.current_weight ? ` (${client.current_weight} lb` : ''}
          {client.target_weight ? `, goal ${client.target_weight} lb` : ''}
          {client.height ? `, ${client.height}` : ''}{client.current_weight ? ')' : ''}.
        </p>

        {/* Goal */}
        <Section title="Main goal">
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {GOAL_OPTIONS.map(g => (
              <button key={g.key} onClick={() => set('goal', g.key)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-center transition-all ${
                  form.goal === g.key ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card hover:bg-accent'
                }`}>
                                <span className={`text-[13px] font-semibold ${form.goal === g.key ? 'text-primary-foreground' : 'text-foreground/80'}`}>{g.label}</span>
              </button>
            ))}
          </div>
        </Section>

        {/* Fitness level */}
        <Section title="Experience">
          <div className="grid grid-cols-3 gap-2">
            {FITNESS_LEVELS.map(l => (
              <button key={l.key} onClick={() => set('fitness_level', l.key)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  form.fitness_level === l.key ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card hover:bg-accent'
                }`}>
                <p className={`text-xs font-bold ${form.fitness_level === l.key ? 'text-primary-foreground' : 'text-foreground'}`}>{l.label}</p>
                <p className={`text-[12px] mt-0.5 ${form.fitness_level === l.key ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{l.desc}</p>
              </button>
            ))}
          </div>
        </Section>

        {/* Training logistics */}
        <Section title="Training setup">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Days a week">
              <div className="flex items-center gap-1">
                {[2,3,4,5,6].map(d => (
                  <button key={d} onClick={() => set('days_per_week', d)}
                    className={`w-9 h-9 rounded-lg text-sm font-bold border transition-all ${
                      form.days_per_week === d ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground/80 hover:bg-accent'
                    }`}>{d}</button>
                ))}
              </div>
            </Field>
            <Field label="Session length, minutes">
              <div className="flex items-center gap-1">
                {[30, 45, 60, 75, 90].map(m => (
                  <button key={m} onClick={() => set('session_length', m)}
                    className={`px-2 h-9 rounded-lg text-xs font-bold border transition-all ${
                      form.session_length === m ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground/80 hover:bg-accent'
                    }`}>{m}</button>
                ))}
              </div>
            </Field>
          </div>
        </Section>

        {/* Training split preference */}
        <Section title="Preferred split">
          <div className="flex flex-wrap gap-2">
            {SPLIT_OPTIONS.map(s => (
              <button key={s} onClick={() => set('preferred_split', s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  form.preferred_split === s ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground/80 hover:bg-accent'
                }`}>{s}</button>
            ))}
          </div>
        </Section>

        {/* Equipment */}
        <Section title="Equipment they have">
          <div className="flex flex-wrap gap-2">
            {EQUIPMENT_OPTIONS.map(e => (
              <button key={e} onClick={() => toggleEquipment(e)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  form.equipment.includes(e) ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground/80 hover:bg-accent'
                }`}>{e}</button>
            ))}
          </div>
        </Section>

        {/* Injuries */}
        <Section title="Injuries or restrictions, optional">
          <textarea
            value={form.injuries}
            onChange={e => set('injuries', e.target.value)}
            placeholder="e.g. Lower back pain, avoid heavy deadlifts. Right shoulder impingement."
            rows={2}
            className="w-full text-sm border border-border rounded-lg px-3 py-2.5 bg-card outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </Section>

        {/* Include cardio */}
        <Section title="Include cardio">
          <div className="flex items-center gap-3">
            {[true, false].map(v => (
              <button key={String(v)} onClick={() => set('include_cardio', v)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold border transition-all ${
                  form.include_cardio === v ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground/80 hover:bg-accent'
                }`}>{v ? 'Yes' : 'No'}</button>
            ))}
          </div>
        </Section>

        {/* Divider */}
        <div className="border-t border-border pt-1">
          <h3 className="text-[20px] text-foreground mt-3">Nutrition</h3>
        </div>

        {/* Diet style */}
        <Section title="Diet style">
          <div className="flex flex-wrap gap-2">
            {DIET_OPTIONS.map(d => (
              <button key={d} onClick={() => set('diet_style', d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  form.diet_style === d ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground/80 hover:bg-accent'
                }`}>{d}</button>
            ))}
          </div>
        </Section>

        <div className="grid grid-cols-2 gap-4">
          <Section title="Daily calories, optional">
            <input
              type="number"
              value={form.daily_calories}
              onChange={e => set('daily_calories', e.target.value ? Number(e.target.value) : '')}
              placeholder="e.g. 2200. Leave blank to estimate"
              className="w-full text-sm border border-border rounded-lg px-3 py-2.5 bg-card outline-none focus:ring-2 focus:ring-ring"
            />
          </Section>
          <Section title="Meals per day">
            <div className="flex items-center gap-1">
              {[3,4,5,6].map(n => (
                <button key={n} onClick={() => set('meals_per_day', n)}
                  className={`w-10 h-10 rounded-lg text-sm font-bold border transition-all ${
                    form.meals_per_day === n ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground/80 hover:bg-accent'
                  }`}>{n}</button>
              ))}
            </div>
          </Section>
        </div>

        <Section title="Allergies and dislikes, optional">
          <input
            type="text"
            value={form.allergies}
            onChange={e => set('allergies', e.target.value)}
            placeholder="e.g. No dairy, no shellfish"
            className="w-full text-sm border border-border rounded-lg px-3 py-2.5 bg-card outline-none focus:ring-2 focus:ring-ring"
          />
        </Section>

        <Section title="Anything else the AI should know, optional">
          <textarea
            value={form.extra_notes}
            onChange={e => set('extra_notes', e.target.value)}
            placeholder="e.g. Client trains early mornings. Prefers compound movements. Competes in powerlifting."
            rows={2}
            className="w-full text-sm border border-border rounded-lg px-3 py-2.5 bg-card outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </Section>

        {/* Generate */}
        <div className="pb-4">
          <Button size="lg" className="w-full" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Drafting' : `Draft a plan for ${client.name}`}
          </Button>
          <p className="text-center text-[13px] text-muted-foreground mt-2">
            Nothing is saved until you review and approve it.
          </p>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[13px] text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}