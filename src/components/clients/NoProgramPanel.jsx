import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { db } from '@/api/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { X, Dumbbell, Check } from 'lucide-react';

function ClientAssignRow({ client, programs, onAssigned }) {
  const [selected, setSelected] = useState('');
  const queryClient = useQueryClient();

  const assignMutation = useMutation({
    mutationFn: () => db.entities.Client.update(client.id, { assigned_program_id: selected }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success(`Program assigned to ${client.name} ✓`);
      onAssigned(client.id);
    },
  });

  const initials = (client.name || '?').split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
      <div className="w-8 h-8 rounded-full bg-accent text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{client.name}</p>
        <p className="text-xs text-muted-foreground truncate">{client.email}</p>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger className="w-36 h-7 text-xs border-border bg-muted">
            <SelectValue placeholder="Pick program…" />
          </SelectTrigger>
          <SelectContent>
            {programs.map(p => (
              <SelectItem key={p.id} value={p.id} className="text-xs">{p.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="icon"
          className="h-7 w-7"
          disabled={!selected || assignMutation.isPending}
          onClick={() => assignMutation.mutate()}
        >
          <Check className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default function NoProgramPanel({ clients, onClose }) {
  const [assignedIds, setAssignedIds] = useState(new Set());
  const { data: programs = [] } = useQuery({
    queryKey: ['programs'],
    queryFn: () => db.entities.WorkoutProgram.list('-created_date', 30),
  });

  const remaining = clients.filter(c => !assignedIds.has(c.id));

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />
      <div
        className="relative w-full max-w-md bg-card h-full shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-primary" />
            <div>
              <p className="font-bold text-foreground text-sm">Clients Without a Program</p>
              <p className="text-xs text-muted-foreground">{remaining.length} remaining</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {remaining.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mb-3">
                <Check className="w-5 h-5 text-success" />
              </div>
              <p className="text-sm font-semibold text-foreground">All assigned!</p>
              <p className="text-xs text-muted-foreground mt-1">Every client now has a program.</p>
              <Button className="mt-4 text-xs" onClick={onClose}>Close</Button>
            </div>
          ) : (
            remaining.map(client => (
              <ClientAssignRow
                key={client.id}
                client={client}
                programs={programs}
                onAssigned={id => setAssignedIds(prev => new Set([...prev, id]))}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}