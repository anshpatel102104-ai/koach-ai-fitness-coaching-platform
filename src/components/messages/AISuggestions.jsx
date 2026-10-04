import React, { useState } from 'react';
import { db } from '@/api/supabaseClient';
import { Sparkles, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AISuggestions({ clientName, recentMessages, onSelect, onClose }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const generate = async () => {
    setLoading(true);
    const context = recentMessages.slice(-6).map(m => `${m.sender === 'coach' ? 'Coach' : clientName}: ${m.content}`).join('\n');
    const res = await db.functions.invoke('aiMessageAssistant', {
      action: 'replySuggestions',
      clientName,
      context,
    });
    setSuggestions(res.data?.suggestions || []);
    setFetched(true);
    setLoading(false);
  };

  return (
    <div className="bg-card border border-border rounded-xl shadow-xl p-4 w-80">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold">AI Reply Suggestions</p>
        </div>
        <button onClick={onClose}><X className="w-4 h-4 text-foreground hover:text-foreground" /></button>
      </div>
      {!fetched ? (
        <Button size="sm" className="w-full" onClick={generate} disabled={loading}>
          {loading ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />Generating...</> : <><Sparkles className="w-3.5 h-3.5 mr-2" />Generate Suggestions</>}
        </Button>
      ) : (
        <div className="space-y-2">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => { onSelect(s); onClose(); }}
              className="w-full text-left p-2.5 bg-secondary/50 hover:bg-secondary rounded-lg text-xs transition-colors"
            >
              {s}
            </button>
          ))}
          <Button size="sm" variant="ghost" className="w-full text-xs" onClick={() => { setSuggestions([]); setFetched(false); }}>
            Regenerate
          </Button>
        </div>
      )}
    </div>
  );
}