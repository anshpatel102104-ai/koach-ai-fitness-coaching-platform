import React from 'react';
import { GripVertical, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SignedImg } from '@/components/shared/SignedImage';

const sessionTypeIcons = {
  check_in: '📞',
  program_review: '💪',
  onboarding: '🎯',
  progress_review: '📊',
  consultation: '🆓',
};

const sessionTypeColors = {
  check_in: { border: 'border-l-4 border-primary', bg: 'bg-accent', text: 'text-primary' },
  program_review: { border: 'border-l-4 border-ai', bg: 'bg-ai/10', text: 'text-ai' },
  onboarding: { border: 'border-l-4 border-success', bg: 'bg-success/10', text: 'text-success' },
  progress_review: { border: 'border-l-4 border-warning', bg: 'bg-warning/10', text: 'text-warning' },
  consultation: { border: 'border-l-4 border-border', bg: 'bg-muted', text: 'text-muted-foreground' },
  video_call: { border: 'border-l-4 border-primary', bg: 'bg-accent', text: 'text-primary' },
  in_person: { border: 'border-l-4 border-success', bg: 'bg-success/10', text: 'text-success' },
};

function getTimeRange(time, durationMinutes) {
  if (!time) return 'All day';
  const [h, m] = time.split(':').map(Number);
  const start = new Date(2000, 0, 1, h, m);
  const end = new Date(start.getTime() + (durationMinutes || 60) * 60000);
  const startStr = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const endStr = end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${startStr} - ${endStr}`;
}

export default function EventCard({
  session,
  client,
  isDragging,
  onDragStart,
  onClick,
  isPast,
  isToday,
  style,
  columnWidth,
}) {
  const colors = sessionTypeColors[session.type] || sessionTypeColors.consultation;
  const isCancelled = session.status === 'cancelled';
  const isCompleted = session.status === 'completed';
  const avatar = client?.avatar_url;
  const initials = client?.name ? client.name.split(' ').map(n => n[0]).join('') : '?';

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      style={style}
      className={cn(
        'absolute rounded-xl border shadow-sm transition-all duration-150 cursor-grab active:cursor-grabbing group overflow-hidden',
        colors.bg,
        colors.border,
        isCancelled && 'border-l-4 border-destructive bg-destructive/10',
        isDragging && 'opacity-75 shadow-lg scale-105 z-50',
        !isDragging && 'hover:shadow-md hover:scale-105 hover:z-40',
        isPast && !isCompleted && 'opacity-60',
        isCompleted && 'opacity-75 bg-muted border-l-4 border-border'
      )}
    >
      <div className={cn(
        'h-full px-2.5 py-1.5 flex flex-col justify-between text-left',
        isCancelled && 'text-destructive',
        isCompleted && 'text-muted-foreground'
      )}>
        {/* Header */}
        <div className="flex items-start gap-2 min-w-0">
          {/* Drag handle */}
          <GripVertical className={cn(
            'w-3 h-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity',
            colors.text
          )} />

          {/* Avatar */}
          {avatar ? (
            <SignedImg src={avatar} alt={client?.name} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0',
              colors.bg,
              colors.text
            )}>
              {initials}
            </div>
          )}

          {/* Client name and type */}
          <div className="flex-1 min-w-0">
            <p className={cn(
              'text-xs font-bold truncate',
              isCancelled && 'line-through'
            )}>
              {client?.name || 'Unknown'}
            </p>
            <p className={cn('text-[10px] opacity-70 truncate', colors.text)}>
              {sessionTypeIcons[session.type.split('_')[0]]} {(session.type || 'Session').replace(/_/g, ' ')}
            </p>
          </div>

          {/* Completed check */}
          {isCompleted && <Check className="w-3.5 h-3.5 flex-shrink-0 text-success" />}
        </div>

        {/* Time */}
        <p className={cn('text-[10px] font-medium mt-0.5', colors.text)}>
          {getTimeRange(session.time, session.duration_minutes)}
        </p>
      </div>
    </div>
  );
}