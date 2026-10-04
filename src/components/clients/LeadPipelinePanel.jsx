import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { CalendarClock, MessageCircle, PhoneCall, Send, FileText, Save } from 'lucide-react';
import { format } from 'date-fns';

const PIPELINE_STAGES = [
  { key: 'new_lead', label: 'New Lead', color: 'bg-muted text-muted-foreground border-border' },
  { key: 'dmd', label: "DM'd", color: 'bg-accent text-primary border-accent', icon: MessageCircle },
  { key: 'call_booked', label: 'Call Booked', color: 'bg-warning/10 text-warning border-warning', icon: PhoneCall },
  { key: 'proposal_sent', label: 'Proposal Sent', color: 'bg-ai/10 text-ai border-ai', icon: Send },
  { key: 'closed', label: 'Closed 🎉', color: 'bg-success/10 text-success border-success' },
  { key: 'lost', label: 'Lost', color: 'bg-destructive/10 text-destructive border-destructive' },
];

export default function LeadPipelinePanel({ client, onUpdate }) {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState(client.lifecycle_notes || '');
  const [followUp, setFollowUp] = useState(client.follow_up_date || '');
  const [stage, setStage] = useState(client.pipeline_stage || 'new_lead');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await db.entities.Client.update(client.id, {
      lifecycle_notes: notes,
      follow_up_date: followUp,
      pipeline_stage: stage,
    });
    queryClient.invalidateQueries({ queryKey: ['clients'] });
    setSaving(false);
    toast.success('Lead updated');
    onUpdate && onUpdate();
  };

  const currentStage = PIPELINE_STAGES.find(s => s.key === stage) || PIPELINE_STAGES[0];
  const isOverdue = followUp && new Date(followUp) < new Date();

  return (
    <div className="space-y-4">
      {/* Pipeline stage selector */}
      <div>
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Pipeline Stage</Label>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {PIPELINE_STAGES.map(s => (
            <button
              key={s.key}
              onClick={() => setStage(s.key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all',
                stage === s.key ? s.color : 'bg-card text-muted-foreground border-border hover:border-muted-foreground'
              )}
            >
              {s.icon && <s.icon className="w-3 h-3" />}
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Follow-up date */}
      <div>
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block flex items-center gap-1.5">
          <CalendarClock className="w-3 h-3" /> Follow-up Reminder
        </Label>
        <Input
          type="date"
          value={followUp}
          onChange={e => setFollowUp(e.target.value)}
          className={cn('h-9 text-sm', isOverdue ? 'border-destructive text-destructive focus-visible:ring-destructive' : '')}
        />
        {isOverdue && (
          <p className="text-xs text-destructive mt-1 flex items-center gap-1">⚠️ Follow-up overdue since {format(new Date(followUp), 'MMM d')}</p>
        )}
        {followUp && !isOverdue && (
          <p className="text-xs text-muted-foreground mt-1">Scheduled for {format(new Date(followUp), 'EEEE, MMM d, yyyy')}</p>
        )}
      </div>

      {/* Notes */}
      <div>
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block flex items-center gap-1.5">
          <FileText className="w-3 h-3" /> CRM Notes
        </Label>
        <Textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Add notes about this lead: source, interests, objections, what they said on the call..."
          rows={4}
          className="text-sm"
        />
      </div>

      <Button onClick={save} disabled={saving} className="w-full gap-2">
        <Save className="w-3.5 h-3.5" />
        {saving ? 'Saving…' : 'Save Lead Info'}
      </Button>
    </div>
  );
}