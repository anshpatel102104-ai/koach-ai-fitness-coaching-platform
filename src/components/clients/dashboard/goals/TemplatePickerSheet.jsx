import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { X, Search, LayoutTemplate } from 'lucide-react';

const TYPE_META = {
  numeric:   { label: 'Numeric',   color: 'var(--tc-foreground)', bg: 'var(--tc-muted)' },
  nutrition: { label: 'Nutrition', color: 'var(--tc-foreground)', bg: 'var(--tc-muted)' },
  simple:    { label: 'Simple',    color: 'var(--tc-foreground)', bg: 'var(--tc-muted)' },
};

// ── Built-in starter templates ────────────────────────────────────────────────
// These are read-only defaults available to every coach. They are stored purely
// in code — applying one pre-fills a new goal form but never writes to the DB.
const BUILT_IN_TEMPLATES = [
  // Numeric
  {
    id: '__builtin_lose_weight',
    _builtin: true,
    name: 'Lose Weight',
    goal_type: 'numeric',
    target_value: 175,
    unit: 'lbs',
    notes: 'Track body weight progress toward target.',
  },
  {
    id: '__builtin_steps',
    _builtin: true,
    name: '10,000 Steps Daily',
    goal_type: 'numeric',
    target_value: 10000,
    unit: 'steps/day',
    notes: 'Hit 10k steps every day as a baseline activity goal.',
  },
  {
    id: '__builtin_water',
    _builtin: true,
    name: 'Drink Water Daily',
    goal_type: 'numeric',
    target_value: 3,
    unit: 'litres/day',
    notes: 'Stay hydrated — aim for 3 litres of water per day.',
  },
  {
    id: '__builtin_bodyfat',
    _builtin: true,
    name: 'Reduce Body Fat %',
    goal_type: 'numeric',
    target_value: 15,
    unit: '% body fat',
    notes: 'Measure and track body fat percentage toward target.',
  },
  {
    id: '__builtin_muscle',
    _builtin: true,
    name: 'Gain Lean Muscle',
    goal_type: 'numeric',
    target_value: 185,
    unit: 'lbs',
    notes: 'Increase lean body weight through progressive overload.',
  },
  // Nutrition
  {
    id: '__builtin_fat_loss_macros',
    _builtin: true,
    name: 'Fat Loss Macros',
    goal_type: 'nutrition',
    calories_target: 1800,
    protein_target: 160,
    carbs_target: 150,
    fat_target: 60,
    notes: 'Moderate calorie deficit with high protein to preserve muscle.',
  },
  {
    id: '__builtin_muscle_gain_macros',
    _builtin: true,
    name: 'Muscle Gain Macros',
    goal_type: 'nutrition',
    calories_target: 2800,
    protein_target: 200,
    carbs_target: 300,
    fat_target: 80,
    notes: 'Calorie surplus focused on muscle growth.',
  },
  {
    id: '__builtin_maintenance_macros',
    _builtin: true,
    name: 'Maintenance Macros',
    goal_type: 'nutrition',
    calories_target: 2200,
    protein_target: 160,
    carbs_target: 220,
    fat_target: 75,
    notes: 'Balanced macros to maintain current weight and composition.',
  },
  // Simple
  {
    id: '__builtin_sleep',
    _builtin: true,
    name: 'Sleep 8 Hours',
    goal_type: 'simple',
    notes: 'Prioritise 8 hours of quality sleep every night.',
  },
  {
    id: '__builtin_vitamins',
    _builtin: true,
    name: 'Daily Vitamins',
    goal_type: 'simple',
    notes: 'Take daily vitamins/supplements consistently.',
  },
  {
    id: '__builtin_stress',
    _builtin: true,
    name: 'Manage Stress',
    goal_type: 'simple',
    notes: 'Practice stress-reduction habits (meditation, journalling, etc.).',
  },
];

function TemplateRow({ t, onSelect }) {
  const meta = TYPE_META[t.goal_type] || TYPE_META.simple;
  const preview = t.goal_type === 'numeric' && t.target_value
    ? `Target: ${t.target_value} ${t.unit || ''}`
    : t.goal_type === 'nutrition' && t.calories_target
    ? `${t.calories_target} kcal · ${t.protein_target ?? 0}g P · ${t.carbs_target ?? 0}g C · ${t.fat_target ?? 0}g F`
    : t.notes || '';

  return (
    <button
      onClick={() => onSelect(t)}
      className="w-full text-left p-3.5 rounded-lg border border-border bg-card transition-colors hover:bg-accent/60"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {t._builtin && <span className="text-[11px] text-muted-foreground flex-shrink-0">Starter</span>}
          <p className="text-sm font-semibold text-foreground truncate">{t.name}</p>
        </div>
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
      </div>
      {preview && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{preview}</p>}
    </button>
  );
}

export default function TemplatePickerSheet({ onSelect, onClose }) {
  const [search, setSearch] = useState('');

  const { data: savedTemplates = [], isLoading } = useQuery({
    queryKey: ['goal-templates'],
    queryFn: () => db.entities.GoalTemplate.list(),
  });

  const q = search.toLowerCase();

  const filteredBuiltin = BUILT_IN_TEMPLATES.filter(t => t.name.toLowerCase().includes(q));
  const filteredSaved   = savedTemplates.filter(t => t.name.toLowerCase().includes(q));
  const totalFiltered   = filteredBuiltin.length + filteredSaved.length;

  return (
    <div className="fixed inset-0 z-[210] flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative bg-card w-full sm:max-w-md rounded-t-2xl sm:rounded-xl flex flex-col"
        style={{ maxHeight: '82vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <LayoutTemplate className="w-4 h-4 text-primary" />
            <h3 className="text-[18px] text-foreground">Choose a template</h3>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-border flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search templates…"
              className="w-full text-sm pl-8 pr-3 py-2 bg-muted border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4">
          {isLoading && <p className="text-xs text-muted-foreground text-center py-6">Loading…</p>}

          {!isLoading && totalFiltered === 0 && (
            <div className="text-center py-10">
              <LayoutTemplate className="w-8 h-8 text-border mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No templates match your search.</p>
            </div>
          )}

          {/* Built-in starter templates */}
          {!isLoading && filteredBuiltin.length > 0 && (
            <div className="space-y-2">
              <p className="text-[13px] text-muted-foreground">Starter templates</p>
              {filteredBuiltin.map(t => <TemplateRow key={t.id} t={t} onSelect={onSelect} />)}
            </div>
          )}

          {/* Coach-saved templates */}
          {!isLoading && filteredSaved.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <LayoutTemplate className="w-3 h-3 text-primary" />
                <p className="text-xs font-semibold text-muted-foreground">My templates</p>
              </div>
              {filteredSaved.map(t => <TemplateRow key={t.id} t={t} onSelect={onSelect} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}