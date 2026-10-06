import React, { useState } from 'react';
import { Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const TIMING_OPTIONS = ['Morning', 'Pre-Workout', 'Post-Workout', 'With Meals', 'Night'];
const PURPOSE_OPTIONS = ['General Health', 'Fat Loss', 'Muscle / Recovery', 'Energy', 'Sleep', 'Immunity', 'Hormonal'];

const CATEGORY_CONFIG = {
  supplement: { label: 'Supplements', color: 'bg-secondary text-foreground border-border' },
  vitamin:    { label: 'Vitamins',     color: 'bg-secondary text-foreground border-border' },
  mineral:    { label: 'Minerals',     color: 'bg-secondary text-foreground border-border' },
};

const QUICK_ADDS = [
  { name: 'Whey Protein',    category: 'supplement', dosage: '1 scoop (25–30g)', timing: 'Post-Workout', purpose: 'Muscle / Recovery' },
  { name: 'Creatine',        category: 'supplement', dosage: '5g',               timing: 'Post-Workout', purpose: 'Muscle / Recovery' },
  { name: 'Omega-3',         category: 'supplement', dosage: '1–2g',             timing: 'Morning',      purpose: 'General Health' },
  { name: 'Vitamin D3',      category: 'vitamin',    dosage: '2000–5000 IU',     timing: 'Morning',      purpose: 'Immunity' },
  { name: 'Vitamin C',       category: 'vitamin',    dosage: '500–1000mg',       timing: 'Morning',      purpose: 'Immunity' },
  { name: 'B-Complex',       category: 'vitamin',    dosage: '1 capsule',        timing: 'Morning',      purpose: 'Energy' },
  { name: 'Magnesium',       category: 'mineral',    dosage: '200–400mg',        timing: 'Night',        purpose: 'Sleep' },
  { name: 'Zinc',            category: 'mineral',    dosage: '15–30mg',          timing: 'Night',        purpose: 'Hormonal' },
  { name: 'Caffeine / Pre',  category: 'supplement', dosage: '100–200mg',        timing: 'Pre-Workout',  purpose: 'Energy' },
];

function SupplementRow({ item, onChange, onRemove }) {
  const catConfig = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.supplement;
  return (
    <div className="grid grid-cols-12 gap-2 items-center py-2 border-b border-border last:border-0">
      <div className="col-span-3">
        <Input
          className="h-8 text-sm"
          placeholder="Name"
          value={item.name || ''}
          onChange={e => onChange('name', e.target.value)}
        />
      </div>
      <div className="col-span-2">
        <Input
          className="h-8 text-xs"
          placeholder="Dosage"
          value={item.dosage || ''}
          onChange={e => onChange('dosage', e.target.value)}
        />
      </div>
      <div className="col-span-3">
        <select
          value={item.timing || ''}
          onChange={e => onChange('timing', e.target.value)}
          className="h-8 w-full rounded-md border border-input bg-card px-2 text-xs"
        >
          <option value="">Timing…</option>
          {TIMING_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div className="col-span-3">
        <select
          value={item.purpose || ''}
          onChange={e => onChange('purpose', e.target.value)}
          className="h-8 w-full rounded-md border border-input bg-card px-2 text-xs"
        >
          <option value="">Purpose…</option>
          {PURPOSE_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <div className="col-span-1 flex justify-end">
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onRemove}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default function SupplementPanel({ value = [], onChange }) {
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');

  const addItem = (preset = {}) => {
    onChange([...value, { name: '', category: 'supplement', dosage: '', timing: '', purpose: '', ...preset }]);
    setOpen(true);
  };

  const updateItem = (idx, field, val) => {
    onChange(value.map((item, i) => i !== idx ? item : { ...item, [field]: val }));
  };

  const removeItem = (idx) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  const grouped = { supplement: [], vitamin: [], mineral: [] };
  value.forEach((item, idx) => {
    const cat = grouped[item.category] ? item.category : 'supplement';
    grouped[cat].push({ ...item, _idx: idx });
  });

  const totalCount = value.length;

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card">
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">Supplements and vitamins</span>
          {totalCount > 0 && (
            <span className="text-xs bg-secondary text-foreground px-1.5 py-0.5 rounded-full font-medium">
              {totalCount} assigned
            </span>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t border-border">
          {/* Quick-add presets */}
          <div className="px-4 pt-3 pb-2">
            <p className="text-[11px] text-muted-foreground font-medium mb-2">Quick Add</p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_ADDS.map(q => (
                <button
                  key={q.name}
                  type="button"
                  onClick={() => addItem(q)}
                  className={cn(
                    'text-[11px] px-2 py-1 rounded-lg border font-medium transition-all hover:opacity-80',
                    CATEGORY_CONFIG[q.category].color
                  )}
                >
                  + {q.name}
                </button>
              ))}
              <button
                type="button"
                onClick={() => addItem()}
                className="text-[11px] px-2 py-1 rounded-lg border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all"
              >
                + Custom
              </button>
            </div>
          </div>

          {/* Items by category */}
          {totalCount > 0 && (
            <div className="px-4 pb-4 space-y-3">
              {/* Column headers */}
              <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground px-0 pt-1">
                <div className="col-span-3">Name</div>
                <div className="col-span-2">Dosage</div>
                <div className="col-span-3">Timing</div>
                <div className="col-span-3">Purpose</div>
              </div>

              {Object.entries(grouped).map(([cat, items]) => {
                if (items.length === 0) return null;
                const config = CATEGORY_CONFIG[cat];
                return (
                  <div key={cat}>
                    <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full border inline-block mb-1', config.color)}>
                      {config.label}
                    </span>
                    {items.map(item => (
                      <SupplementRow
                        key={item._idx}
                        item={item}
                        onChange={(field, val) => updateItem(item._idx, field, val)}
                        onRemove={() => removeItem(item._idx)}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          {totalCount === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4 pb-5">No supplements assigned yet. Use Quick Add above.</p>
          )}
        </div>
      )}
    </div>
  );
}