import React from 'react';

export default function StreakBanner({ streak = 0 }) {
  const msg = streak === 0
    ? 'Log something today to start a streak.'
    : streak >= 30
    ? 'Thirty days or more without a gap.'
    : streak >= 14
    ? 'Two weeks and counting.'
    : streak >= 7
    ? 'A full week in a row.'
    : 'Good start. Keep it going tomorrow.';

  return (
    <section className="panel flex items-center gap-4 px-5 py-3">
      <p className="num text-[32px] text-foreground">{streak}</p>
      <div className="min-w-0">
        <p className="text-[15px] font-semibold text-foreground">Day streak</p>
        <p className="text-[13px] text-muted-foreground">{msg}</p>
      </div>
      {streak > 0 && (
        <div className="ml-auto flex gap-1">
          {[...Array(Math.min(7, streak))].map((_, i) => (
            <span key={i} className="h-3 w-2 rounded-[2px] bg-success" />
          ))}
        </div>
      )}
    </section>
  );
}
