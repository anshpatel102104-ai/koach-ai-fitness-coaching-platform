import React, { useState } from 'react';
import { Send, CheckCircle2, User, AlertCircle, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase as base44 } from '@/api/supabaseClient';
import { toast } from 'sonner';

export default function MigrationInvites({ importedClients = [], onComplete, onSkip }) {
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState(null);
  const [selected, setSelected] = useState(
    new Set(importedClients.filter(c => c.email).map((_, i) => i))
  );

  const withEmail = importedClients.filter(c => c.email);
  const noEmail = importedClients.filter(c => !c.email);

  const toggle = (i) => {
    setSelected(s => {
      const n = new Set(s);
      n.has(i) ? n.delete(i) : n.add(i);
      return n;
    });
  };

  const sendInvites = async () => {
    setSending(true);
    const ok = [], fail = [];
    const toInvite = [...selected].map(i => withEmail[i]);

    for (const client of toInvite) {
      try {
        await base44.functions.invoke('sendClientInvite', {
          clientId: client.id, // required — the function stores the token hash on this client row
          clientName: client.name,
          clientEmail: client.email,
        });
        ok.push(client);
      } catch {
        fail.push(client);
      }
      // Small delay to avoid rate limits
      await new Promise(r => setTimeout(r, 200));
    }

    setSending(false);
    setResults({ ok, fail });
    if (ok.length > 0) toast.success(`${ok.length} invite${ok.length !== 1 ? 's' : ''} sent!`);
  };

  if (results) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 bg-success/10 border border-success rounded-xl">
          <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
          <div>
            <p className="font-semibold text-success text-sm">{results.ok.length} invites sent!</p>
            {results.fail.length > 0 && <p className="text-xs text-success mt-0.5">{results.fail.length} failed — check emails</p>}
          </div>
        </div>
        <button
          onClick={onComplete}
          className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors"
        >
          Finish Migration 🎉
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {withEmail.length === 0 ? (
        <div className="text-center py-8">
          <Mail className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-semibold text-foreground">No clients with email addresses</p>
          <p className="text-xs text-muted-foreground mt-1">
            Import a client list with emails first, or add clients manually on the Clients page.
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Select clients to send a welcome invite to join FitForge.
            </p>
            <button
              onClick={() => setSelected(s => s.size === withEmail.length ? new Set() : new Set(withEmail.map((_, i) => i)))}
              className="text-xs text-primary font-semibold hover:underline"
            >
              {selected.size === withEmail.length ? 'Deselect all' : 'Select all'}
            </button>
          </div>

          <div className="border border-border rounded-xl overflow-hidden">
            <div className="divide-y divide-border max-h-64 overflow-y-auto">
              {withEmail.map((c, i) => (
                <button
                  key={i}
                  onClick={() => toggle(i)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/20 transition-colors',
                    selected.has(i) && 'bg-primary/5'
                  )}
                >
                  <div className={cn(
                    'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all',
                    selected.has(i) ? 'bg-primary border-primary' : 'border-border'
                  )}>
                    {selected.has(i) && <span className="text-[10px] text-white font-bold">✓</span>}
                  </div>
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{c.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {noEmail.length > 0 && (
            <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning rounded-xl">
              <AlertCircle className="w-4 h-4 text-warning shrink-0" />
              <p className="text-xs text-warning">
                {noEmail.length} client{noEmail.length !== 1 ? 's have' : ' has'} no email — add them manually to invite.
              </p>
            </div>
          )}
        </>
      )}

      <div className="flex gap-3">
        <button onClick={onSkip} className="flex-1 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors">
          Skip invites
        </button>
        {withEmail.length > 0 && selected.size > 0 && (
          <button
            onClick={sendInvites}
            disabled={sending}
            className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {sending
              ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Sending...</>
              : <><Send className="w-4 h-4" />Send {selected.size} Invite{selected.size !== 1 ? 's' : ''}</>
            }
          </button>
        )}
        {withEmail.length === 0 && (
          <button onClick={onComplete} className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">
            Finish Migration 🎉
          </button>
        )}
      </div>
    </div>
  );
}