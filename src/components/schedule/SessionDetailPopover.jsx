import React, { useState } from 'react';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import { X, MessageSquare, User, Clock, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { SignedImg } from '@/components/shared/SignedImage';
import { Initials, KeyValue } from '@/components/kit';
import { SESSION_TYPE_LABELS } from './TimeGrid';

function getTimeRange(session) {
  if (!session.time) return format(parseISO(session.date), 'EEEE, MMMM d, yyyy');
  const [h, m] = session.time.split(':').map(Number);
  const start = new Date(2000, 0, 1, h, m);
  const end = new Date(start.getTime() + (session.duration_minutes || 60) * 60000);
  const startStr = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const endStr = end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const dateStr = format(parseISO(session.date), 'EEEE, MMMM d, yyyy');
  return `${dateStr}, ${startStr} to ${endStr}`;
}

function isSessionSoon(session) {
  if (session.status !== 'scheduled') return false;
  const [h, m] = (session.time || '').split(':').map(Number);
  if (!h || !m) return false;
  const now = new Date();
  const sessionDate = parseISO(session.date);
  const sessionStart = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate(), h, m);
  const diff = differenceInMinutes(sessionStart, now);
  return diff >= -5 && diff <= 30; // Within 30 min or currently happening
}

export default function SessionDetailPopover({
  session,
  client,
  onClose,
  onUpdate,
  onMessage,
  onReschedule,
  onCancel,
}) {
  const [editingNotes, setEditingNotes] = useState(session.notes || '');
  const [selectedStatus, setSelectedStatus] = useState(session.status || 'scheduled');
  const [isDirty, setIsDirty] = useState(false);

  const handleNotesChange = (e) => {
    setEditingNotes(e.target.value);
    setIsDirty(true);
  };

  const handleStatusChange = (val) => {
    setSelectedStatus(val);
    setIsDirty(true);
  };

  const handleSave = () => {
    onUpdate({ notes: editingNotes, status: selectedStatus });
    setIsDirty(false);
  };

  const avatar = client?.avatar_url;
  const isCancelled = session.status === 'cancelled';
  const isCompleted = session.status === 'completed';
  const sessionSoon = isSessionSoon(session);
  const typeLabel = SESSION_TYPE_LABELS[session.type] || (session.type || 'Session').replace(/_/g, ' ');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-card rounded-xl shadow-[0_0_0_1px_rgb(var(--border))] max-w-md w-full max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-label="Session details"
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 flex items-start justify-between gap-3 border-b border-border">
          <div className="flex items-center gap-3 min-w-0">
            {avatar ? (
              <SignedImg src={avatar} alt={client?.name} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <Initials name={client?.name || session.client_name || session.title} size={40} />
            )}
            <div className="min-w-0">
              <h3 className="text-xl text-foreground truncate">{client?.name || session.client_name || session.title}</h3>
              <p className="text-[13px] text-muted-foreground">{typeLabel}</p>
            </div>
          </div>
          <button onClick={onClose} className="touch-compact p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <KeyValue label="When" value={getTimeRange(session)} />
            <KeyValue label="Length" value={`${session.duration_minutes || 60} min`} />
            {session.meeting_link && (
              <KeyValue
                label="Link"
                value={(
                  <a href={session.meeting_link} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 truncate inline-block max-w-[220px] align-bottom">
                    {session.meeting_link.replace(/^https?:\/\//, '')}
                  </a>
                )}
              />
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] text-muted-foreground block">Status</label>
            <Select value={selectedStatus} onValueChange={handleStatusChange}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduled">Upcoming</SelectItem>
                <SelectItem value="in_progress">In progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="no_show">No show</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] text-muted-foreground block">Notes</label>
            <Textarea
              value={editingNotes}
              onChange={handleNotesChange}
              placeholder="What you covered, what changes next"
              rows={3}
            />
          </div>

          {isDirty && (
            <Button onClick={handleSave} size="sm" className="w-full">
              Save changes
            </Button>
          )}

          <div className="space-y-2 pt-3 border-t border-border">
            {sessionSoon && !isCompleted && !isCancelled && (
              <Button size="sm" className="w-full">
                <Play /> Start session
              </Button>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={() => onMessage(client?.id)}>
                <MessageSquare /> Message
              </Button>
              <Button variant="outline" size="sm" onClick={() => onReschedule(session)}>
                <Clock /> Reschedule
              </Button>
              <Button variant="outline" size="sm" onClick={() => onMessage(client?.id)}>
                <User /> View profile
              </Button>
              {!isCompleted && !isCancelled && (
                <Button variant="outline" size="sm" onClick={() => onCancel(session)} className="text-destructive hover:text-destructive">
                  <X /> Cancel session
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
