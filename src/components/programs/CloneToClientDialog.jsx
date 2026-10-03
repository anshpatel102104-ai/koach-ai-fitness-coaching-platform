import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Check, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function CloneToClientDialog({ open, onOpenChange, program }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState([]);
  const queryClient = useQueryClient();

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => db.entities.Client.list(),
    enabled: open,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.Client.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients'] }),
  });

  const filtered = clients.filter(c =>
    c.status === 'active' && c.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const handleAssign = () => {
    selected.forEach(clientId => {
      updateMutation.mutate({ id: clientId, data: { assigned_program_id: program.id } });
    });
    toast.success(`Program cloned to ${selected.length} client${selected.length > 1 ? 's' : ''}`);
    setSelected([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">Clone to Clients</DialogTitle>
          <p className="text-sm text-foreground">Assign <span className="font-medium text-foreground">"{program?.title}"</span> to active clients instantly</p>
        </DialogHeader>

        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground" />
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto mt-1">
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-foreground py-6">No active clients found</p>
          ) : filtered.map(client => (
            <button
              key={client.id}
              type="button"
              onClick={() => toggle(client.id)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                selected.includes(client.id)
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/30 bg-card"
              )}
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold flex-shrink-0">
                {client.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{client.name}</p>
                <p className="text-xs text-foreground">{client.goal?.replace('_', ' ')}</p>
              </div>
              {selected.includes(client.id) && (
                <Check className="w-4 h-4 text-primary flex-shrink-0" />
              )}
            </button>
          ))}
        </div>

        <div className="flex justify-between items-center pt-3 border-t border-border">
          <span className="text-sm text-foreground">{selected.length} selected</span>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleAssign} disabled={selected.length === 0}>
              <Users className="w-4 h-4 mr-2" /> Assign to {selected.length || ''} Client{selected.length !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}