import React from 'react';
import { X } from 'lucide-react';
import { formatDistanceToNowStrict, isYesterday, format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

// Categories that are genuinely alerts get a red marker; everything else is quiet.
const ALERT_CATEGORIES = new Set(['atrisk']);

function timeLabel(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const mins = (Date.now() - d.getTime()) / 60000;
    if (mins < 1) return 'Just now';
    if (mins < 60 * 24 && !isYesterday(d)) return formatDistanceToNowStrict(d, { addSuffix: true });
    if (isYesterday(d)) return 'Yesterday';
    if (mins < 60 * 24 * 7) return format(d, 'EEEE');
    return format(d, 'MMM d');
  } catch { return ''; }
}

/** Plain sentence-case row: unread dot, title, one line of body, client + time, optional text action. */
export default function NotificationItem({ n, onMarkRead, onDismiss, onClose }) {
  const navigate = useNavigate();
  const isAlert = ALERT_CATEGORIES.has(n.category);

  const open = () => {
    if (!n.is_read) onMarkRead(n.id);
    if (n.link) { navigate(n.link); onClose(); }
  };

  const handleAction = (e) => {
    e.stopPropagation();
    open();
  };

  const handleDismiss = (e) => {
    e.stopPropagation();
    onDismiss(n.id);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => { if (e.key === 'Enter') open(); }}
      className="relative flex items-start gap-3 px-5 pt-3 cursor-pointer transition-colors hover:bg-accent group"
    >
      {/* Unread marker */}
      <span
        aria-hidden
        className={cn(
          'mt-[7px] h-2 w-2 flex-shrink-0 rounded-full',
          n.is_read ? 'bg-transparent' : isAlert ? 'bg-destructive' : 'bg-brand'
        )}
      />

      <div className="flex-1 min-w-0 border-b border-border pb-3">
        <p className={cn('text-sm leading-snug text-foreground line-clamp-2', n.is_read ? 'font-medium' : 'font-semibold')}>
          {n.title}
        </p>
        {n.body && (
          <p className="text-[13px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">{n.body}</p>
        )}
        <div className="flex items-center gap-3 mt-1.5 flex-wrap text-[13px] text-muted-foreground">
          {n.client_name && <span className="font-medium text-foreground/80">{n.client_name}</span>}
          <span>{timeLabel(n.created_date)}</span>
          {n.action_label && (
            <button
              onClick={handleAction}
              className="font-semibold text-foreground underline underline-offset-4 decoration-1 hover:decoration-2"
            >
              {n.action_label}
            </button>
          )}
        </div>
      </div>

      <button
        onClick={handleDismiss}
        aria-label="Dismiss"
        className="touch-compact w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 text-muted-foreground hover:text-foreground hover:bg-secondary opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
