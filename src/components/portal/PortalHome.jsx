import React, { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabasePortal as base44 } from '@/api/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { format, differenceInDays, parseISO, addDays } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, ChevronRight, Play, Check, User } from 'lucide-react';

function PortalBellButton({ navigate, userId }) {
  const { data: notifs = [] } = useQuery({
    queryKey: ['portal-notifications', userId],
    queryFn: () => base44.entities.Notification.filter({ recipient_id: userId, is_dismissed: false }, '-created_date', 30),
    enabled: !!userId,
    refetchInterval: 30000,
  });
  const unread = notifs.filter(n => !n.is_read).length;
  return (
    <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate('/portal/notifications')}
      className="relative w-10 h-10 rounded-xl flex items-center justify-center"
      style={{ background: unread > 0 ? 'rgb(var(--accent))' : 'rgb(var(--muted))', border: `1px solid ${unread > 0 ? 'rgb(var(--accent))' : 'rgb(var(--border))'}` }}>
      <Bell className="w-5 h-5" style={{ color: unread > 0 ? 'rgb(var(--primary))' : 'rgb(var(--muted-foreground))' }} />
      {unread > 0 && (
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive flex items-center justify-center"
          style={{ boxShadow: '0 0 0 2px white' }}>
          <span className="text-[9px] font-black text-white">{unread > 9 ? '9+' : unread}</span>
        </motion.div>
      )}
    </motion.button>
  );
}

const TODAY = format(new Date(), 'yyyy-MM-dd');
const DEFAULT_LOG = { workout_done: false, meals_logged: 0, water_glasses: 0 };

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getWorkoutGradient(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('push') || n.includes('chest') || n.includes('shoulder')) return 'linear-gradient(135deg, rgb(var(--primary)) 0%, rgb(var(--ai)) 100%)';
  if (n.includes('pull') || n.includes('back') || n.includes('bicep')) return 'linear-gradient(135deg, #0F766E 0%, rgb(var(--primary)) 100%)';
  if (n.includes('leg') || n.includes('squat') || n.includes('glute')) return 'linear-gradient(135deg, rgb(var(--ai)) 0%, #DB2777 100%)';
  if (n.includes('rest') || n.includes('recover')) return 'linear-gradient(135deg, rgb(var(--muted-foreground)) 0%, rgb(var(--foreground)) 100%)';
  return 'linear-gradient(135deg, rgb(var(--primary)) 0%, rgb(var(--ai)) 100%)';
}

