import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

const FieldLabel = ({ children, optional }) => (
  <p className="mb-1.5 text-[13px] text-muted-foreground">
    {children}{optional && <span className="text-muted-foreground/70">, optional</span>}
  </p>
);

const Pill = ({ active, onClick, children }) => (
  <button
    type="button"
    aria-pressed={active}
    onClick={onClick}
    className={cn(
      'h-8 rounded-md px-3 text-[13px] font-medium transition-colors',
      active ? 'bg-primary text-primary-foreground' : 'border border-input bg-card text-foreground hover:bg-accent'
    )}
  >
    {children}
  </button>
);

const CARDIO_OPTIONS = [
  'LISS (Incline Walking)',
  'Steady-State Cardio',
  'HIIT',
  'Sprint Intervals',
  'Zone 2',
  'Sled Pushes/Drags',
  'Assault Bike',
  'Rowing',
  'Stair Climber',
  'Jump Rope',
  'Circuit/Conditioning',
  'Hybrid (HYROX-style)',
  'Sport-Specific',
];

const PROGRESSIONS = [
  { value: 'linear', label: 'Linear' },
  { value: 'undulating', label: 'Undulating (DUP)' },
  { value: 'block', label: 'Block periodization' },
];

const QUICK_DURATIONS = ['4', '8', '12', '16'];

export default function AIPreferencesStep({ profile, onSubmit, isLoading }) {
  const [form, setForm] = useState({
    duration: '12',
    progression_style: 'linear',
    include_cardio: false,
    cardio_types: [],
    include_deload: true,
    deload_frequency: 'every_4_weeks',
    extra_notes: '',
  });
  const [customDuration, setCustomDuration] = useState('');
  const [isCustomDuration, setIsCustomDuration] = useState(false);

  const u = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const selectDuration = (val) => {
    setIsCustomDuration(false);
    setCustomDuration('');
    u('duration', val);
  };

  const handleCustomDurationChange = (val) => {
    setCustomDuration(val);
    setIsCustomDuration(true);
    u('duration', val);
  };

  const toggleCardioType = (type) => {
    const arr = form.cardio_types || [];
    u('cardio_types', arr.includes(type) ? arr.filter(t => t !== type) : [...arr, type]);
  };

  const handleSubmit = () => {
    const finalDuration = isCustomDuration ? customDuration : form.duration;
    onSubmit({ ...form, duration: finalDuration });
  };

  const isValid = isCustomDuration ? (Number(customDuration) >= 1 && Number(customDuration) <= 52) : !!form.duration;

  return (
    <div className="space-y-6">
      <div>
        <FieldLabel>Length</FieldLabel>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_DURATIONS.map(d => (
            <Pill key={d} active={!isCustomDuration && form.duration === d} onClick={() => selectDuration(d)}>{d} weeks</Pill>
          ))}
          <Pill active={isCustomDuration} onClick={() => { setIsCustomDuration(true); setCustomDuration(''); u('duration', ''); }}>Other</Pill>
        </div>
        {isCustomDuration && (
          <div className="mt-2 flex items-center gap-2">
            <Input
              type="number"
              min={1}
              max={52}
              value={customDuration}
              onChange={e => handleCustomDurationChange(e.target.value)}
              placeholder="20"
              className="h-9 w-24"
              autoFocus
            />
            <span className="text-[13px] text-muted-foreground">weeks, 1 to 52</span>
          </div>
        )}
      </div>

      <div>
        <FieldLabel>Progression</FieldLabel>
        <div className="flex flex-wrap gap-1.5">
          {PROGRESSIONS.map(opt => (
            <Pill key={opt.value} active={form.progression_style === opt.value} onClick={() => u('progression_style', opt.value)}>{opt.label}</Pill>
          ))}
        </div>
        <p className="mt-1.5 text-[13px] text-muted-foreground">
          {form.progression_style === 'linear' && 'Add load each session. Best for beginners and early intermediates.'}
          {form.progression_style === 'undulating' && 'Rotate strength, hypertrophy and endurance rep ranges through the week. Intermediate and up.'}
          {form.progression_style === 'block' && 'Accumulation, then intensification, then realization. For advanced lifters.'}
        </p>
      </div>

      <div className="border-t border-border pt-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[15px] font-semibold text-foreground">Deload weeks</p>
            <p className="text-[13px] text-muted-foreground">Lighter weeks so they recover and keep progressing.</p>
          </div>
          <Switch checked={form.include_deload} onCheckedChange={v => u('include_deload', v)} />
        </div>
        {form.include_deload && (
          <Select value={form.deload_frequency} onValueChange={v => u('deload_frequency', v)}>
            <SelectTrigger className="mt-3 h-9 w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="every_3_weeks">Every 3 weeks</SelectItem>
              <SelectItem value="every_4_weeks">Every 4 weeks</SelectItem>
              <SelectItem value="every_5_weeks">Every 5 weeks</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="border-t border-border pt-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[15px] font-semibold text-foreground">Cardio and conditioning</p>
            <p className="text-[13px] text-muted-foreground">Adds conditioning work to the week.</p>
          </div>
          <Switch checked={form.include_cardio} onCheckedChange={v => u('include_cardio', v)} />
        </div>
        {form.include_cardio && (
          <div className="mt-3">
            <div className="flex flex-wrap gap-1.5">
              {CARDIO_OPTIONS.map(type => (
                <Pill key={type} active={(form.cardio_types || []).includes(type)} onClick={() => toggleCardioType(type)}>{type}</Pill>
              ))}
            </div>
            {(form.cardio_types || []).length === 0 && (
              <p className="mt-1.5 text-[13px] text-destructive">Pick at least one.</p>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-border pt-5">
        <FieldLabel optional>Anything else the AI should know</FieldLabel>
        <Textarea
          value={form.extra_notes}
          onChange={e => u('extra_notes', e.target.value)}
          rows={2}
          placeholder="Recovers slowly, likes compound lifts, competing in 16 weeks"
          className="text-sm"
        />
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
        <p className="text-[13px] text-muted-foreground">You check the draft before anything is saved.</p>
        <Button
          onClick={handleSubmit}
          disabled={isLoading || !isValid || (form.include_cardio && (form.cardio_types || []).length === 0)}
        >
          {isLoading ? 'Drafting…' : 'Draft the program'}
        </Button>
      </div>
    </div>
  );
}
