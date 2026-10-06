import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Panel, Segmented, EmptyState, Initials } from '@/components/kit';
import { cn } from '@/lib/utils';
import { calculateStreak, averageAdherenceScore } from '@/lib/adherence';

const BOARDS = [
  { key: 'workouts',  label: 'Workouts',    unit: 'weeks trained' },
  { key: 'steps',     label: 'Steps',       unit: 'steps' },
  { key: 'streak',    label: 'Streak',      unit: 'in a row' },
  { key: 'adherence', label: 'Adherence',   unit: '%' },
  { key: 'weight',    label: 'Weight lost', unit: 'lb' },
];

export default function Leaderboard({ clients }) {
  const [active, setActive] = useState('workouts');

  const { data: checkIns = [] } = useQuery({
    queryKey: ['checkins-leaderboard'],
    queryFn: () => db.entities.CheckIn.list('-date', 500),
  });

  const ranked = useMemo(() => {
    return [...clients]
      .map(c => {
        const cis = checkIns.filter(ci => ci.client_id === c.id).sort((a, b) => new Date(b.date) - new Date(a.date));
        let score = 0;
        if (active === 'workouts') score = cis.filter(ci => (ci.compliance_training || 0) > 0).length;
        else if (active === 'streak') score = calculateStreak(cis);
        else if (active === 'adherence') score = averageAdherenceScore(cis.slice(0, 4)) || 0;
        else if (active === 'weight') {
          const withW = cis.filter(ci => ci.weight != null);
          if (withW.length >= 2) score = Math.max(0, withW[withW.length - 1].weight - withW[0].weight);
        }
        return { ...c, score: Math.round(score * 10) / 10 };
      })
      .filter(c => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }, [clients, checkIns, active]);

  const board = BOARDS.find(b => b.key === active);

  return (
    <Panel className="overflow-hidden">
      <div className="px-4 pt-4 sm:px-5">
        <Segmented size="sm" value={active} onChange={setActive} options={BOARDS.map(b => ({ value: b.key, label: b.label }))} />
      </div>

      {ranked.length === 0 ? (
        <EmptyState title="Nothing to rank yet" body="Scores show up once members log check-ins." />
      ) : (
        <ol className="divide-y divide-border px-4 sm:px-5 pb-1 mt-2">
          {ranked.map((client, idx) => (
            <li key={client.id} className="flex items-center gap-3 py-3">
              <span className={cn('num w-6 text-center text-lg', idx === 0 ? 'text-foreground' : 'text-muted-foreground')}>{idx + 1}</span>
              <Initials name={client.name || ''} size={32} tone={idx === 0 ? 'ink' : 'default'} />
              <p className="flex-1 text-[15px] font-semibold text-foreground truncate">{client.name}</p>
              <span className="whitespace-nowrap">
                <span className="num text-lg text-foreground">{active === 'steps' ? client.score.toLocaleString() : client.score}</span>
                <span className="text-[13px] text-muted-foreground ml-1">{board.unit}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}
