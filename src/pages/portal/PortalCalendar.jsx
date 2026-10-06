import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { portalDb } from '@/api/supabaseClient';
import { useNavigate } from 'react-router-dom';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  addMonths, subMonths, isSameDay, isSameMonth, isToday, parseISO,
  startOfWeek, endOfWeek
} from 'date-fns';
import {
  ChevronLeft, ChevronRight, Camera, ClipboardList, Phone,
  Target, Repeat, Dumbbell, Apple, Check, Scale, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Stat } from '@/components/kit';
import { PortalScreen, PortalHeader, IconButton, Sheet } from '@/components/portal/PortalUI';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ── Event type config ───────────────────────────────────
const EVENT_TYPES = {
  checkin:        { label: 'Check-in',   icon: ClipboardList },
  photo:          { label: 'Photos',     icon: Camera },
  call:           { label: 'Coach call', icon: Phone },
  goal:           { label: 'Goal',       icon: Target },
  habit:          { label: 'Habit',      icon: Repeat },
  workout:        { label: 'Workout',    icon: Dumbbell },
  nutrition:      { label: 'Nutrition',  icon: Apple },
  weighin:        { label: 'Weigh-in',   icon: Scale },
  weighin_pending:{ label: 'Log weight', icon: Scale },
};

// ── Build calendar events from real data ────────────────
function buildEvents(checkIns, goals, sessions, weighIns, workoutSessions) {
  const events = [];

  // Check-ins
  checkIns.forEach(ci => {
    if (!ci.date) return;
    events.push({
      id: `ci-${ci.id}`,
      date: ci.date,
      type: 'checkin',
      title: 'Weekly check-in',
      subtitle: ci.review_status === 'reviewed' ? 'Reviewed by your coach' : 'Sent',
      done: !!ci.coach_responded || ci.review_status === 'reviewed',
    });
  });

  // Sessions / calls
  sessions.forEach(s => {
    if (!s.date) return;
    events.push({
      id: `sess-${s.id}`,
      date: s.date,
      type: 'call',
      title: s.title || 'Coach session',
      subtitle: s.time || '',
      done: s.status === 'completed',
    });
  });

  // Goals with due dates
  goals.forEach(g => {
    if (!g.due_date) return;
    events.push({
      id: `goal-${g.id}`,
      date: g.due_date,
      type: 'goal',
      title: g.name,
      subtitle: g.status === 'completed' ? 'Done' : `Target ${g.target_value || ''} ${g.unit || ''}`.trim(),
      done: g.status === 'completed',
    });
  });

  // Weigh-ins — weight=0 means scheduled/pending (client needs to log)
  weighIns.forEach(w => {
    if (!w.date) return;
    const isPending = !w.weight || w.weight === 0;
    events.push({
      id: `weigh-${w.id}`,
      weighInId: w.id,
      date: w.date,
      type: isPending ? 'weighin_pending' : 'weighin',
      title: isPending ? 'Log your weight' : 'Weight logged',
      subtitle: isPending ? (w.note || 'Tap to enter your weight') : `${w.weight} lb`,
      done: !isPending,
      isPending,
    });
  });

  // Workout sessions scheduled by coach
  (workoutSessions || []).forEach(ws => {
    if (!ws.scheduled_date) return;
    events.push({
      id: `ws-${ws.id}`,
      date: ws.scheduled_date,
      type: 'workout',
      title: ws.workout_name || 'Workout',
      subtitle: ws.program_name || '',
      done: ws.status === 'completed',
    });
  });

  return events;
}

// ── Day cell ────────────────────────────────────────────
function DayCell({ day, currentMonth, events, onSelect, selected }) {
  const dayEvents = events.filter(e => isSameDay(parseISO(e.date), day));
  const isCurrentMonth = isSameMonth(day, currentMonth);
  const isSelectedDay = selected && isSameDay(day, selected);
  const isTodayDate = isToday(day);
  const hasPending = dayEvents.some(e => e.isPending);

  return (
    <button
      type="button"
      onClick={() => onSelect(day)}
      aria-pressed={!!isSelectedDay}
      aria-label={`${format(day, 'EEEE, MMMM d')}${dayEvents.length ? `, ${dayEvents.length} event${dayEvents.length === 1 ? '' : 's'}` : ''}`}
      className={cn(
        'touch-compact flex min-h-[48px] flex-col items-center justify-start rounded-lg !px-0 !pt-1.5 !pb-1 transition-colors',
        isSelectedDay ? 'bg-primary text-primary-foreground' : 'hover:bg-accent',
        !isCurrentMonth && !isSelectedDay && 'opacity-35',
      )}
    >
      <span className={cn(
        'num text-[17px]',
        !isSelectedDay && isTodayDate && 'text-brand',
      )}>
        {format(day, 'd')}
      </span>
      <span className="mt-1 flex h-1.5 gap-0.5">
        {dayEvents.slice(0, 3).map((e, i) => (
          <span key={i} className={cn('h-1.5 w-1.5 rounded-full',
            isSelectedDay ? 'bg-primary-foreground/80' : e.isPending ? 'bg-brand' : 'bg-foreground/60')} />
        ))}
      </span>
      {hasPending && <span className="sr-only">Weight to log</span>}
    </button>
  );
}

