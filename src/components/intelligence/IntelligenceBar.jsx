import React, { useMemo, useState } from 'react';
import { differenceInDays, parseISO } from 'date-fns';
import { compositeAdherenceScore } from '@/lib/adherence';
import { Dumbbell, TrendingUp, Clock, X } from 'lucide-react';
import NoProgramPanel from '@/components/clients/NoProgramPanel';
import QuickMessageModal from '@/components/clients/QuickMessageModal';

const DISMISS_PREFIX = 'insight_dismiss_';

function getDismissedUntil(key) {
  try { const raw = localStorage.getItem(DISMISS_PREFIX + key); return raw ? parseInt(raw, 10) : null; }
  catch { return null; }
}
function dismissFor24h(key) {
  try { localStorage.setItem(DISMISS_PREFIX + key, String(Date.now() + 24 * 3600 * 1000)); } catch {}
}
function isDismissed(key) {
  const until = getDismissedUntil(key);
  return until ? Date.now() < until : false;
}

function InsightCard({ label, sub, actions, onDismiss }) {
  return (
    <div className="flex min-w-0 items-center gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-tight text-foreground">{label}</p>
        {sub && <p className="mt-0.5 truncate text-[13px] text-muted-foreground">{sub}</p>}
      </div>
      <div className="flex flex-shrink-0 items-center gap-1">
        {actions}
        <button
          onClick={onDismiss}
          aria-label="Hide for a day"
          title="Hide for a day"
          className="touch-compact flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function IntelligenceBar({ clients = [], checkIns = [] }) {
  const [dismissed, setDismissed] = useState(() => new Set(['no_program', 'inactive', 'progression'].filter(isDismissed)));
  const [showNoProgramPanel, setShowNoProgramPanel] = useState(false);
  const [showInactiveMessage, setShowInactiveMessage] = useState(false);

  const dismiss = (key) => { dismissFor24h(key); setDismissed(s => new Set([...s, key])); };

  const checkInMap = useMemo(() => {
    const map = {};
    checkIns.forEach(ci => { if (!map[ci.client_id]) map[ci.client_id] = []; map[ci.client_id].push(ci); });
    return map;
  }, [checkIns]);

  const activeClients = useMemo(() => clients.filter(c => (c.lifecycle_status || 'active') === 'active'), [clients]);

  const noProgram = useMemo(() => activeClients.filter(c => !c.assigned_program_id), [activeClients]);

  const inactive = useMemo(() => activeClients.filter(c => {
    const cis = checkInMap[c.id] || [];
    if (!cis.length) return true;
    const lastDate = cis.sort((a, b) => new Date(b.date) - new Date(a.date))[0].date;
    return differenceInDays(new Date(), parseISO(lastDate)) >= 14;
  }), [activeClients, checkInMap]);

  const readyForProgression = useMemo(() => activeClients.filter(c => {
    const cis = checkInMap[c.id] || [];
    if (cis.length < 4) return false;
    const score = compositeAdherenceScore(cis);
    return score !== null && score >= 80;
  }), [activeClients, checkInMap]);

  const insights = [
    {
      key: 'no_program',
      show: noProgram.length > 0,
      icon: Dumbbell,
      label: `${noProgram.length} client${noProgram.length > 1 ? 's' : ''} without a program`,
      sub: noProgram.slice(0, 2).map(c => c.name).join(', ') + (noProgram.length > 2 ? ` +${noProgram.length - 2} more` : ''),
      actions: (
        <button
          onClick={() => setShowNoProgramPanel(true)}
          className="touch-compact h-8 whitespace-nowrap rounded-md border border-input bg-card px-3 text-[13px] font-semibold text-foreground transition-colors hover:bg-accent"
        >
          Assign
        </button>
      ),
    },
    {
      key: 'inactive',
      show: inactive.length > 0,
      icon: Clock,
      label: `${inactive.length} inactive client${inactive.length > 1 ? 's' : ''}`,
      sub: inactive.slice(0, 2).map(c => c.name).join(', ') + (inactive.length > 2 ? ` +${inactive.length - 2} more` : '') + ', no check-in in 14+ days',
      actions: (
        <button
          onClick={() => setShowInactiveMessage(true)}
          className="touch-compact h-8 whitespace-nowrap rounded-md border border-input bg-card px-3 text-[13px] font-semibold text-foreground transition-colors hover:bg-accent"
        >
          Message
        </button>
      ),
    },
    {
      key: 'progression',
      show: readyForProgression.length > 0,
      icon: TrendingUp,
      label: `${readyForProgression.length} client${readyForProgression.length > 1 ? 's' : ''} ready for progression`,
      sub: readyForProgression.slice(0, 2).map(c => c.name).join(', ') + (readyForProgression.length > 2 ? ` +${readyForProgression.length - 2} more` : '') + ', 80%+ adherence',
      actions: null,
    },
  ];

  const visible = insights.filter(i => i.show && !dismissed.has(i.key));

  return (
    <>
      <div className="flex-shrink-0 px-5 pt-3">
        <p className="mb-1 text-[13px] text-muted-foreground">Worth a look</p>

        {visible.length === 0 ? (
          <p className="py-2 text-sm text-foreground">Every active client has a program and a recent check-in.</p>
        ) : (
          <div className="divide-y divide-border">
            {visible.map(insight => (
              <InsightCard key={insight.key} {...insight} onDismiss={() => dismiss(insight.key)} />
            ))}
          </div>
        )}
      </div>

      {showNoProgramPanel && <NoProgramPanel clients={noProgram} onClose={() => setShowNoProgramPanel(false)} />}
      {showInactiveMessage && (
        <QuickMessageModal
          clients={inactive}
          suggestedTemplate="Hey [First Name], just checking in — how are things going?"
          onClose={() => setShowInactiveMessage(false)}
        />
      )}
    </>
  );
}