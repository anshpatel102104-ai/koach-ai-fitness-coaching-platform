import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { MessageSquare, X } from 'lucide-react';
import { toast } from 'sonner';

export default function BulkActionBar({ selectedIds, clients, allEntries, onClear }) {
  const [composing, setComposing] = useState(false);
  const [message, setMessage] = useState('');
  const queryClient = useQueryClient();

  const sendMutation = useMutation({
    mutationFn: (msg) => Promise.all(
      selectedIds.map(id => {
        const c = clients.find(c => c.id === id);
        return db.entities.Message.create({ client_id: id, client_name: c?.name, sender: 'coach', content: msg });
      })
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      toast.success(`Message sent to ${selectedIds.length} clients`);
      setComposing(false);
      setMessage('');
      onClear();
    },
  });

  const handleExport = () => {
    const selected = allEntries.filter(e => selectedIds.includes(e.client.id));
    const headers = ['Client', 'Risk Factors', 'Risk Score', 'Flags'];
    const rows = selected.map(e => [e.client.name, e.flags.length, e.riskScore, e.flags.map(f => f.label).join('; ')]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'at-risk-clients.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-card border-t-2 border-primary shadow-2xl">
      <div className="max-w-4xl mx-auto">
        {composing ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">Bulk message to {selectedIds.length} clients</span>
              <button onClick={() => setComposing(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3}
              placeholder="Type your message..."
              className="w-full border border-border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setComposing(false)} className="px-4 py-2 text-sm border border-border rounded-lg text-foreground">Cancel</button>
              <button onClick={() => sendMutation.mutate(message)} disabled={!message.trim() || sendMutation.isPending}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg font-semibold disabled:opacity-50">
                {sendMutation.isPending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-bold text-foreground">{selectedIds.length} selected</span>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setComposing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90">
                <MessageSquare className="w-3.5 h-3.5" /> Bulk Message
              </button>
              <button onClick={handleExport}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border text-foreground hover:bg-background">
                Export CSV
              </button>
              <button onClick={onClear}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border text-foreground hover:bg-background">
                <X className="w-3 h-3" /> Clear
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}