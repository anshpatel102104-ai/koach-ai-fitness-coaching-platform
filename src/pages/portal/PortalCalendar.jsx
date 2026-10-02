import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabasePortal as base44 } from '@/api/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  addMonths, subMonths, isSameDay, isSameMonth, isToday, parseISO,
  startOfWeek, endOfWeek
} from 'date-fns';
import {
  ChevronLeft, ChevronRight, Camera, ClipboardList, Phone,
  Target, Zap, Dumbbell, Salad, X, Calendar, CheckCircle2, Scale, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ── Event type config ───────────────────────────────────
const EVENT_TYPES = {
  checkin:        { label: 'Check-in',        color: 'rgb(var(--primary))', bg: 'rgb(var(--accent))', icon: ClipboardList, emoji: '📋' },
  photo:          { label: 'Photos',           color: 'rgb(var(--ai))', bg: 'rgb(var(--ai))', icon: Camera,        emoji: '📸' },
  call:           { label: 'Coach Call',       color: 'rgb(var(--success))', bg: 'rgb(var(--success))', icon: Phone,         emoji: '📞' },
  goal:           { label: 'Goal',             color: 'rgb(var(--warning))', bg: 'rgb(var(--warning))', icon: Target,        emoji: '🎯' },
  habit:          { label: 'Habit',            color: '#EC4899', bg: '#FDF2F8', icon: Zap,           emoji: '⚡' },
  workout:        { label: 'Workout',          color: 'rgb(var(--primary))', bg: '#F0F9FF', icon: Dumbbell,      emoji: '💪' },
  nutrition:      { label: 'Nutrition',        color: 'rgb(var(--success))', bg: 'rgb(var(--success))', icon: Salad,         emoji: '🥗' },
  weighin:        { label: 'Weigh-in',         color: 'rgb(var(--primary))', bg: '#F0F9FF', icon: Scale,         emoji: '⚖️' },
  weighin_pending:{ label: 'Log Weight',       color: 'rgb(var(--warning))', bg: 'rgb(var(--warning))', icon: Scale,         emoji: '⚖️' },
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
      title: 'Weekly Check-in',
      subtitle: ci.review_status === 'reviewed' ? 'Reviewed ✓' : 'Submitted',
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
      title: s.title || 'Coach Session',
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
      subtitle: g.status === 'completed' ? 'Completed ✓' : `Target: ${g.target_value || ''} ${g.unit || ''}`.trim(),
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
      title: isPending ? 'Log Your Weight' : 'Weight Logged',
      subtitle: isPending ? (w.note || 'Tap to enter your weight') : `${w.weight} lbs`,
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

  const dotColors = [...new Set(dayEvents.map(e => EVENT_TYPES[e.type]?.color))].slice(0, 3);

  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={() => onSelect(day)}
      className={cn(
        'flex flex-col items-center justify-start pt-1.5 pb-1 rounded-xl transition-all relative',
        isSelectedDay && 'ring-2 ring-primary',
        !isCurrentMonth && 'opacity-30',
      )}
      style={{
        background: isSelectedDay
          ? 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--ai)))'
          : isTodayDate
          ? 'rgb(var(--accent))'
          : 'transparent',
        minHeight: 52,
      }}
    >
      <span className={cn(
        'text-xs font-bold mb-1',
        isSelectedDay ? 'text-white' : isTodayDate ? 'rgb(var(--primary))' : isCurrentMonth ? 'rgb(var(--foreground))' : 'rgb(var(--muted-foreground))'
      )}
        style={{ color: isSelectedDay ? 'rgb(var(--card))' : isTodayDate ? 'rgb(var(--primary))' : undefined }}
      >
        {format(day, 'd')}
      </span>
      {/* Dot indicators */}
      {dotColors.length > 0 && (
        <div className="flex gap-0.5 mt-0.5">
          {dotColors.map((c, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: isSelectedDay ? 'rgba(255,255,255,0.8)' : c }} />
          ))}
        </div>
      )}
    </motion.button>
  );
}

// ── Log Weight Modal ────────────────────────────────────
function LogWeightModal({ weighInId, date, coachNote, onClose, onSaved }) {
  const [weight, setWeight] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!weight || parseFloat(weight) <= 0) return;
    setSaving(true);
    await base44.entities.WeighIn.update(weighInId, { weight: parseFloat(weight) });
    toast.success('Weight logged!');
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        className="relative bg-card rounded-3xl w-full max-w-sm p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-black text-foreground text-lg">Log Your Weight</h3>
            <p className="text-muted-foreground text-xs">{format(parseISO(date), 'EEE, MMMM d')}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center bg-muted">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {coachNote && (
          <div className="mb-4 px-3 py-2 rounded-xl bg-accent border border-accent">
            <p className="text-xs text-primary font-semibold">📋 Coach note: {coachNote}</p>
          </div>
        )}

        <div className="mb-5">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide block mb-2">Weight (lbs)</label>
          <input
            type="number"
            step="0.1"
            autoFocus
            placeholder="e.g. 175.5"
            value={weight}
            onChange={e => setWeight(e.target.value)}
            className="w-full text-2xl font-black text-center border-2 border-border rounded-2xl px-4 py-4 outline-none focus:border-primary"
          />
        </div>

        <button
          onClick={save}
          disabled={saving || !weight || parseFloat(weight) <= 0}
          className="w-full py-3.5 rounded-2xl text-sm font-black text-white flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--primary)))' }}
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {saving ? 'Saving…' : 'Save Weight ⚖️'}
        </button>
      </motion.div>
    </div>
  );
}

