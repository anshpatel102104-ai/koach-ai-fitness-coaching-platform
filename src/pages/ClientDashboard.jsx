import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { format, differenceInDays, parseISO, addDays } from 'date-fns';
import DashboardHeader from '@/components/client-dashboard/DashboardHeader';
import TodayProgressCard from '@/components/client-dashboard/TodayProgressCard';
import TodayWorkout from '@/components/client-dashboard/TodayWorkout';
import NutritionPanel from '@/components/client-dashboard/NutritionPanel';
import StepGoal from '@/components/client-dashboard/StepGoal';
import NextCheckIn from '@/components/client-dashboard/NextCheckIn';
import ClientAchievements from '@/components/client-dashboard/ClientAchievements';
import NotificationSettings from '@/components/client-dashboard/NotificationSettings';

const today = format(new Date(), 'yyyy-MM-dd');

const defaultLog = {
  workout_done: false, meals_logged: 0, water_glasses: 0, steps: 0,
  habits_completed: [], focus_tasks: [], win_of_day: '', mindset_score: 0, streak_days: 0
};

export default function ClientDashboard() {
  const { me } = useAuth();
  const [log, setLog] = useState(defaultLog);
  const [logId, setLogId] = useState(null);
  const [user, setUser] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    me().then(setUser).catch(() => {});
  }, []);

  const { data: existingLog } = useQuery({
    queryKey: ['daily-log', today],
    queryFn: () => db.entities.DailyLog.filter({ date: today }, '-created_date', 1),
    enabled: !!user,
  });

  useEffect(() => {
    if (existingLog?.length > 0) {
      const l = existingLog[0];
      setLog({ ...defaultLog, ...l });
      setLogId(l.id);
    }
  }, [existingLog]);

  const saveMutation = useMutation({
    mutationFn: (data) => logId
      ? db.entities.DailyLog.update(logId, data)
      : db.entities.DailyLog.create({ ...data, client_id: user?.id || 'me', date: today }),
    onSuccess: (res) => {
      if (!logId && res?.id) setLogId(res.id);
      queryClient.invalidateQueries({ queryKey: ['daily-log'] });
    },
  });

  const saveLog = useCallback((updated) => {
    setLog(updated);
    const t = setTimeout(() => saveMutation.mutate(updated), 600);
    return () => clearTimeout(t);
  }, [logId, user]);

  const { data: recentLogs = [] } = useQuery({
    queryKey: ['daily-logs-streak', user?.id],
    queryFn: () => db.entities.DailyLog.filter({ client_id: user?.id || 'me' }, '-date', 60),
    enabled: !!user,
  });

  const streak = (() => {
    let count = 0;
    for (let i = 0; i < recentLogs.length; i++) {
      const l = recentLogs[i];
      if (l.workout_done || l.meals_logged >= 2 || l.water_glasses >= 4) count++;
      else break;
    }
    return count;
  })();

  const { data: clients = [] } = useQuery({
    queryKey: ['my-client-profile'],
    queryFn: () => db.entities.Client.filter({ email: user?.email }, '-created_date', 1),
    enabled: !!user?.email,
  });
  const myClient = clients[0];

  const { data: programs = [] } = useQuery({
    queryKey: ['my-program', myClient?.assigned_program_id],
    queryFn: () => db.entities.WorkoutProgram.filter({ id: myClient.assigned_program_id }, '-created_date', 1),
    enabled: !!myClient?.assigned_program_id,
  });
  const myProgram = programs[0];

  const { data: nutritionPlans = [] } = useQuery({
    queryKey: ['my-nutrition', myClient?.assigned_nutrition_id],
    queryFn: () => db.entities.NutritionPlan.filter({ id: myClient.assigned_nutrition_id }, '-created_date', 1),
    enabled: !!myClient?.assigned_nutrition_id,
  });
  const myNutrition = nutritionPlans[0];

  const { data: checkIns = [] } = useQuery({
    queryKey: ['my-checkins'],
    queryFn: () => db.entities.CheckIn.filter({ client_id: myClient?.id }, '-date', 5),
    enabled: !!myClient?.id,
  });
  const lastCheckIn = checkIns[0];
  const nextCheckInDate = lastCheckIn ? addDays(parseISO(lastCheckIn.date), 7) : null;
  const daysUntilCheckIn = nextCheckInDate ? differenceInDays(nextCheckInDate, new Date()) : null;

  const dayOfWeek = new Date().getDay();
  const workoutsInProgram = myProgram?.workouts || [];
  const todayWorkout = workoutsInProgram.length > 0
    ? workoutsInProgram[dayOfWeek % workoutsInProgram.length]
    : null;

  const goals = [log.workout_done, log.meals_logged >= 3, log.water_glasses >= 6, log.steps >= 8000];
  const completed = goals.filter(Boolean).length;
  const pct = Math.round((completed / goals.length) * 100);

  if (showSettings) {
    return (
      <div className="min-h-screen bg-muted">
        <div className="sticky top-0 z-10 bg-card border-b border-border px-5 py-4">
          <div className="flex items-center justify-between max-w-lg mx-auto">
            <h2 className="font-semibold text-base text-foreground">Notifications</h2>
            <button onClick={() => setShowSettings(false)} className="text-sm text-primary font-semibold">Done</button>
          </div>
        </div>
        <div className="max-w-lg mx-auto px-5 py-6">
          <NotificationSettings />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted">
      <div className="max-w-lg mx-auto px-4 pt-4 pb-28 space-y-3">

        <DashboardHeader
          user={user}
          streak={streak}
          log={log}
          onSettings={() => setShowSettings(true)}
        />

        <TodayProgressCard
          log={log}
          completed={completed}
          total={goals.length}
          pct={pct}
        />

        <TodayWorkout
          workout={todayWorkout}
          program={myProgram}
          done={log.workout_done}
          onToggle={() => saveLog({ ...log, workout_done: !log.workout_done })}
        />

        <NutritionPanel
          plan={myNutrition}
          mealsLogged={log.meals_logged}
          waterGlasses={log.water_glasses}
          onMealsChange={(v) => saveLog({ ...log, meals_logged: v })}
          onWaterChange={(v) => saveLog({ ...log, water_glasses: v })}
        />

        <StepGoal
          steps={log.steps}
          goal={10000}
          onChange={(v) => saveLog({ ...log, steps: Math.max(0, v) })}
        />

        <NextCheckIn
          daysUntil={daysUntilCheckIn}
          nextDate={nextCheckInDate}
          lastCheckIn={lastCheckIn}
          clientId={myClient?.id}
        />

        <ClientAchievements clientId={myClient?.id} />

      </div>
    </div>
  );
}