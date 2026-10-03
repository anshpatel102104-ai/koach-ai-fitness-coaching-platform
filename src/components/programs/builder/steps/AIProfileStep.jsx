import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ChevronRight } from 'lucide-react';

const EQUIPMENT_OPTIONS = [
  'No Equipment', 'Dumbbells', 'Barbell', 'Cables', 'Machines',
  'Full Gym', 'Resistance Bands', 'Kettlebells', 'TRX'
];

const ChipSelect = ({ value, onChange, options, single = false }) => (
  <div className="flex flex-wrap gap-2">
    {options.map(opt => {
      const isActive = single ? value === opt : (Array.isArray(value) && value.includes(opt));
      return (
        <button
          key={opt}
          type="button"
          onClick={() => {
            if (single) {
              onChange(opt);
            } else {
              const arr = Array.isArray(value) ? value : [];
              onChange(isActive ? arr.filter(o => o !== opt) : [...arr, opt]);
            }
          }}
          className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
          style={{
            background: isActive ? 'var(--tc-primary)' : 'var(--tc-muted)',
            color: isActive ? 'var(--tc-primary-foreground)' : 'var(--tc-muted-foreground)',
            border: isActive ? '1px solid var(--tc-primary)' : '0.5px solid var(--tc-border)',
          }}
        >
          {opt}
        </button>
      );
    })}
  </div>
);

const FieldLabel = ({ children, optional }) => (
  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
    {children} {optional && <span className="normal-case tracking-normal font-normal text-[var(--tc-muted-foreground)]">— optional</span>}
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
  const SPLIT_OPTIONS = ['Full Body', 'Upper / Lower', 'Push / Pull / Legs', 'Body Part Split', 'Let AI decide'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-5"
    >
      {/* Client picker */}
      <div>
        <FieldLabel optional>Auto-fill from existing client</FieldLabel>
        <Select value={selectedClient} onValueChange={handleClientSelect}>
          <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select client (optional)" /></SelectTrigger>
          <SelectContent>
            {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Goal + Level */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Primary Goal</FieldLabel>
          <Select value={form.goal} onValueChange={v => u('goal', v)}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="fat_loss">Fat Loss</SelectItem>
              <SelectItem value="muscle_gain">Muscle Gain / Hypertrophy</SelectItem>
              <SelectItem value="strength">Strength</SelectItem>
              <SelectItem value="athletic">Athletic Performance</SelectItem>
              <SelectItem value="endurance">Endurance</SelectItem>
              <SelectItem value="general">General Fitness</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <FieldLabel>Experience Level</FieldLabel>
          <Select value={form.fitness_level} onValueChange={v => u('fitness_level', v)}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="complete_beginner">Complete Beginner (&lt;6 months)</SelectItem>
              <SelectItem value="beginner">Beginner (6–18 months)</SelectItem>
              <SelectItem value="intermediate">Intermediate (1.5–4 years)</SelectItem>
              <SelectItem value="advanced">Advanced (4+ years)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Years lifting + Age + Gender */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <FieldLabel optional>Years Lifting</FieldLabel>
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
          <FieldLabel>Days / Week</FieldLabel>
          <div className="flex gap-1.5 flex-wrap mt-1">
            {[2, 3, 4, 5, 6].map(d => (
              <button
                key={d}
                type="button"
                onClick={() => u('days_per_week', d)}
                className="w-9 h-9 rounded-lg text-sm font-semibold transition-all"
                style={{
                  background: form.days_per_week === d ? 'var(--tc-primary)' : 'var(--tc-muted)',
                  color: form.days_per_week === d ? 'var(--tc-primary-foreground)' : 'var(--tc-muted-foreground)',
                  border: form.days_per_week === d ? '1px solid var(--tc-primary)' : '0.5px solid var(--tc-border)',
                }}
              >{d}</button>
            ))}
          </div>
        </div>
        <div>
          <FieldLabel>Session Length</FieldLabel>
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
        <FieldLabel>Equipment Available</FieldLabel>
        <ChipSelect value={form.equipment} onChange={v => u('equipment', v)} options={EQUIPMENT_OPTIONS} />
      </div>

      {/* Preferred Split */}
      <div>
        <FieldLabel optional>Preferred Training Split</FieldLabel>
        <ChipSelect value={form.preferred_split} onChange={v => u('preferred_split', v)} options={SPLIT_OPTIONS} single />
      </div>

      {/* Priority muscles */}
      <div>
        <FieldLabel optional>Priority Muscle Groups</FieldLabel>
        <ChipSelect value={form.priority_muscles} onChange={v => u('priority_muscles', v)} options={PRIORITY_MUSCLES} />
      </div>

      {/* Injuries */}
      <div>
        <FieldLabel optional>Injuries or Movement Limitations</FieldLabel>
        <Textarea
          value={form.injuries}
          onChange={e => u('injuries', e.target.value)}
          rows={2}
          placeholder="e.g. left knee pain on deep squats, avoid overhead pressing"
          className="text-sm"
        />
      </div>

      {/* Movements to avoid */}
      <div>
        <FieldLabel optional>Specific Lifts to Avoid</FieldLabel>
        <Textarea
          value={form.movements_to_avoid}
          onChange={e => u('movements_to_avoid', e.target.value)}
          rows={1}
          placeholder="e.g. behind-the-neck press, barbell upright row"
          className="text-sm"
        />
      </div>

      {/* Strength numbers */}
      <div>
        <FieldLabel optional>Current Strength Benchmarks (1RM or working weight)</FieldLabel>
        <div className="grid grid-cols-2 gap-2 mt-1">
          {[
            { key: 'current_squat', label: 'Squat' },
            { key: 'current_bench', label: 'Bench Press' },
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

      <div className="flex justify-end pt-2">
        <Button
          onClick={handleSubmit}
          disabled={!isComplete}
          className="gap-2 text-sm font-semibold"
          style={{ background: 'var(--tc-primary)' }}
        >
          Next <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
}