// ── Event pill ──────────────────────────────────────────
function EventPill({ event, onLogWeight }) {
  const cfg = EVENT_TYPES[event.type] || EVENT_TYPES.checkin;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex items-center gap-3 p-3 rounded-2xl', event.isPending && 'cursor-pointer active:scale-95 transition-transform')}
      style={{ background: cfg.bg, border: `1px solid ${cfg.color}22` }}
      onClick={event.isPending && onLogWeight ? () => onLogWeight(event) : undefined}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: cfg.color + '22' }}>
        <span className="text-base">{cfg.emoji}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-foreground truncate">{event.title}</p>
        {event.subtitle ? <p className="text-xs text-muted-foreground truncate">{event.subtitle}</p> : null}
      </div>
      {event.isPending ? (
        <span className="text-[10px] font-black px-2 py-1 rounded-full text-white flex-shrink-0"
          style={{ background: cfg.color }}>
          + Log
        </span>
      ) : event.done ? (
        <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: cfg.color }} />
      ) : null}
    </motion.div>
  );
}

// ── Upcoming event row ──────────────────────────────────
function UpcomingRow({ event }) {
  const cfg = EVENT_TYPES[event.type] || EVENT_TYPES.checkin;
  const date = parseISO(event.date);
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-base"
        style={{ background: cfg.bg }}>
        {cfg.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{event.title}</p>
        <p className="text-[11px] text-muted-foreground">{format(date, 'EEE, MMM d')}</p>
      </div>
      <span className="text-[10px] font-bold px-2 py-1 rounded-full"
        style={{ background: cfg.bg, color: cfg.color }}>
        {cfg.label}
      </span>
    </div>
  );
}

// ── Legend pill ─────────────────────────────────────────
function LegendPill({ type, cfg }) {
  return (
    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold"
      style={{ background: cfg.bg, color: cfg.color }}>
      {cfg.emoji} {cfg.label}
    </span>
  );
}

