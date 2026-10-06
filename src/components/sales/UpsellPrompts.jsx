import React from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Panel, PanelHeader, Initials, CountBadge } from '@/components/kit';

const UPSELL_OFFERS = [
  { tier: 'one_on_one', label: '1:1 upgrade', desc: 'Move to fully personalised 1:1 coaching', value: '$500/mo' },
  { tier: 'group', label: 'Group add-on', desc: 'Join the group coaching community', value: '$97/mo' },
  { tier: 'low_ticket', label: '12-week plan', desc: 'Self-guided 12-week program', value: '$47 once' },
];

export default function UpsellPrompts({ clients, programs }) {
  // Clients whose assigned program was created > 8 weeks ago or has no assignment recently checked
  const completingClients = clients.filter(c => {
    if (c.status !== 'active') return false;
    if (!c.assigned_program_id) return true;
    const prog = programs.find(p => p.id === c.assigned_program_id);
    if (!prog) return false;
    const weeks = prog.duration_weeks || 8;
    if (!c.start_date) return false;
    const daysSinceStart = (Date.now() - new Date(c.start_date).getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceStart >= weeks * 7 * 0.85;
  }).slice(0, 5);

  if (completingClients.length === 0) return null;

  return (
    <Panel>
      <PanelHeader
        title={<span className="inline-flex items-center gap-2">Ready for what's next <CountBadge count={completingClients.length} tone="neutral" /></span>}
        subtitle="Near the end of their program, or without one. A good week to talk about the next block."
      />
      <ul className="px-5 sm:px-6 divide-y divide-border">
        {completingClients.map(client => (
          <li key={client.id} className="flex items-center gap-3 py-3">
            <Initials name={client.name || ''} />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold text-foreground truncate">{client.name}</p>
              <p className="text-sm text-muted-foreground truncate">{client.assigned_program_id ? 'Program almost finished' : 'No program assigned'}</p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <Link to={`/client-profile?id=${client.id}`} className="hidden sm:inline text-sm font-semibold text-foreground underline underline-offset-4 decoration-1 hover:decoration-2">Profile</Link>
              <Button asChild size="sm" variant="outline">
                <Link to={`/messages?client=${client.id}`}>Message</Link>
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <div className="px-5 sm:px-6 py-4 border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <p className="text-[13px] text-muted-foreground">
          Offers: {UPSELL_OFFERS.map(o => `${o.label} ${o.value}`).join(' · ')}
        </p>
        <Link to="/messages" className="text-sm font-semibold text-foreground underline underline-offset-4 decoration-1 hover:decoration-2 whitespace-nowrap">
          Message these clients
        </Link>
      </div>
    </Panel>
  );
}
