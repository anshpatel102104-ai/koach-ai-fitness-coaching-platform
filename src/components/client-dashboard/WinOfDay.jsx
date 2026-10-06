import React, { useState } from 'react';
import { cn } from '@/lib/utils';

const MINDSET_OPTIONS = [
  { score: 1, label: 'Tired' },
  { score: 2, label: 'Low' },
  { score: 3, label: 'Okay' },
  { score: 4, label: 'Good' },
  { score: 5, label: 'Great' },
];

const WIN_PROMPTS = [
  "What's one thing you're proud of today?",
  "Name one small win from today.",
  "What did you do well today?",
  "One positive thing that happened today?",
];

export default function WinOfDay({ win = '', mindsetScore = 0, onWinChange, onMindsetChange }) {
  const [focused, setFocused] = useState(false);
  const prompt = WIN_PROMPTS[new Date().getDay() % WIN_PROMPTS.length];

  return (
    <section className="panel p-5">
      <h2 className="text-xl text-foreground">Win of the day</h2>
      <p className="text-[13px] text-muted-foreground">One line is enough. Your coach can see it.</p>

      <p className="mt-4 mb-2 text-[13px] text-muted-foreground">How's your energy today?</p>
      <div className="grid grid-cols-5 gap-1.5">
        {MINDSET_OPTIONS.map(opt => (
          <button
            key={opt.score}
            type="button"
            onClick={() => onMindsetChange(opt.score)}
            aria-pressed={mindsetScore === opt.score}
            className={cn('touch-compact rounded-lg py-2.5 text-[13px] font-semibold',
              mindsetScore === opt.score ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground hover:bg-accent')}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className={cn('mt-4 rounded-lg border p-3', focused ? 'border-foreground' : 'border-input')}>
        <textarea
          value={win}
          onChange={e => onWinChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={prompt}
          rows={2}
          className="w-full resize-none bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
        />
        {win && <p className="mt-1 border-t border-border pt-2 text-[13px] text-muted-foreground">Saved</p>}
      </div>
    </section>
  );
}
