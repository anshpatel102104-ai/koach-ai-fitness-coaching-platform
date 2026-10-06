import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { portalDb } from '@/api/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { format, differenceInDays, parseISO, addDays, startOfWeek, subWeeks } from 'date-fns';
import { Plus, ChevronRight, Check } from 'lucide-react';
import { ComplianceStrip, complianceState, CountBadge } from '@/components/kit';
import { cn } from '@/lib/utils';
import { calcDayTotals } from '@/lib/nutritionUtils';
import TodayHeroCard from '@/components/portal/TodayHeroCard';
import CoachMessageCard from '@/components/portal/CoachMessageCard';
import DailyTasks from '@/components/portal/DailyTasks';
import { Ring } from '@/components/portal/PortalUI';

const TODAY = format(new Date(), 'yyyy-MM-dd');
const DEFAULT_LOG = { workout_done: false, meals_logged: 0, water_glasses: 0 };
const fmt = (n) => Math.round(n || 0).toLocaleString();

/* ── Calories card: ink ring, calories left, + to log food ── */
function CaloriesCard({ consumed, target, protein, hasPlan, onAdd }) {
  const left = target - consumed;
  const pct = target > 0 ? (consumed / target) * 100 : 0;
  return (
    <section className="panel flex items-center gap-4 p-4">
      <Ring pct={pct} size={76} stroke={9} barClass={left < 0 ? 'text-destructive' : 'text-foreground'} />
      <div className="min-w-0 flex-1">
        {hasPlan ? (
          <>
            <p className="num text-[30px] text-foreground">{left >= 0 ? `${fmt(left)} left` : `${fmt(-left)} over`}</p>
            <p className="mt-1 text-sm leading-snug text-muted-foreground">
              {fmt(consumed)} of {fmt(target)} calories, {fmt(protein)} g protein
            </p>
          </>
        ) : (
          <>
            <p className="num text-[30px] text-foreground">{fmt(consumed)} cal</p>
            <p className="mt-1 text-sm leading-snug text-muted-foreground">
              Logged today, {fmt(protein)} g protein. No calorie target set yet.
            </p>
          </>
        )}
      </div>
      <button
        type="button"
        onClick={onAdd}
        aria-label="Log food"
        className="touch-compact inline-flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg border border-input bg-card text-foreground hover:bg-accent transition-colors"
      >
        <Plus className="h-5 w-5" strokeWidth={2.5} />
      </button>
    </section>
  );
}

/* ── Last 8 weeks: compliance strip from weekly check-ins ── */
function LastWeeksCard({ weeks, onPlan, onOpen }) {
  return (
    <button type="button" onClick={onOpen} className="panel block w-full p-4 text-left hover:bg-accent/40 transition-colors">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg text-foreground">Your last 8 weeks</h2>
        <span className={cn('text-[13px] font-semibold', onPlan > 0 ? 'text-success' : 'text-muted-foreground')}>
          {onPlan} week{onPlan === 1 ? '' : 's'} on plan
        </span>
      </div>
      <ComplianceStrip weeks={weeks} className="mt-3 w-full [&>span]:flex-1 [&>span]:w-auto" label={`${onPlan} of the last 8 weeks on plan`} />
    </button>
  );
}

/* ── Check-in due card with brand left rule ── */
function CheckInDueCard({ daysUntil, nextDate, questionCount, onStart }) {
  const overdue = daysUntil !== null && daysUntil < 0;
  const dueToday = daysUntil === null || daysUntil === 0;
  const title = overdue
    ? `Check-in ${Math.abs(daysUntil)} day${Math.abs(daysUntil) === 1 ? '' : 's'} late`
    : dueToday
      ? 'Check-in due today'
      : daysUntil <= 6 && nextDate
        ? `Check-in due ${format(nextDate, 'EEEE')}`
        : `Next check-in ${nextDate ? format(nextDate, 'MMM d') : 'soon'}`;
  const sub = questionCount
    ? `Weight and ${questionCount} short question${questionCount === 1 ? '' : 's'}`
    : 'Weight, how the week went, anything for your coach';

  return (
    <section className={cn('panel relative flex items-center gap-3 overflow-hidden py-4 pl-5 pr-4')}>
      <span className={cn('absolute inset-y-0 left-0 w-1', overdue ? 'bg-destructive' : 'bg-brand')} aria-hidden />
      <div className="min-w-0 flex-1">
        <h2 className="text-lg text-foreground">{title}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{sub}</p>
      </div>
      <button type="button" onClick={onStart} className="text-[15px] font-bold text-foreground underline underline-offset-4 decoration-1 hover:decoration-2">
        Start
      </button>
    </section>
  );
}

