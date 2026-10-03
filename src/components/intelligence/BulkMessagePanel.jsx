import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { X, MessageSquare, Send, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const SUGGESTED_TEMPLATE = "Hey [First Name], just checking in — how are things going? Let me know if you need anything! 💪";

export default function BulkMessagePanel({ clients, onClose, onSent }) {
  const [message, setMessage] = useState(SUGGESTED_TEMPLATE);
  const [sending, setSending] = useState(false);
  const queryClient = useQueryClient();

  const handleSend = async () => {
    if (!message.trim() || clients.length === 0) return;
    setSending(true);
    try {
      await Promise.all(
        clients.map(client => {
          const personalised = message.replace(/\[First Name\]/gi, client.name?.split(' ')[0] || client.name);
          return db.entities.Message.create({
            client_id: client.id,
            client_name: client.name,
            sender: 'coach',
            content: personalised,
            tag: 'general',
          });
        })
      );
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success(`Message sent to ${clients.length} client${clients.length > 1 ? 's' : ''}!`);
      onSent?.();
      onClose();
    } catch {
      toast.error('Failed to send messages');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />
      <div
        className="relative w-full max-w-md bg-card h-full shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-warning" />
            </div>
            <div>
              <p className="font-bold text-foreground text-sm">Bulk Message</p>
              <p className="text-xs text-muted-foreground">{clients.length} inactive client{clients.length > 1 ? 's' : ''}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col gap-4 px-5 py-4">
          {/* Recipients */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Users className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recipients</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {clients.map(c => (
                <span key={c.id} className="px-2.5 py-1 rounded-full bg-warning/10 text-warning text-xs font-medium border border-warning">
                  {c.name}
                </span>
              ))}
            </div>
          </div>

          {/* Message composer */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Message</p>
              <span className="text-[10px] text-muted-foreground">[First Name] will be personalised per client</span>
            </div>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={6}
              className="w-full rounded-xl border border-border bg-muted px-3.5 py-3 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              placeholder="Type your message…"
            />
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Tip: Use <code className="bg-border px-1 rounded text-[10px]">[First Name]</code> to personalise the message for each client.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border flex gap-2">
          <Button variant="outline" className="flex-1 text-xs border-border" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="flex-1 text-xs gap-1.5"
            disabled={!message.trim() || sending}
            onClick={handleSend}
          >
            <Send className="w-3.5 h-3.5" />
            {sending ? 'Sending…' : `Send to ${clients.length}`}
          </Button>
        </div>
      </div>
    </div>
  );
}