import React, { useState } from 'react';
import { X, LayoutTemplate } from 'lucide-react';
import { db } from '@/api/supabaseClient';
import { toast } from 'sonner';

/**
 * Saves the current form values as a new GoalTemplate.
 * `form`  — the current goal form state (from GoalFormModal)
 * `onSaved` — called after successful save
 * `onClose` — close without saving
 */
export default function SaveTemplateModal({ form, onSaved, onClose }) {
  const [templateName, setTemplateName] = useState(form.name || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!templateName.trim()) { toast.error('Template name is required'); return; }
    setSaving(true);
    const payload = {
      coach_id: 'me',
      name: templateName.trim(),
      goal_type: form.goal_type,
      notes: form.notes || null,
    };
    if (form.goal_type === 'numeric') {
      payload.target_value = form.target_value !== '' ? Number(form.target_value) : null;
      payload.unit = form.unit || null;
    }
    if (form.goal_type === 'nutrition') {
      payload.calories_target = form.calories_target !== '' ? Number(form.calories_target) : null;
      payload.protein_target  = form.protein_target  !== '' ? Number(form.protein_target)  : null;
      payload.carbs_target    = form.carbs_target    !== '' ? Number(form.carbs_target)    : null;
      payload.fat_target      = form.fat_target      !== '' ? Number(form.fat_target)      : null;
    }
    await db.entities.GoalTemplate.create(payload);
    toast.success('Template saved!');
    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <LayoutTemplate className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">Save as Template</h3>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground mb-4">Give this template a name. It will be saved to your library and can be applied to any client.</p>
        <input
          type="text"
          value={templateName}
          onChange={e => setTemplateName(e.target.value)}
          placeholder="e.g. Weight Loss — 175 lbs"
          autoFocus
          className="w-full text-sm border border-border rounded-lg px-3 py-2.5 bg-card outline-none focus:ring-2 focus:ring-primary mb-4"
          onKeyDown={e => e.key === 'Enter' && handleSave()}
        />
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="text-sm font-semibold text-muted-foreground px-4 py-2 rounded-lg border border-border">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary px-4 py-2 rounded-lg disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Template'}
          </button>
        </div>
      </div>
    </div>
  );
}