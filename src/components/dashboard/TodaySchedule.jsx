import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { format } from 'date-fns';
import { MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Panel, PanelHeader, Initials, TextLink, EmptyState } from '@/components/kit';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const TYPE_LABELS = {
  video_call:   'Video call',
  in_person:    'In person',
  check_in:     'Check-in call',
  consultation: 'Consultation',
};

const STATUS_LABELS = {
  scheduled: 'Upcoming',
  completed: 'Done',
  cancelled: 'Cancelled',
  no_show:   'No-show',
};

function parseSessionTime(timeStr) {
  if (!timeStr) return null;
  // Handles "14:00", "2:00 PM", "14:00:00"
  const clean = timeStr.trim();
  const match12 = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let h = parseInt(match12[1]);
    const m = parseInt(match12[2]);
    const ampm = match12[3].toUpperCase();
    if (ampm === 'PM' && h !== 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return { h, m };
  }
  const match24 = clean.match(/^(\d{1,2}):(\d{2})/);
  if (match24) return { h: parseInt(match24[1]), m: parseInt(match24[2]) };
  return null;
}

function formatDisplayTime(timeStr) {
  const t = parseSessionTime(timeStr);
  if (!t) return timeStr || '';
  const ampm = t.h >= 12 ? 'PM' : 'AM';
  const h = t.h % 12 || 12;
  return `${h}:${String(t.m).padStart(2, '0')} ${ampm}`;
}

function minutesUntil(timeStr) {
  const t = parseSessionTime(timeStr);
  if (!t) return null;
  const now = new Date();
  const sessionMinutes = t.h * 60 + t.m;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return sessionMinutes - nowMinutes;
}

function isInProgress(session) {
  const minsUntil = minutesUntil(session.time);
  if (minsUntil === null) return false;
  return minsUntil <= 0 && minsUntil >= -(session.duration_minutes || 60);
}

function SessionRow({ session, clients, onMessage }) {
  const navigate = useNavigate();
  const minsUntil = minutesUntil(session.time);
  const inProgress = isInProgress(session);
  const startingSoon = minsUntil !== null && minsUntil > 0 && minsUntil <= 30;

  const client = clients.find(c => c.id === session.client_id);
  const clientName = client?.name || session.client_name || 'Client';
  const rawType = session.type ? String(session.type).replace(/_/g, ' ') : 'Session';
  const typeLabel = TYPE_LABELS[session.type] || rawType[0].toUpperCase() + rawType.slice(1);
  const statusKey = session.status || 'scheduled';
  const closed = statusKey === 'completed' || statusKey === 'cancelled' || statusKey === 'no_show';

  const statusText = inProgress ? 'Happening now'
    : startingSoon ? `Starts in ${minsUntil} min`
    : STATUS_LABELS[statusKey] || 'Upcoming';

  return (
    <li className="flex items-center gap-3 border-t border-border px-5 py-3 first:border-t-0 sm:px-6">
      <span className={cn('num w-[68px] flex-shrink-0 text-[17px]', closed ? 'text-muted-foreground' : 'text-foreground')}>
        {formatDisplayTime(session.time)}
      </span>
      <Initials name={clientName} size={32} />
      <div className="min-w-0 flex-1">
        <p className={cn('truncate text-[15px] font-semibold', closed ? 'text-muted-foreground line-through decoration-1' : 'text-foreground')}>{clientName}</p>
        <p className={cn('truncate text-[13px]', inProgress || startingSoon ? 'font-semibold text-brand' : statusKey === 'no_show' ? 'text-destructive' : 'text-muted-foreground')}>
          {typeLabel} · {statusText}
        </p>
      </div>
      {!closed && (
        <div className="flex flex-shrink-0 items-center gap-1.5">
          {session.zoom_start_url ? (
            <Button asChild size="sm" variant={inProgress || startingSoon ? 'default' : 'outline'}>
              <a href={session.zoom_start_url} target="_blank" rel="noreferrer">Start Zoom</a>
            </Button>
          ) : (
            <Button size="sm" variant={inProgress || startingSoon ? 'default' : 'outline'} onClick={() => navigate('/schedule')}>
              Start
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="w-8 px-0"
            onClick={() => onMessage && onMessage(session.client_id)}
            title={`Message ${clientName}`}
            aria-label={`Message ${clientName}`}
          >
            <MessageSquare />
          </Button>
        </div>
      )}
    </li>
  );
}

export default function TodaySchedule({ clients = [] }) {
  const navigate = useNavigate();
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['sessions-today'],
    queryFn: () => db.entities.Session.filter({ date: todayStr }),
  });

  const todaySessions = useMemo(() => {
    return [...sessions]
      .filter(s => s.date === todayStr)
      .sort((a, b) => {
        const ta = parseSessionTime(a.time);
        const tb = parseSessionTime(b.time);
        if (!ta || !tb) return 0;
        return (ta.h * 60 + ta.m) - (tb.h * 60 + tb.m);
      });
  }, [sessions, todayStr]);

  const handleMessage = (clientId) => {
    navigate(`/messages?client=${clientId}`);
  };

  return (
    <Panel>
      <PanelHeader
        title="Today's sessions"
        subtitle={todaySessions.length ? `${todaySessions.length} on the calendar for ${format(new Date(), 'EEEE')}` : undefined}
        right={<TextLink onClick={() => navigate('/schedule')}>Calendar</TextLink>}
      />
      {isLoading ? (
        <div className="space-y-2 px-5 pb-5 sm:px-6" aria-busy="true">
          {[1, 2].map(i => <div key={i} className="h-11 rounded-lg bg-secondary" />)}
        </div>
      ) : todaySessions.length === 0 ? (
        <EmptyState
          className="pt-1"
          title="No sessions today."
          action={<Button variant="outline" size="sm" onClick={() => navigate('/schedule')}>Schedule a session</Button>}
        />
      ) : (
        <ul className="pb-2">
          {todaySessions.map(session => (
            <SessionRow key={session.id} session={session} clients={clients} onMessage={handleMessage} />
          ))}
        </ul>
      )}
    </Panel>
  );
}
