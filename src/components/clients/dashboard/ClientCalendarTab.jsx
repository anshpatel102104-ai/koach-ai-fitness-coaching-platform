import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { AnimatePresence, motion } from 'framer-motion';
import {
  format, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameDay, isToday, parseISO, isSameMonth,
  startOfMonth, endOfMonth, addMonths, subMonths, addDays
} from 'date-fns';
import {
  ChevronLeft, ChevronRight, Plus, X, ClipboardList,
  Phone, Target, Zap, Scale, Dumbbell, CheckCircle2, Circle, Loader2, RefreshCw, LayoutTemplate
} from 'lucide-react';
import ReactDOM from 'react-dom';
import TemplatePickerSheet from './goals/TemplatePickerSheet';

// ── Event type config ─────────────────────────────────────────────────────────
const TYPES = {
  checkin:  { label: 'Check-in',    color: 'var(--tc-primary)', dot: 'var(--tc-primary)', emoji: '', icon: ClipboardList },
  session:  { label: 'Session',     color: 'var(--tc-success)', dot: 'var(--tc-success)', emoji: '', icon: Phone },
  goal:     { label: 'Goal due',    color: 'var(--tc-warning)', dot: 'var(--tc-warning)', emoji: '', icon: Target },
  habit:    { label: 'Habit',       color: 'var(--tc-ai)', dot: 'var(--tc-ai)', emoji: '', icon: Zap },
  weighin:  { label: 'Weigh-in',    color: 'var(--tc-primary)', dot: 'var(--tc-primary)', emoji: '', icon: Scale },
  workout:  { label: 'Workout',     color: 'var(--tc-muted-foreground)', dot: 'var(--tc-muted-foreground)', emoji: '', icon: Dumbbell },
};

function buildEvents(checkIns, goals, sessions, weighIns, workoutSessions, habits, habitCompletions) {
  const ev = [];
  checkIns.forEach(ci => {
    if (!ci.date) return;
    ev.push({ id: `ci-${ci.id}`, date: ci.date, type: 'checkin', title: 'Check-in',
      done: !!ci.coach_responded || ci.review_status === 'reviewed' });
  });
  sessions.forEach(s => {
    if (!s.date) return;
    ev.push({ id: `se-${s.id}`, date: s.date, type: 'session', title: s.title || 'Session',
      done: s.status === 'completed' });
  });
  goals.forEach(g => {
    if (!g.due_date) return;
    ev.push({ id: `go-${g.id}`, date: g.due_date, type: 'goal', title: g.name,
      done: g.status === 'completed' });
  });
  weighIns.forEach(w => {
    if (!w.date) return;
    ev.push({ id: `wi-${w.id}`, date: w.date, type: 'weighin', title: `${w.weight} lbs`, done: true });
  });
  (workoutSessions || []).forEach(ws => {
    if (!ws.scheduled_date) return;
    ev.push({ id: `ws-${ws.id}`, date: ws.scheduled_date, type: 'workout',
      title: ws.workout_name || 'Workout', done: ws.status === 'completed' });
  });
  // Habits: show each HabitCompletion on its date
  const habitsById = {};
  (habits || []).forEach(h => { habitsById[h.id] = h; });
  (habitCompletions || []).forEach(hc => {
    if (!hc.date) return;
    const habit = habitsById[hc.habit_id];
    const title = habit ? `${habit.emoji ? habit.emoji + ' ' : ''}${habit.name}` : 'Habit';
    ev.push({ id: `hc-${hc.id}`, date: hc.date, type: 'habit', title, done: !!hc.completed });
  });
  return ev;
}

// ── Event chip inside a day cell ──────────────────────────────────────────────
function EventChip({ event }) {
  const cfg = TYPES[event.type] || TYPES.checkin;
  return (
    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold truncate"
      style={{ background: cfg.color + '18', color: cfg.color, border: `1px solid ${cfg.color}30` }}>
      {event.done
        ? <CheckCircle2 className="w-2.5 h-2.5 flex-shrink-0" />
        : <Circle className="w-2.5 h-2.5 flex-shrink-0 opacity-60" />
      }
      <span className="truncate">{event.title}</span>
    </div>
  );
}

