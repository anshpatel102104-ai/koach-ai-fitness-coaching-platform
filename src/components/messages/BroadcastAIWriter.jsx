import React, { useState } from 'react';
import { Sparkles, Loader2, Check, RotateCw } from 'lucide-react';
import { db } from '@/api/supabaseClient';
import { cn } from '@/lib/utils';

const TONE_COLORS = {
  Motivational: 'border-orange-200 bg-orange-50 text-orange-700',
  Informative: 'border-success bg-success/10 text-success',
  Casual: 'border-ai bg-ai/10 text-ai',
  Reminder: 'border-primary bg-accent text-primary',
};

function previewMsg(msg, client) {
  if (!client) return msg;
  return msg.replace(/\[First Name\]/gi, client.name?.split(' ')[0] || client.name || 'there');
}

export default function BroadcastAIWriter({ clients, selectedClientIds, filter, onUseVersion }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [previewClient, setPreviewClient] = useState(null);

  const selectedClients = clients.filter(c => selectedClientIds.has(c.id));

  const generate = async () => {
    setLoading(true);
    setOpen(true);
    setVersions([]);
    const filterLabel = {
      all: 'all clients',
      active: 'active clients',
      at_risk: 'at-risk clients',
      no_program: 'clients without a program',
      lead: 'leads',
    }[filter] || 'selected clients';

    try {
      const res = await db.functions.invoke('aiMessageAssistant', {
        action: 'generateBroadcast',
        selectedClientIds: [...selectedClientIds],
        clients: selectedClients.slice(0, 5),
        broadcastContext: {
          filter: filterLabel,
          count: selectedClientIds.size,
          reason: `Broadcast to ${filterLabel}`,
        },
      });
      setVersions(res.data?.versions || []);
      setPreviewClient(selectedClients[0] || null);
    } catch (e) {
      setVersions([{ message: 'Hey [First Name], just checking in on you — how are things going? 💪', tone: 'Casual' }]);
    }
    setLoading(false);
  };

  if (!open) {
    return (
      <button
        onClick={generate}
        disabled={selectedClientIds.size === 0}
        className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full bg-gradient-to-r from-primary to-ai text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
      >
        <Sparkles className="w-3.5 h-3.5" />
        ✨ AI Write Message
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-accent/10 to-ai/10 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-bold text-primary">AI Broadcast Writer</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={generate} disabled={loading} className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground hover:text-primary transition-colors">
            <RotateCw className={cn('w-3 h-3', loading && 'animate-spin')} /> Regenerate
          </button>
          <button onClick={() => setOpen(false)} className="text-[10px] text-muted-foreground hover:text-muted-foreground underline">Close</button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-2">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">Generating {selectedClientIds.size} personalized broadcast versions…</span>
        </div>
      ) : (
        <>
          {/* Preview client selector */}
          {selectedClients.length > 1 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-muted-foreground">Preview for:</span>
              {selectedClients.slice(0, 4).map(c => (
                <button
                  key={c.id}
                  onClick={() => setPreviewClient(c)}
                  className={cn(
                    'text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all',
                    previewClient?.id === c.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground hover:border-primary/40'
                  )}
                >
                  {c.name?.split(' ')[0]}
                </button>
              ))}
            </div>
          )}

          {/* Versions */}
          <div className="space-y-2">
            {versions.map((v, i) => (
              <div key={i} className="bg-card rounded-xl border border-white shadow-sm p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', TONE_COLORS[v.tone] || 'border-border bg-muted text-foreground')}>
                    {v.tone}
                  </span>
                  <span className="text-[10px] text-muted-foreground">Version {i + 1}</span>
                </div>
                <p className="text-xs text-foreground leading-relaxed mb-2.5">
                  {previewMsg(v.message, previewClient)}
                </p>
                <button
                  onClick={() => { onUseVersion(v.message); setOpen(false); }}
                  className="flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors"
                >
                  <Check className="w-3 h-3" /> Use This Version
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}