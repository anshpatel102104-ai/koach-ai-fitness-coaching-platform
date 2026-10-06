import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Initials } from '@/components/kit';
import { cn } from '@/lib/utils';
import { SignedImg } from '@/components/shared/SignedImage';

export default function ClientPickerStep({ selectedClients, onSelectClients, allClients }) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredClients = useMemo(() => {
    return allClients
      .filter((client) => {
        const query = searchQuery.toLowerCase();
        return (
          (client.name || '').toLowerCase().includes(query) ||
          (client.email || '').toLowerCase().includes(query)
        );
      })
      .sort((a, b) => {
        // Clients without programs first
        const aHasProgram = !!a.assigned_program_id;
        const bHasProgram = !!b.assigned_program_id;
        if (aHasProgram !== bHasProgram) {
          return aHasProgram ? 1 : -1;
        }
        return (a.name || '').localeCompare(b.name || '');
      });
  }, [allClients, searchQuery]);

  const toggleClient = (clientId) => {
    if (selectedClients.includes(clientId)) {
      onSelectClients(selectedClients.filter((id) => id !== clientId));
    } else {
      onSelectClients([...selectedClients, clientId]);
    }
  };

  const toggleAll = () => {
    if (selectedClients.length === filteredClients.length) {
      onSelectClients([]);
    } else {
      onSelectClients(filteredClients.map((c) => c.id));
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          placeholder="Name or email"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-10 w-full rounded-lg bg-secondary pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {filteredClients.length > 0 && (
        <label className="flex cursor-pointer items-center gap-3 px-1 py-1.5 text-sm">
          <Checkbox
            checked={selectedClients.length === filteredClients.length && filteredClients.length > 0}
            onCheckedChange={toggleAll}
          />
          <span className="font-medium text-foreground">
            Select all {filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''}
          </span>
          {selectedClients.length > 0 && (
            <span className="ml-auto text-[13px] text-muted-foreground">{selectedClients.length} selected</span>
          )}
        </label>
      )}

      <div className="max-h-96 overflow-y-auto rounded-xl border border-border">
        {filteredClients.length === 0 ? (
          <p className="px-4 py-8 text-sm text-muted-foreground">No clients match that search.</p>
        ) : (
          filteredClients.map((client) => {
            const isSelected = selectedClients.includes(client.id);
            const hasProgram = !!client.assigned_program_id;

            return (
              <label
                key={client.id}
                className={cn(
                  'flex cursor-pointer items-center gap-3 border-b border-border px-3 py-2.5 transition-colors last:border-b-0',
                  isSelected ? 'bg-accent' : 'hover:bg-accent/50'
                )}
              >
                <Checkbox checked={isSelected} onCheckedChange={() => toggleClient(client.id)} />
                {client.avatar_url
                  ? <SignedImg src={client.avatar_url} alt={client.name} className="h-8 w-8 flex-shrink-0 rounded-full object-cover" />
                  : <Initials name={client.name} size={32} />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold text-foreground">{client.name}</p>
                  <p className={cn('truncate text-[13px]', hasProgram ? 'text-warning' : 'text-muted-foreground')}>
                    {hasProgram ? 'On another program. This replaces it.' : 'No program yet'}
                  </p>
                </div>
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}
