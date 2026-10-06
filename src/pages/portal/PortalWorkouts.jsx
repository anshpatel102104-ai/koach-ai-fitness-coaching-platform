import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { portalDb } from '@/api/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { startOfWeek, addDays, subDays, isSameDay } from 'date-fns';
import { CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/kit';
import { PortalScreen, PortalHeader } from '@/components/portal/PortalUI';
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
      <PortalScreen>
        <PortalHeader title="Train" />
        <section className="panel px-5 py-6">
          <p className="text-[15px] font-semibold text-foreground">No program yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Your coach is building your training plan. It will show up here, day by day, once it's assigned.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/portal/messages')}>Message your coach</Button>
        </section>
      </PortalScreen>
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

      <PortalScreen>
        <PortalHeader
          title="Train"
          subtitle={todayWorkout && !isTodayDone ? `Today is ${todayWorkout.day_name}.` : isTodayDone ? 'Today\'s session is logged.' : undefined}
          right={(
            <Button variant="outline" size="sm" onClick={() => navigate('/portal/calendar')}>
              <CalendarDays /> Schedule
            </Button>
          )}
        />

        <div className="space-y-3">
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
          <Segmented
            className="w-full [&>button]:flex-1 [&>button]:justify-center"
            value={activeTab}
            onChange={setActiveTab}
            options={[
              { value: 'schedule', label: 'This week' },
              { value: 'history', label: 'History', count: sessions.length || null },
            ]}
          />

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
      </PortalScreen>
    </>
  );
}
