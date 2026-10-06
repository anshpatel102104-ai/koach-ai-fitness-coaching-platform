import React from 'react';
import { Button } from '@/components/ui/button';
import { Panel, PanelHeader, Initials } from '@/components/kit';
import { SignedImg } from '@/components/shared/SignedImage';

export default function ProgramAssignedClientsPanel({
  assignedClients = [],
  allClients = [], // eslint-disable-line no-unused-vars
  programId, // eslint-disable-line no-unused-vars
  programDurationWeeks = 12,
  progressByClientId = {},
  onAssign,
}) {
  return (
    <Panel>
      <PanelHeader
        title="On this program"
        subtitle={assignedClients.length ? `${assignedClients.length} client${assignedClients.length !== 1 ? 's' : ''}` : null}
        className="sm:px-5 sm:pt-5"
      />

      {assignedClients.length === 0 ? (
        <div className="px-5 pb-5">
          <p className="text-sm text-muted-foreground">Nobody yet.</p>
          <Button size="sm" onClick={onAssign} className="mt-3">Assign a client</Button>
        </div>
      ) : (
        <div className="px-5 pb-5">
          {assignedClients.slice(0, 5).map((client) => {
            const stat = progressByClientId[client.id];
            const started = stat && stat.total > 0;
            const progress = started ? Math.round((stat.completed / stat.total) * 100) : 0;
            const currentWeek = started ? Math.max(1, Math.floor((progress / 100) * programDurationWeeks)) : null;

            return (
              <div key={client.id} className="border-b border-border py-3 last:border-b-0">
                <div className="flex items-center gap-3">
                  {client.avatar_url
                    ? <SignedImg src={client.avatar_url} alt={client.name} className="h-8 w-8 flex-shrink-0 rounded-full object-cover" />
                    : <Initials name={client.name} size={32} />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold text-foreground">{client.name}</p>
                    <p className="text-[13px] text-muted-foreground">
                      {started ? `Week ${currentWeek} of ${programDurationWeeks}` : 'Not started yet'}
                    </p>
                  </div>
                  {started && <span className="num text-[17px] text-foreground">{progress}%</span>}
                </div>
                {started && (
                  <div className="ml-11 mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-foreground" style={{ width: `${progress}%` }} />
                  </div>
                )}
              </div>
            );
          })}

          {assignedClients.length > 5 && (
            <p className="pt-2 text-[13px] text-muted-foreground">
              And {assignedClients.length - 5} more.
            </p>
          )}

          <button onClick={onAssign} className="mt-3 text-sm font-semibold text-foreground underline underline-offset-4">
            Assign someone else
          </button>
        </div>
      )}
    </Panel>
  );
}
