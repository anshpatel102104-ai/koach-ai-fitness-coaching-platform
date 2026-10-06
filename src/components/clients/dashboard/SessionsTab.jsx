import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import CalendlyBookingWidget from './CalendlyBookingWidget';
import { format } from 'date-fns';
import { Video, Copy, FileText, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const STATUS_CONFIG = {
  scheduled:  { label: 'Upcoming',   className: 'bg-accent text-primary border-accent' },
  completed:  { label: 'Completed',  className: 'bg-success/10 text-success border-success' },
  cancelled:  { label: 'Cancelled',  className: 'bg-muted text-muted-foreground border-border' },
  no_show:    { label: 'No show',    className: 'bg-destructive/10 text-destructive border-destructive' },
};

const TYPE_LABELS = {
  video_call:   'Video Call',
  in_person:    'In-Person',
  check_in:     'Check-in',
  consultation: 'Consultation',
  strategy:     'Strategy',
  assessment:   'Assessment',
  custom:       'Custom',
};

function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(`${label} copied`);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border border-border text-foreground hover:bg-muted transition-colors"
    >
      {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copied' : label}
    </button>
  );
}

function SessionRow({ session }) {
  const [showNotes, setShowNotes] = useState(false);
  const [notesValue, setNotesValue] = useState(session.notes || '');
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (data) => db.entities.Session.update(session.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions-modal'] });
      toast.success('Notes saved');
      setShowNotes(false);
    },
  });

  const statusCfg = STATUS_CONFIG[session.status] || STATUS_CONFIG.scheduled;
  const hasZoom = !!session.zoom_join_url;

  let displayDate = '';
  try {
    if (session.date) displayDate = format(new Date(session.date + 'T12:00:00'), 'MMM d, yyyy');
  } catch {}

  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden">
      <div className="flex items-start gap-3 p-4">
        {/* Zoom icon or type icon */}
        <div className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
          hasZoom ? 'bg-[var(--tc-brand)]/10' : 'bg-muted'
        )}>
          <Video className={cn('w-4 h-4', hasZoom ? 'text-[var(--tc-brand)]' : 'text-muted-foreground')} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <p className="text-sm font-semibold text-foreground leading-tight">{session.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {displayDate}{session.time && ` · ${session.time}`} · {session.duration_minutes || 60} min · {TYPE_LABELS[session.type] || session.type}
              </p>
            </div>
            <span className={cn('text-[11px] font-semibold px-2.5 py-0.5 rounded-full border flex-shrink-0', statusCfg.className)}>
              {statusCfg.label}
            </span>
          </div>

          {/* Zoom links */}
          {hasZoom && (
            <div className="flex flex-wrap gap-2 mt-2.5">
              <a
                href={session.zoom_start_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 bg-brand text-brand-foreground rounded-lg hover:bg-[var(--tc-brand)] transition-colors"
              >
                <Video className="w-3 h-3" /> Start meeting
              </a>
              <CopyButton text={session.zoom_join_url} label="Copy client link" />
              {session.zoom_password && (
                <CopyButton text={session.zoom_password} label="Copy password" />
              )}
            </div>
          )}

          {/* Notes */}
          {session.notes && !showNotes && (
            <p className="text-xs text-muted-foreground mt-2 italic line-clamp-2">{session.notes}</p>
          )}
        </div>

        {/* Log notes button */}
        <button
          onClick={() => setShowNotes(v => !v)}
          className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 mt-0.5"
        >
          <FileText className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Notes</span>
        </button>
      </div>

      {/* Notes editor */}
      {showNotes && (
        <div className="border-t border-border bg-background p-3 flex flex-col gap-2">
          <Textarea
            value={notesValue}
            onChange={e => setNotesValue(e.target.value)}
            placeholder="Add session notes, outcomes, next steps..."
            rows={3}
            className="text-sm resize-none"
          />
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={() => setShowNotes(false)}>Cancel</Button>
            <Button size="sm" onClick={() => updateMutation.mutate({ notes: notesValue })}
              disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving...' : 'Save notes'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SessionsTab({ client }) {
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['sessions-modal', client?.id],
    queryFn: () => db.entities.Session.filter({ client_id: client.id }),
    enabled: !!client?.id,
    select: d => [...d].sort((a, b) => new Date(b.date + 'T' + (b.time || '00:00')) - new Date(a.date + 'T' + (a.time || '00:00'))),
  });

  const upcoming = sessions.filter(s => s.status === 'scheduled');
  const past = sessions.filter(s => s.status !== 'scheduled');

  return (
    <div className="h-full overflow-y-auto p-5 space-y-5">
      <CalendlyBookingWidget client={client} />
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm font-semibold text-foreground">No sessions yet</p>
          <p className="text-xs text-muted-foreground mt-1">Sessions will appear here once booked</p>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-3">
                Upcoming ({upcoming.length})
              </p>
              <div className="space-y-2">
                {upcoming.map(s => <SessionRow key={s.id} session={s} />)}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-3">
                Past ({past.length})
              </p>
              <div className="space-y-2">
                {past.map(s => <SessionRow key={s.id} session={s} />)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}