import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase as base44 } from '@/api/supabaseClient';
import { Dumbbell, Calendar, ChevronRight, Layers, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { SignedImg } from '@/components/shared/SignedImage';

const DIFFICULTY_STYLES = {
  beginner:     'bg-success/10 text-success border-success',
  intermediate: 'bg-accent text-primary border-accent',
  advanced:     'bg-orange-50 text-orange-700 border-orange-100',
  elite:        'bg-destructive/10 text-destructive border-destructive',
};

export default function ProfileProgramsTab({ client }) {
  const navigate = useNavigate();
  const { data: programs = [], isLoading } = useQuery({
    queryKey: ['workout-programs'],
    queryFn: () => base44.entities.WorkoutProgram.list(),
  });

  const assigned = programs.find(p => p.id === client.assigned_program_id);

  if (isLoading) return (
    <div className="space-y-3">
      {[1, 2].map(i => <div key={i} className="h-24 bg-card rounded-2xl border border-border animate-pulse" />)}
    </div>
  );

  if (!assigned) return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted border border-border flex items-center justify-center mb-4">
        <Dumbbell className="w-7 h-7 text-muted-foreground" />
      </div>
      <p className="text-sm font-semibold text-foreground mb-1">No program assigned</p>
      <p className="text-xs text-muted-foreground mb-5">Assign a training program to get started</p>
      <Button size="sm" variant="outline" onClick={() => navigate('/programs')} className="gap-1.5">
        <Dumbbell className="w-3.5 h-3.5" /> Browse Programs
      </Button>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Program header card */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-muted">
          <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
            <Dumbbell className="w-3.5 h-3.5 text-primary" />
          </div>
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Assigned Program</h3>
        </div>

        <div className="p-4">
          {assigned.image_url && (
            <div className="w-full h-32 rounded-xl overflow-hidden mb-4 border border-border">
              <SignedImg src={assigned.image_url} alt={assigned.title} className="w-full h-full object-cover" />
            </div>
          )}

          <h2 className="text-base font-bold text-foreground mb-1">{assigned.title}</h2>
          {assigned.description && (
            <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{assigned.description}</p>
          )}

          <div className="flex flex-wrap gap-1.5 mb-4">
            {assigned.difficulty && (
              <span className={cn('text-[11px] font-semibold px-2.5 py-1 rounded-lg border capitalize', DIFFICULTY_STYLES[assigned.difficulty] || 'bg-muted text-foreground border-border')}>
                {assigned.difficulty}
              </span>
            )}
            {assigned.duration_weeks && (
              <span className="text-[11px] font-medium px-2.5 py-1 rounded-lg border bg-muted text-foreground border-border flex items-center gap-1">
                <Clock className="w-3 h-3" /> {assigned.duration_weeks} weeks
              </span>
            )}
            {assigned.days_per_week && (
              <span className="text-[11px] font-medium px-2.5 py-1 rounded-lg border bg-muted text-foreground border-border flex items-center gap-1">
                <Calendar className="w-3 h-3" /> {assigned.days_per_week}×/week
              </span>
            )}
            {assigned.category && (
              <span className="text-[11px] font-medium px-2.5 py-1 rounded-lg border bg-muted text-foreground border-border capitalize">
                {assigned.category.replace('_', ' ')}
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => navigate('/programs')} className="flex-1 gap-1.5 text-xs">
              <Layers className="w-3.5 h-3.5" /> Change Program
            </Button>
          </div>
        </div>
      </div>

      {/* Workout schedule */}
      {assigned.workouts?.length > 0 && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-muted">
            <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Weekly Split</h3>
          </div>
          <div className="divide-y divide-muted">
            {assigned.workouts.map((w, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <div className="w-7 h-7 rounded-lg bg-accent/10 text-primary text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                  {w.day_number || i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{w.day_name || `Day ${i + 1}`}</p>
                  <p className="text-xs text-muted-foreground">{w.exercises?.length || 0} exercises</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}