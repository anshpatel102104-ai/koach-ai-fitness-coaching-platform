import React from 'react';
import { useNavigate } from 'react-router-dom';

/** Row of tappable stat pairs: label over a condensed number. */
export default function StatsStrip({ stats }) {
  const navigate = useNavigate();

  return (
    <section className="panel grid grid-flow-col auto-cols-fr divide-x divide-border overflow-x-auto">
      {stats.map((stat) => (
        <button key={stat.id} type="button" onClick={() => stat.path && navigate(stat.path)} className="min-w-[80px] px-3 py-3 text-left">
          <p className="text-[13px] text-muted-foreground">{stat.label}</p>
          <p className="num mt-1 text-[22px] text-foreground">{stat.value}</p>
        </button>
      ))}
    </section>
  );
}
