import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Panel, PanelHeader, ComplianceStrip, ComplianceLegend, TextLink } from '@/components/kit';
import { cn } from '@/lib/utils';

const MOBILE_WEEKS = 5;

/**
 * Roster pulse: one row per active client with their last eight weeks of
 * compliance and the composite adherence score on the right.
 * Shared by Today and the Adherence page.
 */
export function RosterGrid({ rows, labels, onOpen, compact = false }) {
  const mobileLabels = labels.slice(-MOBILE_WEEKS);
  return (
    <div className="px-5 pb-5 sm:px-6 sm:pb-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_3.25rem] items-center gap-x-3 sm:gap-x-5">
        {/* Header row */}
        <span className="pb-1.5 text-[13px] text-muted-foreground">Weekly compliance</span>
        <span className="pb-1.5">
          <span className="flex gap-[5px] sm:hidden">
            {mobileLabels.map(l => <span key={l} className="w-6 text-center text-[11px] font-medium text-foreground/80">{l}</span>)}
          </span>
          <span className="hidden gap-[5px] sm:flex">
            {labels.map(l => <span key={l} className="w-[26px] text-center text-[12px] font-medium text-foreground/80">{l}</span>)}
          </span>
        </span>
        <span />

        {rows.map(({ client, cells, score }) => (
          <React.Fragment key={client.id}>
            <button
              onClick={() => onOpen?.(client)}
              className={cn('min-w-0 truncate py-[5px] text-left text-[15px] font-medium text-foreground hover:underline underline-offset-4', compact && 'text-sm')}
            >
              {client.name}
            </button>
            <span className="py-[5px]">
              <ComplianceStrip weeks={cells.slice(-MOBILE_WEEKS)} size="sm" className="sm:hidden" label={`${client.name}, last ${MOBILE_WEEKS} weeks`} />
              <ComplianceStrip weeks={cells} className="hidden sm:flex" label={`${client.name}, last ${cells.length} weeks`} />
            </span>
            <span className="num py-[5px] text-right text-[19px] text-foreground">
              {score !== null && score !== undefined ? `${score}%` : <span className="text-muted-foreground">—</span>}
            </span>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

export default function RosterPulse({ rows, labels, total, limit = 10 }) {
  const navigate = useNavigate();
  const shown = rows.slice(0, limit);

  return (
    <Panel className="flex flex-col">
      <PanelHeader
        title="Roster pulse"
        right={<ComplianceLegend className="hidden sm:flex" />}
      />
      <ComplianceLegend className="px-5 pb-3 sm:hidden" />
      {shown.length === 0 ? (
        <p className="px-5 pb-6 text-sm text-muted-foreground sm:px-6">
          No active clients yet. Compliance shows up here after their first check-in.
        </p>
      ) : (
        <RosterGrid rows={shown} labels={labels} onOpen={c => navigate(`/client-profile?id=${c.id}`)} />
      )}
      <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border px-5 py-4 sm:px-6">
        <TextLink onClick={() => navigate('/adherence')}>
          {total > shown.length ? `See all ${total} clients` : 'Open adherence'}
        </TextLink>
        <TextLink onClick={() => navigate('/clients')} className="text-muted-foreground">Add a client</TextLink>
      </div>
    </Panel>
  );
}
