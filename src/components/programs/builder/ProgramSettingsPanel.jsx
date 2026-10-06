import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const DIFFICULTY_STYLES = {
  beginner: { color: 'bg-success/10 text-success border-success' },
  intermediate: { color: 'bg-accent text-primary border-primary' },
  advanced: { color: 'bg-ai/10 text-ai border-ai' },
  elite: { color: 'bg-destructive/10 text-destructive border-destructive' },
};

const EQUIPMENT_OPTIONS = [
  'No Equipment',
  'Dumbbells',
  'Barbell',
  'Cables',
  'Machines',
  'Full Gym',
  'Resistance Bands',
  'Kettlebells',
];

export default function ProgramSettingsPanel({ meta, onMetaChange }) {
  const [expandAdvanced, setExpandAdvanced] = useState(false);

  const handleTagAdd = (tag) => {
    if (!tag.trim() || !meta.tags) return;
    const newTags = [...(meta.tags || []), tag.trim()];
    onMetaChange({ ...meta, tags: newTags });
  };

  const handleTagRemove = (idx) => {
    const newTags = (meta.tags || []).filter((_, i) => i !== idx);
    onMetaChange({ ...meta, tags: newTags });
  };

  const handleEquipmentToggle = (eq) => {
    const equipment = meta.equipment || [];
    const newEquipment = equipment.includes(eq)
      ? equipment.filter(e => e !== eq)
      : [...equipment, eq];
    onMetaChange({ ...meta, equipment: newEquipment });
  };

  return (
    <div className="space-y-3 overflow-y-auto flex-1">
      {/* Duration */}
      <div className="px-4 pt-4">
        <Label className="text-xs font-semibold text-muted-foreground">Duration (weeks)</Label>
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={() => onMetaChange({
              ...meta,
              duration_weeks: Math.max(1, Number(meta.duration_weeks) - 1),
            })}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors"
          >
            −
          </button>
          <input
            type="number"
            value={meta.duration_weeks}
            onChange={e => onMetaChange({ ...meta, duration_weeks: Number(e.target.value) || 1 })}
            className="flex-1 h-8 text-sm text-center border border-border bg-muted rounded-lg focus:outline-none focus:border-primary"
          />
          <button
            onClick={() => onMetaChange({
              ...meta,
              duration_weeks: Number(meta.duration_weeks) + 1,
            })}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors"
          >
            +
          </button>
          <span className="text-xs text-muted-foreground ml-2">weeks</span>
        </div>
      </div>

      {/* Difficulty */}
      <div className="px-4">
        <Label className="text-xs font-semibold text-muted-foreground">Difficulty</Label>
        <div className="flex gap-2 mt-2">
          {Object.entries(DIFFICULTY_STYLES).map(([diff, style]) => (
            <button
              key={diff}
              onClick={() => onMetaChange({ ...meta, difficulty: diff })}
              className={cn(
                'flex-1 px-2 py-2 rounded-lg text-xs font-semibold border-2 transition-all capitalize',
                meta.difficulty === diff
                  ? `${style.color} border-current`
                  : 'bg-muted text-muted-foreground border-border hover:border-muted-foreground'
              )}
            >
              {diff}
            </button>
          ))}
        </div>
      </div>

      {/* Category */}
      <div className="px-4">
        <Label className="text-xs font-semibold text-muted-foreground">Category</Label>
        <Select value={meta.category} onValueChange={v => onMetaChange({ ...meta, category: v })}>
          <SelectTrigger className="h-8 text-sm mt-2 border-border bg-muted">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {['Fat Loss', 'Strength', 'Hypertrophy', 'Endurance', 'Mobility', 'Athletic Performance', 'General Fitness', 'Custom'].map(c => (
              <SelectItem key={c.toLowerCase().replace(' ', '_')} value={c.toLowerCase().replace(' ', '_')}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Frequency */}
      <div className="px-4">
        <Label className="text-xs font-semibold text-muted-foreground">Sessions per Week</Label>
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={() => onMetaChange({
              ...meta,
              days_per_week: Math.max(1, Number(meta.days_per_week) - 1),
            })}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors"
          >
            −
          </button>
          <input
            type="number"
            value={meta.days_per_week}
            onChange={e => onMetaChange({ ...meta, days_per_week: Number(e.target.value) || 1 })}
            className="flex-1 h-8 text-sm text-center border border-border bg-muted rounded-lg focus:outline-none focus:border-primary"
          />
          <button
            onClick={() => onMetaChange({
              ...meta,
              days_per_week: Math.min(7, Number(meta.days_per_week) + 1),
            })}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors"
          >
            +
          </button>
        </div>
      </div>

      {/* Session Length */}
      <div className="px-4">
        <Label className="text-xs font-semibold text-muted-foreground">Est. Session Length</Label>
        <Select value={meta.estimated_session_length || '60'} onValueChange={v => onMetaChange({ ...meta, estimated_session_length: v })}>
          <SelectTrigger className="h-8 text-sm mt-2 border-border bg-muted">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {['30', '45', '60', '75', '90+'].map(m => (
              <SelectItem key={m} value={m}>{m} min</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Equipment */}
      <div className="px-4">
        <Label className="text-xs font-semibold text-muted-foreground mb-2 block">Equipment Needed</Label>
        <div className="flex flex-wrap gap-2">
          {EQUIPMENT_OPTIONS.map(eq => (
            <button
              key={eq}
              onClick={() => handleEquipmentToggle(eq)}
              className={cn(
                'px-2 py-1.5 rounded-lg text-xs font-medium transition-all border',
                (meta.equipment || []).includes(eq)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted text-muted-foreground border-border hover:border-muted-foreground'
              )}
            >
              {eq}
            </button>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div className="px-4">
        <Label className="text-xs font-semibold text-muted-foreground">Tags</Label>
        <div className="flex flex-wrap gap-2 mt-2 mb-2">
          {(meta.tags || []).map((tag, idx) => (
            <div key={idx} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-accent text-primary text-xs font-medium">
              {tag}
              <button onClick={() => handleTagRemove(idx)} className="hover:text-primary">×</button>
            </div>
          ))}
        </div>
        <input
          type="text"
          placeholder="Add tag and press Enter"
          onKeyDown={e => {
            if (e.key === 'Enter') {
              handleTagAdd(e.target.value);
              e.target.value = '';
            }
          }}
          className="w-full h-8 text-sm border border-border bg-muted rounded-lg px-2 focus:outline-none focus:border-primary"
        />
      </div>

      {/* Description */}
      <div className="px-4">
        <Label className="text-xs font-semibold text-muted-foreground">Description</Label>
        <Textarea
          value={meta.description || ''}
          onChange={e => onMetaChange({ ...meta, description: e.target.value })}
          rows={4}
          className="text-sm mt-2 resize-none border-border bg-muted"
          placeholder="Describe this program — goals, who it's for, what to expect, and any important notes..."
        />
      </div>

      {/* Advanced Settings */}
      <div className="px-4 border-t border-border mt-4">
        <button
          onClick={() => setExpandAdvanced(!expandAdvanced)}
          className="w-full flex items-center justify-between py-3 text-sm font-semibold text-foreground hover:text-primary transition-colors"
        >
          Advanced Settings
          {expandAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {expandAdvanced && (
          <div className="pb-4 space-y-3">
            {/* Progression Model */}
            <div>
              <Label className="text-xs font-semibold text-muted-foreground">Progression Model</Label>
              <Select value={meta.progression_model || 'linear'} onValueChange={v => onMetaChange({ ...meta, progression_model: v })}>
                <SelectTrigger className="h-8 text-sm mt-2 border-border bg-muted">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['Linear', 'Undulating', 'Block'].map(m => (
                    <SelectItem key={m.toLowerCase()} value={m.toLowerCase()}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Deload Frequency */}
            <div>
              <Label className="text-xs font-semibold text-muted-foreground">Deload Week Frequency</Label>
              <Select value={meta.deload_frequency || 'never'} onValueChange={v => onMetaChange({ ...meta, deload_frequency: v })}>
                <SelectTrigger className="h-8 text-sm mt-2 border-border bg-muted">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['Never', 'Every 4 weeks', 'Every 6 weeks', 'Every 8 weeks'].map(f => (
                    <SelectItem key={f.toLowerCase().replace(' ', '_')} value={f.toLowerCase().replace(' ', '_')}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Rest Day Notes */}
            <div>
              <Label className="text-xs font-semibold text-muted-foreground">Rest Day Recommendations</Label>
              <Textarea
                value={meta.rest_day_notes || ''}
                onChange={e => onMetaChange({ ...meta, rest_day_notes: e.target.value })}
                rows={3}
                className="text-sm mt-2 resize-none border-border bg-muted"
                placeholder="E.g., 'Active recovery — 20 min walk or yoga recommended'"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}