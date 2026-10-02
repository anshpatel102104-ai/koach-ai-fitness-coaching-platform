import React, { useState } from 'react';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import { X, MessageSquare, User, Clock, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { SignedImg } from '@/components/shared/SignedImage';

const sessionTypeColors = {
  check_in: 'bg-accent text-primary border-l-4 border-primary',
  program_review: 'bg-ai/10 text-ai border-l-4 border-ai',
  onboarding: 'bg-success/10 text-success border-l-4 border-success',
  progress_review: 'bg-warning/10 text-warning border-l-4 border-warning',
  consultation: 'bg-muted text-muted-foreground border-l-4 border-border',
  video_call: 'bg-accent text-primary border-l-4 border-primary',
  in_person: 'bg-success/10 text-success border-l-4 border-success',
};

function getTimeRange(session) {
  if (!session.time) return format(parseISO(session.date), 'EEEE, MMMM d, yyyy');
  const [h, m] = session.time.split(':').map(Number);
  const start = new Date(2000, 0, 1, h, m);
  const end = new Date(start.getTime() + (session.duration_minutes || 60) * 60000);
  const startStr = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const endStr = end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const dateStr = format(parseISO(session.date), 'EEEE, MMMM d, yyyy');
  return `${dateStr} • ${startStr} - ${endStr}`;
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
  const initials = client?.name ? client.name.split(' ').map(n => n[0]).join('') : '?';
  const colors = sessionTypeColors[session.type] || sessionTypeColors.consultation;
  const isCancelled = session.status === 'cancelled';
  const isCompleted = session.status === 'completed';
  const sessionSoon = isSessionSoon(session);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="bg-card rounded-2xl shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={cn('p-4 border-b border-border flex items-start justify-between', colors)}>
          <div className="flex items-center gap-3">
            {avatar ? (
              <SignedImg src={avatar} alt={client?.name} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold', colors)}>
                {initials}
              </div>
            )}
            <div>
              <h3 className="text-sm font-bold">{client?.name || 'Unknown'}</h3>
              <p className="text-xs opacity-75">{(session.type || 'Session').replace(/_/g, ' ')}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-[var(--kc-w-20)] rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Date & Time */}
          <div className="flex items-start gap-3 p-3 bg-muted rounded-xl">
            <Clock className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-foreground">Date & Time</p>
              <p className="text-xs text-muted-foreground mt-0.5">{getTimeRange(session)}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Duration: {session.duration_minutes || 60} min</p>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="text-xs font-semibold text-foreground block mb-2">Status</label>
            <Select value={selectedStatus} onValueChange={handleStatusChange}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduled">Upcoming</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="no_show">No Show</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-foreground block mb-2">Notes</label>
            <Textarea
              value={editingNotes}
              onChange={handleNotesChange}
              placeholder="Add session notes..."
              rows={3}
              className="text-xs"
            />
          </div>

          {/* Meeting Link */}
          {session.meeting_link && (
            <div className="p-3 bg-accent/10 rounded-xl">
              <p className="text-xs font-semibold text-primary mb-1">Meeting Link</p>
              <a
                href={session.meeting_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline truncate block"
              >
                {session.meeting_link}
              </a>
            </div>
          )}

          {/* Save changes */}
          {isDirty && (
            <Button onClick={handleSave} size="sm" className="w-full">
              Save Changes
            </Button>
          )}

          {/* Action Buttons */}
          <div className="space-y-2 pt-2 border-t border-border">
            {sessionSoon && !isCompleted && !isCancelled && (
              <Button size="sm" className="w-full bg-gradient-to-r from-primary to-ai text-white">
                <Play className="w-3.5 h-3.5 mr-1.5" /> Start Session
              </Button>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onMessage(client?.id)}
                className="text-xs"
              >
                <MessageSquare className="w-3 h-3 mr-1" /> Message
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onReschedule(session)}
                className="text-xs"
              >
                <Clock className="w-3 h-3 mr-1" /> Reschedule
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onMessage(client?.id)}
                className="text-xs"
              >
                <User className="w-3 h-3 mr-1" /> View Profile
              </Button>
              {!isCompleted && !isCancelled && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onCancel(session)}
                  className="text-xs text-destructive hover:text-destructive"
                >
                  <X className="w-3 h-3 mr-1" /> Cancel
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}