// ── MAIN ────────────────────────────────────────────────
export default function PortalCalendar({ user }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [logWeightEvent, setLogWeightEvent] = useState(null);
  const qc = useQueryClient();

  // Fetch client
  const { data: clients = [] } = useQuery({
    queryKey: ['portal-cal-client', user?.email],
    queryFn: () => base44.entities.Client.filter({ email: user.email }, '-created_date', 1),
    enabled: !!user?.email,
  });
  const myClient = clients[0];

  // Fetch data in parallel
  const { data: checkIns = [] } = useQuery({
    queryKey: ['portal-cal-checkins', myClient?.id],
    queryFn: () => base44.entities.CheckIn.filter({ client_id: myClient.id }, '-date', 100),
    enabled: !!myClient?.id,
  });
  const { data: goals = [] } = useQuery({
    queryKey: ['portal-cal-goals', myClient?.id],
    queryFn: () => base44.entities.Goal.filter({ client_id: myClient.id }, '-created_date', 50),
    enabled: !!myClient?.id,
  });
  const { data: sessions = [] } = useQuery({
    queryKey: ['portal-cal-sessions', myClient?.id],
    queryFn: () => base44.entities.Session.filter({ client_id: myClient.id }, '-date', 50),
    enabled: !!myClient?.id,
  });
  const { data: weighIns = [] } = useQuery({
    queryKey: ['portal-cal-weighins', myClient?.id],
    queryFn: () => base44.entities.WeighIn.filter({ client_id: myClient.id }, '-date', 50),
    enabled: !!myClient?.id,
  });
  const { data: workoutSessions = [] } = useQuery({
    queryKey: ['portal-cal-workoutsessions', myClient?.id],
    queryFn: () => base44.entities.WorkoutSession.filter({ client_id: myClient.id }, '-scheduled_date', 200),
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

  return (
    <div className="pb-32" style={{ background: 'rgb(var(--muted))', minHeight: '100vh' }}>
      {/* Header */}
      <div className="bg-card px-5 pt-14 pb-4" style={{ boxShadow: '0 1px 0 rgb(var(--muted))' }}>
        <div className="flex items-center justify-between mb-1">
          <div>
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">My Schedule</p>
            <h1 className="text-foreground font-black text-2xl leading-tight">Calendar</h1>
          </div>
          <Calendar className="w-7 h-7 text-primary" />
        </div>
      </div>

      {/* Calendar card */}
      <div className="mx-4 mt-4 bg-card rounded-3xl overflow-hidden"
        style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: '1px solid rgb(var(--muted))' }}>

        {/* Month nav */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <motion.button whileTap={{ scale: 0.88 }}
            onClick={() => setCurrentMonth(m => subMonths(m, 1))}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgb(var(--muted))', border: '1px solid rgb(var(--border))' }}>
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </motion.button>
          <p className="font-black text-foreground text-base">{format(currentMonth, 'MMMM yyyy')}</p>
          <motion.button whileTap={{ scale: 0.88 }}
            onClick={() => setCurrentMonth(m => addMonths(m, 1))}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgb(var(--muted))', border: '1px solid rgb(var(--border))' }}>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </motion.button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 px-3 pt-2 pb-1">
          {DAY_HEADERS.map(d => (
            <div key={d} className="text-center text-[10px] font-bold text-muted-foreground py-1">{d}</div>
          ))}
        </div>

        {/* Day cells */}
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

        {/* Legend */}
        <div className="px-4 pb-4 flex gap-1.5 flex-wrap">
          {Object.entries(EVENT_TYPES).slice(0, 5).map(([key, cfg]) => (
            <LegendPill key={key} type={key} cfg={cfg} />
          ))}
        </div>
      </div>

      {/* Selected day events */}
      <div className="mx-4 mt-4">
        <div className="flex items-center justify-between mb-3">
          <p className="font-bold text-foreground text-sm">
            {isToday(selectedDay) ? "Today" : format(selectedDay, 'EEE, MMMM d')}
          </p>
          <span className="text-[11px] text-muted-foreground font-semibold">
            {selectedEvents.length} event{selectedEvents.length !== 1 ? 's' : ''}
          </span>
        </div>

        {selectedEvents.length === 0 ? (
          <div className="bg-card rounded-2xl p-6 text-center"
            style={{ border: '1px solid rgb(var(--muted))', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
            <p className="text-3xl mb-2">📅</p>
            <p className="text-muted-foreground text-sm font-semibold">Nothing scheduled</p>
            <p className="text-border text-xs mt-1">Rest up or stay ahead of your goals</p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {selectedEvents.map(event => (
                <EventPill key={event.id} event={event} onLogWeight={setLogWeightEvent} />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Log Weight Modal */}
        <AnimatePresence>
          {logWeightEvent && (
            <LogWeightModal
              weighInId={logWeightEvent.weighInId}
              date={logWeightEvent.date}
              coachNote={logWeightEvent.subtitle !== 'Tap to enter your weight' ? logWeightEvent.subtitle : null}
              onClose={() => setLogWeightEvent(null)}
              onSaved={() => qc.invalidateQueries({ queryKey: ['portal-cal-weighins', myClient?.id] })}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Upcoming section */}
      {upcomingEvents.length > 0 && (
        <div className="mx-4 mt-5">
          <p className="font-bold text-foreground text-sm mb-3">Coming Up</p>
          <div className="bg-card rounded-2xl px-4 py-1"
            style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.05)', border: '1px solid rgb(var(--muted))' }}>
            {upcomingEvents.map(event => (
              <UpcomingRow key={event.id} event={event} />
            ))}
          </div>
        </div>
      )}

      {/* Monthly summary */}
      <div className="mx-4 mt-4 mb-4">
        <div className="bg-card rounded-2xl p-4"
          style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.05)', border: '1px solid rgb(var(--muted))' }}>
          <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mb-3">This Month</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Workouts', count: events.filter(e => e.type === 'workout' && isSameMonth(parseISO(e.date), currentMonth)).length, emoji: '💪', color: 'rgb(var(--primary))' },
              { label: 'Sessions', count: events.filter(e => e.type === 'call' && isSameMonth(parseISO(e.date), currentMonth)).length, emoji: '📞', color: 'rgb(var(--success))' },
              { label: 'Check-ins', count: events.filter(e => e.type === 'checkin' && isSameMonth(parseISO(e.date), currentMonth)).length, emoji: '📋', color: 'rgb(var(--primary))' },
            ].map(stat => (
              <div key={stat.label} className="text-center p-3 rounded-xl" style={{ background: 'rgb(var(--muted))' }}>
                <p className="text-xl mb-0.5">{stat.emoji}</p>
                <p className="font-black text-lg" style={{ color: stat.color }}>{stat.count}</p>
                <p className="text-muted-foreground text-[10px] font-semibold">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}