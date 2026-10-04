import React, { useState } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import { db } from '@/api/supabaseClient';
import { toast } from 'sonner';
import { differenceInYears, parseISO } from 'date-fns';

const SEX_LABELS = {
  male: 'Male',
  female: 'Female',
  other: 'Other',
  prefer_not_to_say: 'Prefer not to say',
};

function calcAge(dob) {
  if (!dob) return null;
  try {
    return differenceInYears(new Date(), parseISO(dob));
  } catch {
    return null;
  }
}

/**
 * An inline-editable card showing the client's baseline body metrics:
 * height, current weight, starting weight, target weight, sex, date of birth.
 * Stored directly on the Client entity — changes are saved immediately on confirm.
 */
export default function MetricsCard({ client, onUpdated }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({});

  const startEdit = () => {
    setDraft({
      height: client.height || '',
      current_weight: client.current_weight ?? '',
      starting_weight: client.starting_weight ?? '',
      target_weight: client.target_weight ?? '',
      sex: client.sex || '',
      date_of_birth: client.date_of_birth || '',
    });
    setEditing(true);
  };

  const cancel = () => { setEditing(false); setDraft({}); };

  const save = async () => {
    setSaving(true);
    const patch = {
      height: draft.height || null,
      current_weight: draft.current_weight !== '' ? Number(draft.current_weight) : null,
      starting_weight: draft.starting_weight !== '' ? Number(draft.starting_weight) : null,
      target_weight: draft.target_weight !== '' ? Number(draft.target_weight) : null,
      sex: draft.sex || null,
      date_of_birth: draft.date_of_birth || null,
    };
    // Remove nulls to avoid overwriting with null if field is intentionally kept empty
    Object.keys(patch).forEach(k => { if (patch[k] === null) delete patch[k]; });
    await db.entities.Client.update(client.id, patch);
    toast.success('Metrics saved');
    setSaving(false);
    setEditing(false);
    onUpdated?.();
  };

  const age = calcAge(client.date_of_birth);

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-4">
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-0.5 h-3.5 rounded-full bg-primary" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Body Metrics</p>
        </div>
        {!editing && (
          <button
            onClick={startEdit}
            className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary transition-colors px-2.5 py-1 rounded-lg bg-accent hover:bg-accent"
          >
            <Pencil className="w-3 h-3" /> Edit Metrics
          </button>
        )}
      </div>

      {editing ? (
        <div className="bg-accent rounded-xl p-4 border border-accent">
          <div className="grid grid-cols-2 gap-3">
            <MetricInput label="Height" placeholder="e.g. 5'10&quot; or 178cm"
              value={draft.height} onChange={v => setDraft(d => ({ ...d, height: v }))} type="text" />
            <MetricInput label="Current weight (lbs)" placeholder="e.g. 185"
              value={draft.current_weight} onChange={v => setDraft(d => ({ ...d, current_weight: v }))} type="number" />
            <MetricInput label="Starting weight (lbs)" placeholder="e.g. 200"
              value={draft.starting_weight} onChange={v => setDraft(d => ({ ...d, starting_weight: v }))} type="number" />
            <MetricInput label="Target weight (lbs)" placeholder="e.g. 175"
              value={draft.target_weight} onChange={v => setDraft(d => ({ ...d, target_weight: v }))} type="number" />
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Sex</label>
              <select
                value={draft.sex}
                onChange={e => setDraft(d => ({ ...d, sex: e.target.value }))}
                className="w-full text-xs border border-border rounded-lg px-2.5 py-2 bg-card outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">— select —</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>
            <MetricInput label="Date of birth" placeholder=""
              value={draft.date_of_birth} onChange={v => setDraft(d => ({ ...d, date_of_birth: v }))} type="date" />
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-1.5 text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              <Check className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Metrics'}
            </button>
            <button onClick={cancel} disabled={saving}
              className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground px-4 py-2 rounded-lg border border-border bg-card transition-colors">
              <X className="w-4 h-4" /> Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          <MetricRow label="Height" value={client.height} />
          <MetricRow label="Current weight" value={client.current_weight ? `${client.current_weight} lbs` : null} />
          <MetricRow label="Starting weight" value={client.starting_weight ? `${client.starting_weight} lbs` : null} />
          <MetricRow label="Target weight" value={client.target_weight ? `${client.target_weight} lbs` : null} />
          <MetricRow label="Sex" value={SEX_LABELS[client.sex] || null} />
          <MetricRow
            label="Date of birth"
            value={client.date_of_birth
              ? `${client.date_of_birth}${age !== null ? ` (${age} yrs)` : ''}`
              : null}
          />
        </div>
      )}
    </div>
  );
}

function MetricRow({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5 py-1">
      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className="text-sm font-semibold text-foreground">{value ?? <span className="text-border font-normal">—</span>}</span>
    </div>
  );
}

function MetricInput({ label, value, onChange, type, placeholder }) {
  return (
    <div>
      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-card outline-none focus:ring-1 focus:ring-primary"
      />
    </div>
  );
}