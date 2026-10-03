import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { SignedImg } from '@/components/shared/SignedImage';

export default function ClientPickerStep({ selectedClients, onSelectClients, allClients }) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredClients = useMemo(() => {
    return allClients
      .filter((client) => {
        const query = searchQuery.toLowerCase();
        return (
          client.name.toLowerCase().includes(query) ||
          client.email.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => {
        // Clients without programs first
        const aHasProgram = !!a.assigned_program_id;
        const bHasProgram = !!b.assigned_program_id;
        if (aHasProgram !== bHasProgram) {
          return aHasProgram ? 1 : -1;
        }
        return a.name.localeCompare(b.name);
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
    <div className="space-y-4">
      {/* Search */}
      <Input
        placeholder="Search by name or email..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="h-9"
      />

      {/* Select All */}
      {filteredClients.length > 0 && (
        <label className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-secondary cursor-pointer transition-colors">
          <Checkbox
            checked={selectedClients.length === filteredClients.length && filteredClients.length > 0}
            onCheckedChange={toggleAll}
          />
          <span className="text-sm font-medium">
            Select all {filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''}
          </span>
        </label>
      )}

      {/* Client List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredClients.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No clients found</p>
          </div>
        ) : (
          filteredClients.map((client) => {
            const isSelected = selectedClients.includes(client.id);
            const hasProgram = !!client.assigned_program_id;

            return (
              <motion.label
                key={client.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : hasProgram
                    ? 'border-warning bg-warning/10'
                    : 'border-border hover:bg-secondary'
                }`}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleClient(client.id)}
                />

                <Avatar className="h-8 w-8">
                  {client.avatar_url && <SignedImg src={client.avatar_url} alt={client.name} />}
                  <AvatarFallback>{client.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{client.name}</p>
                  {hasProgram ? (
                    <p className="text-xs text-muted-foreground">Currently on: {client.assigned_program_id}</p>
                  ) : (
                    <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-success/10 text-success">
                      No program assigned
                    </span>
                  )}
                </div>

                {hasProgram && (
                  <div className="flex-shrink-0 flex items-center gap-1 text-warning">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-xs font-medium">Has program</span>
                  </div>
                )}
              </motion.label>
            );
          })
        )}
      </div>

      {selectedClients.length > 0 && (
        <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <p className="text-sm font-medium text-primary">
            {selectedClients.length} client{selectedClients.length !== 1 ? 's' : ''} selected
          </p>
        </div>
      )}
    </div>
  );
}