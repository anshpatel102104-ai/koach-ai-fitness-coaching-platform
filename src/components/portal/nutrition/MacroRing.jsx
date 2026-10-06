import React from 'react';
import { motion } from 'framer-motion';

const MACRO_ICONS = { protein: '', carbs: '', fats: '', water: '' };
const MACRO_COLORS = { protein: 'rgb(var(--primary))', carbs: 'rgb(var(--warning))', fats: 'rgb(var(--warning))', water: 'rgb(var(--foreground))' };

export default function MacroRing({ consumed, target, breakdown }) {
  const pct = Math.min(100, (consumed / target) * 100);
  const remaining = Math.max(0, target - consumed);
  const r = 60;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);

  const macros = [
    { key: 'protein', label: 'Protein', remaining: breakdown?.protein?.remaining || 0, unit: 'g' },
    { key: 'carbs', label: 'Carbs', remaining: breakdown?.carbs?.remaining || 0, unit: 'g' },
    { key: 'fats', label: 'Fats', remaining: breakdown?.fats?.remaining || 0, unit: 'g' },
    { key: 'water', label: 'Water', remaining: breakdown?.water?.remaining || 0, unit: 'glass' },
  ];

  return (
    <div className="px-4 mb-5">
      <div className="bg-card rounded-[20px] p-6 text-center"
        style={{ boxShadow: 'none', border: '1px solid rgb(var(--muted))' }}>

        {/* Donut ring */}
        <div className="relative w-48 h-48 mx-auto mb-4 flex items-center justify-center">
          <svg width={196} height={196} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={98} cy={98} r={r} fill="none" strokeWidth={14} stroke="rgb(var(--muted))" />
            <motion.circle
              cx={98} cy={98} r={r} fill="none" strokeWidth={14}
              stroke="rgb(var(--foreground))"
              strokeDasharray={circ}
              initial={{ strokeDashoffset: circ }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1, ease: 'easeOut' }}
              strokeLinecap="round"
            />
          </svg>

          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.p
              className="text-foreground font-black leading-none"
              style={{ fontSize: 28 }}>
              {Math.round(consumed)}
            </motion.p>
            <p className="text-muted-foreground text-xs font-semibold mt-0.5">/ {target} cal</p>
            <p className="text-primary text-[12px] font-bold mt-1">↓ {remaining} left</p>
          </div>
        </div>

        {/* Macro chips */}
        <div className="grid grid-cols-4 gap-2">
          {macros.map(m => (
            <button key={m.key}
              className="flex flex-col items-center p-2.5 rounded-xl transition-colors"
              style={{ background: 'rgb(var(--muted))', border: '1px solid rgb(var(--muted))' }}>
              <span className="text-lg leading-none mb-1">{MACRO_ICONS[m.key]}</span>
              <p className="text-[12px] font-black text-foreground" style={{ color: MACRO_COLORS[m.key] }}>
                {m.remaining.toFixed(0)}{m.unit[0]}
              </p>
              <p className="text-[12px] text-muted-foreground font-semibold">{m.label}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}