// ── Day cell in the weekly grid ───────────────────────────────────────────────
function DayCell({ day, events, onDayClick }) {
  const dayEvents = events.filter(e => isSameDay(parseISO(e.date), day));
  const isT = isToday(day);
  const maxShow = 3;
  const shown = dayEvents.slice(0, maxShow);
  const overflow = dayEvents.length - maxShow;

  return (
    <div
      onClick={() => onDayClick(day)}
      className="border-r border-b border-border p-1.5 cursor-pointer hover:bg-accent/40 transition-colors group relative"
      style={{ minHeight: 90 }}
    >
      {/* Day number */}
      <div className="flex items-center justify-between mb-1">
        <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full
          ${isT ? 'bg-primary text-primary-foreground' : 'text-foreground'}`}>
          {format(day, 'd')}
        </span>
        <button
          onClick={e => { e.stopPropagation(); onDayClick(day); }}
          className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center bg-primary text-primary-foreground transition-opacity"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>

      {/* Events */}
      <div className="space-y-0.5">
        {shown.map(ev => <EventChip key={ev.id} event={ev} />)}
        {overflow > 0 && (
          <p className="text-[11px] text-muted-foreground font-semibold pl-1">+{overflow} more</p>
        )}
      </div>
    </div>
  );
}

// ── Add Event Modal ───────────────────────────────────────────────────────────

const inputCls = "w-full border border-border rounded-lg px-3 py-2 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary/30";

// ── Repeat Options Modal ──────────────────────────────────────────────────────
const DAY_LABELS = ['S','M','T','W','T','F','S'];

function RepeatModal({ repeat, onChange, onClose }) {
  const [freq, setFreq] = useState(repeat.freq || 'weekly');
  const [every, setEvery] = useState(repeat.every || 1);
  const [days, setDays] = useState(repeat.days || [1,3,5]); // Mon, Wed, Fri default
  const [forWeeks, setForWeeks] = useState(repeat.forWeeks || 4);

  const toggleDay = (d) => setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);

  const apply = () => {
    onChange({ freq, every, days, forWeeks });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.12 }}
        className="relative bg-card rounded-xl w-full max-w-sm p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-foreground text-base">Repeat options</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">Frequency</label>
            <select className={inputCls} value={freq} onChange={e => setFreq(e.target.value)}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Every 2 weeks</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          {freq === 'weekly' || freq === 'biweekly' ? (
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">
                Every <select className="border border-border rounded-lg px-2 py-1 text-sm mx-1" value={every} onChange={e => setEvery(Number(e.target.value))}>
                  {[1,2,3,4].map(n => <option key={n} value={n}>{n}</option>)}
                </select> week on
              </label>
              <div className="flex gap-1.5 mt-2">
                {DAY_LABELS.map((d, i) => (
                  <button key={i} onClick={() => toggleDay(i)}
                    className="w-9 h-9 rounded-full text-xs font-bold transition-all"
                    style={{
                      background: days.includes(i) ? 'var(--tc-primary)' : 'var(--tc-muted)',
                      color: days.includes(i) ? 'var(--tc-primary-foreground)' : 'var(--tc-foreground)',
                    }}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
          ) : freq === 'daily' ? (
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">
                Every <select className="border border-border rounded-lg px-2 py-1 text-sm mx-1" value={every} onChange={e => setEvery(Number(e.target.value))}>
                  {[1,2,3].map(n => <option key={n} value={n}>{n}</option>)}
                </select> day(s)
              </label>
            </div>
          ) : null}

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">
              Repeat for <select className="border border-border rounded-lg px-2 py-1 text-sm mx-1" value={forWeeks} onChange={e => setForWeeks(Number(e.target.value))}>
                {[1,2,3,4,6,8,12,16,20,26,39,52,78,104].map(n => <option key={n} value={n}>{n} {n >= 52 ? `(${Math.round(n/52)}yr${n > 52 ? '+' : ''})` : ''}</option>)}
              </select> {freq === 'daily' ? 'weeks' : 'weeks'}
            </label>
          </div>
        </div>

        <button onClick={apply}
          className="w-full mt-5 py-2.5 rounded-xl text-sm font-bold text-primary-foreground"
          style={{ background: 'var(--tc-primary)' }}>
          Apply
        </button>
      </motion.div>
    </div>
  );
}

// ── Generate all dates for a repeat config ────────────────────────────────────
function generateRepeatDates(startDate, repeat) {
  const dates = new Set();
  const totalDays = repeat.forWeeks * 7;
  const intervalWeeks = repeat.every || 1;

  if (repeat.freq === 'daily') {
    for (let i = 0; i < totalDays; i += intervalWeeks) {
      dates.add(format(addDays(startDate, i), 'yyyy-MM-dd'));
    }
  } else if (repeat.freq === 'weekly' || repeat.freq === 'biweekly') {
    const intervalDays = intervalWeeks * 7;
    const startDow = startDate.getDay(); // 0=Sun
    // For each target day-of-week, find its first occurrence >= startDate, then step by intervalDays
    (repeat.days || []).forEach(targetDow => {
      // How many days from startDate to the first occurrence of targetDow
      let offset = targetDow - startDow;
      if (offset < 0) offset += 7;
      // Now step forward by intervalDays
      let d = offset;
      while (d < totalDays) {
        dates.add(format(addDays(startDate, d), 'yyyy-MM-dd'));
        d += intervalDays;
      }
    });
  } else if (repeat.freq === 'monthly') {
    const months = Math.ceil(repeat.forWeeks / 4);
    for (let m = 0; m < months; m++) {
      dates.add(format(addDays(startDate, m * 28), 'yyyy-MM-dd'));
    }
  }

  return [...dates].sort();
}

// ── Activity type config for sidebar ─────────────────────────────────────────
const ACTIVITY_TYPES = [
  { key: 'workout',  label: 'Workout',      emoji: '', color: 'var(--tc-muted-foreground)' },
  { key: 'session',  label: 'Session/Call', emoji: '', color: 'var(--tc-success)' },
  { key: 'goal',     label: 'Goal',         emoji: '', color: 'var(--tc-warning)' },
  { key: 'habit',    label: 'Habit',        emoji: '', color: 'var(--tc-ai)' },
  { key: 'weighin',  label: 'Weigh-in',     emoji: '', color: 'var(--tc-primary)' },
  { key: 'checkin',  label: 'Check-in Form',emoji: '', color: 'var(--tc-primary)' },
];

function WorkoutContent({ date, dateStr, setDateStr, repeat, setShowRepeat, client, onDone }) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [selectedWorkoutIdx, setSelectedWorkoutIdx] = useState('');
  const [note, setNote] = useState('');

  const { data: program, isLoading } = useQuery({
    queryKey: ['cal-program', client?.assigned_program_id],
    queryFn: () => db.entities.WorkoutProgram.filter({ id: client.assigned_program_id }, '-created_date', 1).then(r => r[0]),
    enabled: !!client?.assigned_program_id,
  });

  const workouts = program?.workouts || [];

  const save = async () => {
    if (selectedWorkoutIdx === '') return;
    setSaving(true);
    const workout = workouts[parseInt(selectedWorkoutIdx)];
    const baseDate = parseISO(dateStr);

    let datesToCreate = [dateStr];
    if (repeat) {
      datesToCreate = generateRepeatDates(baseDate, repeat);
    }

    // Batch creates with delay to avoid rate limits
    for (const d of datesToCreate) {
      const session = await db.entities.WorkoutSession.create({
        client_id: client.id,
        program_id: client.assigned_program_id,
        program_name: program?.title,
        workout_name: workout?.day_name || `Day ${workout?.day_number || parseInt(selectedWorkoutIdx) + 1}`,
        scheduled_date: d,
        status: 'scheduled',
        notes: note || undefined,
        exercises: workout?.exercises || [],
        team_id: client.team_id,
      });
      // Sync to Google Calendar
      await db.functions.invoke('googleCalendarProxy', {
        action: 'createEvent',
        event: {
          summary: `${client.name} - ${workout?.day_name || `Day ${workout?.day_number || parseInt(selectedWorkoutIdx) + 1}`}`,
          description: note || `Workout session for ${client.name}`,
          start: { date: d },
          end: { date: d },
        },
      }).catch(() => {}); // Silently fail if Google Calendar isn't connected
      await new Promise(r => setTimeout(r, 50));
    }
    qc.invalidateQueries({ queryKey: ['cal-workoutsessions', client.id] });
    onDone();
  };

  if (!client?.assigned_program_id) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-3xl mb-2"></p>
          <p className="text-sm font-semibold text-foreground">No program assigned</p>
          <p className="text-xs text-muted-foreground mt-1">Assign a workout program to this client first.</p>
        </div>
      </div>
    );
  }

  if (isLoading) return <div className="flex-1 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-[var(--tc-muted-foreground)]" /></div>;

  return (
    <div className="flex-1 flex flex-col justify-between">
      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">Date</label>
          <div className="flex items-center gap-3">
            <input type="date" className={inputCls + ' flex-1'} value={dateStr} onChange={e => setDateStr(e.target.value)} />
            <button onClick={() => setShowRepeat(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline whitespace-nowrap">
              <RefreshCw className="w-3 h-3" />
              {repeat ? `Repeating (${repeat.freq})` : 'Setup repeat'}
            </button>
          </div>
          {repeat && (
            <p className="text-[11px] text-muted-foreground mt-1">
              Will create sessions on multiple dates · <button className="text-destructive hover:underline" onClick={() => setShowRepeat(null)}>Clear</button>
            </p>
          )}
        </div>

        {program && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--tc-muted)] border border-[var(--tc-muted-foreground)]/20">
            <span></span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[var(--tc-muted-foreground)] truncate">{program.title}</p>
              <p className="text-[11px] text-muted-foreground">{workouts.length} workout days</p>
            </div>
          </div>
        )}

        <div>
          <label className="text-xs font-semibold text-foreground block mb-2">Select from current training program</label>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {workouts.map((w, i) => (
              <label key={i} className={`flex items-center gap-3 p-2.5 rounded-xl border-2 cursor-pointer transition-all ${selectedWorkoutIdx === String(i) ? 'border-[var(--tc-muted-foreground)] bg-[var(--tc-muted)]' : 'border-border hover:border-[var(--tc-muted-foreground)]/40'}`}>
                <input type="radio" name="workout_day" value={i} checked={selectedWorkoutIdx === String(i)}
                  onChange={() => setSelectedWorkoutIdx(String(i))} className="accent-[var(--tc-muted-foreground)]" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground">{w.day_name || `Day ${w.day_number || i + 1}`}</p>
                  {w.exercises?.length > 0 && (
                    <p className="text-[11px] text-muted-foreground">{w.exercises.length} exercises</p>
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">Note (optional)</label>
          <input className={inputCls} placeholder="Coaching notes…" value={note} onChange={e => setNote(e.target.value)} />
        </div>
      </div>

      <button onClick={save} disabled={saving || selectedWorkoutIdx === ''}
        className="mt-4 w-full py-2.5 rounded-xl text-sm font-bold text-primary-foreground flex items-center justify-center gap-2 disabled:opacity-50"
        style={{ background: 'var(--tc-primary)' }}>
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        {saving ? 'Adding…' : repeat ? `Add (${generateRepeatDates(parseISO(dateStr), repeat).length} sessions)` : 'Add to Calendar'}
      </button>
    </div>
  );
}

function SessionContent({ dateStr, setDateStr, repeat, setShowRepeat, client, onDone }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState('Coaching Session');
  const [time, setTime] = useState('09:00');
  const [type, setType] = useState('video_call');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const baseDate = parseISO(dateStr);
    const datesToCreate = repeat ? generateRepeatDates(baseDate, repeat) : [dateStr];
    for (const d of datesToCreate) {
      await db.entities.Session.create({ client_id: client.id, client_name: client.name,
        title, date: d, time, session_type: type, status: 'scheduled', team_id: client.team_id });
      // Sync to Google Calendar
      await db.functions.invoke('googleCalendarProxy', {
        action: 'createEvent',
        event: {
          summary: `${client.name} - ${title}`,
          description: `${type.replace(/_/g, ' ')} at ${time}`,
          start: { dateTime: `${d}T${time}:00` },
          end: { dateTime: `${d}T${String(parseInt(time.split(':')[0]) + 1).padStart(2, '0')}:00:00` },
        },
      }).catch(() => {});
      await new Promise(r => setTimeout(r, 50));
    }
    qc.invalidateQueries({ queryKey: ['cal-sessions', client.id] });
    onDone();
  };

  return (
    <div className="flex-1 flex flex-col justify-between">
      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">Date</label>
          <div className="flex items-center gap-3">
            <input type="date" className={inputCls + ' flex-1'} value={dateStr} onChange={e => setDateStr(e.target.value)} />
            <button onClick={() => setShowRepeat(true)} className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline whitespace-nowrap">
              <RefreshCw className="w-3 h-3" />{repeat ? `Repeating` : 'Setup repeat'}
            </button>
          </div>
        </div>
        <div><label className="text-xs font-semibold text-foreground block mb-1">Title</label><input className={inputCls} value={title} onChange={e => setTitle(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className="text-xs font-semibold text-foreground block mb-1">Time</label><input type="time" className={inputCls} value={time} onChange={e => setTime(e.target.value)} /></div>
          <div><label className="text-xs font-semibold text-foreground block mb-1">Type</label>
            <select className={inputCls} value={type} onChange={e => setType(e.target.value)}>
              <option value="video_call">Video call</option>
              <option value="phone_call">Phone call</option>
              <option value="in_person">In person</option>
            </select>
          </div>
        </div>
      </div>
      <button onClick={save} disabled={saving} className="mt-4 w-full py-2.5 rounded-xl text-sm font-bold text-primary-foreground flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: 'var(--tc-primary)' }}>
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}{saving ? 'Adding…' : 'Add to Calendar'}
      </button>
    </div>
  );
}



const GOAL_TYPES = [
  { key: 'numeric', label: 'Numeric' },
  { key: 'simple',  label: 'Simple'  },
  { key: 'nutrition', label: 'Nutrition' },
];

function HabitContent({ dateStr, setDateStr, repeat, setShowRepeat, client, onDone }) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const [frequency, setFrequency] = useState('daily');
  const [daysOfWeek, setDaysOfWeek] = useState([1, 2, 3, 4, 5]);

  const QUICK_HABITS = [
    { name: 'Morning vitamins', emoji: '💊' },
    { name: 'Drink 3L water',   emoji: '💧' },
    { name: 'Sleep 8hrs',       emoji: '😴' },
    { name: '10k steps',        emoji: '👟' },
    { name: 'Workout',          emoji: '🏋️' },
    { name: 'Meditate',         emoji: '🧘' },
  ];

  const toggleDay = (d) => setDaysOfWeek(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    // Create one Habit record (habits are recurring by nature)
    const habit = await db.entities.Habit.create({
      client_id: client.id,
      name: name.trim(),
      emoji: emoji || undefined,
      frequency,
      days_of_week: frequency === 'custom' ? daysOfWeek : [],
      is_active: true,
      team_id: client.team_id,
    });
    // Create HabitCompletion placeholder records for the scheduled dates so they appear on the calendar
    const baseDate = parseISO(dateStr);
    const datesToCreate = repeat ? generateRepeatDates(baseDate, repeat) : [dateStr];
    for (const d of datesToCreate) {
      await db.entities.HabitCompletion.create({
        habit_id: habit.id,
        client_id: client.id,
        date: d,
        completed: false,
        team_id: client.team_id,
      });
      await new Promise(r => setTimeout(r, 50));
    }
    qc.invalidateQueries({ queryKey: ['habits', client.id] });
    qc.invalidateQueries({ queryKey: ['habit-completions', client.id] });
    onDone();
  };

  return (
    <div className="flex-1 flex flex-col justify-between">
      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">Start date</label>
          <div className="flex items-center gap-3">
            <input type="date" className={inputCls + ' flex-1'} value={dateStr} onChange={e => setDateStr(e.target.value)} />
            <button onClick={() => setShowRepeat(true)} className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline whitespace-nowrap">
              <RefreshCw className="w-3 h-3" />{repeat ? `Repeating (${repeat.freq})` : 'Setup repeat'}
            </button>
          </div>
          {repeat && (
            <p className="text-[11px] text-muted-foreground mt-1">
              Will create {generateRepeatDates(parseISO(dateStr), repeat).length} habit entries ·{' '}
              <button className="text-destructive hover:underline" onClick={() => setShowRepeat(null)}>Clear</button>
            </p>
          )}
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground block mb-1.5">Quick add</label>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_HABITS.map(s => (
              <button key={s.name} onClick={() => { setName(s.name); setEmoji(s.emoji); }}
                className={`text-xs px-2.5 py-1 rounded-full border font-semibold transition-colors ${name === s.name ? 'border-ai bg-ai/10 text-ai' : 'border-border text-muted-foreground hover:bg-ai/10'}`}>
                {s.emoji} {s.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">Habit name</label>
          <div className="flex gap-2">
            <input type="text" maxLength={2} value={emoji} onChange={e => setEmoji(e.target.value)}
              placeholder="😀" className={inputCls + ' w-12 text-center text-base'} />
            <input className={inputCls + ' flex-1'} placeholder="e.g. Morning vitamins" value={name} onChange={e => setName(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground block mb-2">Frequency</label>
          <div className="flex gap-2 mb-2">
            {[{ key: 'daily', label: 'Every day' }, { key: 'custom', label: 'Specific days' }].map(f => (
              <button key={f.key} onClick={() => setFrequency(f.key)}
                className={`flex-1 py-1.5 text-xs font-bold rounded-xl border-2 transition-all ${frequency === f.key ? 'border-ai bg-ai/10 text-ai' : 'border-border text-muted-foreground'}`}>
                {f.label}
              </button>
            ))}
          </div>
          {frequency === 'custom' && (
            <div className="flex gap-1.5">
              {DAY_LABELS.map((d, i) => (
                <button key={i} onClick={() => toggleDay(i)}
                  className="w-8 h-8 rounded-full text-xs font-bold transition-all"
                  style={{ background: daysOfWeek.includes(i) ? 'var(--tc-ai)' : 'var(--tc-muted)', color: daysOfWeek.includes(i) ? 'var(--tc-primary-foreground)' : 'var(--tc-foreground)' }}>
                  {d}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <button onClick={save} disabled={saving || !name.trim()}
        className="mt-4 w-full py-2.5 rounded-xl text-sm font-bold text-primary-foreground flex items-center justify-center gap-2 disabled:opacity-50"
        style={{ background: 'var(--tc-primary)' }}>
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        {saving ? 'Adding…' : repeat ? `Add habit (${generateRepeatDates(parseISO(dateStr), repeat).length})` : 'Add habit'}
      </button>
    </div>
  );
}

function GoalContent({ dateStr, setDateStr, repeat, setShowRepeat, client, onDone }) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [goalType, setGoalType] = useState('simple');
  const [targetValue, setTargetValue] = useState('');
  const [unit, setUnit] = useState('');
  const [note, setNote] = useState('');
  const [appliedTemplate, setAppliedTemplate] = useState(null);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  const applyTemplate = (tmpl) => {
    setAppliedTemplate(tmpl);
    setName(tmpl.name || '');
    setGoalType(tmpl.goal_type || 'simple');
    setTargetValue(tmpl.target_value ?? '');
    setUnit(tmpl.unit || '');
    setNote(tmpl.notes || '');
    setShowTemplatePicker(false);
  };

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const baseDate = parseISO(dateStr);
    const datesToCreate = repeat ? generateRepeatDates(baseDate, repeat) : [dateStr];
    for (const d of datesToCreate) {
      const payload = {
        client_id: client.id,
        name: name.trim(),
        goal_type: goalType,
        status: 'active',
        team_id: client.team_id,
        due_date: d,
        notes: note || undefined,
      };
      if (goalType === 'numeric') {
        payload.target_value = targetValue !== '' ? Number(targetValue) : undefined;
        payload.unit = unit || undefined;
      }
      await db.entities.Goal.create(payload);
      await new Promise(r => setTimeout(r, 50));
    }
    qc.invalidateQueries({ queryKey: ['cal-goals', client.id] });
    onDone();
  };

  return (
    <>
      <div className="flex-1 flex flex-col justify-between">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">Due date</label>
            <div className="flex items-center gap-3">
              <input type="date" className={inputCls + ' flex-1'} value={dateStr} onChange={e => setDateStr(e.target.value)} />
              <button onClick={() => setShowRepeat(true)} className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline whitespace-nowrap">
                <RefreshCw className="w-3 h-3" />{repeat ? `Repeating (${repeat.freq})` : 'Setup repeat'}
              </button>
            </div>
            {repeat && (
              <p className="text-[11px] text-muted-foreground mt-1">
                Will create {generateRepeatDates(parseISO(dateStr), repeat).length} goals ·{' '}
                <button className="text-destructive hover:underline" onClick={() => setShowRepeat(null)}>Clear</button>
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">Goal template</label>
            <button
              onClick={() => setShowTemplatePicker(true)}
              className="w-full flex items-center gap-2 border border-border rounded-lg px-3 py-2 text-sm bg-card hover:bg-muted transition-colors text-left"
            >
              <LayoutTemplate className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className={appliedTemplate ? 'text-foreground font-semibold' : 'text-muted-foreground'}>
                {appliedTemplate ? appliedTemplate.name : '— Choose a template —'}
              </span>
            </button>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">Goal type</label>
            <div className="flex gap-1.5">
              {GOAL_TYPES.map(gt => (
                <button key={gt.key} onClick={() => setGoalType(gt.key)}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg border-2 transition-all ${goalType === gt.key ? 'border-warning bg-warning/10 text-warning' : 'border-border text-muted-foreground'}`}>
                  {gt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">Goal name</label>
            <input className={inputCls} placeholder="e.g. Reach 175 lbs" value={name} onChange={e => setName(e.target.value)} />
          </div>

          {goalType === 'numeric' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Target value</label>
                <input type="number" className={inputCls} placeholder="175" value={targetValue} onChange={e => setTargetValue(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Unit</label>
                <input className={inputCls} placeholder="lbs, steps…" value={unit} onChange={e => setUnit(e.target.value)} />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">Notes (optional)</label>
            <input className={inputCls} placeholder="Any context…" value={note} onChange={e => setNote(e.target.value)} />
          </div>
        </div>

        <button onClick={save} disabled={saving || !name.trim()}
          className="mt-4 w-full py-2.5 rounded-xl text-sm font-bold text-primary-foreground flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ background: 'var(--tc-primary)' }}>
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {saving ? 'Adding…' : repeat ? `Add Goal (${generateRepeatDates(parseISO(dateStr), repeat).length})` : 'Add Goal to Calendar'}
        </button>
      </div>

      {showTemplatePicker && ReactDOM.createPortal(
        <TemplatePickerSheet onSelect={applyTemplate} onClose={() => setShowTemplatePicker(false)} />,
        document.body
      )}
    </>
  );
}



function CheckInContent({ dateStr, setDateStr, repeat, setShowRepeat, client, onDone }) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [formId, setFormId] = useState('');
  const [note, setNote] = useState('');

  const { data: checkInForms = [] } = useQuery({
    queryKey: ['checkin-forms'],
    queryFn: () => db.entities.CheckInForm.filter({ is_active: true }, '-created_date', 50),
  });

  const save = async () => {
    setSaving(true);
    const baseDate = parseISO(dateStr);
    const datesToCreate = repeat ? generateRepeatDates(baseDate, repeat) : [dateStr];
    for (const d of datesToCreate) {
      await db.entities.CheckIn.create({
        client_id: client.id,
        client_name: client.name,
        date: d,
        review_status: 'pending',
        coach_notes: note || undefined,
        form_id: formId || undefined,
        team_id: client.team_id,
      });
      await new Promise(r => setTimeout(r, 50));
    }
    qc.invalidateQueries({ queryKey: ['cal-checkins', client.id] });
    onDone();
  };

  const selectedForm = checkInForms.find(f => f.id === formId);

  return (
    <div className="flex-1 flex flex-col justify-between">
      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">Date</label>
          <div className="flex items-center gap-3">
            <input type="date" className={inputCls + ' flex-1'} value={dateStr} onChange={e => setDateStr(e.target.value)} />
            <button onClick={() => setShowRepeat(true)} className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline whitespace-nowrap">
              <RefreshCw className="w-3 h-3" />{repeat ? `Repeating (${repeat.freq})` : 'Setup repeat'}
            </button>
          </div>
          {repeat && (
            <p className="text-[11px] text-muted-foreground mt-1">
              Will create {generateRepeatDates(parseISO(dateStr), repeat).length} check-ins ·{' '}
              <button className="text-destructive hover:underline" onClick={() => setShowRepeat(null)}>Clear</button>
            </p>
          )}
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">Check-in Form</label>
          <select className={inputCls} value={formId} onChange={e => setFormId(e.target.value)}>
            <option value="">— No specific form (general check-in) —</option>
            {checkInForms.map(f => (
              <option key={f.id} value={f.id}>{f.name}{f.frequency ? ` · ${f.frequency.replace('_', ' ')}` : ''}</option>
            ))}
          </select>
          {selectedForm && (
            <p className="text-[11px] text-muted-foreground mt-1">
              {selectedForm.questions?.length || 0} questions · {selectedForm.frequency?.replace('_', ' ')}
            </p>
          )}
          {checkInForms.length === 0 && (
            <p className="text-[11px] text-muted-foreground mt-1">No forms created yet — a general check-in will be scheduled.</p>
          )}
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">Coach note (optional)</label>
          <input className={inputCls} placeholder="Any notes for this check-in…" value={note} onChange={e => setNote(e.target.value)} />
        </div>
      </div>

      <button onClick={save} disabled={saving}
        className="mt-4 w-full py-2.5 rounded-xl text-sm font-bold text-primary-foreground flex items-center justify-center gap-2 disabled:opacity-50"
        style={{ background: 'var(--tc-primary)' }}>
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        {saving ? 'Scheduling…' : repeat ? `Schedule (${generateRepeatDates(parseISO(dateStr), repeat).length} check-ins)` : 'Schedule Check-in'}
      </button>
    </div>
  );
}

function WeighInContent({ dateStr, setDateStr, repeat, setShowRepeat, client, onDone }) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState('');

  const save = async () => {
    setSaving(true);
    const baseDate = parseISO(dateStr);
    const datesToCreate = repeat ? generateRepeatDates(baseDate, repeat) : [dateStr];
    for (const d of datesToCreate) {
      // weight=0 signals a "scheduled / pending" weigh-in that the client will fill in themselves
      await db.entities.WeighIn.create({
        client_id: client.id,
        weight: 0,
        date: d,
        note: note || undefined,
        team_id: client.team_id,
      });
      await new Promise(r => setTimeout(r, 50));
    }
    qc.invalidateQueries({ queryKey: ['cal-weighins', client.id] });
    onDone();
  };

  return (
    <div className="flex-1 flex flex-col justify-between">
      <div className="space-y-4">
        <div className="p-3 rounded-xl bg-accent border border-accent">
          <p className="text-xs font-semibold text-primary">Scheduled by coach</p>
          <p className="text-xs text-primary mt-0.5">This will appear in the client's calendar as a pending weigh-in task. The client logs their own weight in their portal.</p>
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">Date</label>
          <div className="flex items-center gap-3">
            <input type="date" className={inputCls + ' flex-1'} value={dateStr} onChange={e => setDateStr(e.target.value)} />
            <button onClick={() => setShowRepeat(true)} className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline whitespace-nowrap">
              <RefreshCw className="w-3 h-3" />{repeat ? `Repeating (${repeat.freq})` : 'Setup repeat'}
            </button>
          </div>
          {repeat && (
            <p className="text-[11px] text-muted-foreground mt-1">
              Will create {generateRepeatDates(parseISO(dateStr), repeat).length} weigh-in prompts ·{' '}
              <button className="text-destructive hover:underline" onClick={() => setShowRepeat(null)}>Clear</button>
            </p>
          )}
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">Coach note (optional)</label>
          <input className={inputCls} placeholder="e.g. Morning weigh-in, fasted" value={note} onChange={e => setNote(e.target.value)} />
        </div>
      </div>

      <button onClick={save} disabled={saving}
        className="mt-4 w-full py-2.5 rounded-xl text-sm font-bold text-primary-foreground flex items-center justify-center gap-2 disabled:opacity-50"
        style={{ background: 'var(--tc-primary)' }}>
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        {saving ? 'Scheduling…' : repeat ? `Schedule (${generateRepeatDates(parseISO(dateStr), repeat).length} prompts)` : 'Schedule Weigh-in'}
      </button>
    </div>
  );
}

function AddEventModal({ day, client, onClose }) {
  const [activeType, setActiveType] = useState('workout');
  const [dateStr, setDateStr] = useState(format(day, 'yyyy-MM-dd'));
  const [repeat, setRepeat] = useState(null);
  const [showRepeat, setShowRepeat] = useState(false);

  const renderContent = () => {
    if (activeType === 'workout') {
      return <WorkoutContent dateStr={dateStr} setDateStr={setDateStr} repeat={repeat} setShowRepeat={setShowRepeat} client={client} onDone={onClose} />;
    }
    if (activeType === 'session') {
      return <SessionContent dateStr={dateStr} setDateStr={setDateStr} repeat={repeat} setShowRepeat={setShowRepeat} client={client} onDone={onClose} />;
    }
    if (activeType === 'goal') {
      return <GoalContent dateStr={dateStr} setDateStr={setDateStr} repeat={repeat} setShowRepeat={setShowRepeat} client={client} onDone={onClose} />;
    }
    if (activeType === 'habit') {
      return <HabitContent dateStr={dateStr} setDateStr={setDateStr} repeat={repeat} setShowRepeat={setShowRepeat} client={client} onDone={onClose} />;
    }
    if (activeType === 'checkin') {
      return <CheckInContent dateStr={dateStr} setDateStr={setDateStr} repeat={repeat} setShowRepeat={setShowRepeat} client={client} onDone={onClose} />;
    }
    if (activeType === 'weighin') {
      return <WeighInContent dateStr={dateStr} setDateStr={setDateStr} repeat={repeat} setShowRepeat={setShowRepeat} client={client} onDone={onClose} />;
    }
    return null;
  };

  return (
    <>
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" onClick={onClose}>
        <div className="absolute inset-0 bg-black/50" />
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.14 }}
          className="relative bg-card rounded-xl w-full max-w-lg overflow-hidden flex flex-col"
          style={{ maxHeight: '90vh' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h3 className="font-bold text-foreground text-lg">Add activity</h3>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  // trigger save from content (handled by individual content components)
                }}
                className="px-4 py-1.5 rounded-lg text-sm font-bold text-primary-foreground"
                style={{ background: 'var(--tc-primary)', opacity: 0.9 }}
              >
                Add
              </button>
              <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Body: sidebar + content */}
          <div className="flex flex-1 overflow-hidden" style={{ minHeight: 400 }}>
            {/* Left sidebar */}
            <div className="w-44 border-r border-border bg-background flex-shrink-0 overflow-y-auto">
              {ACTIVITY_TYPES.map(t => (
                <button key={t.key} onClick={() => setActiveType(t.key)}
                  className={`w-full flex items-center gap-2.5 px-3 py-3 text-left text-sm font-semibold transition-colors border-l-2 ${
                    activeType === t.key
                      ? 'bg-card border-l-[var(--tc-primary)] text-foreground'
                      : 'border-l-transparent text-muted-foreground hover:bg-card hover:text-foreground'
                  }`}
                >
                  <input type="checkbox" readOnly checked={activeType === t.key}
                    className="w-3.5 h-3.5 rounded accent-[var(--tc-primary)] flex-shrink-0" />
                  <span className="text-xs leading-tight">{t.label}</span>
                </button>
              ))}
            </div>

            {/* Right content */}
            <div className="flex-1 p-5 overflow-y-auto flex flex-col">
              <AnimatePresence mode="wait">
                <div key={activeType} className="flex flex-col flex-1">
                  {renderContent()}
                </div>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Repeat modal */}
      <AnimatePresence>
        {showRepeat && (
          <RepeatModal
            repeat={repeat || {}}
            onChange={r => setRepeat(r)}
            onClose={() => setShowRepeat(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ── LEGEND ────────────────────────────────────────────────────────────────────
function Legend() {
  return (
    <div className="flex flex-wrap gap-2 px-4 py-2 border-b border-border bg-background">
      <span className="text-[11px] font-bold text-muted-foreground mr-1 self-center">LEGEND</span>
      {Object.entries(TYPES).map(([key, cfg]) => (
        <span key={key} className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: cfg.color }}>
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: cfg.dot }} />
          {cfg.label}
        </span>
      ))}
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function ClientCalendarTab({ client }) {
  const [viewDate, setViewDate] = useState(new Date());
  const [activeDay, setActiveDay] = useState(null);

  const { data: checkIns = [] } = useQuery({
    queryKey: ['cal-checkins', client?.id],
    queryFn: () => db.entities.CheckIn.filter({ client_id: client.id }, '-date', 150),
    enabled: !!client?.id,
  });
  const { data: goals = [] } = useQuery({
    queryKey: ['cal-goals', client?.id],
    queryFn: () => db.entities.Goal.filter({ client_id: client.id }, '-created_date', 50),
    enabled: !!client?.id,
  });
  const { data: sessions = [] } = useQuery({
    queryKey: ['cal-sessions', client?.id],
    queryFn: () => db.entities.Session.filter({ client_id: client.id }, '-date', 50),
    enabled: !!client?.id,
  });
  const { data: weighIns = [] } = useQuery({
    queryKey: ['cal-weighins', client?.id],
    queryFn: () => db.entities.WeighIn.filter({ client_id: client.id }, '-date', 150),
    enabled: !!client?.id,
  });
  const { data: workoutSessions = [] } = useQuery({
    queryKey: ['cal-workoutsessions', client?.id],
    queryFn: () => db.entities.WorkoutSession.filter({ client_id: client.id }, '-scheduled_date', 150),
    enabled: !!client?.id,
  });
  const { data: habits = [] } = useQuery({
    queryKey: ['habits', client?.id],
    queryFn: () => db.entities.Habit.filter({ client_id: client.id }),
    enabled: !!client?.id,
  });
  const { data: habitCompletions = [] } = useQuery({
    queryKey: ['habit-completions', client?.id],
    queryFn: () => db.entities.HabitCompletion.filter({ client_id: client.id }),
    enabled: !!client?.id,
  });

  const events = useMemo(() => buildEvents(checkIns, goals, sessions, weighIns, workoutSessions, habits, habitCompletions),
    [checkIns, goals, sessions, weighIns, workoutSessions, habits, habitCompletions]);

  // Build weeks for this month (Mon–Sun grid)
  const weeks = useMemo(() => {
    const monthStart = startOfMonth(viewDate);
    const monthEnd = endOfMonth(viewDate);
    // Pad to full weeks starting Monday
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const allDays = eachDayOfInterval({ start: gridStart, end: gridEnd });
    const result = [];
    for (let i = 0; i < allDays.length; i += 7) {
      result.push(allDays.slice(i, i + 7));
    }
    return result;
  }, [viewDate]);

  const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Summary stats
  const monthEvents = useMemo(() => {
    const ms = startOfMonth(viewDate);
    const me = endOfMonth(viewDate);
    return events.filter(e => {
      const d = parseISO(e.date);
      return d >= ms && d <= me;
    });
  }, [events, viewDate]);

  const stats = [
    { label: 'Workouts',  count: monthEvents.filter(e => e.type === 'workout').length,   color: 'var(--tc-muted-foreground)', emoji: '' },
    { label: 'Check-ins', count: monthEvents.filter(e => e.type === 'checkin').length,   color: 'var(--tc-primary)', emoji: '' },
    { label: 'Sessions',  count: monthEvents.filter(e => e.type === 'session').length,   color: 'var(--tc-success)', emoji: '' },
    { label: 'Weigh-ins', count: monthEvents.filter(e => e.type === 'weighin').length,   color: 'var(--tc-primary)', emoji: '' },
    { label: 'Goals',     count: monthEvents.filter(e => e.type === 'goal').length,      color: 'var(--tc-warning)', emoji: '' },
  ];

  return (
    <div className="h-full flex flex-col bg-card overflow-hidden">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={() => setViewDate(d => subMonths(d, 1))}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted border border-border transition-colors">
            <ChevronLeft className="w-4 h-4 text-foreground" />
          </button>
          <h2 className="font-bold text-foreground text-sm min-w-[130px] text-center">
            {format(viewDate, 'MMMM yyyy')}
          </h2>
          <button onClick={() => setViewDate(d => addMonths(d, 1))}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted border border-border transition-colors">
            <ChevronRight className="w-4 h-4 text-foreground" />
          </button>
          <button onClick={() => setViewDate(new Date())}
            className="ml-1 px-2.5 py-1 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted transition-colors">
            Today
          </button>
        </div>

        {/* Stats */}
        <div className="hidden md:flex items-center gap-3">
          {stats.map(s => (
            <div key={s.label} className="flex items-center gap-1.5">
              <span className="font-bold text-sm" style={{ color: s.color }}>{s.count}</span>
              <span className="text-[11px] text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </div>

        <button onClick={() => setActiveDay(new Date())}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-primary-foreground"
          style={{ background: 'var(--tc-primary)' }}>
          <Plus className="w-3.5 h-3.5" /> Add event
        </button>
      </div>

      {/* ── Legend ── */}
      <Legend />

      {/* ── Day-of-week headers ── */}
      <div className="grid grid-cols-7 border-b border-border flex-shrink-0">
        {DAY_HEADERS.map(d => (
          <div key={d} className="py-2 text-center text-[11px] font-bold text-muted-foreground border-r border-border last:border-r-0">
            {d}
          </div>
        ))}
      </div>

      {/* ── Calendar grid ── */}
      <div className="flex-1 overflow-y-auto">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b border-border last:border-b-0">
            {week.map((day, di) => {
              const inMonth = isSameMonth(day, viewDate);
              return (
                <div key={di} className={`${!inMonth ? 'bg-background opacity-50' : ''}`}>
                  <DayCell day={day} events={events} onDayClick={setActiveDay} />
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* ── Add Event modal ── */}
      <AnimatePresence>
        {activeDay && (
          <AddEventModal
            day={activeDay}
            client={client}
            onClose={() => setActiveDay(null)}
          />
        )}
      </AnimatePresence>

      {/* HabitFormModal is handled inside AddEventModal via portal — no duplicate needed */}
    </div>
  );
}