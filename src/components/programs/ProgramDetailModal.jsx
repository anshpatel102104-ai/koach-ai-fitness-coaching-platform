import React, { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { db } from '@/api/supabaseClient';
import { Segmented, Stat } from '@/components/kit';

import ProgramOverviewTab from './tabs/ProgramOverviewTab';
import ProgramWeeklyScheduleTab from './tabs/ProgramWeeklyScheduleTab';
import ProgramExercisesTab from './tabs/ProgramExercisesTab';
import ProgramAssignedClientsPanel from './sidebar/ProgramAssignedClientsPanel';
import ProgramStatsPanel from './sidebar/ProgramStatsPanel';

const CATEGORY_LABELS = {
  strength: 'Strength',
  hypertrophy: 'Hypertrophy',
  fat_loss: 'Fat loss',
  athletic: 'Athletic',
  mobility: 'Mobility',
  custom: 'Custom',
};

const DIFFICULTY_LABELS = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  elite: 'Elite',
};

const TAB_LIST = [
  { value: 'schedule', label: 'Weeks' },
  { value: 'overview', label: 'Overview' },
  { value: 'exercises', label: 'Exercises' },
];

export default function ProgramDetailModal({
  program,
  assignedClients = [],
  allClients = [],
  onClose,
  onAssign,
  onEdit,
}) {
  const [activeTab, setActiveTab] = useState('schedule');
  const [sessions, setSessions] = useState([]);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Pull real logged sessions for this program so the sidebar shows actual
  // completion/progress instead of fabricated numbers.
  useEffect(() => {
    let active = true;
    if (!program?.id) return;
    setSessionsLoaded(false);
    db.entities.WorkoutSession.filter({ program_id: program.id })
      .then(rows => { if (active) { setSessions(rows || []); setSessionsLoaded(true); } })
      .catch(() => { if (active) { setSessions([]); setSessionsLoaded(true); } });
    return () => { active = false; };
  }, [program?.id]);

  // Per-client completion (completed vs. all resolved sessions for this program).
  const progressByClientId = useMemo(() => {
    const map = {};
    for (const s of sessions) {
      if (!s.client_id) continue;
      const m = map[s.client_id] || (map[s.client_id] = { completed: 0, total: 0 });
      if (['completed', 'missed', 'skipped'].includes(s.status)) {
        m.total += 1;
        if (s.status === 'completed') m.completed += 1;
      }
    }
    return map;
  }, [sessions]);

  // Aggregate program stats from real session data.
  const programStats = useMemo(() => {
    let completed = 0, total = 0, ratingSum = 0, ratingCount = 0;
    for (const s of sessions) {
      if (['completed', 'missed', 'skipped'].includes(s.status)) {
        total += 1;
        if (s.status === 'completed') completed += 1;
      }
      if (typeof s.session_rating === 'number') { ratingSum += s.session_rating; ratingCount += 1; }
    }
    return {
      assignedCount: assignedClients.length,
      completedSessions: completed,
      totalSessions: total,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : null,
      avgDifficulty: ratingCount > 0 ? (ratingSum / ratingCount).toFixed(1) : null,
      loaded: sessionsLoaded,
    };
  }, [sessions, assignedClients.length, sessionsLoaded]);

  const typeLabel = CATEGORY_LABELS[program.category] || program.category || 'Program';
  const levelLabel = DIFFICULTY_LABELS[program.difficulty] || program.difficulty || '';
  const eyebrow = [typeLabel, program.is_template ? 'template' : null].filter(Boolean).join(' ');

  const stats = [
    program.duration_weeks && { key: 'duration', label: 'Length', value: program.duration_weeks, unit: program.duration_weeks === 1 ? 'week' : 'weeks' },
    program.days_per_week && { key: 'freq', label: 'Training days', value: program.days_per_week, unit: 'a week' },
    { key: 'rest', label: 'Rest days', value: Math.max(0, 7 - (program.days_per_week || 0)), unit: 'a week' },
    program.difficulty && { key: 'level', label: 'Level', value: levelLabel },
  ].filter(Boolean);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-[rgb(17_19_24/0.55)] sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={program.title}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="flex h-[94dvh] w-full max-w-6xl flex-col overflow-hidden rounded-t-2xl bg-background shadow-[0_24px_64px_-16px_rgb(0_0_0/0.35)] sm:h-[90vh] sm:rounded-xl"
      >
        {/* ── Header ── */}
        <div className="flex-shrink-0 border-b border-border bg-card px-5 pb-5 pt-5 sm:px-8 sm:pt-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="mb-1 text-sm font-medium text-muted-foreground">{eyebrow}</p>
              <h2 className="text-[28px] text-foreground sm:text-[34px]">{program.title}</h2>
              {program.description && (
                <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">{program.description}</p>
              )}
            </div>
            <div className="flex flex-shrink-0 items-center gap-2">
              <Button onClick={onEdit} variant="outline" className="hidden sm:inline-flex">Edit in builder</Button>
              <Button onClick={onAssign} className="hidden sm:inline-flex">Assign</Button>
              <button
                onClick={onClose}
                className="touch-compact flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:flex sm:gap-10">
            {stats.map(s => (
              <Stat key={s.key} label={s.label} value={s.value} unit={s.unit} size="sm" />
            ))}
          </div>

          <div className="mt-4 flex gap-2 sm:hidden">
            <Button onClick={onEdit} variant="outline" className="flex-1">Edit in builder</Button>
            <Button onClick={onAssign} className="flex-1">Assign</Button>
          </div>
        </div>

        {/* ── Content ── */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
          <div className="min-w-0 flex-1 px-5 py-5 sm:px-8 lg:overflow-y-auto">
            <Segmented options={TAB_LIST} value={activeTab} onChange={setActiveTab} className="mb-5" />
            {activeTab === 'overview' && <ProgramOverviewTab program={program} />}
            {activeTab === 'schedule' && <ProgramWeeklyScheduleTab program={program} />}
            {activeTab === 'exercises' && <ProgramExercisesTab program={program} />}
          </div>

          <aside className="flex-shrink-0 space-y-4 px-5 pb-6 sm:px-8 lg:w-[320px] lg:overflow-y-auto lg:py-5 lg:pl-0 lg:pr-6">
            <ProgramAssignedClientsPanel
              assignedClients={assignedClients}
              allClients={allClients}
              programId={program.id}
              programDurationWeeks={program.duration_weeks}
              progressByClientId={progressByClientId}
              onAssign={onAssign}
            />
            <ProgramStatsPanel stats={programStats} />
          </aside>
        </div>
      </div>
    </motion.div>
  );
}
