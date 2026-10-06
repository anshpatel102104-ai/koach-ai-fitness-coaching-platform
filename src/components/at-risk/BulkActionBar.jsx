import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { X } from 'lucide-react';
import { toast } from 'sonner';

const BULK_MESSAGE = "Hey, I wanted to check in with you personally. Can we find ten minutes to talk this week?";

/** Floating ink bar shown when at-risk rows are selected. */
export default function BulkActionBar({ selectedIds, clients, atRisk, onClear }) {
  const queryClient = useQueryClient();

  const sendBulkMutation = useMutation({
    mutationFn: ({ ids, message }) =>
      Promise.all(ids.map(id => {
        const c = clients.find(c => c.id === id);
        return db.entities.Message.create({ client_id: id, client_name: c?.name, sender: 'coach', content: message });
      })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      toast.success(`Message sent to ${selectedIds.length} client${selectedIds.length === 1 ? '' : 's'}`);
      onClear();
    },
  });

  const exportCSV = () => {
    const selected = atRisk.filter(e => selectedIds.includes(e.client.id));
    const rows = selected.map(e => [
      e.client.name, e.riskScore, e.flags.length,
      e.flags.map(f => f.label).join(' | '),
      e.lastCheckInDate || 'Never',
    ]);
    const csv = [['Name', 'Risk Score', 'Flag Count', 'Flags', 'Last Check-in'], ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'at-risk-clients.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed bottom-20 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-xl bg-primary py-2 pl-4 pr-2 text-primary-foreground shadow-md lg:bottom-6">
      <span className="mr-2 whitespace-nowrap text-sm font-semibold">{selectedIds.length} selected</span>
      <button
        onClick={() => sendBulkMutation.mutate({ ids: selectedIds, message: BULK_MESSAGE })}
        disabled={sendBulkMutation.isPending}
        title={`Sends: "${BULK_MESSAGE}"`}
        className="h-8 whitespace-nowrap rounded-md bg-primary-foreground px-3 text-[13px] font-semibold text-primary transition-colors hover:bg-primary-foreground/90 disabled:opacity-60"
      >
        {sendBulkMutation.isPending ? 'Sending…' : 'Send a check-in note'}
      </button>
      <button onClick={exportCSV} className="h-8 whitespace-nowrap rounded-md px-3 text-[13px] font-semibold text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground">
        Export CSV
      </button>
      <button onClick={onClear} aria-label="Clear selection" className="flex h-8 w-8 items-center justify-center rounded-md text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
