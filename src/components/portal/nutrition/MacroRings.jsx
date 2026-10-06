import React from 'react';

function MiniRing({ value, target, color, trackColor, label, unit = 'g', size = 56, stroke = 5 }) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const pct = target > 0 ? Math.min(value / target, 1) : 0;
  const offset = circ * (1 - pct);
  const remaining = Math.max(0, target - value);
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} stroke={trackColor} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke}
            stroke={color} strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.7s ease' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="font-black leading-none" style={{ color, fontSize: size > 80 ? 18 : 11 }}>{Math.round(value)}</p>
          {size > 80 && <p className="text-muted-foreground text-[12px] mt-0.5">{unit}</p>}
        </div>
      </div>
      <p className="text-muted-foreground text-[12px] font-bold text-center">{label}</p>
      <p className="text-muted-foreground text-[12px] text-center">{Math.round(remaining)}{unit} left</p>
    </div>
  );
}

function BigCalorieRing({ consumed, target }) {
  const size = 120; const stroke = 8;
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const pct = target > 0 ? Math.min(consumed / target, 1) : 0;
  const offset = circ * (1 - pct);
  const over = consumed > target;
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} stroke="rgb(var(--warning))" />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke}
            stroke={over ? 'rgb(var(--destructive))' : 'rgb(var(--foreground))'}
            strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.7s ease' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-foreground font-black text-2xl leading-none">{Math.round(consumed)}</p>
          <p className="text-muted-foreground text-[12px] mt-0.5">of {target}</p>
          <p className="text-muted-foreground text-[12px]">kcal</p>
        </div>
      </div>
      <p className="text-muted-foreground text-xs mt-1 font-semibold">
        {over ? `${Math.round(consumed - target)} over` : `${Math.round(target - consumed)} remaining`}
      </p>
    </div>
  );
}

export default function MacroRings({ logged, plan }) {
  const targets = {
    calories: plan?.calories || 2000,
    protein: plan?.protein_g || 150,
    carbs: plan?.carbs_g || 200,
    fats: plan?.fats_g || 65,
    water: 3000,
  };
  return (
    <div className="mx-4 bg-card p-5 rounded-xl" style={{ boxShadow: 'none', border: '1px solid rgb(var(--muted))' }}>
      <div className="flex items-center gap-6">
        <BigCalorieRing consumed={logged.calories || 0} target={targets.calories} />
        <div className="flex gap-4 flex-1 justify-around">
          <MiniRing value={logged.protein || 0} target={targets.protein} color="rgb(var(--foreground))" trackColor="rgb(var(--secondary))" label="Protein" />
          <MiniRing value={logged.carbs || 0} target={targets.carbs} color="rgb(var(--foreground))" trackColor="rgb(var(--secondary))" label="Carbs" />
          <MiniRing value={logged.fats || 0} target={targets.fats} color="rgb(var(--foreground))" trackColor="rgb(var(--secondary))" label="Fats" />
          <MiniRing value={(logged.water || 0) / 1000} target={targets.water / 1000} color="rgb(var(--foreground))" trackColor="rgb(var(--secondary))" label="Water" unit="L" />
        </div>
      </div>
    </div>
  );
}