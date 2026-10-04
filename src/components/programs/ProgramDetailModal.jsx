import React, { useState, useEffect, useMemo } from 'react';
import { X, Target, Flame, BarChart3, Clock, UserPlus, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '@/api/supabaseClient';

import ProgramOverviewTab from './tabs/ProgramOverviewTab';
import ProgramWeeklyScheduleTab from './tabs/ProgramWeeklyScheduleTab';
import ProgramExercisesTab from './tabs/ProgramExercisesTab';
import ProgramAssignedClientsPanel from './sidebar/ProgramAssignedClientsPanel';
import ProgramStatsPanel from './sidebar/ProgramStatsPanel';

const CATEGORY_LABELS = {
  strength: 'Strength',
  hypertrophy: 'Hypertrophy',
  fat_loss: 'Fat Loss',
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
  { id: 'overview', label: 'Overview' },
  { id: 'schedule', label: 'Weekly Schedule' },
  { id: 'exercises', label: 'Exercises' },
];

const STAT_ICONS = {
  duration: Clock,
  frequency: BarChart3,
  rest: Target,
  level: Flame,
};

export default function ProgramDetailModal({
  program,
  assignedClients = [],
  allClients = [],
  onClose,
  onAssign,
  onEdit,
}) {
  const [activeTab, setActiveTab] = useState('overview');
  const [sessions, setSessions] = useState([]);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);

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

  const stats = [
    program.duration_weeks && { key: 'duration', icon: Clock,    label: 'Duration',  value: `${program.duration_weeks} weeks` },
    program.days_per_week  && { key: 'freq',     icon: BarChart3, label: 'Frequency', value: `${program.days_per_week}x / week` },
    { key: 'rest',   icon: Target,   label: 'Rest Days', value: `${7 - (program.days_per_week || 0)} / week` },
    program.difficulty     && { key: 'level',    icon: Flame,     label: 'Level',     value: levelLabel },
  ].filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.18 }}
        className="w-full max-w-5xl h-[90vh] bg-card rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* ── HEADER ── */}
        <div style={{ background: 'var(--tc-sidebar)' }} className="px-6 sm:px-8 pt-6 pb-5 flex-shrink-0">
          {/* Top row: type pill + action buttons + close */}
          <div className="flex items-start justify-between gap-3 mb-3">
            {/* Type pill */}
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: 'color-mix(in srgb, var(--tc-primary) 18%, transparent)', color: 'var(--tc-primary)' }}
            >
              {typeLabel}
            </span>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                onClick={onAssign}
                size="sm"
                className="h-8 px-3 text-xs font-semibold gap-1.5"
                style={{ background: 'var(--tc-primary)', color: 'var(--tc-primary-foreground)', border: 'none' }}
              >
                <UserPlus className="w-3.5 h-3.5" />
                Assign
              </Button>
              <Button
                onClick={onEdit}
                size="sm"
                variant="ghost"
                className="h-8 px-3 text-xs font-semibold text-white gap-1.5 hover:bg-[var(--kc-w-10)]"
                style={{ border: '0.5px solid color-mix(in srgb, white 50%, transparent)', background: 'transparent' }}
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </Button>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
                style={{ background: 'color-mix(in srgb, white 8%, transparent)' }}
              >
                <X className="w-4 h-4 text-white/80" />
              </button>
            </div>
          </div>

          {/* Title + description */}
          <h2 className="text-white font-medium mb-1.5" style={{ fontSize: 22 }}>
            {program.title}
          </h2>
          {program.description && (
            <p className="text-sm leading-relaxed max-w-2xl" style={{ color: 'color-mix(in srgb, white 60%, transparent)' }}>
              {program.description}
            </p>
          )}
        </div>

        {/* ── STAT ROW (white strip) ── */}
        <div className="flex items-center gap-0 border-b border-border bg-card flex-shrink-0">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.key}
                className={cn(
                  'flex items-center gap-2.5 px-5 py-3.5 flex-1',
                  i !== stats.length - 1 && 'border-r border-border'
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--tc-primary)' }} />
                <div>
                  <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{stat.label}</div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--tc-foreground)' }}>{stat.value}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── CONTENT ── */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Tab nav */}
          <div className="flex gap-0 px-6 sm:px-8 border-b border-border bg-card overflow-x-auto flex-shrink-0">
            {TAB_LIST.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="pb-3 pt-3 px-3 text-sm font-semibold transition-colors relative whitespace-nowrap"
                style={{
                  color: activeTab === tab.id ? 'var(--tc-primary)' : 'var(--tc-muted-foreground)',
                }}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="progTabUnderline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                    style={{ background: 'var(--tc-primary)' }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Main + sidebar */}
          <div className="flex-1 overflow-hidden flex">
            {/* Main content */}
            <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6">
              <AnimatePresence mode="wait">
                {activeTab === 'overview' && (
                  <motion.div key="overview" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>
                    <ProgramOverviewTab program={program} />
                  </motion.div>
                )}
                {activeTab === 'schedule' && (
                  <motion.div key="schedule" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>
                    <ProgramWeeklyScheduleTab program={program} />
                  </motion.div>
                )}
                {activeTab === 'exercises' && (
                  <motion.div key="exercises" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>
                    <ProgramExercisesTab program={program} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Sidebar */}
            <div className="hidden lg:flex lg:w-[30%] flex-col border-l border-border overflow-y-auto bg-muted">
              <div className="p-5 space-y-6">
                <ProgramAssignedClientsPanel
                  assignedClients={assignedClients}
                  allClients={allClients}
                  programId={program.id}
                  programDurationWeeks={program.duration_weeks}
                  progressByClientId={progressByClientId}
                  onAssign={onAssign}
                />
                <ProgramStatsPanel stats={programStats} />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}