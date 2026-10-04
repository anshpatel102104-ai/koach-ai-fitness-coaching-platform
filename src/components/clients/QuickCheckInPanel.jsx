import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { db } from '@/api/supabaseClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { X, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';

const MOODS = [
  { key: 'great', label: '😄 Great' },
  { key: 'good', label: '🙂 Good' },
  { key: 'okay', label: '😐 Okay' },
  { key: 'tired', label: '😴 Tired' },
  { key: 'stressed', label: '😰 Stressed' },
];

export default function QuickCheckInPanel({ client, onClose }) {
  const [weight, setWeight] = useState('');
  const [mood, setMood] = useState('');
  const [notes, setNotes] = useState('');
  const queryClient = useQueryClient();

  const today = new Date().toISOString().split('T')[0];

  const saveMutation = useMutation({
    mutationFn: () => db.entities.CheckIn.create({
      client_id: client.id,
      client_name: client.name,
      date: today,
      weight: weight ? parseFloat(weight) : undefined,
      mood: mood || undefined,
      notes: notes || undefined,
      review_status: 'pending',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkins-clients'] });
      queryClient.invalidateQueries({ queryKey: ['checkins'] });
      toast.success(`Check-in logged for ${client.name} ✓`);
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />
      <div
        className="relative w-full max-w-sm bg-card h-full shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-primary" />
            <div>
              <p className="font-bold text-foreground text-sm">Log Check-in</p>
              <p className="text-xs text-muted-foreground">{client.name}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Weight */}
          <div>
            <label className="text-xs font-semibold text-foreground mb-1.5 block">Weight (lbs)</label>
            <Input
              type="number"
              placeholder="e.g. 175"
              value={weight}
              onChange={e => setWeight(e.target.value)}
              className="border-border bg-muted text-sm"
            />
          </div>

          {/* Mood */}
          <div>
            <label className="text-xs font-semibold text-foreground mb-1.5 block">Mood</label>
            <div className="flex flex-wrap gap-2">
              {MOODS.map(m => (
                <button
                  key={m.key}
                  onClick={() => setMood(v => v === m.key ? '' : m.key)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                    mood === m.key
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card text-foreground border-border hover:border-primary/40'
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-foreground mb-1.5 block">Notes</label>
            <Textarea
              placeholder="Any wins, struggles, or feedback…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="min-h-[80px] text-sm border-border bg-muted resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border flex gap-2">
          <Button variant="outline" className="flex-1 border-border text-xs" onClick={onClose}>Cancel</Button>
          <Button
            className="flex-1 text-xs"
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            {saveMutation.isPending ? 'Saving…' : 'Log Check-in'}
          </Button>
        </div>
      </div>
    </div>
  );
}