// ── Log weight sheet ────────────────────────────────────
function LogWeightModal({ weighInId, date, coachNote, onClose, onSaved }) {
  const [weight, setWeight] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!weight || parseFloat(weight) <= 0) return;
    setSaving(true);
    await portalDb.entities.WeighIn.update(weighInId, { weight: parseFloat(weight) });
    toast.success('Weight logged');
    onSaved();
    onClose();
  };

  return (
    <Sheet open onClose={onClose} title="Log your weight"
      footer={(
        <Button size="lg" className="h-[52px] w-full text-base font-bold" onClick={save}
          disabled={saving || !weight || parseFloat(weight) <= 0}>
          {saving && <Loader2 className="animate-spin" />}
          {saving ? 'Saving' : 'Save weight'}
        </Button>
      )}>
      <p className="text-[15px] text-muted-foreground">{format(parseISO(date), 'EEEE, MMMM d')}</p>
      {coachNote && (
        <div className="mt-3 rounded-lg bg-secondary px-4 py-3 text-[15px] text-foreground">
          <span className="font-bold">Coach note:</span> {coachNote}
        </div>
      )}
      <div className="mt-4 flex items-end gap-2">
        <input
          type="number"
          step="0.1"
          inputMode="decimal"
          autoFocus
          placeholder="0"
          aria-label="Weight in lb"
          value={weight}
          onChange={e => setWeight(e.target.value)}
          className="num h-20 w-44 rounded-xl border-2 border-foreground bg-card text-center text-[44px] text-foreground focus:outline-none"
        />
        <span className="pb-3 text-lg font-semibold text-muted-foreground">lb</span>
      </div>
    </Sheet>
  );
}

// ── Event row ───────────────────────────────────────────
function EventPill({ event, onLogWeight }) {
  const cfg = EVENT_TYPES[event.type] || EVENT_TYPES.checkin;
  const Icon = cfg.icon;
  const Comp = event.isPending && onLogWeight ? 'button' : 'div';
  return (
    <Comp
      type={Comp === 'button' ? 'button' : undefined}
      className="flex w-full items-center gap-3 py-3 text-left"
      onClick={event.isPending && onLogWeight ? () => onLogWeight(event) : undefined}
    >
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold text-foreground">{event.title}</span>
        <span className="block truncate text-[13px] text-muted-foreground">
          {cfg.label}{event.subtitle ? `, ${event.subtitle}` : ''}
        </span>
      </span>
      {event.isPending ? (
        <span className="flex-shrink-0 text-sm font-semibold text-foreground underline underline-offset-4">Log</span>
      ) : event.done ? (
        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-success text-white"><Check className="h-3.5 w-3.5" strokeWidth={3} /></span>
      ) : null}
    </Comp>
  );
}

// ── Upcoming event row ──────────────────────────────────
function UpcomingRow({ event }) {
  const cfg = EVENT_TYPES[event.type] || EVENT_TYPES.checkin;
  const date = parseISO(event.date);
  return (
    <li className="flex items-center gap-3 py-3">
      <span className="w-11 flex-shrink-0 text-center">
        <span className="block text-[12px] text-muted-foreground">{format(date, 'EEE')}</span>
        <span className="num block text-[22px] text-foreground">{format(date, 'd')}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold text-foreground">{event.title}</span>
        <span className="block text-[13px] text-muted-foreground">{cfg.label}, {format(date, 'MMM d')}</span>
      </span>
    </li>
  );
}

