import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { portalDb } from '@/api/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { startOfWeek, addDays, subDays, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { Settings } from 'lucide-react';
import WorkoutProgramHeader from '@/components/portal/workout/WorkoutProgramHeader';
import WeekScheduleSelector from '@/components/portal/workout/WeekScheduleSelector';
import WorkoutCard from '@/components/portal/workout/WorkoutCard';
import WorkoutHistory from '@/components/portal/workout/WorkoutHistory';
import ActiveWorkout from '@/components/portal/workout/ActiveWorkout';
import WorkoutComplete from '@/components/portal/workout/WorkoutComplete';
import MissedWorkoutBanner from '@/components/portal/workout/MissedWorkoutBanner';
import { useNavigate } from 'react-router-dom';

const today = new Date();
const todayDayOfWeek = today.getDay(); // 0=Sun
const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Mon

// Map Mon-Sun index (0-6) to JS day of week
function weekIdxToProgIdx(weekDayIdx, workoutsLength) {
  // weekDayIdx: 0=Mon, 6=Sun
  // JS getDay: 0=Sun, 1=Mon ... 6=Sat
  return weekDayIdx % workoutsLength;
}

function getTodayWeekIdx() {
  const d = today.getDay(); // 0=Sun
  return d === 0 ? 6 : d - 1; // Mon=0 ... Sun=6
}

