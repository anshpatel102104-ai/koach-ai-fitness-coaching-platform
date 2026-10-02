import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase as base44 } from '@/api/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, Calendar, Clock, CheckCircle2, ChevronRight, Plus, RefreshCw, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { startOfWeek, addDays, format, isToday } from 'date-fns';
import { SignedImg } from '@/components/shared/SignedImage';

const DIFFICULTY_STYLE = {
  beginner:     { label: 'Beginner',     bg: 'bg-success/10', text: 'text-success' },
  intermediate: { label: 'Intermediate', bg: 'bg-warning/10',   text: 'text-warning'   },
  advanced:     { label: 'Advanced',     bg: 'bg-destructive/10',     text: 'text-destructive'      },
  elite:        { label: 'Elite',        bg: 'bg-ai/10',  text: 'text-ai'   },
};

// ── Program Picker ────────────────────────────────────────────────────────────
function ProgramPicker({ programs, onSelect, onCancel }) {
  const [search, setSearch] = useState('');
  const filtered = programs.filter(p => p.title?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-3">
      <input
        autoFocus
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search programs..."
        className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {filtered.map(p => {
          const diff = DIFFICULTY_STYLE[p.difficulty] || DIFFICULTY_STYLE.intermediate;
          return (
            <button
              key={p.id}
              onClick={() => onSelect(p)}
              className="w-full text-left p-3 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-accent/50 transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-foreground">{p.title}</span>
                <ChevronRight className="w-4 h-4 text-border group-hover:text-primary transition-colors" />
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', diff.bg, diff.text)}>
                  {diff.label}
                </span>
                {p.duration_weeks && (
                  <span className="text-[10px] text-muted-foreground">{p.duration_weeks}w</span>
                )}
                {p.days_per_week && (
                  <span className="text-[10px] text-muted-foreground">{p.days_per_week}x/wk</span>
                )}
              </div>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6">No programs found</p>
        )}
      </div>
      <Button variant="ghost" size="sm" onClick={onCancel} className="w-full text-xs">
        Cancel
      </Button>
    </div>
  );
}

// ── Assigned Program Card ─────────────────────────────────────────────────────
function AssignedProgramSection({ client, allPrograms, assignedProgram, onRefetch }) {
  const [picking, setPicking] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const assignMutation = useMutation({
    mutationFn: (programId) =>
      base44.entities.Client.update(client.id, { assigned_program_id: programId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['programs-tab', client.id] });
      toast.success('Program assigned!');
      onRefetch();
      setPicking(false);
    },
  });

  if (picking) {
    return (
      <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
        <h3 className="text-sm font-bold text-foreground mb-3">Select a Program</h3>
        <ProgramPicker
          programs={allPrograms}
          onSelect={p => assignMutation.mutate(p.id)}
          onCancel={() => setPicking(false)}
        />
      </div>
    );
  }

  if (!assignedProgram) {
    return (
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm text-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-muted border border-border flex items-center justify-center mx-auto">
          <Dumbbell className="w-6 h-6 text-border" />
        </div>
        <div>
          <p className="font-semibold text-foreground text-sm">No program assigned yet</p>
          <p className="text-xs text-muted-foreground mt-0.5">Assign a workout program to get started</p>
        </div>
        <div className="flex gap-2 justify-center">
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setPicking(true)}>
            <Layers className="w-3.5 h-3.5" /> Assign Existing
          </Button>
          <Button size="sm" className="gap-1.5 text-xs" onClick={() => navigate('/programs')}>
            <Plus className="w-3.5 h-3.5" /> Create New
          </Button>
        </div>
      </div>
    );
  }

  const diff = DIFFICULTY_STYLE[assignedProgram.difficulty] || DIFFICULTY_STYLE.intermediate;

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      {assignedProgram.image_url && (
        <SignedImg src={assignedProgram.image_url} alt={assignedProgram.title} className="w-full h-28 object-cover" />
      )}
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-bold text-foreground text-base">{assignedProgram.title}</h3>
            {assignedProgram.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{assignedProgram.description}</p>
            )}
          </div>
          <span className={cn('text-[10px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0', diff.bg, diff.text)}>
            {diff.label}
          </span>
        </div>

        <div className="flex gap-3 text-xs text-muted-foreground">
          {assignedProgram.duration_weeks && (
            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{assignedProgram.duration_weeks} weeks</span>
          )}
          {assignedProgram.days_per_week && (
            <span className="flex items-center gap-1"><Dumbbell className="w-3.5 h-3.5" />{assignedProgram.days_per_week}x per week</span>
          )}
          {assignedProgram.workouts?.length > 0 && (
            <span className="flex items-center gap-1"><Layers className="w-3.5 h-3.5" />{assignedProgram.workouts.length} workouts</span>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs flex-1"
            onClick={() => navigate(`/programs`)}
          >
            <ChevronRight className="w-3.5 h-3.5" /> View Program
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5 text-xs text-muted-foreground"
            onClick={() => setPicking(true)}
          >
            <RefreshCw className="w-3.5 h-3.5" /> Change
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Weekly Schedule ───────────────────────────────────────────────────────────
function WeeklySchedule({ assignedProgram, workoutSessions }) {
  if (!assignedProgram?.workouts?.length) return null;

  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Mon
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Map workouts by day_number (1-indexed) or cycle through
  const workouts = assignedProgram.workouts || [];
  const daysPerWeek = assignedProgram.days_per_week || workouts.length || 3;

  // Build a simple weekly schedule: spread workouts across the week
  const schedule = days.map((date, i) => {
    const dayWorkoutIndex = i < daysPerWeek ? i : null;
    const workout = dayWorkoutIndex !== null ? workouts[dayWorkoutIndex % workouts.length] : null;

    // Check if completed today
    const dateStr = format(date, 'yyyy-MM-dd');
    const completed = workoutSessions.some(s =>
      s.client_id === assignedProgram._clientId &&
      s.completed_at?.startsWith(dateStr)
    );

    return { date, workout, completed, isToday: isToday(date) };
  });

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-4 space-y-3">
      <h3 className="text-sm font-bold text-foreground">This Week's Schedule</h3>
      <div className="space-y-1.5">
        {schedule.map(({ date, workout, completed, isToday: todayFlag }) => (
          <div
            key={date.toISOString()}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-xl transition-colors',
              todayFlag ? 'bg-primary/5 border border-primary/20' : 'bg-muted/70'
            )}
          >
            {/* Day label */}
            <div className="w-10 text-center flex-shrink-0">
              <p className={cn('text-[10px] font-bold uppercase', todayFlag ? 'text-primary' : 'text-muted-foreground')}>
                {format(date, 'EEE')}
              </p>
              <p className={cn('text-sm font-bold', todayFlag ? 'text-primary' : 'text-muted-foreground')}>
                {format(date, 'd')}
              </p>
            </div>

            {/* Workout info or rest day */}
            {workout ? (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{workout.day_name || `Day ${workout.day_number || ''}`}</p>
                {workout.exercises?.length > 0 && (
                  <p className="text-[10px] text-muted-foreground">{workout.exercises.length} exercises</p>
                )}
              </div>
            ) : (
              <div className="flex-1">
                <p className="text-xs text-muted-foreground italic">Rest Day</p>
              </div>
            )}

            {/* Status icon */}
            {workout && (
              <div className="flex-shrink-0">
                {completed ? (
                  <CheckCircle2 className="w-4 h-4 text-success" />
                ) : (
                  <Clock className={cn('w-4 h-4', todayFlag ? 'text-primary' : 'text-border')} />
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Program Progress ──────────────────────────────────────────────────────────
function ProgramProgress({ assignedProgram, workoutSessions, client }) {
  if (!assignedProgram) return null;

  const totalWeeks = assignedProgram.duration_weeks || 0;
  const daysPerWeek = assignedProgram.days_per_week || 3;
  const totalWorkouts = totalWeeks * daysPerWeek || 0;

  const completed = workoutSessions.filter(s => s.client_id === client.id).length;
  const completionPct = totalWorkouts > 0 ? Math.min(Math.round((completed / totalWorkouts) * 100), 100) : 0;

  // Week number
  const startDate = client.start_date ? new Date(client.start_date) : null;
  const currentWeek = startDate
    ? Math.min(Math.floor((Date.now() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1, totalWeeks || 999)
    : null;

  // This week completions (last 7 days)
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const thisWeekDone = workoutSessions.filter(s => {
    const d = s.completed_at ? new Date(s.completed_at) : null;
    return d && d >= weekStart && s.client_id === client.id;
  }).length;

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-4 space-y-4">
      <h3 className="text-sm font-bold text-foreground">Program Progress</h3>

      <div className="grid grid-cols-3 gap-3">
        {currentWeek !== null && totalWeeks > 0 && (
          <div className="text-center p-3 rounded-xl bg-accent">
            <p className="text-2xl font-bold text-primary">{currentWeek}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">of {totalWeeks} weeks</p>
          </div>
        )}
        <div className="text-center p-3 rounded-xl bg-success/10">
          <p className="text-2xl font-bold text-success">{thisWeekDone}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">this week</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-muted">
          <p className="text-2xl font-bold text-foreground">{completed}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">total done</p>
        </div>
      </div>

      {totalWorkouts > 0 && (
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-muted-foreground font-medium">Overall completion</span>
            <span className="font-bold text-foreground">{completionPct}%</span>
          </div>
          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-ai transition-all duration-500"
              style={{ width: `${completionPct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────
export default function ProgramsTab({ client }) {
  const { data: allPrograms = [], isLoading, refetch } = useQuery({
    queryKey: ['programs-tab', client.id],
    queryFn: () => base44.entities.WorkoutProgram.list('-created_date'),
    staleTime: 0,
    refetchOnMount: true,
  });

  const { data: workoutSessions = [] } = useQuery({
    queryKey: ['workout-sessions-tab', client.id],
    queryFn: () => base44.entities.WorkoutSession.filter({ client_id: client.id }),
    enabled: !!client.id,
  });

  const assignedProgram = allPrograms.find(p => p.id === client.assigned_program_id) || null;

  if (isLoading) return (
    <div className="p-5 space-y-3">
      {[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)}
    </div>
  );

  return (
    <div className="h-full overflow-y-auto p-5 space-y-4">
      <AssignedProgramSection
        client={client}
        allPrograms={allPrograms}
        assignedProgram={assignedProgram}
        onRefetch={refetch}
      />
      <WeeklySchedule
        assignedProgram={assignedProgram}
        workoutSessions={workoutSessions}
      />
      <ProgramProgress
        assignedProgram={assignedProgram}
        workoutSessions={workoutSessions}
        client={client}
      />
    </div>
  );
}