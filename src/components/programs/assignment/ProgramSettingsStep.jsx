import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const PACES = [
  { value: 'standard', label: 'Standard', body: 'Follow the program as written.' },
  { value: 'accelerated', label: 'Faster', body: 'Compress the timeline so weeks move quicker.' },
  { value: 'extended', label: 'Slower', body: 'More time in each phase. Good for beginners.' },
];

export default function ProgramSettingsStep({
  startDate,
  onStartDateChange,
  repeatProgram,
  onRepeatChange,
  pace,
  onPaceChange,
  showCustomMessage,
  onShowCustomMessageChange,
  customMessage,
  onCustomMessageChange,
}) {
  const formatDate = (date) => new Date(date).toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      <div>
        <Label className="mb-1.5 block text-[13px] font-normal text-muted-foreground">Start date</Label>
        <Input
          type="date"
          value={formatDate(startDate)}
          onChange={(e) => onStartDateChange(new Date(e.target.value))}
          className="max-w-[220px]"
        />
      </div>

      <div className="flex items-center justify-between gap-4 border-y border-border py-3">
        <div>
          <p className="text-[15px] font-semibold text-foreground">Repeat when it ends</p>
          <p className="text-[13px] text-muted-foreground">Starts again from week 1 when they finish.</p>
        </div>
        <Switch checked={repeatProgram} onCheckedChange={onRepeatChange} />
      </div>

      <div>
        <p className="mb-2 text-[13px] text-muted-foreground">Pace</p>
        <RadioGroup value={pace} onValueChange={onPaceChange} className="gap-0 overflow-hidden rounded-xl border border-border">
          {PACES.map(p => (
            <label key={p.value} htmlFor={`pace-${p.value}`} className="flex cursor-pointer items-center gap-3 border-b border-border px-3 py-3 last:border-b-0 hover:bg-accent/50">
              <RadioGroupItem value={p.value} id={`pace-${p.value}`} />
              <div className="flex-1">
                <p className="text-[15px] font-semibold text-foreground">{p.label}</p>
                <p className="text-[13px] text-muted-foreground">{p.body}</p>
              </div>
            </label>
          ))}
        </RadioGroup>
      </div>

      <div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[15px] font-semibold text-foreground">Personal note</p>
            <p className="text-[13px] text-muted-foreground">Shown with the program when they open it.</p>
          </div>
          <Switch checked={showCustomMessage} onCheckedChange={onShowCustomMessageChange} />
        </div>
        {showCustomMessage && (
          <Textarea
            placeholder="Why you picked this for them and what to focus on in week 1."
            value={customMessage}
            onChange={(e) => onCustomMessageChange(e.target.value)}
            className="mt-3 h-24 text-sm"
          />
        )}
      </div>
    </div>
  );
}