export default function PortalWorkouts({ user, onActiveWorkoutChange }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const startTimeRef = useRef(Date.now());

  const [activeMode, setActiveMode] = useState(false);
  const [completeMode, setCompleteMode] = useState(false);
  const [exerciseLogs, setExerciseLogs] = useState({});
  const [selectedWeekDayIdx, setSelectedWeekDayIdx] = useState(getTodayWeekIdx());
  const [activeTab, setActiveTab] = useState('schedule'); // 'schedule' | 'history'

  // Client
  const { data: clients = [] } = useQuery({
    queryKey: ['portal-client-profile', user?.email],
    queryFn: () => portalDb.entities.Client.filter({ email: user.email }, '-created_date', 1),
    enabled: !!user?.email,
  });
  const myClient = clients[0];

  // Program
  const { data: programs = [] } = useQuery({
    queryKey: ['portal-program', myClient?.assigned_program_id],
    queryFn: () => portalDb.entities.WorkoutProgram.filter({ id: myClient.assigned_program_id }, '-created_date', 1),
    enabled: !!myClient?.assigned_program_id,
  });
  const myProgram = programs[0];

  // Workout sessions
  const { data: sessions = [] } = useQuery({
    queryKey: ['portal-sessions', myClient?.id],
    queryFn: () => portalDb.entities.WorkoutSession.filter({ client_id: myClient.id }, '-completed_at', 50),
    enabled: !!myClient?.id,
  });

  const saveMutation = useMutation({
    mutationFn: (data) => portalDb.entities.WorkoutSession.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['portal-sessions'] }),
  });

  const workouts = myProgram?.workouts || [];
  const todayWeekIdx = getTodayWeekIdx();
  const selectedProgIdx = weekIdxToProgIdx(selectedWeekDayIdx, workouts.length || 1);
  const selectedWorkout = workouts[selectedProgIdx];
  const todayProgIdx = weekIdxToProgIdx(todayWeekIdx, workouts.length || 1);
  const todayWorkout = workouts[todayProgIdx];

  const selectedDay = addDays(weekStart, selectedWeekDayIdx);
  const isToday = selectedWeekDayIdx === todayWeekIdx;

  // Check if today's workout is done
  const todayDoneSession = sessions.find(s => {
    const d = s.completed_at ? new Date(s.completed_at) : null;
    return d && isSameDay(d, today);
  });
  const isTodayDone = !!todayDoneSession;

  // Missed yesterday?
  const yesterday = subDays(today, 1);
  const yesterdayProgIdx = weekIdxToProgIdx(todayWeekIdx === 0 ? 6 : todayWeekIdx - 1, workouts.length || 1);
  const yesterdayWorkout = workouts[yesterdayProgIdx];
  const missedYesterday = yesterdayWorkout && !sessions.find(s => {
    const d = s.completed_at ? new Date(s.completed_at) : null;
    return d && isSameDay(d, yesterday);
  });

  const handleStartWorkout = () => {
    startTimeRef.current = Date.now();
    setExerciseLogs({});
    setActiveMode(true);
    onActiveWorkoutChange?.(true);
  };

  const handleFinishWorkout = (logs) => {
    setExerciseLogs(logs);
    setActiveMode(false);
    setCompleteMode(true);
  };

  const handleSaveSession = (rating, note) => {
    const durationMin = Math.round((Date.now() - startTimeRef.current) / 60000);
    const workout = workouts[selectedProgIdx];
    saveMutation.mutate({
      client_id: myClient?.id || user?.id || 'me',
      program_id: myProgram?.id,
      workout_day_name: workout?.day_name || '',
      workout_day_index: selectedProgIdx,
      completed_at: new Date().toISOString(),
      duration_minutes: durationMin,
      session_rating: rating,
      session_note: note,
      exercise_logs: (workout?.exercises || []).map((ex, i) => ({
        exercise_name: ex.name,
        sets_completed: exerciseLogs[i]?.sets_completed || [],
      })),
    });
    setCompleteMode(false);
  };

  if (!myProgram) {
    return (
      <div className="pb-24 pt-16 px-5 text-center" style={{ background: 'rgb(var(--muted))', minHeight: '100vh' }}>
        <p className="text-5xl mb-4">🏋️</p>
        <p className="text-foreground font-bold text-lg">No program assigned yet</p>
        <p className="text-muted-foreground text-sm mt-2">Your coach is building something great for you 💪</p>
      </div>
    );
  }

  return (
    <>
      {/* Active workout full-screen mode */}
      <AnimatePresence>
        {activeMode && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ActiveWorkout
              workout={selectedWorkout}
              onFinish={handleFinishWorkout}
              onExit={() => { setActiveMode(false); onActiveWorkoutChange?.(false); }}
            />
          </motion.div>
        )}
        {completeMode && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <WorkoutComplete
              workout={selectedWorkout}
              exerciseLogs={exerciseLogs}
              durationSeconds={Math.round((Date.now() - startTimeRef.current) / 1000)}
              onClose={handleSaveSession}
              onMessageCoach={() => { setCompleteMode(false); navigate('/portal/messages'); }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pb-28 space-y-5" style={{ background: 'rgb(var(--muted))', minHeight: '100vh' }}>
        {/* Page header */}
        <div className="bg-card px-5 flex items-center justify-between" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 14px)', paddingBottom: 14, boxShadow: '0 1px 0 rgb(var(--muted))' }}>
          <h1 className="text-foreground font-black text-[28px] leading-tight">Train</h1>
          <button className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgb(var(--muted))' }}>
            <Settings className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Program progress header */}
        <WorkoutProgramHeader program={myProgram} client={myClient} sessions={sessions} />

        {/* Missed workout banner */}
        {missedYesterday && !isTodayDone && (
          <MissedWorkoutBanner
            workoutName={yesterdayWorkout?.day_name}
            onDoNow={() => { setSelectedWeekDayIdx(todayWeekIdx === 0 ? 6 : todayWeekIdx - 1); handleStartWorkout(); }}
            onSkip={() => {}}
          />
        )}

        {/* Tabs */}
        <div className="px-4 flex gap-2">
          {['schedule', 'history'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={cn('flex-1 py-3 rounded-2xl text-sm font-bold transition-all capitalize')}
              style={{
                background: activeTab === tab ? 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--ai)))' : 'rgb(var(--card))',
                color: activeTab === tab ? 'rgb(var(--card))' : 'rgb(var(--muted-foreground))',
                border: activeTab === tab ? 'none' : '1.5px solid rgb(var(--muted))',
                boxShadow: activeTab === tab ? '0 4px 12px rgb(var(--primary) / 0.25)' : '0 1px 4px rgba(0,0,0,0.04)',
              }}>
              {tab === 'schedule' ? '📅 Schedule' : '📋 History'}
            </button>
          ))}
        </div>

        {activeTab === 'schedule' ? (
          <>
            {/* Week selector */}
            <WeekScheduleSelector
              program={myProgram}
              workoutSessions={sessions}
              selectedDay={selectedWeekDayIdx}
              onSelectDay={setSelectedWeekDayIdx}
            />

            {/* Today's / selected workout card */}
            <WorkoutCard
              workout={selectedWorkout}
              isToday={isToday}
              dayDate={selectedDay}
              isDone={isToday && isTodayDone}
              onStart={handleStartWorkout}
            />
          </>
        ) : (
          <WorkoutHistory sessions={sessions} />
        )}
      </div>
    </>
  );
}