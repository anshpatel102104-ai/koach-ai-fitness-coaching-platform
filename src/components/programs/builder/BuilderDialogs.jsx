import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Search } from 'lucide-react';
import { db } from '@/api/supabaseClient';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Initials, Segmented } from '@/components/kit';

const EQUIPMENT_OPTIONS = ['No Equipment', 'Dumbbells', 'Barbell', 'Cables', 'Machines', 'Full Gym', 'Resistance Bands', 'Kettlebells'];
const DIFFICULTIES = ['beginner', 'intermediate', 'advanced', 'elite'];
const CATEGORIES = ['strength', 'hypertrophy', 'fat_loss', 'athletic', 'mobility', 'custom'];
const SESSION_LENGTHS = ['30', '45', '60', '75', '90+'];

const cap = (s = '') => {
  const t = s.replace(/_/g, ' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
};

function FieldLabel({ children }) {
  return <p className="mb-1.5 text-[13px] text-muted-foreground">{children}</p>;
}

function Stepper({ label, value, min = 1, max = 99, onChange, unit }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex h-10 items-center overflow-hidden rounded-md border border-input bg-card">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))}
          className="touch-compact flex h-full w-10 flex-shrink-0 items-center justify-center border-r border-input text-base text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label={`Fewer ${label.toLowerCase()}`}>−</button>
        <span className="flex-1 text-center text-sm font-semibold tabular-nums text-foreground">{value}{unit ? ` ${unit}` : ''}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))}
          className="touch-compact flex h-full w-10 flex-shrink-0 items-center justify-center border-l border-input text-base text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label={`More ${label.toLowerCase()}`}>+</button>
      </div>
    </div>
  );
}

/* ── Program settings ─────────────────────────────────────────────────────── */

