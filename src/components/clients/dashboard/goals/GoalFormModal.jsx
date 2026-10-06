import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, BookmarkPlus } from 'lucide-react';
import { db } from '@/api/supabaseClient';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import SaveTemplateModal from './SaveTemplateModal';

const GOAL_TYPES = [
  { key: 'numeric',   label: 'Numeric',   desc: 'Target a number with a unit (weight, steps, reps…)' },
  { key: 'nutrition', label: 'Nutrition', desc: 'Daily macro targets: calories, protein, carbs, fat' },
  { key: 'simple',    label: 'Simple',    desc: 'Named goal with a manual progress % (habits, lifestyle)' },
];

const EMPTY = {
  name: '', goal_type: 'numeric', notes: '', status: 'active',
  target_value: '', current_value: '', unit: '',
  progress_pct: 0,
  calories_target: '', protein_target: '', carbs_target: '', fat_target: '',
  calories_current: '', protein_current: '', carbs_current: '', fat_current: '',
};

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-muted-foreground mb-1">{label}</label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = 'text' }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-card outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
    />
  );
}

export default function GoalFormModal({ clientId, goal, prefilledTemplate, onSaved, onClose }) {
  const isEdit = !!goal?.id;
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);

  const { data: templates = [] } = useQuery({
    queryKey: ['goal-templates'],
    queryFn: () => db.entities.GoalTemplate.list('-created_date', 50),
  });

  useEffect(() => {
    if (goal) {
      setForm({
        name: goal.name || '',
        goal_type: goal.goal_type || 'numeric',
        notes: goal.notes || '',
        status: goal.status || 'active',
        target_value: goal.target_value ?? '',
        current_value: goal.current_value ?? '',
        unit: goal.unit || '',
        progress_pct: goal.progress_pct ?? 0,
        calories_target: goal.calories_target ?? '',
        protein_target: goal.protein_target ?? '',
        carbs_target: goal.carbs_target ?? '',
        fat_target: goal.fat_target ?? '',
        calories_current: goal.calories_current ?? '',
        protein_current: goal.protein_current ?? '',
        carbs_current: goal.carbs_current ?? '',
        fat_current: goal.fat_current ?? '',
      });
    } else if (prefilledTemplate) {
      // Apply template as starting point — current values left blank
      setForm({
        ...EMPTY,
        name: prefilledTemplate.name || '',
        goal_type: prefilledTemplate.goal_type || 'numeric',
        notes: prefilledTemplate.notes || '',
        target_value: prefilledTemplate.target_value ?? '',
        unit: prefilledTemplate.unit || '',
        calories_target: prefilledTemplate.calories_target ?? '',
        protein_target: prefilledTemplate.protein_target ?? '',
        carbs_target: prefilledTemplate.carbs_target ?? '',
        fat_target: prefilledTemplate.fat_target ?? '',
      });
    } else {
      setForm(EMPTY);
    }
  }, [goal, prefilledTemplate]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  // Apply a template to pre-fill the form (current values start blank)
  const applyTemplate = (tmplId) => {
    setSelectedTemplate(tmplId);
    const tmpl = templates.find(t => t.id === tmplId);
    if (!tmpl) return;
    setForm(f => ({
      ...f,
      name: tmpl.name,
      goal_type: tmpl.goal_type,
      notes: tmpl.notes || '',
      target_value: tmpl.target_value ?? '',
      unit: tmpl.unit || '',
      current_value: '',
      progress_pct: 0,
      calories_target: tmpl.calories_target ?? '',
      protein_target: tmpl.protein_target ?? '',
      carbs_target: tmpl.carbs_target ?? '',
      fat_target: tmpl.fat_target ?? '',
      calories_current: '',
      protein_current: '',
      carbs_current: '',
      fat_current: '',
    }));
    toast.success(`Template "${tmpl.name}" applied`);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Goal name is required'); return; }
    setSaving(true);
    const payload = {
      client_id: clientId,
      name: form.name.trim(),
      goal_type: form.goal_type,
      notes: form.notes || null,
      status: form.status,
    };
    if (form.goal_type === 'numeric') {
      payload.target_value  = form.target_value  !== '' ? Number(form.target_value)  : null;
      payload.current_value = form.current_value !== '' ? Number(form.current_value) : null;
      payload.unit = form.unit || null;
    }
    if (form.goal_type === 'simple') {
      payload.progress_pct = Number(form.progress_pct) || 0;
    }
    if (form.goal_type === 'nutrition') {
      payload.calories_target  = form.calories_target  !== '' ? Number(form.calories_target)  : null;
      payload.protein_target   = form.protein_target   !== '' ? Number(form.protein_target)   : null;
      payload.carbs_target     = form.carbs_target     !== '' ? Number(form.carbs_target)     : null;
      payload.fat_target       = form.fat_target       !== '' ? Number(form.fat_target)       : null;
      payload.calories_current = form.calories_current !== '' ? Number(form.calories_current) : null;
      payload.protein_current  = form.protein_current  !== '' ? Number(form.protein_current)  : null;
      payload.carbs_current    = form.carbs_current    !== '' ? Number(form.carbs_current)    : null;
      payload.fat_current      = form.fat_current      !== '' ? Number(form.fat_current)      : null;
    }

    if (isEdit) {
      await db.entities.Goal.update(goal.id, payload);
      toast.success('Goal updated');
    } else {
      await db.entities.Goal.create(payload);
      toast.success('Goal created');
    }
    setSaving(false);
    onSaved();
  };

  return (
    <>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative bg-card rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h3 className="text-base font-bold text-foreground">{isEdit ? 'Edit goal' : 'Add goal'}</h3>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-6 py-5 space-y-5">

            {/* Inline template dropdown */}
            {!isEdit && templates.length > 0 && (
              <Field label="Use a template">
                <select
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-card outline-none focus:ring-2 focus:ring-primary"
                  value={selectedTemplate}
                  onChange={e => applyTemplate(e.target.value)}
                >
                  <option value="">— Pick a template to pre-fill —</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.goal_type})</option>
                  ))}
                </select>
              </Field>
            )}

            {/* Goal type selector */}
            <Field label="Goal type">
              <div className="grid grid-cols-3 gap-2">
                {GOAL_TYPES.map(t => (
                  <button
                    key={t.key}
                    onClick={() => set('goal_type', t.key)}
                    className={`text-left p-3 rounded-xl border-2 transition-all ${
                      form.goal_type === t.key
                        ? 'border-primary bg-accent'
                        : 'border-border bg-muted hover:border-border'
                    }`}
                  >
                    <p className={`text-xs font-bold ${form.goal_type === t.key ? 'text-primary' : 'text-foreground'}`}>{t.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{t.desc}</p>
                  </button>
                ))}
              </div>
            </Field>

            {/* Name */}
            <Field label="Goal name">
              <TextInput value={form.name} onChange={v => set('name', v)} placeholder="e.g. Reach 175 lbs" />
            </Field>

            {/* ── Numeric fields ── */}
            {form.goal_type === 'numeric' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Target value">
                    <TextInput type="number" value={form.target_value} onChange={v => set('target_value', v)} placeholder="e.g. 175" />
                  </Field>
                  <Field label="Current value">
                    <TextInput type="number" value={form.current_value} onChange={v => set('current_value', v)} placeholder="e.g. 190" />
                  </Field>
                </div>
                <Field label="Unit">
                  <TextInput value={form.unit} onChange={v => set('unit', v)} placeholder="e.g. lbs, steps, km" />
                </Field>
              </div>
            )}

            {/* ── Nutrition fields ── */}
            {form.goal_type === 'nutrition' && (
              <div className="space-y-4">
                <p className="text-xs font-semibold text-muted-foreground">Daily targets</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Calories (kcal)">
                    <TextInput type="number" value={form.calories_target} onChange={v => set('calories_target', v)} placeholder="e.g. 2200" />
                  </Field>
                  <Field label="Protein (g)">
                    <TextInput type="number" value={form.protein_target} onChange={v => set('protein_target', v)} placeholder="e.g. 180" />
                  </Field>
                  <Field label="Carbs (g)">
                    <TextInput type="number" value={form.carbs_target} onChange={v => set('carbs_target', v)} placeholder="e.g. 220" />
                  </Field>
                  <Field label="Fat (g)">
                    <TextInput type="number" value={form.fat_target} onChange={v => set('fat_target', v)} placeholder="e.g. 70" />
                  </Field>
                </div>
                <p className="text-xs font-semibold text-muted-foreground">Current actuals (today)</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Calories (kcal)">
                    <TextInput type="number" value={form.calories_current} onChange={v => set('calories_current', v)} placeholder="e.g. 1800" />
                  </Field>
                  <Field label="Protein (g)">
                    <TextInput type="number" value={form.protein_current} onChange={v => set('protein_current', v)} placeholder="e.g. 140" />
                  </Field>
                  <Field label="Carbs (g)">
                    <TextInput type="number" value={form.carbs_current} onChange={v => set('carbs_current', v)} placeholder="e.g. 180" />
                  </Field>
                  <Field label="Fat (g)">
                    <TextInput type="number" value={form.fat_current} onChange={v => set('fat_current', v)} placeholder="e.g. 55" />
                  </Field>
                </div>
              </div>
            )}

            {/* ── Simple fields ── */}
            {form.goal_type === 'simple' && (
              <Field label={`Progress: ${form.progress_pct}%`}>
                <input
                  type="range" min={0} max={100} step={1}
                  value={form.progress_pct}
                  onChange={e => set('progress_pct', Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </Field>
            )}

            {/* Notes */}
            <Field label="Notes (optional)">
              <textarea
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="Any additional context…"
                rows={2}
                className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-card outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </Field>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-border">
            {/* Save as template (left side) */}
            <button
              onClick={() => setShowSaveTemplate(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary px-3 py-2 rounded-lg border border-border hover:border-primary transition-colors"
              title="Save current settings as a reusable template"
            >
              <BookmarkPlus className="w-3.5 h-3.5" />
              Save as Template
            </button>

            <div className="flex items-center gap-2">
              <button onClick={onClose} className="text-sm font-semibold text-muted-foreground hover:text-foreground px-4 py-2 rounded-lg border border-border bg-card">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="text-sm font-semibold text-primary-foreground px-5 py-2 rounded-lg bg-primary hover:bg-primary disabled:opacity-50"
              >
                {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add goal'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Save-as-template overlay — portalled to body */}
      {showSaveTemplate && ReactDOM.createPortal(
        <SaveTemplateModal
          form={form}
          onSaved={() => { setShowSaveTemplate(false); toast.success('Saved to your template library'); }}
          onClose={() => setShowSaveTemplate(false)}
        />,
        document.body
      )}
    </>
  );
}