/* ── Daily Rings ── */
function DailyRings({ workoutDone, mealsLogged, totalMeals, waterGlasses, waterGoal, navigate }) {
  const rings = [
    { label: 'Move', pct: workoutDone ? 100 : 0, color: 'rgb(var(--primary))', trackColor: 'rgb(var(--accent))', icon: '💪', path: '/portal/workouts' },
    { label: 'Eat', pct: Math.min(100, Math.round((mealsLogged / Math.max(totalMeals, 1)) * 100)), color: 'rgb(var(--success))', trackColor: 'rgb(var(--success))', icon: '🥗', path: '/portal/nutrition' },
    { label: 'Hydrate', pct: Math.min(100, Math.round((waterGlasses / waterGoal) * 100)), color: '#06B6D4', trackColor: '#CFFAFE', icon: '💧', path: '/portal/nutrition' },
  ];
  const doneCount = rings.filter(r => r.pct >= 100).length;
  const allDone = doneCount === 3;

  return (
    <div className="px-4">
      <div className="bg-card rounded-3xl p-5" style={{ boxShadow: '0 2px 20px rgba(0,0,0,0.06)', border: '1px solid rgb(var(--muted))' }}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Daily Goals</p>
          <p className="text-xs font-semibold text-muted-foreground">{doneCount} of 3 complete</p>
        </div>
        <div className="flex items-center justify-around">
          {rings.map((ring, i) => {
            const r = 26; const circ = 2 * Math.PI * r;
            return (
              <motion.button key={ring.label} onClick={() => navigate(ring.path)} whileTap={{ scale: 0.93 }}
                className="flex flex-col items-center gap-2">
                <div className="relative w-20 h-20">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r={r} fill="none" stroke={ring.trackColor} strokeWidth="6" />
                    <motion.circle cx="32" cy="32" r={r} fill="none" stroke={ring.color} strokeWidth="6"
                      strokeLinecap="round" strokeDasharray={circ}
                      initial={{ strokeDashoffset: circ }}
                      animate={{ strokeDashoffset: circ - (ring.pct / 100) * circ }}
                      transition={{ duration: 1, delay: i * 0.15, ease: 'easeOut' }} />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-2xl">{ring.icon}</div>
                  {ring.pct >= 100 && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: ring.color }}>
                      <Check className="w-3 h-3 text-white" strokeWidth={3} />
                    </motion.div>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-foreground text-xs font-bold">{ring.label}</p>
                  <p className="text-xs font-semibold" style={{ color: ring.pct >= 100 ? ring.color : 'rgb(var(--muted-foreground))' }}>{ring.pct}%</p>
                </div>
              </motion.button>
            );
          })}
        </div>
        <AnimatePresence>
          {allDone && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className="mt-4 py-2.5 rounded-2xl text-center"
              style={{ background: 'linear-gradient(135deg, rgb(var(--success)), rgb(var(--accent)))', border: '1px solid #A7F3D0' }}>
              <p className="text-success font-bold text-sm">🎉 Perfect Day! All goals complete!</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ── Stats Chips ── */
function StatsChips({ streak, weight, weeklyWorkouts, daysUntilCheckIn, navigate }) {
  const checkInColor = daysUntilCheckIn !== null && daysUntilCheckIn <= 0 ? 'rgb(var(--destructive))' : daysUntilCheckIn !== null && daysUntilCheckIn <= 2 ? 'rgb(var(--warning))' : 'rgb(var(--foreground))';
  const checkInLabel = daysUntilCheckIn === null ? '—' : daysUntilCheckIn <= 0 ? 'Due today!' : `in ${daysUntilCheckIn}d`;
  const displayWeight = weight && weight > 0 && weight < 999 ? `${Number(weight).toFixed(1)} lbs` : '—';

  const chips = [
    { emoji: '🔥', value: `${streak}d`, label: 'Streak', path: '/portal/progress', valueColor: streak > 0 ? 'rgb(var(--warning))' : 'rgb(var(--foreground))' },
    { emoji: '⚖️', value: displayWeight, label: 'Weight', path: '/portal/progress', valueColor: 'rgb(var(--foreground))' },
    { emoji: '💪', value: weeklyWorkouts, label: 'This week', path: '/portal/workouts', valueColor: 'rgb(var(--primary))' },
    { emoji: '📋', value: checkInLabel, label: 'Check-in', path: '/portal/checkin', valueColor: checkInColor },
  ];

  return (
    <div className="px-4">
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
        {chips.map(chip => (
          <motion.button key={chip.label} whileTap={{ scale: 0.95 }} onClick={() => navigate(chip.path)}
            className="flex-shrink-0 bg-card flex items-center gap-3 px-4 py-3 rounded-2xl"
            style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgb(var(--muted))' }}>
            <span className="text-lg">{chip.emoji}</span>
            <div className="text-left">
              <p className="font-extrabold text-sm leading-none" style={{ color: chip.valueColor }}>{chip.value}</p>
              <p className="text-muted-foreground text-[10px] mt-0.5">{chip.label}</p>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

/* ── Today's Focus Card ── */
function TodayFocusCard({ workout, program, workoutDone, onStart }) {
  const gradient = getWorkoutGradient(workout?.day_name);
  const exercises = workout?.exercises || [];
  const isRest = !workout || (workout?.day_name || '').toLowerCase().includes('rest');

  if (workoutDone) {
    return (
      <div className="px-4">
        <div className="rounded-3xl p-5 overflow-hidden"
          style={{ background: 'linear-gradient(135deg, rgb(var(--success)), rgb(var(--success)))', border: '1px solid #A7F3D0', boxShadow: '0 4px 24px rgb(var(--success) / 0.12)' }}>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-success flex items-center justify-center text-2xl flex-shrink-0">🎉</div>
            <div>
              <p className="text-success font-black text-lg">Workout Complete!</p>
              <p className="text-success text-sm mt-0.5">{workout?.day_name || 'Great work today'}</p>
              <p className="text-success text-xs mt-1 font-semibold">Keep the momentum going 🔥</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isRest) {
    return (
      <div className="px-4">
        <div className="rounded-3xl p-5" style={{ background: 'linear-gradient(135deg, rgb(var(--muted)), rgb(var(--muted)))', border: '1px solid rgb(var(--border))', boxShadow: '0 2px 20px rgba(0,0,0,0.05)' }}>
          <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mb-3">TODAY</p>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-border flex items-center justify-center text-3xl flex-shrink-0">🛌</div>
            <div>
              <p className="text-foreground font-black text-xl">Rest & Recover</p>
              <p className="text-muted-foreground text-sm mt-0.5">Recovery is where progress happens</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl overflow-hidden"
        style={{ background: gradient, boxShadow: '0 8px 32px rgb(var(--primary) / 0.3)' }}>
        <div className="p-5" style={{ background: 'rgba(0,0,0,0.12)' }}>
          <div className="mb-4">
            <span className="inline-block px-3 py-1 rounded-full text-[10px] font-black text-white/80 uppercase tracking-widest mb-3"
              style={{ background: 'rgba(255,255,255,0.18)' }}>
              TODAY'S WORKOUT
            </span>
            <h2 className="text-white font-black text-3xl leading-tight">{workout.day_name}</h2>
            {program && <p className="text-white/60 text-sm mt-1">{program.title}</p>}
          </div>

          <div className="flex items-center gap-3 text-white/60 text-xs mb-4">
            <span>🏋️ {exercises.length} exercises</span>
            <span>·</span>
            <span>⏱ ~{Math.max(30, exercises.length * 4)} min</span>
          </div>

          {exercises.length > 0 && (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-5">
              {exercises.slice(0, 3).map((ex, i) => (
                <span key={i} className="flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold text-white"
                  style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.25)' }}>
                  {ex.name}
                </span>
              ))}
              {exercises.length > 3 && (
                <span className="flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold text-white/60"
                  style={{ background: 'rgba(255,255,255,0.1)' }}>
                  +{exercises.length - 3}
                </span>
              )}
            </div>
          )}

          <motion.button whileTap={{ scale: 0.97 }} onClick={onStart}
            className="w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2"
            style={{ background: 'rgba(255,255,255,0.95)', color: 'rgb(var(--primary))', boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}>
            <Play className="w-5 h-5" fill="rgb(var(--primary))" />
            Start Workout →
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

/* ── Coach Message Card ── */
function CoachMsgCard({ msg, navigate }) {
  if (!msg) return null;
  const age = msg.created_date ? differenceInDays(new Date(), new Date(msg.created_date)) : null;
  if (age !== null && age > 2) return null;
  const timeStr = msg.created_date ? format(new Date(msg.created_date), 'h:mm a') : '';

  return (
    <div className="px-4">
      <motion.button whileTap={{ scale: 0.98 }} onClick={() => navigate('/portal/messages')}
        className="w-full bg-card rounded-2xl p-4 text-left flex items-center gap-3"
        style={{ boxShadow: '0 2px 20px rgb(var(--primary) / 0.08)', border: '1px solid rgb(var(--accent))', borderLeft: '4px solid rgb(var(--primary))' }}>
        <div className="relative flex-shrink-0">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--ai)))' }}>C</div>
          <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-success border-2 border-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-foreground font-bold text-sm">Your Coach</p>
            <p className="text-muted-foreground text-[10px]">{timeStr}</p>
          </div>
          <p className="text-muted-foreground text-xs mt-0.5 line-clamp-1">{msg.content}</p>
        </div>
        <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
      </motion.button>
    </div>
  );
}

/* ── Daily Tasks ── */
function DailyTasks({ tasks, onToggle }) {
  const done = tasks.filter(t => t.completed).length;
  const pct = tasks.length ? (done / tasks.length) * 100 : 0;

  return (
    <div className="px-4">
      <div className="bg-card rounded-3xl overflow-hidden" style={{ boxShadow: '0 2px 20px rgba(0,0,0,0.06)', border: '1px solid rgb(var(--muted))' }}>
        <div className="h-1 w-full" style={{ background: 'rgb(var(--muted))' }}>
          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }}
            className="h-full" style={{ background: 'linear-gradient(90deg, rgb(var(--primary)), rgb(var(--ai)))' }} />
        </div>
        <div className="px-5 pt-4 pb-2 flex items-center justify-between">
          <p className="text-foreground font-bold text-sm">Today's Tasks</p>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold text-white"
            style={{ background: 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--ai)))' }}>
            {done} of {tasks.length}
          </span>
        </div>
        <div className="px-4 pb-4 space-y-2">
          {tasks.map(task => (
            <motion.button key={task.id} whileTap={{ scale: 0.98 }} onClick={() => onToggle(task.id)}
              className="w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all"
              style={{ background: task.completed ? 'rgb(var(--success))' : 'rgb(var(--muted))', border: `1px solid ${task.completed ? 'rgb(var(--success))' : 'rgb(var(--muted))'}` }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                style={task.completed
                  ? { background: 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--ai)))' }
                  : { background: 'rgb(var(--muted))', border: '2px solid rgb(var(--border))' }}>
                {task.completed
                  ? <Check className="w-4 h-4 text-white" strokeWidth={3} />
                  : <span className="text-sm">{task.emoji}</span>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${task.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{task.label}</p>
                {task.sublabel && <p className="text-muted-foreground text-[10px] mt-0.5">{task.sublabel}</p>}
              </div>
              {!task.completed && <ChevronRight className="w-4 h-4 text-border flex-shrink-0" />}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Weekly Dots ── */
function WeeklyDots({ recentLogs, checkIns, streak }) {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const today = new Date();
  const todayIdx = today.getDay() === 0 ? 6 : today.getDay() - 1;

  const weekLogs = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (todayIdx - i));
    const dateStr = format(d, 'yyyy-MM-dd');
    const log = recentLogs.find(l => l.date === dateStr);
    const ci = checkIns.find(c => c.date === dateStr);
    if (i > todayIdx) return 'upcoming';
    if (log?.workout_done || ci) return 'done';
    return 'missed';
  });

  return (
    <div className="px-4">
      <div className="bg-card rounded-3xl p-5" style={{ boxShadow: '0 2px 20px rgba(0,0,0,0.06)', border: '1px solid rgb(var(--muted))' }}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-foreground font-bold text-sm">This Week</p>
          {streak > 0 && (
            <p className="text-warning text-xs font-bold">🔥 {streak} day streak</p>
          )}
        </div>
        <div className="flex items-center justify-between">
          {days.map((day, i) => {
            const status = weekLogs[i];
            const isToday = i === todayIdx;
            const bg = status === 'done' ? 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--ai)))' : status === 'missed' ? 'rgb(var(--destructive))' : 'rgb(var(--muted))';
            const iconColor = status === 'done' ? 'text-white' : status === 'missed' ? 'text-destructive' : 'text-border';
            return (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <motion.div animate={isToday ? { scale: [1, 1.12, 1] } : {}} transition={{ repeat: Infinity, duration: 2 }}
                  className="flex items-center justify-center rounded-full transition-all"
                  style={{
                    width: isToday ? 36 : 28, height: isToday ? 36 : 28,
                    background: isToday ? 'transparent' : bg,
                    border: isToday ? '2.5px solid rgb(var(--primary))' : status === 'done' ? 'none' : '1.5px solid rgb(var(--border))',
                    boxShadow: isToday ? '0 0 0 3px rgb(var(--primary) / 0.15)' : 'none',
                  }}>
                  {status === 'done' && !isToday && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                  {status === 'missed' && !isToday && <span className="text-destructive text-[9px] font-bold">✕</span>}
                  {isToday && <span style={{ background: 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--ai)))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontSize: 11, fontWeight: 900 }}>{format(new Date(), 'd')}</span>}
                </motion.div>
                <p className={`text-[9px] font-bold ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>{day}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── MAIN ── */
export default function PortalHome({ user }) {
  const [log, setLog] = useState(DEFAULT_LOG);
  const [logId, setLogId] = useState(null);
  const [tasksDone, setTasksDone] = useState(new Set());
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: clients = [] } = useQuery({
    queryKey: ['portal-client-profile', user?.email],
    queryFn: () => base44.entities.Client.filter({ email: user.email }, '-created_date', 1),
    enabled: !!user?.email,
  });
  const myClient = clients[0];

  const { data: programs = [] } = useQuery({
    queryKey: ['portal-program', myClient?.assigned_program_id],
    queryFn: () => base44.entities.WorkoutProgram.filter({ id: myClient.assigned_program_id }, '-created_date', 1),
    enabled: !!myClient?.assigned_program_id,
  });
  const myProgram = programs[0];

  const { data: nutritionPlans = [] } = useQuery({
    queryKey: ['portal-nutrition', myClient?.assigned_nutrition_id],
    queryFn: () => base44.entities.NutritionPlan.filter({ id: myClient.assigned_nutrition_id }, '-created_date', 1),
    enabled: !!myClient?.assigned_nutrition_id,
  });
  const myNutrition = nutritionPlans[0];

  const { data: checkIns = [] } = useQuery({
    queryKey: ['portal-checkins', myClient?.id],
    queryFn: () => base44.entities.CheckIn.filter({ client_id: myClient.id }, '-date', 20),
    enabled: !!myClient?.id,
  });

  const { data: existingLog } = useQuery({
    queryKey: ['portal-daily-log', TODAY],
    queryFn: () => base44.entities.DailyLog.filter({ date: TODAY }, '-created_date', 1),
    enabled: !!user,
  });
  useEffect(() => {
    if (existingLog?.length > 0) { const l = existingLog[0]; setLog({ ...DEFAULT_LOG, ...l }); setLogId(l.id); }
  }, [existingLog]);

  const { data: recentLogs = [] } = useQuery({
    queryKey: ['portal-recent-logs', myClient?.id],
    queryFn: () => base44.entities.DailyLog.filter({ client_id: myClient.id }, '-date', 30),
    enabled: !!myClient?.id,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['portal-messages', myClient?.id],
    queryFn: () => base44.entities.Message.filter({ client_id: myClient?.id }, '-created_date', 20),
    enabled: !!myClient?.id,
  });
  const latestCoachMsg = messages.find(m => m.sender === 'coach');
  const unreadCount = messages.filter(m => m.sender === 'coach' && !m.is_read).length;

  const saveMutation = useMutation({
    mutationFn: (data) => logId
      ? base44.entities.DailyLog.update(logId, data)
      : base44.entities.DailyLog.create({ ...data, client_id: myClient.id, date: TODAY }),
    onSuccess: (res) => { if (!logId && res?.id) setLogId(res.id); },
  });
  const saveLog = useCallback((updated) => {
    setLog(updated);
    if (!logId && !myClient?.id) return; // can't create a log without the resolved client id
    saveMutation.mutate(updated);
  }, [logId, myClient?.id]);

  const dayOfWeek = new Date().getDay();
  const workouts = myProgram?.workouts || [];
  const todayWorkout = workouts.length > 0 ? workouts[dayOfWeek % workouts.length] : null;

  const streak = (() => { let c = 0; for (const l of recentLogs) { if (l.workout_done || l.meals_logged >= 2) c++; else break; } return c; })();
  const lastCheckIn = checkIns[0];
  const nextCheckInDate = lastCheckIn ? addDays(parseISO(lastCheckIn.date), 7) : null;
  const daysUntilCheckIn = nextCheckInDate ? differenceInDays(nextCheckInDate, new Date()) : null;
  const checkInDueToday = daysUntilCheckIn !== null && daysUntilCheckIn <= 0;

  const motivLine = checkInDueToday ? "Check-in day! Your coach is waiting 📋"
    : log.workout_done ? "Workout crushed today 🔥 Keep the momentum!"
    : "Let's make today count 💪";

  const allTasks = [
    { id: 'workout', emoji: '💪', label: "Complete today's workout", sublabel: todayWorkout?.day_name, completed: log.workout_done || tasksDone.has('workout') },
    { id: 'meals', emoji: '🥗', label: 'Log your meals', sublabel: `${log.meals_logged} of ${myNutrition?.meals?.length || 3} logged`, completed: log.meals_logged >= (myNutrition?.meals?.length || 3) || tasksDone.has('meals') },
    { id: 'water', emoji: '💧', label: 'Hit your water goal', sublabel: `${log.water_glasses} of 8 glasses`, completed: log.water_glasses >= 8 || tasksDone.has('water') },
    ...(checkInDueToday ? [{ id: 'checkin', emoji: '📋', label: 'Weekly check-in due today!', sublabel: 'Tap to complete', completed: tasksDone.has('checkin') }] : []),
  ];

  const handleToggleTask = (id) => {
    if (id === 'checkin') { navigate('/portal/checkin'); return; }
    if (id === 'workout') { navigate('/portal/workouts'); return; }
    setTasksDone(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    if (id === 'meals') saveLog({ ...log, meals_logged: log.meals_logged >= 3 ? 0 : log.meals_logged + 1 });
    if (id === 'water') saveLog({ ...log, water_glasses: log.water_glasses >= 8 ? 0 : log.water_glasses + 1 });
  };

  const firstName = user?.full_name?.split(' ')[0] || 'there';
  const safeWeight = myClient?.current_weight && myClient.current_weight > 0 && myClient.current_weight < 999 ? myClient.current_weight : null;
  const weeklyWorkouts = `${recentLogs.filter(l => l.workout_done).slice(0, 7).length}/7`;

  return (
    <div className="pb-32 space-y-4" style={{ background: 'rgb(var(--muted))', minHeight: '100vh' }}>
      {/* Header */}
      <div className="bg-card px-5 pt-14 pb-5" style={{ boxShadow: '0 1px 0 rgb(var(--muted))' }}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-muted-foreground text-xs font-semibold">{format(new Date(), 'EEEE, MMMM d')}</p>
            <h1 className="text-foreground font-black text-2xl leading-tight mt-0.5">
              {getGreeting()}, {firstName}! 👋
            </h1>
            <p className="text-primary text-sm font-semibold mt-1">{motivLine}</p>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <PortalBellButton navigate={navigate} userId={user?.id} />
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate('/portal/profile')}
              className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--ai)))' }}>
              {user?.full_name
                ? <span className="text-white font-bold text-sm">{user.full_name[0]}</span>
                : <User className="w-5 h-5 text-white" />
              }
            </motion.button>
          </div>
        </div>
      </div>

      <TodayFocusCard workout={todayWorkout} program={myProgram} workoutDone={log.workout_done} onStart={() => navigate('/portal/workouts')} />
      <DailyRings workoutDone={log.workout_done} mealsLogged={log.meals_logged} totalMeals={myNutrition?.meals?.length || 3} waterGlasses={log.water_glasses} waterGoal={8} navigate={navigate} />
      <StatsChips streak={streak} weight={safeWeight} weeklyWorkouts={weeklyWorkouts} daysUntilCheckIn={daysUntilCheckIn} navigate={navigate} />
      <CoachMsgCard msg={latestCoachMsg} navigate={navigate} />
      <DailyTasks tasks={allTasks} onToggle={handleToggleTask} />
      <WeeklyDots recentLogs={recentLogs} checkIns={checkIns} streak={streak} />

      <div className="px-4 pb-4">
        <div className="bg-card rounded-2xl p-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.05)', border: '1px solid rgb(var(--muted))' }}>
          <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mb-2">Daily Motivation</p>
          <p className="text-muted-foreground text-sm leading-relaxed italic">"The pain you feel today will be the strength you feel tomorrow."</p>
        </div>
      </div>
    </div>
  );
}