import React from 'react';
import { Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SignedImg } from '@/components/shared/SignedImage';

function getInitials(name = '') {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function getAvatarColor(name = '') {
  const colors = [
    ['var(--tc-accent)', 'var(--tc-primary)'],
    ['var(--tc-success)', 'var(--tc-success)'],
    ['var(--tc-warning)', 'var(--tc-warning)'],
    ['var(--tc-ai)', 'var(--tc-ai)'],
    ['var(--kc-fce7f3)', 'var(--kc-9d174d)'],
    ['var(--tc-warning)', 'var(--kc-9a3412)'],
  ];
  const i = name.charCodeAt(0) % colors.length;
  return colors[i];
}

export default function ProgramAssignedClientsPanel({
  assignedClients = [],
  allClients = [],
  programId,
  programDurationWeeks = 12,
  progressByClientId = {},
  onAssign,
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" />
          Assigned Clients
        </h3>
        {assignedClients.length > 0 && (
          <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {assignedClients.length}
          </span>
        )}
      </div>

      {assignedClients.length === 0 ? (
        <div className="text-center py-6">
          <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-3">
            <Users className="w-5 h-5 text-[var(--kc-3730a3)]" />
          </div>
          <p className="text-xs text-muted-foreground mb-3">No clients assigned yet</p>
          <Button
            size="sm"
            onClick={onAssign}
            className="w-full gap-1.5 text-xs"
            style={{ background: 'var(--tc-primary)', color: 'var(--tc-primary-foreground)' }}
          >
            <Plus className="w-3.5 h-3.5" /> Assign Client
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-3 mb-4">
            {assignedClients.slice(0, 5).map((client) => {
              const stat = progressByClientId[client.id];
              const started = stat && stat.total > 0;
              const progress = started ? Math.round((stat.completed / stat.total) * 100) : 0;
              const currentWeek = started ? Math.max(1, Math.floor((progress / 100) * programDurationWeeks)) : null;
              const [bgColor, textColor] = getAvatarColor(client.name);

              return (
                <div key={client.id}>
                  <div className="flex items-center gap-2.5 mb-1.5">
                    {/* Initials avatar */}
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: bgColor, color: textColor }}
                    >
                      {client.avatar_url
                        ? <SignedImg src={client.avatar_url} alt={client.name} className="w-8 h-8 rounded-full object-cover" />
                        : getInitials(client.name)
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{client.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {started ? `Week ${currentWeek} of ${programDurationWeeks}` : 'Not started yet'}
                      </p>
                    </div>
                    {started && <span className="text-[10px] font-bold text-primary">{progress}%</span>}
                  </div>
                  {/* Progress bar */}
                  <div className="ml-10 h-1.5 bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${progress}%`, background: 'var(--tc-primary)' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {assignedClients.length > 5 && (
            <p className="text-xs text-muted-foreground mb-3">
              +{assignedClients.length - 5} more client{assignedClients.length - 5 !== 1 ? 's' : ''}
            </p>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={onAssign}
            className="w-full gap-1.5 text-xs font-semibold"
            style={{ color: 'var(--tc-primary)', borderColor: 'var(--tc-primary)' }}
          >
            <Plus className="w-3.5 h-3.5" /> Assign New
          </Button>
        </>
      )}
    </div>
  );
}