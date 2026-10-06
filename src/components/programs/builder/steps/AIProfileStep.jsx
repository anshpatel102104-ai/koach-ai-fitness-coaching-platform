import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const EQUIPMENT_OPTIONS = [
  'No Equipment', 'Dumbbells', 'Barbell', 'Cables', 'Machines',
  'Full Gym', 'Resistance Bands', 'Kettlebells', 'TRX'
];

const ChipSelect = ({ value, onChange, options, single = false }) => (
  <div className="flex flex-wrap gap-1.5">
    {options.map(opt => {
      const isActive = single ? value === opt : (Array.isArray(value) && value.includes(opt));
      return (
        <button
          key={opt}
          type="button"
          aria-pressed={isActive}
          onClick={() => {
            if (single) {
              onChange(opt);
            } else {
              const arr = Array.isArray(value) ? value : [];
              onChange(isActive ? arr.filter(o => o !== opt) : [...arr, opt]);
            }
          }}
          className={cn(
            'h-8 rounded-md px-3 text-[13px] font-medium transition-colors',
            isActive ? 'bg-primary text-primary-foreground' : 'border border-input bg-card text-foreground hover:bg-accent'
          )}
        >
          {opt}
        </button>
      );
    })}
  </div>
);

const FieldLabel = ({ children, optional }) => (
  <p className="mb-1.5 text-[13px] text-muted-foreground">
    {children}{optional && <span className="text-muted-foreground/70">, optional</span>}
  </p>
);

