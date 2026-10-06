import React from 'react';
import { averageAdherenceScore, calculateStreak } from '@/lib/adherence';
import { Panel, PanelHeader, Initials, TextLink } from '@/components/kit';

/**
 * Clients ranked by adherence, as a plain list: rank, name, streak, badges,
 * score. No medals — the number says it.
 */
export default function AdherenceLeaderboard({ clients, checkIns, badges = [], limit = 8, onSelect }) {
  const [showAll, setShowAll] = React.useState(false);
  const cisByClient = {};
  for (const ci of checkIns) (cisByClient[ci.client_id] = cisByClient[ci.client_id] || []).push(ci);

  const ranked = clients
    .map(c => {
      const cis = (cisByClient[c.id] || []).sort((a, b) => new Date(b.date) - new Date(a.date));
      return {
        client: c,
        score: averageAdherenceScore(cis),
        streak: calculateStreak(cis),
        badgeCount: badges.filter(b => b.client_id === c.id).length,
      };
    })
    .filter(x => x.score !== null)
    .sort((a, b) => b.score - a.score);

  if (!ranked.length) return null;
  const shown = showAll ? ranked : ranked.slice(0, limit);

  return (
    <Panel>
      <PanelHeader title="Ranking" subtitle="Average of the last 4 check-ins." />
      <ol className="px-5 pb-2 sm:px-6">
        {shown.map(({ client, score, streak, badgeCount }, i) => {
          const Row = onSelect ? 'button' : 'div';
          return (
            <li key={client.id} className="border-t border-border first:border-t-0">
              <Row onClick={onSelect ? () => onSelect(client) : undefined} className="flex w-full items-center gap-3 py-3 text-left">
                <span className="num w-5 flex-shrink-0 text-[17px] text-muted-foreground">{i + 1}</span>
                <Initials name={client.name} size={32} tone={score < 50 ? 'alert' : 'default'} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold text-foreground">{client.name}</span>
                  <span className="block text-[13px] text-muted-foreground">
                    {streak}-week streak{badgeCount > 0 && ` · ${badgeCount} badge${badgeCount === 1 ? '' : 's'}`}
                  </span>
                </span>
                <span className="num text-[20px] text-foreground">{score}%</span>
              </Row>
            </li>
          );
        })}
      </ol>
      {ranked.length > limit && (
        <div className="border-t border-border px-5 py-3 sm:px-6">
          <TextLink onClick={() => setShowAll(s => !s)}>{showAll ? 'Show fewer' : `Show all ${ranked.length}`}</TextLink>
        </div>
      )}
    </Panel>
  );
}