// ── MAIN ────────────────────────────────────────────────
export default function PortalCalendar({ user }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [logWeightEvent, setLogWeightEvent] = useState(null);
  const qc = useQueryClient();
  const navigate = useNavigate();

  // Fetch client
  const { data: clients = [] } = useQuery({
    queryKey: ['portal-cal-client', user?.email],
    queryFn: () => portalDb.entities.Client.filter({ portal_user_id: user.id }, '-created_date', 1),
    enabled: !!user?.email,
  });
  const myClient = clients[0];

  // Fetch data in parallel
  const { data: checkIns = [] } = useQuery({
    queryKey: ['portal-cal-checkins', myClient?.id],
    queryFn: () => portalDb.entities.CheckIn.filter({ client_id: myClient.id }, '-date', 100),
    enabled: !!myClient?.id,
  });
  const { data: goals = [] } = useQuery({
    queryKey: ['portal-cal-goals', myClient?.id],
    queryFn: () => portalDb.entities.Goal.filter({ client_id: myClient.id }, '-created_date', 50),
    enabled: !!myClient?.id,
  });
  const { data: sessions = [] } = useQuery({
    queryKey: ['portal-cal-sessions', myClient?.id],
    queryFn: () => portalDb.entities.Session.filter({ client_id: myClient.id }, '-date', 50),
    enabled: !!myClient?.id,
  });
  const { data: weighIns = [] } = useQuery({
    queryKey: ['portal-cal-weighins', myClient?.id],
    queryFn: () => portalDb.entities.WeighIn.filter({ client_id: myClient.id }, '-date', 50),
    enabled: !!myClient?.id,
  });
  const { data: workoutSessions = [] } = useQuery({
    queryKey: ['portal-cal-workoutsessions', myClient?.id],
    queryFn: () => portalDb.entities.WorkoutSession.filter({ client_id: myClient.id }, '-scheduled_date', 200),
    enabled: !!myClient?.id,
  });

  const events = useMemo(
    () => buildEvents(checkIns, goals, sessions, weighIns, workoutSessions),
    [checkIns, goals, sessions, weighIns, workoutSessions]
  );

  // Calendar grid days
  const calDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth));
    const end = endOfWeek(endOfMonth(currentMonth));
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const selectedEvents = useMemo(
    () => events.filter(e => isSameDay(parseISO(e.date), selectedDay)),
    [events, selectedDay]
  );

  const upcomingEvents = useMemo(() => {
    const today = new Date();
    return events
      .filter(e => parseISO(e.date) >= today)
      .sort((a, b) => parseISO(a.date) - parseISO(b.date))
      .slice(0, 5);
  }, [events]);

  const DAY_HEADERS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const monthCount = (type) => events.filter(e => e.type === type && isSameMonth(parseISO(e.date), currentMonth)).length;

  return (
    <PortalScreen>
      <PortalHeader
        title="Schedule"
        subtitle="Workouts, calls, check-ins and weigh-ins by day."
        onBack={() => navigate(-1)}
      />

      <div className="space-y-3">
        {/* Calendar */}
        <section className="panel">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <IconButton label="Previous month" onClick={() => setCurrentMonth(m => subMonths(m, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </IconButton>
            <h2 className="text-xl text-foreground">{format(currentMonth, 'MMMM yyyy')}</h2>
            <IconButton label="Next month" onClick={() => setCurrentMonth(m => addMonths(m, 1))}>
              <ChevronRight className="h-4 w-4" />
            </IconButton>
          </div>

          <div className="grid grid-cols-7 px-3 pt-1">
            {DAY_HEADERS.map(d => (
              <div key={d} className="py-1 text-center text-[12px] text-muted-foreground">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5 px-3 pb-3">
            {calDays.map(day => (
              <DayCell
                key={day.toISOString()}
                day={day}
                currentMonth={currentMonth}
                events={events}
                onSelect={setSelectedDay}
                selected={selectedDay}
              />
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3 border-t border-border px-4 py-3">
            <Stat size="sm" label="Workouts" value={monthCount('workout')} />
            <Stat size="sm" label="Calls" value={monthCount('call')} />
            <Stat size="sm" label="Check-ins" value={monthCount('checkin')} />
          </div>
        </section>

        {/* Selected day */}
        <section className="panel px-4 pt-4 pb-1">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl text-foreground">{isToday(selectedDay) ? 'Today' : format(selectedDay, 'EEEE, MMMM d')}</h2>
            <span className="text-[13px] text-muted-foreground">{selectedEvents.length} item{selectedEvents.length !== 1 ? 's' : ''}</span>
          </div>
          {selectedEvents.length === 0 ? (
            <p className="py-3 text-sm text-muted-foreground">Nothing scheduled.</p>
          ) : (
            <div className="divide-y divide-border">
              {selectedEvents.map(event => (
                <EventPill key={event.id} event={event} onLogWeight={setLogWeightEvent} />
              ))}
            </div>
          )}
        </section>

        {/* Upcoming */}
        {upcomingEvents.length > 0 && (
          <section className="panel px-4 pt-4 pb-1">
            <h2 className="text-xl text-foreground">Coming up</h2>
            <ul className="divide-y divide-border">
              {upcomingEvents.map(event => <UpcomingRow key={event.id} event={event} />)}
            </ul>
          </section>
        )}
      </div>

      {/* Log weight sheet */}
      {logWeightEvent && (
        <LogWeightModal
          weighInId={logWeightEvent.weighInId}
          date={logWeightEvent.date}
          coachNote={logWeightEvent.subtitle !== 'Tap to enter your weight' ? logWeightEvent.subtitle : null}
          onClose={() => setLogWeightEvent(null)}
          onSaved={() => qc.invalidateQueries({ queryKey: ['portal-cal-weighins', myClient?.id] })}
        />
      )}
    </PortalScreen>
  );
}
