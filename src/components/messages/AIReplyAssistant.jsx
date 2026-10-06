import React, { useState, useCallback } from 'react';
import { Loader2, X } from 'lucide-react';
import { db } from '@/api/supabaseClient';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const TONES = [
  { key: 'motivational', label: 'More motivational' },
  { key: 'empathetic', label: 'More empathetic' },
  { key: 'direct', label: 'More direct' },
  { key: 'casual', label: 'More casual' },
  { key: 'professional', label: 'More professional' },
];

const LINK = 'touch-compact text-[13px] font-semibold text-foreground underline underline-offset-4 decoration-1 hover:decoration-2';

/**
 * "Suggested reply" card that sits at the foot of the thread. Generates on
 * demand; Use this drops it in the composer, Edit does the same for editing.
 */
export default function AIReplyAssistant({
  client,
  conversationMessages = [],
  checkIn,
  onUse,
  onEditFirst,
  onDismiss,
  className,
}) {
  const [suggestion, setSuggestion] = useState(null);
  const [toneLabel, setToneLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentTone, setCurrentTone] = useState(null);
  const [visible, setVisible] = useState(false);

  const generate = useCallback(async (tone = null) => {
    setLoading(true);
    setVisible(true);
    setSuggestion(null);
    try {
      const res = await db.functions.invoke('aiMessageAssistant', {
        action: 'generateReply',
        clientId: client?.id,
        client,
        tone,
        conversationMessages,
        checkIn,
      });
      setSuggestion(res.data?.message || '');
      setToneLabel(res.data?.tone || '');
    } catch (e) {
      setSuggestion('Could not draft a reply right now. Try again in a moment.');
    }
    setLoading(false);
  }, [client, conversationMessages, checkIn]);

  const handleToneChange = (toneKey) => {
    setCurrentTone(toneKey);
    generate(toneKey);
  };

  const handleDismiss = () => {
    setVisible(false);
    setSuggestion(null);
    onDismiss?.();
  };

  // Trigger (shown when not open)
  if (!visible) {
    return (
      <div className={cn('flex justify-end', className)}>
        <Button variant="outline" size="sm" onClick={() => generate(currentTone)}>
          Suggest a reply
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('ml-auto w-full max-w-[420px] rounded-xl bg-card ring-1 ring-border p-4', className)}>
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <p className="text-[13px] font-semibold text-foreground">
          Suggested reply
          {toneLabel && <span className="font-normal text-muted-foreground"> · {toneLabel.toLowerCase()}</span>}
        </p>
        <button onClick={handleDismiss} aria-label="Dismiss suggestion" className="touch-compact -mt-1 -mr-1 p-1 text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <p className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Reading the conversation…
        </p>
      ) : suggestion ? (
        <>
          <p className="text-[15px] leading-relaxed text-foreground">{suggestion}</p>
          <div className="flex items-center gap-2 flex-wrap mt-3">
            <Button size="sm" onClick={() => { onUse(suggestion); handleDismiss(); }}>Use this</Button>
            <Button size="sm" variant="outline" onClick={() => { onEditFirst(suggestion); handleDismiss(); }}>Edit</Button>
            <span className="ml-auto flex items-center gap-3">
              <button onClick={() => generate(currentTone)} className={LINK}>Try again</button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={LINK}>Tone</button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  {TONES.map(t => (
                    <DropdownMenuItem
                      key={t.key}
                      onClick={() => handleToneChange(t.key)}
                      className={cn(currentTone === t.key && 'font-semibold')}
                    >
                      {t.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </span>
          </div>
        </>
      ) : null}
    </div>
  );
}
