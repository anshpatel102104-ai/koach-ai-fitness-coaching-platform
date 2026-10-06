import React from 'react';
import { format } from 'date-fns';
import { Panel, PanelHeader, EmptyState } from '@/components/kit';

const TYPE_LABEL = { risk: 'Risk', celebration: 'Worth celebrating', opportunity: 'Opportunity', performance: 'Progress' };

/** Readable label from an insight id like "risk_churn_<uuid>". */
function describeId(id, clients = []) {
  const parts = id.split('_');
  const kind = parts.slice(1, -1).join(' ') || parts[1] || 'note';
  const maybeClient = parts[parts.length - 1];
  const client = clients.find(c => c.id === maybeClient);
  return client ? `${kind[0].toUpperCase()}${kind.slice(1)} · ${client.name}` : id.replace(/_/g, ' ');
}

export default function InsightHistory({ clients }) {
  // Dismissed insights in localStorage stand in for history.
  const history = (() => {
    try {
      const raw = JSON.parse(localStorage.getItem('koach_dismissed_insights') || '{}');
      return Object.entries(raw)
        .map(([id, ts]) => ({ id, ts, type: id.split('_')[0] === 'risk' ? 'risk' : id.split('_')[0] === 'celebrate' ? 'celebration' : id.split('_')[0] === 'opp' ? 'opportunity' : 'performance' }))
        .sort((a, b) => b.ts - a.ts);
    } catch { return []; }
  })();

  return (
    <Panel>
      <PanelHeader title="History" subtitle={`${history.length} dismissed in the last 7 days. Dismissed notes come back after a week if they still apply.`} />
      {history.length === 0 ? (
        <EmptyState className="pt-2" title="Nothing dismissed yet." body="Notes you dismiss are listed here for a week." />
      ) : (
        <ul className="pb-2">
          {history.map(({ id, ts, type }) => (
            <li key={id} className="flex items-center gap-4 border-t border-border px-5 py-3 sm:px-6">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium text-foreground">{describeId(id, clients)}</p>
                <p className="text-[13px] text-muted-foreground">{TYPE_LABEL[type]} · dismissed {format(new Date(ts), 'MMM d, h:mm a')}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