export function SettingsModal({ open, onClose, meta, onMetaChange }) {
  // Local draft so changes only persist on Save
  const [draft, setDraft] = useState(meta);
  useEffect(() => { if (open) setDraft(meta); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const u = (k, v) => setDraft(d => ({ ...d, [k]: v }));
  const toggleEquip = (eq) => {
    const list = draft.equipment || [];
    u('equipment', list.includes(eq) ? list.filter(e => e !== eq) : [...list, eq]);
  };
  const handleSave = () => { onMetaChange(draft); onClose(); };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="flex flex-col gap-0 overflow-hidden p-0 sm:max-w-lg sm:p-0 sm:flex">
        <div className="px-5 pt-5 pb-3 sm:px-6 sm:pt-6">
          <DialogTitle className="text-[22px]">Program settings</DialogTitle>
          <DialogDescription className="mt-1">Length, level and what equipment the client has.</DialogDescription>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 pb-5 sm:max-h-[60vh] sm:px-6">
          <div>
            <FieldLabel>Description</FieldLabel>
            <textarea
              rows={2}
              value={draft.description || ''}
              onChange={e => u('description', e.target.value)}
              placeholder="Who it's for and how it progresses"
              className="w-full resize-none rounded-md border border-input bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Stepper label="Weeks" value={Number(draft.duration_weeks)} min={1} max={52} onChange={v => u('duration_weeks', v)} />
            <Stepper label="Days a week" value={Number(draft.days_per_week)} min={1} max={7} onChange={v => u('days_per_week', v)} />
          </div>

          <div>
            <FieldLabel>Level</FieldLabel>
            <Segmented
              size="sm"
              options={DIFFICULTIES.map(d => ({ value: d, label: cap(d) }))}
              value={draft.difficulty}
              onChange={v => u('difficulty', v)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Goal</FieldLabel>
              <Select value={draft.category} onValueChange={v => u('category', v)}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{cap(c)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <FieldLabel>Session length</FieldLabel>
              <Select value={draft.estimated_session_length || '60'} onValueChange={v => u('estimated_session_length', v)}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SESSION_LENGTHS.map(m => <SelectItem key={m} value={m}>{m} min</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <FieldLabel>Equipment</FieldLabel>
            <div className="flex flex-wrap gap-1.5">
              {EQUIPMENT_OPTIONS.map(eq => {
                const on = (draft.equipment || []).includes(eq);
                return (
                  <button
                    key={eq}
                    type="button"
                    onClick={() => toggleEquip(eq)}
                    aria-pressed={on}
                    className={cn(
                      'h-8 rounded-md px-3 text-[13px] font-medium transition-colors',
                      on ? 'bg-primary text-primary-foreground' : 'border border-input bg-card text-foreground hover:bg-accent'
                    )}
                  >
                    {eq}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Progression</FieldLabel>
              <Select value={draft.progression_model || 'linear'} onValueChange={v => u('progression_model', v)}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['linear', 'undulating', 'block'].map(m => <SelectItem key={m} value={m}>{cap(m)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <FieldLabel>Deload</FieldLabel>
              <Select value={draft.deload_frequency || 'never'} onValueChange={v => u('deload_frequency', v)}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['never', 'every_4_weeks', 'every_6_weeks', 'every_8_weeks'].map(f => <SelectItem key={f} value={f}>{cap(f)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <label className="flex cursor-pointer items-center gap-2.5">
            <Switch checked={!!draft.is_template} onCheckedChange={v => u('is_template', v)} />
            <span className="text-sm text-foreground">Save as a template</span>
          </label>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1 sm:flex-none">Cancel</Button>
            <Button onClick={handleSave} className="flex-1 sm:flex-none">Save settings</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Assign to a client ──────────────────────────────────────────────────── */

export function AssignClientModal({ open, onClose, programId, programTitle, initialClientId = null }) {
  const [selected, setSelected] = useState(null);
  const [done, setDone] = useState(false);
  const [query, setQuery] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => { if (open && initialClientId) setSelected(initialClientId); }, [open, initialClientId]);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'], queryFn: () => db.entities.Client.list(), enabled: open,
  });
  const assignMutation = useMutation({
    mutationFn: () => db.entities.Client.update(selected, { assigned_program_id: programId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['clients'] }); setDone(true); toast.success('Program assigned'); },
  });
  const handleClose = () => { setSelected(null); setDone(false); setQuery(''); onClose(); };

  const q = query.trim().toLowerCase();
  const visible = q ? clients.filter(c => c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q)) : clients;
  const selectedClient = clients.find(c => c.id === selected);

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="flex flex-col gap-0 overflow-hidden p-0 sm:max-w-md sm:p-0 sm:flex">
        <div className="px-5 pt-5 pb-3 sm:px-6 sm:pt-6">
          <DialogTitle className="text-[22px] pr-8">Assign {programTitle ? `“${programTitle}”` : 'program'}</DialogTitle>
          <DialogDescription className="mt-1">It replaces whatever program they're on now.</DialogDescription>
        </div>
        {done ? (
          <div className="px-5 pb-6 sm:px-6">
            <p className="text-[15px] font-semibold text-foreground">
              {selectedClient ? `${selectedClient.name} is on it now.` : 'Assigned.'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">They'll see it in their app the next time they open it.</p>
            <Button variant="outline" className="mt-4" onClick={handleClose}>Done</Button>
          </div>
        ) : (
          <>
            <div className="px-5 sm:px-6">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Name or email"
                  className="h-10 w-full rounded-lg bg-secondary pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div className="mt-2 max-h-72 overflow-y-auto px-3 sm:px-4">
              {visible.length === 0 && <p className="px-2 py-6 text-sm text-muted-foreground">No clients match.</p>}
              {visible.map(c => {
                const isSel = selected === c.id;
                const onThis = c.assigned_program_id && c.assigned_program_id === programId;
                return (
                  <button key={c.id} onClick={() => setSelected(c.id)}
                    className={cn('flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors', isSel ? 'bg-accent' : 'hover:bg-accent/60')}>
                    <Initials name={c.name} size={32} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold text-foreground">{c.name}</span>
                      <span className="block truncate text-[13px] text-muted-foreground">{onThis ? 'Already on this program' : c.email}</span>
                    </span>
                    {isSel && <Check className="h-4 w-4 flex-shrink-0 text-foreground" />}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2 border-t border-border px-5 py-4 sm:px-6">
              <Button variant="outline" className="flex-1" onClick={handleClose}>Cancel</Button>
              <Button className="flex-1" disabled={!selected || assignMutation.isPending} onClick={() => assignMutation.mutate()}>
                {assignMutation.isPending ? 'Assigning…' : selectedClient ? `Assign to ${selectedClient.name.split(' ')[0]}` : 'Assign'}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
