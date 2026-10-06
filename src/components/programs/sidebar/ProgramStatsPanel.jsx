import React from 'react';
import { Panel, PanelHeader, Stat } from '@/components/kit';

export default function ProgramStatsPanel({ stats = {} }) {
  const {
    assignedCount = 0,
    completedSessions = 0,
    totalSessions = 0,
    completionRate = null,
    avgDifficulty = null,
    loaded = false,
  } = stats;

  return (
    <Panel>
      <PanelHeader title="How it's going" className="sm:px-5 sm:pt-5" />
      <div className="grid grid-cols-2 gap-x-4 gap-y-5 px-5 pb-5">
        <Stat label="Assigned" value={assignedCount} size="sm" />
        <Stat label="Sessions done" value={completionRate != null ? `${completionRate}%` : '—'} size="sm" />
        <Stat
          label="Sessions logged"
          value={loaded && totalSessions === 0 ? '0' : completedSessions}
          sub={loaded && totalSessions === 0 ? 'None logged yet' : `of ${totalSessions} due`}
          size="sm"
        />
        {avgDifficulty != null && (
          <Stat label="Felt like" value={avgDifficulty} unit="/ 10" size="sm" />
        )}
      </div>
    </Panel>
  );
}
