import React, { useState } from 'react';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Initials, Stat, KeyValue, Segmented } from '@/components/kit';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { KANBAN_STAGES, stageLabel } from './KanbanBoard';
import { toast } from 'sonner';
import {
  sourceLabel, money, safeDate, shortDate, lastContactLabel, isFollowUpOverdue,
  daysInStage, scoreTone, scoreText,
} from './leadMeta';

const ACTIVITY_TYPES = [
  { value: 'note', label: 'Note' },
  { value: 'call', label: 'Call' },
  { value: 'message', label: 'Message' },
  { value: 'meeting', label: 'Meeting' },
];
const ACTIVITY_LABEL = { note: 'Note', call: 'Call', stage_change: 'Stage change', message: 'Message', meeting: 'Meeting' };

function Section({ title, children, className }) {
  return (
    <section className={cn('py-5 border-t border-border', className)}>
      <p className="text-sm font-semibold text-foreground mb-3">{title}</p>
      {children}
    </section>
  );
}

export default function LeadDetailDrawer({ lead, open, onClose, onUpdate, onDelete }) {
  const [newNote, setNewNote] = useState('');
  const [activityType, setActivityType] = useState('note');
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpNote, setFollowUpNote] = useState('');

  if (!lead) return null;

  const score = lead.lead_score || 50;
  const days = daysInStage(lead);
  const added = shortDate(lead.created_date, 'MMM d, yyyy');
  const source = sourceLabel(lead.source);
  const followUpOverdue = isFollowUpOverdue(lead);
  const followUp = safeDate(lead.follow_up_date);

  const handleStageChange = (stage) => {
    onUpdate(lead.id, { stage, stage_changed_at: new Date().toISOString() });
    toast.success(`Moved to ${stageLabel(stage)}`);
  };

  const logActivity = () => {
    if (!newNote.trim()) return;
    const log = lead.activity_log || [];
    const entry = { type: activityType, note: newNote.trim(), date: new Date().toISOString() };
    onUpdate(lead.id, {
      activity_log: [entry, ...log],
      last_contact_date: new Date().toISOString(),
    });
    setNewNote('');
    toast.success('Activity logged');
  };

  const saveFollowUp = () => {
    if (!followUpDate) return;
    onUpdate(lead.id, { follow_up_date: followUpDate, follow_up_note: followUpNote });
    toast.success('Follow-up reminder set');
  };

  const convertToClient = () => {
    onUpdate(lead.id, { stage: 'closed_won', stage_changed_at: new Date().toISOString() });
    toast.success(`${lead.name} marked as won`);
    onClose();
  };

  const oneLine = [
    source ? `${source} lead` : 'Lead',
    added ? `added ${added}` : null,
  ].filter(Boolean).join(', ') + `. ${lastContactLabel(lead)}.`;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 overflow-y-auto">
        <div className="px-6 pt-8 pb-2">
          <p className="text-sm font-medium text-muted-foreground mb-4">{stageLabel(lead.stage)}{days !== null ? `, day ${days}` : ''}</p>
          <Initials name={lead.name} size={64} tone="ink" />
          <SheetTitle asChild>
            <h2 className="text-[32px] leading-tight text-foreground mt-4">{lead.name}</h2>
          </SheetTitle>
          <SheetDescription className="text-[15px] text-muted-foreground mt-1.5">{oneLine}</SheetDescription>

          <div className="grid grid-cols-2 gap-2 mt-5">
            <Select value={lead.stage} onValueChange={handleStageChange}>
              <SelectTrigger className="h-11" aria-label="Move stage">
                <SelectValue placeholder="Move stage" />
              </SelectTrigger>
              <SelectContent>
                {KANBAN_STAGES.map(s => (
                  <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {lead.stage !== 'closed_won' ? (
              <Button className="h-11" onClick={convertToClient}>Mark as won</Button>
            ) : (
              <Button className="h-11" variant="outline" disabled>Won</Button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-4 mt-6">
            <Stat size="sm" label="Value" value={lead.deal_value > 0 ? `${money(lead.deal_value)}/mo` : '—'} />
            <Stat size="sm" label="Lead score" value={score} tone={scoreTone(score)} sub={scoreText(score)} />
            <Stat size="sm" label="Last contact" value={shortDate(lead.last_contact_date) || '—'} />
            <Stat size="sm" label="Follow-up" value={followUp ? format(followUp, 'MMM d') : '—'} tone={followUpOverdue ? 'danger' : undefined} sub={followUpOverdue ? 'Overdue' : undefined} />
          </div>
        </div>

        <div className="px-6 pb-8">
          {(lead.email || lead.phone || lead.instagram || lead.location) && (
            <Section title="Contact" className="mt-5">
              {lead.email && <KeyValue label="Email" value={<a href={`mailto:${lead.email}`} className="underline underline-offset-4 decoration-1">{lead.email}</a>} />}
              {lead.phone && <KeyValue label="Phone" value={lead.phone} />}
              {lead.instagram && <KeyValue label="Instagram" value={`@${lead.instagram.replace(/^@/, '')}`} />}
              {lead.location && <KeyValue label="Location" value={lead.location} />}
            </Section>
          )}

          {(lead.goal || lead.notes || lead.pinned_note) && (
            <Section title="Notes">
              {lead.pinned_note && (
                <p className="text-sm text-foreground bg-warning-soft rounded-lg px-3 py-2.5 mb-3">
                  <span className="font-semibold">Pinned:</span> {lead.pinned_note}
                </p>
              )}
              {lead.goal && <p className="text-[15px] text-foreground"><span className="font-semibold">Goal:</span> {lead.goal}</p>}
              {lead.notes && <p className="text-[15px] text-foreground/90 leading-relaxed mt-2">{lead.notes}</p>}
            </Section>
          )}

          <Section title="Follow-up reminder">
            {followUp && (
              <p className={cn('text-sm mb-3', followUpOverdue ? 'text-destructive font-semibold' : 'text-foreground')}>
                {followUpOverdue ? 'Overdue since ' : 'Scheduled for '}
                {format(followUp, 'MMM d, yyyy, h:mm a')}
                {lead.follow_up_note && <span className="text-muted-foreground font-normal">. {lead.follow_up_note}</span>}
              </p>
            )}
            <div className="flex gap-2">
              <Input type="datetime-local" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} className="flex-1" aria-label="Follow-up date" />
              <Button variant="outline" onClick={saveFollowUp} disabled={!followUpDate}>Set</Button>
            </div>
            <Input className="mt-2" placeholder="What to follow up on" value={followUpNote} onChange={e => setFollowUpNote(e.target.value)} />
          </Section>

          <Section title="Log activity">
            <Segmented size="sm" options={ACTIVITY_TYPES} value={activityType} onChange={setActivityType} className="mb-3" />
            <Textarea
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              placeholder="What happened?"
              rows={3}
            />
            <Button onClick={logActivity} disabled={!newNote.trim()} className="mt-2 w-full">Log {activityType}</Button>
          </Section>

          {lead.activity_log?.length > 0 && (
            <Section title="Activity">
              <ol className="divide-y divide-border">
                {lead.activity_log.map((entry, i) => (
                  <li key={i} className="py-3 grid grid-cols-[88px_1fr] gap-3">
                    <div>
                      <p className="text-[13px] font-semibold text-foreground">{ACTIVITY_LABEL[entry.type] || 'Note'}</p>
                      <p className="text-[13px] text-muted-foreground">{shortDate(entry.date, 'MMM d, h:mm a') || ''}</p>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">{entry.note}</p>
                  </li>
                ))}
              </ol>
            </Section>
          )}

          <div className="pt-5 border-t border-border">
            <button
              onClick={() => { onDelete(lead.id); onClose(); }}
              className="text-sm font-semibold text-destructive underline underline-offset-4 decoration-1 hover:decoration-2"
            >
              Delete lead
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