export default function AIProfileStep({ onSubmit }) {
  const [selectedClient, setSelectedClient] = useState('');
  const [form, setForm] = useState({
    goal: '',
    fitness_level: '',
    years_lifting: '',
    age: '',
    gender: '',
    days_per_week: '',
    session_length: '',
    equipment: [],
    injuries: '',
    movements_to_avoid: '',
    focus_areas: '',
    priority_muscles: [],
    preferred_split: '',
    current_squat: '',
    current_bench: '',
    current_deadlift: '',
    current_ohp: '',
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => db.entities.Client.list('name'),
  });

  const u = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleClientSelect = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setForm(f => ({ ...f, goal: client.goal || '' }));
      setSelectedClient(clientId);
    }
  };

  const handleSubmit = () => {
    if (!form.goal || !form.fitness_level || !form.days_per_week || !form.session_length) return;
    onSubmit({ ...form, client_id: selectedClient });
  };

  const isComplete = form.goal && form.fitness_level && form.days_per_week && form.session_length;

  const PRIORITY_MUSCLES = ['Chest', 'Back', 'Shoulders', 'Arms', 'Quads', 'Hamstrings', 'Glutes', 'Core', 'Calves'];
  const SPLIT_OPTIONS = ['Full body', 'Upper / lower', 'Push / pull / legs', 'Body part split', 'Let AI decide'];

  return (
    <div className="space-y-5">
      {/* Client picker */}
      <div>
        <FieldLabel optional>Fill in from a client</FieldLabel>
        <Select value={selectedClient} onValueChange={handleClientSelect}>
          <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Pick a client" /></SelectTrigger>
          <SelectContent>
            {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Goal + Level */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Main goal</FieldLabel>
          <Select value={form.goal} onValueChange={v => u('goal', v)}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="fat_loss">Fat loss</SelectItem>
              <SelectItem value="muscle_gain">Muscle gain</SelectItem>
              <SelectItem value="strength">Strength</SelectItem>
              <SelectItem value="athletic">Athletic performance</SelectItem>
              <SelectItem value="endurance">Endurance</SelectItem>
              <SelectItem value="general">General fitness</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <FieldLabel>Training age</FieldLabel>
          <Select value={form.fitness_level} onValueChange={v => u('fitness_level', v)}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="complete_beginner">Brand new (under 6 months)</SelectItem>
              <SelectItem value="beginner">Beginner (6 to 18 months)</SelectItem>
              <SelectItem value="intermediate">Intermediate (1.5 to 4 years)</SelectItem>
              <SelectItem value="advanced">Advanced (4+ years)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Years lifting + Age + Gender */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <FieldLabel optional>Years lifting</FieldLabel>
          <Input
            type="number" min="0" max="50"
            value={form.years_lifting}
            onChange={e => u('years_lifting', e.target.value)}
            placeholder="e.g. 3"
            className="h-9 text-sm"
          />
        </div>
        <div>
          <FieldLabel optional>Age</FieldLabel>
          <Input
            type="number" value={form.age}
            onChange={e => u('age', e.target.value)}
            placeholder="e.g. 28"
            className="h-9 text-sm"
          />
        </div>
        <div>
          <FieldLabel optional>Gender</FieldLabel>
          <Select value={form.gender} onValueChange={v => u('gender', v)}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Days + Session Length */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Days a week</FieldLabel>
          <div className="flex gap-1.5 flex-wrap mt-1">
            {[2, 3, 4, 5, 6].map(d => (
              <button
                key={d}
                type="button"
                aria-pressed={form.days_per_week === d}
                onClick={() => u('days_per_week', d)}
                className={cn(
                  'h-9 w-9 rounded-md text-sm font-semibold tabular-nums transition-colors',
                  form.days_per_week === d ? 'bg-primary text-primary-foreground' : 'border border-input bg-card text-foreground hover:bg-accent'
                )}
              >{d}</button>
            ))}
          </div>
        </div>
        <div>
          <FieldLabel>Session length</FieldLabel>
          <Select value={form.session_length} onValueChange={v => u('session_length', v)}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30 min</SelectItem>
              <SelectItem value="45">45 min</SelectItem>
              <SelectItem value="60">60 min</SelectItem>
              <SelectItem value="75">75 min</SelectItem>
              <SelectItem value="90">90+ min</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Equipment */}
      <div>
        <FieldLabel>Equipment they have</FieldLabel>
        <ChipSelect value={form.equipment} onChange={v => u('equipment', v)} options={EQUIPMENT_OPTIONS} />
      </div>

      {/* Preferred Split */}
      <div>
        <FieldLabel optional>Split</FieldLabel>
        <ChipSelect value={form.preferred_split} onChange={v => u('preferred_split', v)} options={SPLIT_OPTIONS} single />
      </div>

      {/* Priority muscles */}
      <div>
        <FieldLabel optional>Muscles to prioritise</FieldLabel>
        <ChipSelect value={form.priority_muscles} onChange={v => u('priority_muscles', v)} options={PRIORITY_MUSCLES} />
      </div>

      {/* Injuries */}
      <div>
        <FieldLabel optional>Injuries or limitations</FieldLabel>
        <Textarea
          value={form.injuries}
          onChange={e => u('injuries', e.target.value)}
          rows={2}
          placeholder="Left knee pain on deep squats, no overhead pressing"
          className="text-sm"
        />
      </div>

      {/* Movements to avoid */}
      <div>
        <FieldLabel optional>Lifts to leave out</FieldLabel>
        <Textarea
          value={form.movements_to_avoid}
          onChange={e => u('movements_to_avoid', e.target.value)}
          rows={1}
          placeholder="Behind-the-neck press, barbell upright row"
          className="text-sm"
        />
      </div>

      {/* Strength numbers */}
      <div>
        <FieldLabel optional>Current lifts (1RM or working weight)</FieldLabel>
        <div className="grid grid-cols-2 gap-2 mt-1">
          {[
            { key: 'current_squat', label: 'Squat' },
            { key: 'current_bench', label: 'Bench' },
            { key: 'current_deadlift', label: 'Deadlift' },
            { key: 'current_ohp', label: 'OHP' },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-20 flex-shrink-0">{label}</span>
              <Input
                type="text"
                value={form[key]}
                onChange={e => u(key, e.target.value)}
                placeholder="e.g. 100kg"
                className="h-8 text-xs flex-1"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
        <p className="text-[13px] text-muted-foreground">{isComplete ? 'Next: how long it runs and how it progresses.' : 'Goal, training age, days and session length are needed.'}</p>
        <Button onClick={handleSubmit} disabled={!isComplete}>Next</Button>
      </div>
    </div>
  );
}