/* ── This week: day tiles + quick numbers ── */
function ThisWeekCard({ recentLogs, checkIns, streak, weight, weeklyWorkouts, navigate }) {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const today = new Date();
  const todayIdx = today.getDay() === 0 ? 6 : today.getDay() - 1;

  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (todayIdx - i));
    const dateStr = format(d, 'yyyy-MM-dd');
    const log = recentLogs.find(l => l.date === dateStr);
    const ci = checkIns.find(c => c.date === dateStr);
    if (i > todayIdx) return 'upcoming';
    if (log?.workout_done || ci) return 'done';
    return 'open';
  });

  const stats = [
    { label: 'Streak', value: streak, unit: streak === 1 ? 'day' : 'days', path: '/portal/progress' },
    { label: 'Weight', value: weight ? Number(weight).toFixed(1) : '–', unit: weight ? 'lb' : '', path: '/portal/progress' },
    { label: 'Workouts', value: weeklyWorkouts, unit: '', path: '/portal/workouts' },
  ];

  return (
    <section className="panel p-4">
      <h2 className="text-lg text-foreground">This week</h2>
      <div className="mt-3 grid grid-cols-7 gap-1.5">
        {week.map((status, i) => {
          const isToday = i === todayIdx;
          return (
            <div key={i} className="flex flex-col items-center gap-1">
              <span
                className={cn(
                  'flex h-9 w-full items-center justify-center rounded-md text-[13px] font-semibold',
                  status === 'done' ? 'bg-success text-white' : 'bg-secondary text-muted-foreground',
                  isToday && status !== 'done' && 'ring-2 ring-brand ring-inset text-foreground',
                )}
              >
                {status === 'done' ? <Check className="h-4 w-4" strokeWidth={3} /> : null}
              </span>
              <span className={cn('text-[12px]', isToday ? 'font-bold text-foreground' : 'text-muted-foreground')}>{days[i]}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-4 grid grid-cols-3 divide-x divide-border border-t border-border pt-3">
        {stats.map(s => (
          <button key={s.label} type="button" onClick={() => navigate(s.path)} className="touch-compact px-2 text-left first:pl-0">
            <p className="text-[13px] text-muted-foreground">{s.label}</p>
            <p className="num mt-1 text-[22px] text-foreground">
              {s.value}{s.unit && <span className="ml-1 text-[13px] font-semibold text-muted-foreground" style={{ fontFamily: 'var(--font-body)' }}>{s.unit}</span>}
            </p>
          </button>
        ))}
      </div>
    </section>
  );
}

/* ── Links to the screens that are not in the tab bar ── */
function MoreLinks({ navigate, communityCount, unreadNotifications }) {
  const rows = [
    { label: 'Schedule', detail: 'Sessions, calls and check-ins by day', path: '/portal/calendar' },
    { label: 'Check-ins', detail: 'Send this week\'s, see past ones', path: '/portal/checkin' },
    { label: 'Community', detail: 'Posts, challenges and group chat', path: '/portal/community', count: communityCount },
    { label: 'Notifications', detail: 'Replies, reviews and reminders', path: '/portal/notifications', count: unreadNotifications },
    { label: 'Profile and billing', detail: 'Your details, plan and payments', path: '/portal/profile' },
  ];
  return (
    <section className="panel px-4 py-1">
      <ul className="divide-y divide-border">
        {rows.map(r => (
          <li key={r.path}>
            <button type="button" onClick={() => navigate(r.path)} className="flex w-full items-center gap-3 py-3 text-left">
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-foreground">{r.label}</span>
                <span className="block text-[13px] text-muted-foreground truncate">{r.detail}</span>
              </span>
              <CountBadge count={r.count} />
              <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ── MAIN ── */
export default function PortalHome({ user }) {
  const [log, setLog] = useState(DEFAULT_LOG);
  const [logId, setLogId] = useState(null);
  const [tasksDone, setTasksDone] = useState(new Set());
  const navigate = useNavigate();

  const { data: clients = [] } = useQuery({
    queryKey: ['portal-client-profile', user?.email],
    queryFn: () => portalDb.entities.Client.filter({ portal_user_id: user.id }, '-created_date', 1),
    enabled: !!user?.email,
  });
  const myClient = clients[0];

  const { data: programs = [] } = useQuery({
    queryKey: ['portal-program', myClient?.assigned_program_id],
    queryFn: () => portalDb.entities.WorkoutProgram.filter({ id: myClient.assigned_program_id }, '-created_date', 1),
    enabled: !!myClient?.assigned_program_id,
  });
  const myProgram = programs[0];

  const { data: nutritionPlans = [] } = useQuery({
    queryKey: ['portal-nutrition', myClient?.assigned_nutrition_id],
    queryFn: () => portalDb.entities.NutritionPlan.filter({ id: myClient.assigned_nutrition_id }, '-created_date', 1),
    enabled: !!myClient?.assigned_nutrition_id,
  });
  const myNutrition = nutritionPlans[0];

  const { data: checkIns = [] } = useQuery({
    queryKey: ['portal-checkins', myClient?.id],
    queryFn: () => portalDb.entities.CheckIn.filter({ client_id: myClient.id }, '-date', 20),
    enabled: !!myClient?.id,
  });

  const { data: existingLog } = useQuery({
    queryKey: ['portal-daily-log', TODAY],
    queryFn: () => portalDb.entities.DailyLog.filter({ date: TODAY }, '-created_date', 1),
    enabled: !!user,
  });
  useEffect(() => {
    if (existingLog?.length > 0) { const l = existingLog[0]; setLog({ ...DEFAULT_LOG, ...l }); setLogId(l.id); }
  }, [existingLog]);

  const { data: recentLogs = [] } = useQuery({
    queryKey: ['portal-recent-logs', myClient?.id],
    queryFn: () => portalDb.entities.DailyLog.filter({ client_id: myClient.id }, '-date', 30),
    enabled: !!myClient?.id,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['portal-messages', myClient?.id],
    queryFn: () => portalDb.entities.Message.filter({ client_id: myClient?.id }, '-created_date', 20),
    enabled: !!myClient?.id,
  });
  const latestCoachMsg = messages.find(m => m.sender === 'coach');

  // Today's food log, for the calories card.
  const { data: foodLogs = [] } = useQuery({
    queryKey: ['portal-home-food', myClient?.id, TODAY],
    queryFn: () => portalDb.entities.FoodLog.filter({ client_id: myClient.id, logged_date: TODAY }, '-created_date', 100),
    enabled: !!myClient?.id,
  });
  const foodTotals = useMemo(() => calcDayTotals(foodLogs.filter(l => l.food_name)), [foodLogs]);

  // Active check-in form, for the "N short questions" line.
  const { data: forms = [] } = useQuery({
    queryKey: ['checkin-forms'],
    queryFn: () => portalDb.entities.CheckInForm.filter({ is_active: true }, '-created_date', 1),
  });
  const questionCount = forms[0]?.questions?.length || 0;

  // Notifications (bell in the hero).
  const { data: notifs = [] } = useQuery({
    queryKey: ['portal-notifications', user?.id],
    queryFn: () => portalDb.entities.Notification.filter({ recipient_id: user.id, is_dismissed: false }, '-created_date', 30),
    enabled: !!user?.id,
    refetchInterval: 30000,
  });
  const unreadNotifications = notifs.filter(n => !n.is_read).length;

  // New community announcements (last 24h), shown on the Community link.
  const { data: communityPosts = [] } = useQuery({
    queryKey: ['portal-community-nav'],
    queryFn: () => portalDb.entities.CommunityPost.filter({ is_announcement: true, is_hidden: false }, '-created_date', 5),
    refetchInterval: 60000,
  });
  const newCommunityPosts = communityPosts.filter(p => p.created_date && differenceInDays(new Date(), new Date(p.created_date)) < 1).length;

  const saveMutation = useMutation({
    mutationFn: (data) => logId
      ? portalDb.entities.DailyLog.update(logId, data)
      : portalDb.entities.DailyLog.create({ ...data, client_id: myClient.id, date: TODAY }),
    onSuccess: (res) => { if (!logId && res?.id) setLogId(res.id); },
  });
  const saveLog = useCallback((updated) => {
    setLog(updated);
    if (!logId && !myClient?.id) return; // can't create a log without the resolved client id
    saveMutation.mutate(updated);
  }, [logId, myClient?.id]);

  // Monday-first, matching the Train tab and the coach's program builder.
  const jsDay = new Date().getDay();
  const weekDayIdx = jsDay === 0 ? 6 : jsDay - 1;
  const workouts = myProgram?.workouts || [];
  const todayWorkout = workouts.length > 0 ? workouts[weekDayIdx % workouts.length] : null;

  const streak = (() => { let c = 0; for (const l of recentLogs) { if (l.workout_done || l.meals_logged >= 2) c++; else break; } return c; })();
  const lastCheckIn = checkIns[0];
  const nextCheckInDate = lastCheckIn ? addDays(parseISO(lastCheckIn.date), 7) : null;
  const daysUntilCheckIn = nextCheckInDate ? differenceInDays(nextCheckInDate, new Date()) : null;
  const checkInDueToday = daysUntilCheckIn !== null && daysUntilCheckIn <= 0;

  const weekNumber = myClient?.start_date
    ? Math.max(1, Math.floor(differenceInDays(new Date(), parseISO(myClient.start_date)) / 7) + 1)
    : null;

  // Last 8 weeks, oldest first: average of training + nutrition compliance from that week's check-in.
  const last8 = useMemo(() => {
    const thisWeek = startOfWeek(new Date(), { weekStartsOn: 1 });
    const start = myClient?.start_date ? parseISO(myClient.start_date) : null;
    return Array.from({ length: 8 }, (_, idx) => {
      const ws = subWeeks(thisWeek, 7 - idx);
      const we = addDays(ws, 7);
      if (start && we <= start) return 'none';
      const ci = checkIns.find(c => { const d = parseISO(c.date); return d >= ws && d < we; });
      if (!ci) return idx === 7 ? 'none' : 'missed';
      const parts = [ci.compliance_training, ci.compliance_nutrition].filter(v => typeof v === 'number');
      if (!parts.length) return 'on';
      return complianceState(parts.reduce((a, b) => a + b, 0) / parts.length);
    });
  }, [checkIns, myClient?.start_date]);
  const weeksOnPlan = last8.filter(w => w === 'on').length;

  const totalMeals = myNutrition?.meals?.length || 3;
  const allTasks = [
    { id: 'workout', label: todayWorkout?.day_name ? `Train: ${todayWorkout.day_name}` : "Today's workout", sublabel: log.workout_done ? 'Logged' : 'Opens your session', completed: log.workout_done || tasksDone.has('workout'), navigates: true },
    { id: 'meals', label: 'Log your meals', sublabel: `${log.meals_logged} of ${totalMeals} logged. Tap to add one.`, completed: log.meals_logged >= totalMeals || tasksDone.has('meals') },
    { id: 'water', label: 'Drink 8 glasses of water', sublabel: `${log.water_glasses} of 8 so far. Tap to add one.`, completed: log.water_glasses >= 8 || tasksDone.has('water') },
    ...(checkInDueToday ? [{ id: 'checkin', label: 'Send your weekly check-in', sublabel: 'Due today', completed: tasksDone.has('checkin'), navigates: true }] : []),
  ];

  const handleToggleTask = (id) => {
    if (id === 'checkin') { navigate('/portal/checkin'); return; }
    if (id === 'workout') { navigate('/portal/workouts'); return; }
    setTasksDone(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    if (id === 'meals') saveLog({ ...log, meals_logged: log.meals_logged >= 3 ? 0 : log.meals_logged + 1 });
    if (id === 'water') saveLog({ ...log, water_glasses: log.water_glasses >= 8 ? 0 : log.water_glasses + 1 });
  };

  const safeWeight = myClient?.current_weight && myClient.current_weight > 0 && myClient.current_weight < 999 ? myClient.current_weight : null;
  const weeklyWorkouts = `${recentLogs.filter(l => l.workout_done).slice(0, 7).length}/7`;
  const recentCoachMsg = latestCoachMsg && (!latestCoachMsg.created_date || differenceInDays(new Date(), new Date(latestCoachMsg.created_date)) <= 2)
    ? latestCoachMsg : null;

  return (
    <div className="min-h-full bg-background pb-28">
      <TodayHeroCard
        program={myProgram}
        todayWorkout={todayWorkout}
        workoutDone={log.workout_done}
        onStartWorkout={() => navigate('/portal/workouts')}
        weekNumber={weekNumber}
        unreadNotifications={unreadNotifications}
        onNotifications={() => navigate('/portal/notifications')}
        userName={user?.full_name}
        onProfile={() => navigate('/portal/profile')}
      />

      <div className="space-y-3 px-4 pt-4">
        <CaloriesCard
          consumed={foodTotals.calories}
          target={myNutrition?.calories || 0}
          protein={foodTotals.protein}
          hasPlan={!!myNutrition?.calories}
          onAdd={() => navigate('/portal/nutrition')}
        />

        <LastWeeksCard weeks={last8} onPlan={weeksOnPlan} onOpen={() => navigate('/portal/progress')} />

        <CheckInDueCard
          daysUntil={daysUntilCheckIn}
          nextDate={nextCheckInDate}
          questionCount={questionCount}
          onStart={() => navigate('/portal/checkin')}
        />

        {recentCoachMsg && (
          <CoachMessageCard message={recentCoachMsg} onReply={() => navigate('/portal/messages')} />
        )}

        <DailyTasks tasks={allTasks} onToggle={handleToggleTask} />

        <ThisWeekCard
          recentLogs={recentLogs}
          checkIns={checkIns}
          streak={streak}
          weight={safeWeight}
          weeklyWorkouts={weeklyWorkouts}
          navigate={navigate}
        />

        <MoreLinks navigate={navigate} communityCount={newCommunityPosts} unreadNotifications={unreadNotifications} />
      </div>
    </div>
  );
}
