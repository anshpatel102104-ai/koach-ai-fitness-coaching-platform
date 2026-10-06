import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';

/* ─── URL params ─── */
const urlParams = new URLSearchParams(window.location.search);
const COACH_ID = urlParams.get('coach') || '';
const COACH_NAME = urlParams.get('name') || '';

/* ─── Steps ─── */
const STEPS = [
  'welcome',
  'basic_info',
  'goals',
  'body_metrics',
  'experience',
  'lifestyle',
  'training_prefs',
  'equipment',
  'nutrition',
  'medical',
  'consent',
  'mindset',
  'obstacles',
  'commitment',
  'generating',
  'done',
];
const NO_PROGRESS = new Set(['welcome', 'generating', 'done']);
const PROGRESS_STEPS = STEPS.filter(s => !NO_PROGRESS.has(s));

/* Steps grouped into the four labelled segments of the progress bar. */
const PHASES = [
  { label: 'You', steps: ['basic_info', 'goals', 'body_metrics'] },
  { label: 'Training', steps: ['experience', 'lifestyle', 'training_prefs', 'equipment'] },
  { label: 'Health', steps: ['nutrition', 'medical', 'consent'] },
  { label: 'Mindset', steps: ['mindset', 'obstacles', 'commitment'] },
];

/* ─── Shared primitives (light canvas, white option rows, ink selection) ─── */
function Screen({ children }) {
  return <div className="flex h-full w-full flex-col bg-background">{children}</div>;
}

/** Back lives in the sticky footer now; kept so every step's markup stays the same. */
// eslint-disable-next-line no-unused-vars
function BackBtn({ onClick }) {
  return null;
}

/** Page 13 top bar: back, "Intake, step 2 of 13", segmented progress with labels. */
function StepTopBar({ step, onBack, coachName }) {
  const idx = PROGRESS_STEPS.indexOf(step);
  return (
    <div className="flex-shrink-0 bg-background px-5 pt-4">
      <div className="mx-auto w-full max-w-md">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            aria-label="Back"
            className="touch-compact flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-card text-foreground shadow-[0_0_0_1px_rgb(var(--border))]"
          >
            <svg width="18" height="18" fill="none" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M10 3L6 8L10 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <p className="min-w-0 flex-1 truncate text-[15px] font-semibold text-foreground">
            Intake, step {idx + 1} of {PROGRESS_STEPS.length}
          </p>
          {coachName && <p className="truncate text-sm text-muted-foreground">For Coach {coachName}</p>}
        </div>
        <div className="mt-4 grid grid-cols-4 gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={PROGRESS_STEPS.length} aria-valuenow={idx + 1}>
          {PHASES.map(p => {
            const first = PROGRESS_STEPS.indexOf(p.steps[0]);
            const last = PROGRESS_STEPS.indexOf(p.steps[p.steps.length - 1]);
            const state = idx > last ? 'done' : idx >= first ? 'current' : 'todo';
            return (
              <div key={p.label}>
                <span className={`block h-1 rounded-full ${state === 'done' ? 'bg-success' : state === 'current' ? 'bg-foreground' : 'bg-border'}`} />
                <span className={`mt-1.5 block text-[13px] ${state === 'todo' ? 'text-muted-foreground' : 'font-semibold text-foreground'}`}>{p.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// eslint-disable-next-line no-unused-vars
function Header({ eyebrow, headline, sub }) {
  return (
    <div className="mx-auto w-full max-w-md flex-shrink-0 px-5 pb-4 pt-5">
      <h1 className="text-[32px] leading-[1.04] text-foreground sm:text-[36px]">{headline}</h1>
      {sub && <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{sub}</p>}
    </div>
  );
}

/** Sticky footer: Back (outline) + Next (ink). */
function CTABtn({ label = 'Next', onClick, disabled, onBack }) {
  return (
    <div className="flex-shrink-0 border-t border-border bg-background px-5 pt-3" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
      <div className="mx-auto flex w-full max-w-md gap-2">
        {onBack && (
          <button
            onClick={onBack}
            className="h-12 rounded-lg border border-input bg-card px-5 text-[15px] font-semibold text-foreground transition-colors hover:bg-accent"
          >
            Back
          </button>
        )}
        <button
          onClick={onClick}
          disabled={disabled}
          className="h-12 flex-1 rounded-lg bg-primary px-5 text-[15px] font-semibold text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-35"
        >
          {label}
        </button>
      </div>
    </div>
  );
}

function CheckDot({ selected, square }) {
  return (
    <span
      className={`flex h-6 w-6 flex-shrink-0 items-center justify-center ${square ? 'rounded-md' : 'rounded-full'} ${selected ? 'bg-primary' : 'border-[1.5px] border-input bg-card'}`}
      aria-hidden="true"
    >
      {selected && (
        <svg viewBox="0 0 10 10" fill="none" className="h-3 w-3">
          <path d="M2 5L4 7L8 3" stroke="rgb(var(--primary-foreground))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  );
}

// `emoji` is accepted but no longer drawn.
// eslint-disable-next-line no-unused-vars
function Chip({ label, selected, onClick, emoji }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      className={`touch-compact h-10 rounded-full px-4 text-[15px] font-medium transition-colors ${selected
        ? 'bg-primary text-primary-foreground'
        : 'bg-card text-foreground shadow-[inset_0_0_0_1px_rgb(var(--input))] hover:bg-accent'}`}
    >
      {label}
    </button>
  );
}

// eslint-disable-next-line no-unused-vars
function BigCard({ emoji, label, sublabel, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      className={`flex w-full items-center gap-4 rounded-xl bg-card px-4 py-3.5 text-left transition-shadow ${selected
        ? 'shadow-[inset_0_0_0_2px_rgb(var(--foreground))]'
        : 'shadow-[inset_0_0_0_1px_rgb(var(--border))] hover:shadow-[inset_0_0_0_1px_rgb(var(--input))]'}`}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-foreground">{label}</span>
        {sublabel && <span className="mt-0.5 block text-sm text-muted-foreground">{sublabel}</span>}
      </span>
      <CheckDot selected={selected} />
    </button>
  );
}

function PremiumField({ label, value, onChange, type = 'text', placeholder, autoFocus }) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-sm font-medium text-foreground">{label}</span>
      <input
        type={type}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="h-12 w-full rounded-lg border border-input bg-card px-4 text-base text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus:border-foreground focus:ring-1 focus:ring-foreground"
      />
    </label>
  );
}

function NumBox({ label, value, onChange, unit, placeholder }) {
  return (
    <label className="flex flex-1 flex-col gap-1 rounded-xl bg-card px-4 py-3.5 shadow-[inset_0_0_0_1px_rgb(var(--border))] focus-within:shadow-[inset_0_0_0_2px_rgb(var(--foreground))]">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="flex items-baseline gap-1.5">
        <input
          type="number"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="num w-full min-w-0 border-0 bg-transparent p-0 text-[34px] leading-none text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
        />
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </span>
    </label>
  );
}

function SliderRow({ label, value, onChange, min = 1, max = 10, leftLabel, rightLabel }) {
  const v = value || min;
  const pct = ((v - min) / (max - min)) * 100;
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <p className="text-[15px] font-semibold text-foreground">{label}</p>
        <p className="text-sm text-muted-foreground"><span className="num text-xl text-foreground">{v}</span> of {max}</p>
      </div>
      <div className="relative flex h-7 items-center">
        <span className="absolute inset-x-0 h-1.5 rounded-full bg-border" />
        <span className="absolute left-0 h-1.5 rounded-full bg-foreground" style={{ width: `${pct}%` }} />
        <input
          type="range"
          min={min}
          max={max}
          value={v}
          onChange={e => onChange(Number(e.target.value))}
          aria-label={label}
          className="relative h-7 w-full cursor-pointer appearance-none bg-transparent outline-none"
        />
      </div>
      {(leftLabel || rightLabel) && (
        <div className="flex justify-between text-[13px] text-muted-foreground">
          <span>{leftLabel}</span>
          <span>{rightLabel}</span>
        </div>
      )}
    </div>
  );
}

/** Small question heading between groups of options. */
function SectionDivider({ label }) {
  return <p className="pt-1 text-[15px] font-semibold text-foreground">{label}</p>;
}

function PremiumTextarea({ value, onChange, placeholder, rows = 4 }) {
  return (
    <textarea
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full resize-none rounded-lg border border-input bg-card px-4 py-3 text-base leading-relaxed text-foreground outline-none placeholder:text-muted-foreground focus:border-foreground focus:ring-1 focus:ring-foreground"
    />
  );
}

/* ─────────────────────────────────── SCREENS ─────────────────────────────────── */

function WelcomeStep({ onNext }) {
  const displayName = COACH_NAME || (COACH_ID ? decodeURIComponent(COACH_ID).split('@')[0] : null);
  const totalSteps = PROGRESS_STEPS.length;
  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-background">
      {/* Graphite hero */}
      <div className="flex-shrink-0 bg-sidebar px-5 pb-8 pt-6 text-white">
        <div className="mx-auto w-full max-w-md">
          <img src="/koach-logo-white.png" alt="KOACH" className="h-6 w-auto" />
          <p className="mt-10 text-sm text-white/70">
            {displayName ? `Coach ${displayName} invited you` : 'Your coach invited you'}
          </p>
          <h1 className="mt-1 text-[40px] leading-[1.02] text-white">Let's build your plan.</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-white/75">
            Your answers shape your training, nutrition and check-ins. Only your coach sees them.
          </p>
        </div>
      </div>

      {/* What we'll ask */}
      <div className="mx-auto w-full max-w-md flex-1 px-5 py-6">
        <p className="text-[13px] font-semibold text-muted-foreground">Four short parts, about 5 minutes</p>
        <ol className="mt-3 space-y-2">
          {PHASES.map((p, i) => (
            <li key={p.label} className="flex items-center gap-4 rounded-xl bg-card px-4 py-3.5 shadow-[inset_0_0_0_1px_rgb(var(--border))]">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-[1.5px] border-foreground text-sm font-bold text-foreground">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-foreground">{p.label}</span>
                <span className="block text-sm text-muted-foreground">
                  {['Name, goals and body measurements', 'Experience, routine, style and equipment', 'Food, injuries and health screening', 'Your reasons, obstacles and commitment'][i]}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className="flex-shrink-0 border-t border-border bg-background px-5 pt-3" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
        <div className="mx-auto w-full max-w-md">
          <button onClick={onNext} className="h-12 w-full rounded-lg bg-primary text-[15px] font-semibold text-primary-foreground">
            Start
          </button>
          <p className="mt-2 text-center text-[13px] text-muted-foreground">{totalSteps} steps · Private to you and your coach</p>
        </div>
      </div>
    </div>
  );
}

/* STEP 1: BASIC INFO */
function BasicInfoStep({ data, set, onNext, onBack }) {
  const valid = (data.first_name || '').trim() && (data.email || '').includes('@');
  return (
    <Screen>
      <BackBtn onClick={onBack} />
      <Header eyebrow="Step 1 of 13" headline="What should your coach call you?" sub="Your coach uses this to message you." />
      <div className="flex-1 overflow-y-auto px-5">
        <div className="space-y-4 max-w-md mx-auto w-full pb-4"
        >
          <div className="flex gap-3">
            <div className="flex-1">
              <PremiumField label="First name" value={data.first_name} onChange={v => set('first_name', v)} placeholder="Alex" autoFocus />
            </div>
            <div className="flex-1">
              <PremiumField label="Last name (optional)" value={data.last_name} onChange={v => set('last_name', v)} placeholder="Johnson" />
            </div>
          </div>
          <PremiumField label="Email" value={data.email} onChange={v => set('email', v)} type="email" placeholder="alex@email.com" />
          <PremiumField label="Phone (optional)" value={data.phone} onChange={v => set('phone', v)} type="tel" placeholder="+1 (555) 000-0000" />
        </div>
      </div>
      <CTABtn onBack={onBack} onClick={onNext} disabled={!valid} />
    </Screen>
  );
}

/* STEP 2: GOALS */
const GOAL_OPTIONS = [
  { id: 'fat_loss', label: 'Lose fat', sublabel: 'Get leaner and lighter' },
  { id: 'muscle_gain', label: 'Build muscle', sublabel: 'Add size and strength' },
  { id: 'strength', label: 'Get stronger', sublabel: 'Lift heavier weights' },
  { id: 'confidence', label: 'Feel more confident', sublabel: 'Like what you see in the mirror' },
  { id: 'energy', label: 'More energy', sublabel: 'Stop running out by mid-afternoon' },
  { id: 'athletic', label: 'Perform better at a sport', sublabel: 'Speed, power, endurance' },
  { id: 'general_health', label: 'General health', sublabel: 'Feel better day to day' },
  { id: 'lifestyle', label: 'Build habits that stick', sublabel: 'Routine you can keep' },
  { id: 'hybrid', label: 'Lose fat and build muscle', sublabel: 'Recomposition' },
];

function GoalsStep({ data, set, onNext, onBack }) {
  const selected = data.goals || [];
  const toggle = id => set('goals', selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
  return (
    <Screen>
      <BackBtn onClick={onBack} />
      <Header eyebrow="Step 2 of 13" headline="What do you want from coaching?" sub="Pick as many as are true." />
      <div className="flex-1 overflow-y-auto px-5">
        <div className="space-y-2.5 max-w-md mx-auto w-full pb-4"
        >
          {GOAL_OPTIONS.map(g => (
            <div key={g.id}>
              <BigCard {...g} selected={selected.includes(g.id)} onClick={() => toggle(g.id)} />
            </div>
          ))}
        </div>
      </div>
      <CTABtn onBack={onBack} onClick={onNext} disabled={selected.length === 0} />
    </Screen>
  );
}

/* STEP 3: BODY METRICS */
function BodyMetricsStep({ data, set, onNext, onBack }) {
  const valid = data.age && data.current_weight && data.height;
  return (
    <Screen>
      <BackBtn onClick={onBack} />
      <Header eyebrow="Step 3 of 13" headline="Your starting numbers." sub="Used to set your calories and training targets. Rough is fine." />
      <div className="flex-1 overflow-y-auto px-5">
        <div className="space-y-4 max-w-md mx-auto w-full pb-4"
        >
          <div className="flex gap-3">
            <NumBox label="Age" value={data.age} onChange={v => set('age', v)} unit="years" placeholder="25" />
            <NumBox label="Weight" value={data.current_weight} onChange={v => set('current_weight', v)} unit="lbs" placeholder="170" />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <PremiumField label="Height" value={data.height} onChange={v => set('height', v)} placeholder={`5'10"`} />
            </div>
            <div className="flex-1">
              <PremiumField label="Goal weight (optional)" value={data.target_weight} onChange={v => set('target_weight', v)} placeholder="160 lbs" />
            </div>
          </div>
          <div className="flex gap-3">
            <NumBox label="Body fat % (optional)" value={data.body_fat_pct} onChange={v => set('body_fat_pct', v)} unit="%" placeholder="18" />
          </div>
        </div>
      </div>
      <CTABtn onBack={onBack} onClick={onNext} disabled={!valid} />
    </Screen>
  );
}

/* STEP 4: EXPERIENCE */
const EXP_LEVELS = [
  { id: 'none', label: 'Beginner', sublabel: 'New to structured training' },
  { id: 'some', label: 'Intermediate', sublabel: '1 to 3 years of regular training' },
  { id: 'experienced', label: 'Advanced', sublabel: '3 to 5 years of serious training' },
  { id: 'advanced', label: 'Competitive', sublabel: '5+ years, you compete' },
];
const EXP_DURATIONS = ['Never', '<1 year', '1–3 years', '3–5 years', '5+ years'];

function ExperienceStep({ data, set, onNext, onBack }) {
  return (
    <Screen>
      <BackBtn onClick={onBack} />
      <Header eyebrow="Step 4 of 13" headline="How much have you trained?" />
      <div className="flex-1 overflow-y-auto px-5">
        <div className="space-y-5 max-w-md mx-auto w-full pb-6">
          <div className="space-y-2.5">
            {EXP_LEVELS.map(l => (
              <div key={l.id}>
                <BigCard {...l} selected={data.experience === l.id} onClick={() => set('experience', l.id)} />
              </div>
            ))}
          </div>
          <SectionDivider label="How long have you trained consistently?" />
          <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
              {EXP_DURATIONS.map(d => (
                <Chip key={d} label={d} selected={data.training_duration === d} onClick={() => set('training_duration', d)} />
              ))}
            </div>
          </div>
          <SectionDivider label="Anything about your training history? (optional)" />
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-foreground">
              Describe your training history (optional)
            </p>
            <PremiumTextarea
              value={data.training_history}
              onChange={v => set('training_history', v)}
              placeholder="Powerlifted for 2 years, took 6 months off, back in the gym since March"
              rows={3}
            />
          </div>
        </div>
      </div>
      <CTABtn onBack={onBack} onClick={onNext} disabled={!data.experience} />
    </Screen>
  );
}

/* STEP 5: LIFESTYLE */
const ACTIVITY_OPTS = ['Mostly sitting', 'Light movement', 'Moderately active', 'Very active', 'Athlete-level'];
const SCHEDULE_OPTS = ['9-5 office job', 'Shift work', 'Remote / flexible', 'Student', 'Physical job'];
const ALCOHOL_OPTS = ['Never', 'Rarely', 'Weekends', 'Few times/week', 'Daily'];

function LifestyleStep({ data, set, onNext, onBack }) {
  const valid = data.activity_level && data.stress_level && data.sleep_quality;
  return (
    <Screen>
      <BackBtn onClick={onBack} />
      <Header eyebrow="Step 5 of 13" headline="What does a normal week look like?" sub="Sleep, stress and work change what you can recover from." />
      <div className="flex-1 overflow-y-auto px-5">
        <div className="space-y-5 max-w-md mx-auto w-full pb-6">

          <div className="space-y-3">
            <p className="text-[15px] font-semibold text-foreground">Daily activity</p>
            <div className="flex flex-wrap gap-2">
              {ACTIVITY_OPTS.map(o => <Chip key={o} label={o} selected={data.activity_level === o} onClick={() => set('activity_level', o)} />)}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[15px] font-semibold text-foreground">Work schedule</p>
            <div className="flex flex-wrap gap-2">
              {SCHEDULE_OPTS.map(o => <Chip key={o} label={o} selected={data.work_schedule === o} onClick={() => set('work_schedule', o)} />)}
            </div>
          </div>

          <SliderRow
            label="Stress"
            value={data.stress_level}
            onChange={v => set('stress_level', v)}
            min={1} max={10}
            leftLabel="Very calm"
            rightLabel="Overwhelmed"
          />

          <SliderRow
            label="Sleep quality"
            value={data.sleep_quality}
            onChange={v => set('sleep_quality', v)}
            min={1} max={10}
            leftLabel="Very poor"
            rightLabel="Excellent"
          />

          <SliderRow
            label="Water each day"
            value={data.water_intake}
            onChange={v => set('water_intake', v)}
            min={1} max={10}
            leftLabel="Barely any"
            rightLabel="Well hydrated"
          />

          <div className="space-y-3">
            <p className="text-[15px] font-semibold text-foreground">Alcohol frequency</p>
            <div className="flex flex-wrap gap-2">
              {ALCOHOL_OPTS.map(o => <Chip key={o} label={o} selected={data.alcohol_frequency === o} onClick={() => set('alcohol_frequency', o)} />)}
            </div>
          </div>
        </div>
      </div>
      <CTABtn onBack={onBack} onClick={onNext} disabled={!valid} />
    </Screen>
  );
}

/* STEP 6: TRAINING PREFS */
const TRAINING_STYLES = [
  { id: 'gym', label: 'Gym workouts', sublabel: 'Weights, machines, barbells' },
  { id: 'running', label: 'Running', sublabel: 'Road or trail' },
  { id: 'hybrid', label: 'Hybrid', sublabel: 'Strength and cardio together' },
  { id: 'strength', label: 'Strength', sublabel: 'Barbell lifts, powerlifting' },
  { id: 'functional', label: 'Functional fitness', sublabel: 'CrossFit-style, athletic movement' },
  { id: 'home', label: 'Home workouts', sublabel: 'Little or no equipment' },
  { id: 'cardio', label: 'Cardio', sublabel: 'Cycling, swimming, intervals' },
  { id: 'sports', label: 'Sport-specific', sublabel: 'Training for your sport' },
];

function TrainingPrefsStep({ data, set, onNext, onBack }) {
  const selected = data.training_styles || [];
  const toggle = id => set('training_styles', selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
  const DAYS = [1, 2, 3, 4, 5, 6, 7];

  return (
    <Screen>
      <BackBtn onClick={onBack} />
      <Header eyebrow="Step 6 of 13" headline="How do you like to train?" sub="Pick as many as you enjoy." />
      <div className="flex-1 overflow-y-auto px-5">
        <div className="space-y-5 max-w-md mx-auto w-full pb-6">
          <div className="space-y-2.5">
            {TRAINING_STYLES.map(s => (
              <div key={s.id}>
                <BigCard {...s} selected={selected.includes(s.id)} onClick={() => toggle(s.id)} />
              </div>
            ))}
          </div>
          <SectionDivider label="Days a week you can train" />
          <div className="space-y-3">
                        <div className="flex gap-2">
              {DAYS.map(d => (
                <button
                  key={d}
                  onClick={() => set('training_days_per_week', d)}
                  aria-pressed={data.training_days_per_week === d}
                  className={`touch-compact num h-12 flex-1 rounded-lg text-xl transition-colors ${data.training_days_per_week === d
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card text-foreground shadow-[inset_0_0_0_1px_rgb(var(--border))] hover:bg-accent'}`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <CTABtn onBack={onBack} onClick={onNext} disabled={selected.length === 0 || !data.training_days_per_week} />
    </Screen>
  );
}

/* STEP 7: EQUIPMENT */
const EQUIPMENT_OPTS = [
  { id: 'full_gym', label: 'Full gym', sublabel: 'Barbells, cables, machines, dumbbells' },
  { id: 'home_full', label: 'Home gym, full', sublabel: 'Barbell, rack, plates, dumbbells' },
  { id: 'home_basic', label: 'Home gym, basic', sublabel: 'Dumbbells, bands, a bench' },
  { id: 'bodyweight', label: 'Bodyweight only', sublabel: 'No equipment' },
  { id: 'outdoor', label: 'Outdoors or a park', sublabel: 'Pull-up bars, open space' },
  { id: 'hotel', label: 'Hotel or travel gym', sublabel: 'A few machines, light dumbbells' },
];

function EquipmentStep({ data, set, onNext, onBack }) {
  return (
    <Screen>
      <BackBtn onClick={onBack} />
      <Header eyebrow="Step 7 of 13" headline="Where will you train?" sub="Your coach only programs exercises you can actually do there." />
      <div className="flex-1 overflow-y-auto px-5">
        <div className="space-y-4 max-w-md mx-auto w-full pb-4">
          <div className="space-y-2.5">
            {EQUIPMENT_OPTS.map(e => (
              <div key={e.id}>
                <BigCard {...e} selected={data.equipment_access === e.id} onClick={() => set('equipment_access', e.id)} />
              </div>
            ))}
          </div>
          <SectionDivider label="Any specific equipment? (optional)" />
          <PremiumTextarea
            value={data.equipment_notes}
            onChange={v => set('equipment_notes', v)}
            placeholder="Squat rack, barbell, dumbbells up to 50 lb. No cable machine."
            rows={3}
          />
        </div>
      </div>
      <CTABtn onBack={onBack} onClick={onNext} disabled={!data.equipment_access} />
    </Screen>
  );
}

/* STEP 8: NUTRITION */
const FOOD_CHIPS = ['Chicken', 'Steak', 'Rice', 'Potatoes', 'Eggs', 'Pasta', 'Greek Yogurt', 'Salmon', 'Turkey', 'Fruit', 'Oats', 'Avocado', 'Broccoli', 'Bread', 'Quinoa', 'Tofu'];
const DIET_OPTS = ['No restrictions', 'Dairy-free', 'Gluten-free', 'Vegetarian', 'Vegan', 'Halal', 'Kosher', 'Keto', 'Paleo'];
const ALLERGY_OPTS = ['None', 'Peanuts', 'Tree nuts', 'Shellfish', 'Fish', 'Eggs', 'Milk/Dairy', 'Wheat/Gluten', 'Soy', 'Sesame'];

function NutritionStep({ data, set, onNext, onBack }) {
  const favFoods = data.fav_foods || [];
  const diets = data.dietary_restrictions || [];
  const allergies = data.food_allergies || [];

  const toggleFood = f => set('fav_foods', favFoods.includes(f) ? favFoods.filter(x => x !== f) : [...favFoods, f]);
  const toggleDiet = d => {
    if (d === 'No restrictions') { set('dietary_restrictions', ['No restrictions']); return; }
    const without = diets.filter(x => x !== 'No restrictions');
    set('dietary_restrictions', without.includes(d) ? without.filter(x => x !== d) : [...without, d]);
  };
  const toggleAllergy = a => {
    if (a === 'None') { set('food_allergies', ['None']); return; }
    const without = allergies.filter(x => x !== 'None');
    set('food_allergies', without.includes(a) ? without.filter(x => x !== a) : [...without, a]);
  };

  const valid = allergies.length > 0;

  return (
    <Screen>
      <BackBtn onClick={onBack} />
      <Header eyebrow="Step 8 of 13" headline="What do you like to eat?" sub="Your meal plan is built around food you already enjoy." />
      <div className="flex-1 overflow-y-auto px-5">
        <div className="space-y-5 max-w-md mx-auto w-full pb-6">

          <div className="space-y-3">
            <p className="text-[15px] font-semibold text-foreground">Foods you enjoy</p>
            <div className="flex flex-wrap gap-2">
              {FOOD_CHIPS.map(f => <Chip key={f} label={f} selected={favFoods.includes(f)} onClick={() => toggleFood(f)} />)}
            </div>
          </div>

                    <PremiumField
            label="Anything you won't eat?"
            value={data.disliked_foods}
            onChange={v => set('disliked_foods', v)}
            placeholder="Fish, mushrooms, tofu"
          />

          <SectionDivider label="Dietary preferences" />
          <div className="flex flex-wrap gap-2">
            {DIET_OPTS.map(d => <Chip key={d} label={d} selected={diets.includes(d)} onClick={() => toggleDiet(d)} />)}
          </div>

          <SectionDivider label="Food allergies" />
          <p className="-mt-3 text-sm text-muted-foreground">Required. Pick None if you have none.</p>
          <div className="flex flex-wrap gap-2">
            {ALLERGY_OPTS.map(a => <Chip key={a} label={a} selected={allergies.includes(a)} onClick={() => toggleAllergy(a)} />)}
          </div>

          <SectionDivider label="Other allergies or notes (optional)" />
          <PremiumTextarea
            value={data.allergy_notes}
            onChange={v => set('allergy_notes', v)}
            placeholder="Intolerances, or anything else about food"
            rows={2}
          />
        </div>
      </div>
      <CTABtn onBack={onBack} onClick={onNext} disabled={!valid} />
    </Screen>
  );
}

/* STEP 9: MEDICAL / INJURIES */
const INJURY_OPTS = ['Lower back', 'Knees', 'Shoulders', 'Hips', 'Ankles', 'Neck', 'Wrists/Elbows', 'Previous surgery', 'None'];
const MEDICAL_OPTS = ['High blood pressure', 'Diabetes (Type 1)', 'Diabetes (Type 2)', 'Digestive issues', 'Hormonal issues', 'Asthma', 'Anxiety/depression', 'Heart condition', 'Thyroid condition', 'None'];

function MedicalStep({ data, set, onNext, onBack }) {
  const injuries = data.injuries || [];
  const medical = data.medical_conditions || [];

  const toggleInjury = v => {
    if (v === 'None') { set('injuries', ['None']); return; }
    const w = injuries.filter(x => x !== 'None');
    set('injuries', w.includes(v) ? w.filter(x => x !== v) : [...w, v]);
  };
  const toggleMedical = v => {
    if (v === 'None') { set('medical_conditions', ['None']); return; }
    const w = medical.filter(x => x !== 'None');
    set('medical_conditions', w.includes(v) ? w.filter(x => x !== v) : [...w, v]);
  };

  const valid = injuries.length > 0 && medical.length > 0 && data.parq_answer;

  return (
    <Screen>
      <BackBtn onClick={onBack} />
      <Header eyebrow="Step 9 of 13" headline="Injuries and health." sub="So your plan works around anything that hurts." />
      <div className="flex-1 overflow-y-auto px-5">
        <div className="space-y-5 max-w-md mx-auto w-full pb-6">

          <div className="space-y-3">
            <p className="text-[15px] font-semibold text-foreground">Injuries or problem areas</p>
            <div className="flex flex-wrap gap-2">
              {INJURY_OPTS.map(o => <Chip key={o} label={o} selected={injuries.includes(o)} onClick={() => toggleInjury(o)} />)}
            </div>
          </div>

          <SectionDivider label="Medical conditions" />
          <div className="flex flex-wrap gap-2">
            {MEDICAL_OPTS.map(o => <Chip key={o} label={o} selected={medical.includes(o)} onClick={() => toggleMedical(o)} />)}
          </div>

          <SectionDivider label="Medications (optional)" />
          <PremiumTextarea
            value={data.medications}
            onChange={v => set('medications', v)}
            placeholder="Anything that affects exercise, like beta-blockers or insulin"
            rows={2}
          />

          <SectionDivider label="Health screening" />
          <div className="space-y-3 rounded-xl bg-card p-4 shadow-[inset_0_0_0_1px_rgb(var(--border))]">
            <p className="text-[15px] leading-relaxed text-foreground">
              Has a doctor ever said you have a heart condition, or that you should only do physical activity a doctor recommends?
            </p>
            <div className="flex gap-2">
              {['Yes', 'No'].map(ans => (
                <button
                  key={ans}
                  onClick={() => set('parq_answer', ans)}
                  aria-pressed={data.parq_answer === ans}
                  className={`h-12 flex-1 rounded-lg text-[15px] font-semibold transition-colors ${data.parq_answer === ans
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card text-foreground shadow-[inset_0_0_0_1px_rgb(var(--input))] hover:bg-accent'}`}
                >
                  {ans}
                </button>
              ))}
            </div>
            {data.parq_answer === 'Yes' && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm leading-relaxed text-destructive">
                Get medical clearance before you start. Your coach will see this and may ask for a note from your doctor.
              </p>
            )}
          </div>

          <SectionDivider label="Anything else about your health? (optional)" />
          <PremiumTextarea
            value={data.health_notes}
            onChange={v => set('health_notes', v)}
            placeholder="Surgery, recent illness, pregnancy"
            rows={3}
          />
        </div>
      </div>
      <CTABtn onBack={onBack} onClick={onNext} disabled={!valid} />
    </Screen>
  );
}

/* STEP 10: CONSENT */
function ConsentStep({ data, set, onNext, onBack }) {
  const consentChecked = !!data.consent_agreed;

  return (
    <Screen>
      <BackBtn onClick={onBack} />
      <Header eyebrow="Step 10 of 13" headline="Before you start." sub="Read this and confirm." />
      <div className="flex-1 overflow-y-auto px-5">
        <div className="space-y-5 max-w-md mx-auto w-full pb-4">

          {/* Disclaimer card */}
          <div className="divide-y divide-border rounded-xl bg-card px-4 shadow-[inset_0_0_0_1px_rgb(var(--border))]">
            {[
              ['Coaching is not medical advice', 'The coaching, training programs and nutrition guidance are for general fitness and wellness only. They are not medical advice, diagnosis or treatment. Talk to a qualified healthcare professional before starting any exercise or nutrition program, especially if you have a pre-existing condition.'],
              ['Exercise clearance', 'By continuing, you confirm you are physically able to exercise, have disclosed any known medical conditions or limitations above, and are not using this coaching in place of professional medical advice.'],
              ['Privacy', 'Your personal information and health data are shared only with your coach. They are never sold or shared with third parties.'],
            ].map(([title, body]) => (
              <div key={title} className="py-4">
                <p className="text-[15px] font-semibold text-foreground">{title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>

          {/* Consent checkbox */}
          <button
            onClick={() => set('consent_agreed', !consentChecked)}
            aria-pressed={consentChecked}
            className={`flex w-full items-start gap-4 rounded-xl bg-card p-4 text-left transition-shadow ${consentChecked
              ? 'shadow-[inset_0_0_0_2px_rgb(var(--foreground))]'
              : 'shadow-[inset_0_0_0_1px_rgb(var(--border))]'}`}
          >
            <CheckDot selected={consentChecked} square />
            <p className="text-[15px] leading-relaxed text-foreground">
              I am cleared to exercise, I understand coaching is not medical advice, and I take responsibility for my own health and safety during this program.
            </p>
          </button>

          {!consentChecked && (
            <p className="text-center text-[13px] text-muted-foreground">Tick the box to continue.</p>
          )}
        </div>
      </div>
      <CTABtn onBack={onBack} onClick={onNext} disabled={!consentChecked} label="I agree" />
    </Screen>
  );
}

/* STEP 11: MINDSET */
const WHY_PROMPTS = ['Confidence', 'Family', 'Performance', 'Discipline', 'Health', 'Longevity', 'Mental health', 'Appearance', 'Athletics'];

function MindsetStep({ data, set, onNext, onBack }) {
  const valid = (data.motivation || '').trim().length >= 8;
  const append = word => set('motivation', (data.motivation || '').trim() ? `${data.motivation.trim()}, ${word.toLowerCase()}` : word);

  return (
    <Screen>
      <BackBtn onClick={onBack} />
      <Header eyebrow="Step 11 of 13" headline="Why does this matter to you?" sub="Your coach brings this up on the hard weeks. Be honest." />
      <div className="flex-1 overflow-y-auto px-5">
        <div className="space-y-6 max-w-md mx-auto w-full pb-4">
          <div className="relative">
            <PremiumTextarea
              value={data.motivation}
              onChange={v => set('motivation', v)}
              placeholder="I want to keep up with my kids and stop feeling tired by 3pm"
              rows={6}
            />
            <span className="absolute bottom-3 right-4 text-xs tabular-nums text-muted-foreground">
              {(data.motivation || '').length}/500
            </span>
          </div>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Stuck? Tap a word to add it.</p>
            <div className="flex flex-wrap gap-2">
              {WHY_PROMPTS.map(p => (
                <Chip key={p} label={`+ ${p}`} selected={false} onClick={() => append(p)} />
              ))}
            </div>
          </div>
        </div>
      </div>
      <CTABtn onBack={onBack} onClick={onNext} disabled={!valid} />
    </Screen>
  );
}

/* STEP 12: OBSTACLES */
const OBSTACLE_OPTS = [
  { id: 'consistency', label: 'Consistency' },
  { id: 'motivation', label: 'Motivation' },
  { id: 'nutrition', label: 'Nutrition' },
  { id: 'time', label: 'Time' },
  { id: 'stress', label: 'Stress' },
  { id: 'gym_anxiety', label: 'Gym anxiety' },
  { id: 'travel', label: 'Travel' },
  { id: 'discipline', label: 'Discipline' },
  { id: 'recovery', label: 'Recovery' },
  { id: 'social', label: 'Social events' },
  { id: 'injury', label: 'Injuries' },
];

function ObstaclesStep({ data, set, onNext, onBack }) {
  const selected = data.obstacles || [];
  const toggle = id => set('obstacles', selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
  return (
    <Screen>
      <BackBtn onClick={onBack} />
      <Header eyebrow="Step 12 of 13" headline="What usually gets in the way?" sub="Your coach plans around these from week one." />
      <div className="flex-1 overflow-y-auto px-5">
        <div className="space-y-5 max-w-md mx-auto w-full pb-4">
          <div className="grid grid-cols-2 gap-2.5">
            {OBSTACLE_OPTS.map(o => (
              <button
                key={o.id}
                onClick={() => toggle(o.id)}
                aria-pressed={selected.includes(o.id)}
                className={`flex items-center justify-between gap-2 rounded-xl bg-card px-4 py-3.5 text-left transition-shadow ${selected.includes(o.id)
                  ? 'shadow-[inset_0_0_0_2px_rgb(var(--foreground))]'
                  : 'shadow-[inset_0_0_0_1px_rgb(var(--border))]'}`}
              >
                <span className="text-[15px] font-semibold text-foreground">{o.label}</span>
                <CheckDot selected={selected.includes(o.id)} />
              </button>
            ))}
          </div>
        </div>
      </div>
      <CTABtn onBack={onBack} onClick={onNext} disabled={selected.length === 0} />
    </Screen>
  );
}

/* STEP 13: COMMITMENT + ANYTHING ELSE */
const COMMIT_LEVELS = [
  { value: 3, label: 'Casual', sub: "I'll fit it in when I can" },
  { value: 6, label: 'Motivated', sub: 'Ready to put in real effort' },
  { value: 8, label: 'Serious', sub: 'This is a priority for me' },
  { value: 10, label: 'All in', sub: 'I will rearrange my week for it' },
];

function CommitmentStep({ data, set, onNext, onBack }) {
  const level = data.commitment_level || 0;
  return (
    <Screen>
      <BackBtn onClick={onBack} />
      <Header eyebrow="Step 13 of 13" headline="Last one." sub="There is no wrong answer." />
      <div className="flex-1 overflow-y-auto px-5">
        <div className="space-y-6 max-w-md mx-auto w-full pb-4">

          <div className="space-y-3">
            <p className="text-[15px] font-semibold text-foreground">How committed are you right now?</p>
            <div className="space-y-2">
              {COMMIT_LEVELS.map(c => {
                const sel = level === c.value;
                return (
                  <BigCard key={c.value} label={c.label} sublabel={c.sub} selected={sel} onClick={() => set('commitment_level', c.value)} />
                );
              })}
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Your coach uses this to set how hard the plan pushes and how often they check in.
          </p>

          <SectionDivider label="Anything else your coach should know? (optional)" />
          <PremiumTextarea
            value={data.anything_else}
            onChange={v => set('anything_else', v)}
            placeholder="A wedding in June, night shifts, a coach you had before"
            rows={5}
          />
        </div>
      </div>
      <CTABtn onBack={onBack} onClick={onNext} disabled={!level} label="Send to my coach" />
    </Screen>
  );
}

/* SUBMITTING */
const GEN_ITEMS = [
  { label: 'Training profile',       activateAt: 0.5 },
  { label: 'Equipment and access',   activateAt: 1.0 },
  { label: 'Food preferences',       activateAt: 1.6 },
  { label: 'Recovery targets',       activateAt: 2.2 },
  { label: 'Health and safety notes', activateAt: 2.8 },
  { label: 'What holds you back',    activateAt: 3.4 },
];
const REDIRECT_AFTER = 5200;

function GenItemCard({ item }) {
  const [status, setStatus] = useState('waiting');
  useEffect(() => {
    const t1 = setTimeout(() => setStatus('loading'), (item.activateAt - 0.4) * 1000);
    const t2 = setTimeout(() => setStatus('done'), item.activateAt * 1000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);
  return (
    <div className="flex items-center gap-3 py-3">
      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center">
        {status === 'loading' && <span className="h-4 w-4 animate-spin rounded-full border-2 border-foreground border-t-transparent" />}
        {status === 'done' && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5L4 7L8 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
        )}
        {status === 'waiting' && <span className="h-4 w-4 rounded-full border-[1.5px] border-input" />}
      </span>
      <p className={`flex-1 text-[15px] ${status === 'waiting' ? 'text-muted-foreground' : 'font-semibold text-foreground'}`}>{item.label}</p>
      <p className="text-[13px] text-muted-foreground">{status === 'done' ? 'Ready' : status === 'loading' ? 'Reading' : 'Waiting'}</p>
    </div>
  );
}

function GeneratingStep({ onNext, submitStatus, submitError, onRetry }) {
  const [allDone, setAllDone] = useState(false);
  const lastAt = GEN_ITEMS[GEN_ITEMS.length - 1].activateAt;

  useEffect(() => {
    const t = setTimeout(() => setAllDone(true), lastAt * 1000 + 400);
    return () => clearTimeout(t);
  }, []);

  // Auto-advance ONLY when animation is done AND we have a CONFIRMED success response.
  // Never advance on timer alone — submitStatus must be 'success'.
  useEffect(() => {
    if (allDone && submitStatus === 'success') {
      const t = setTimeout(onNext, 800);
      return () => clearTimeout(t);
    }
    // If allDone but status is still 'pending', stay on this screen and wait.
    // If status is 'error', the error card below will render — never advance.
  }, [allDone, submitStatus]);

  return (
    <Screen>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 overflow-y-auto px-5 py-8">
        <div>
          <h1 className="text-[32px] leading-[1.04] text-foreground">
            {allDone ? 'Your profile is ready.' : 'Putting your answers together.'}
          </h1>
          <p className="mt-2 text-[15px] text-muted-foreground">
            {allDone ? 'Sending it to your coach now.' : 'Your coach gets one tidy summary instead of 13 screens.'}
          </p>
        </div>

        <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
          <motion.div
            className="h-full rounded-full bg-foreground"
            animate={{ width: allDone ? '100%' : '85%' }}
            initial={{ width: '0%' }}
            transition={{ duration: lastAt * 0.9 }}
          />
        </div>

        <div className="divide-y divide-border rounded-xl bg-card px-4 shadow-[inset_0_0_0_1px_rgb(var(--border))]">
          {GEN_ITEMS.map((item, i) => <GenItemCard key={i} item={item} />)}
        </div>

        {/* Error state — shown instead of success when submission fails */}
        {submitStatus === 'error' && (
          <div className="space-y-3 rounded-xl bg-card p-4 shadow-[inset_0_0_0_1px_rgb(var(--destructive)/0.5)]">
            <p className="text-[15px] font-semibold text-destructive">Your answers did not send</p>
            <p className="break-words rounded-lg bg-secondary p-3 font-mono text-[13px] leading-relaxed text-foreground">
              {submitError || 'Unknown error. No message came back from the server.'}
            </p>
            <p className="text-sm text-muted-foreground">
              Your answers are still here in this browser. Try again, and if it keeps failing, send your coach a message.
            </p>
            <button onClick={onRetry} className="h-12 w-full rounded-lg bg-primary text-[15px] font-semibold text-primary-foreground">
              Try again
            </button>
          </div>
        )}
      </div>
    </Screen>
  );
}

/* DONE */
function DoneStep({ firstName, coachDisplayName, clientEmail }) {
  const name = firstName || 'you';
  const coach = coachDisplayName ? `Coach ${coachDisplayName}` : 'your coach';
  return (
    <Screen>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 overflow-y-auto px-5 py-8">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success">
          <svg width="22" height="22" viewBox="0 0 42 42" fill="none">
            <path d="M9 21L17 29L33 13" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <div>
          <h1 className="text-[36px] leading-[1.04] text-foreground">Thanks, {name}. Your answers are in.</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
            {coach.charAt(0).toUpperCase() + coach.slice(1)} will read them and get in touch to start your plan.
          </p>
          {clientEmail && (
            <p className="mt-2 text-sm text-muted-foreground">
              We sent a confirmation to <span className="font-semibold text-foreground">{clientEmail}</span>.
            </p>
          )}
        </div>

        <div className="rounded-xl bg-card p-4 shadow-[inset_0_0_0_1px_rgb(var(--border))]">
          <p className="text-[15px] font-semibold text-foreground">What happens next</p>
          <ol className="mt-3 space-y-3">
            {[
              `${coach.charAt(0).toUpperCase() + coach.slice(1)} reads your intake`,
              'Your training and nutrition plan gets built',
              'You hear back within 24 hours',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-[1.5px] border-foreground text-[13px] font-bold text-foreground">{i + 1}</span>
                <p className="pt-0.5 text-[15px] text-foreground">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Screen>
  );
}

/* ─────────────────────────────────── MAIN ─────────────────────────────────── */
export default function ClientOnboarding() {
  const [step, setStep] = useState('welcome');
  const [direction, setDirection] = useState(1);
  const [data, setData] = useState({ training_days_per_week: 4 });

  const set = (k, v) => setData(d => ({ ...d, [k]: v }));

  const idx = STEPS.indexOf(step);
  const next = () => {
    if (idx < STEPS.length - 1) { setDirection(1); setStep(STEPS[idx + 1]); }
  };
  const back = () => {
    if (idx > 0) { setDirection(-1); setStep(STEPS[idx - 1]); }
  };
  const goTo = s => { setDirection(1); setStep(s); };

  const progressIdx = PROGRESS_STEPS.indexOf(step);
  const showProgress = progressIdx >= 0;

  const coachDisplayName = COACH_NAME || (COACH_ID ? decodeURIComponent(COACH_ID).split('@')[0] : '');

  const submitMutation = useMutation({
    mutationFn: async () => {
      // Guard: coach param is required — without it the record would have no coach_id
      // and would be invisible on the dashboard due to RLS.
      if (!COACH_ID) {
        throw new Error(
          'This intake link is missing its coach identifier. Please use the original link sent to you by your coach.'
        );
      }

      let res;
      try {
        res = await db.functions.invoke('submitOnboardingIntake', {
          name: [data.first_name, data.last_name].filter(Boolean).join(' '),
          email: data.email,
          coachId: COACH_ID,
          formData: data,
        });
      } catch (networkErr) {
        // Network-level failure (no response at all)
        throw new Error(`Network error: ${networkErr?.message || 'Could not reach the server. Please check your connection and try again.'}`);
      }

      // Surface HTTP-level errors with status + body
      if (res?.status && res.status >= 400) {
        const body = res?.data ? JSON.stringify(res.data) : '(no response body)';
        throw new Error(`Server error ${res.status}: ${body}`);
      }

      if (!res?.data?.success) {
        const errMsg = res?.data?.error || res?.data?.message || JSON.stringify(res?.data) || 'Submission failed. No confirmation came back.';
        throw new Error(errMsg);
      }

      return res.data;
    },
    onSuccess: () => goTo('done'),
    onError: (err) => {
      console.error('submitOnboardingIntake failed:', err);
      // Error is surfaced in GeneratingStep via submitMutation.status + submitMutation.error
    },
  });

  const handleNext = () => {
    if (step === 'commitment') {
      next(); // advance to generating screen first (shows animation)
      submitMutation.mutate();
      return;
    }
    next();
  };

  // Functional step transition: a short slide in the direction of travel.
  const variants = {
    enter: dir => ({ x: dir > 0 ? 32 : -32, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: dir => ({ x: dir > 0 ? -32 : 32, opacity: 0 }),
  };
  const transition = { type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.22 };

  const props = { data, set, onNext: handleNext, onBack: back };

  const renderStep = () => {
    switch (step) {
      case 'welcome':        return <WelcomeStep onNext={next} />;
      case 'basic_info':     return <BasicInfoStep {...props} />;
      case 'goals':          return <GoalsStep {...props} />;
      case 'body_metrics':   return <BodyMetricsStep {...props} />;
      case 'experience':     return <ExperienceStep {...props} />;
      case 'lifestyle':      return <LifestyleStep {...props} />;
      case 'training_prefs': return <TrainingPrefsStep {...props} />;
      case 'equipment':      return <EquipmentStep {...props} />;
      case 'nutrition':      return <NutritionStep {...props} />;
      case 'medical':        return <MedicalStep {...props} />;
      case 'consent':        return <ConsentStep {...props} />;
      case 'mindset':        return <MindsetStep {...props} />;
      case 'obstacles':      return <ObstaclesStep {...props} />;
      case 'commitment':     return <CommitmentStep {...props} />;
      case 'generating':     return (
        <GeneratingStep
          onNext={next}
          submitStatus={submitMutation.status}
          submitError={submitMutation.error?.message}
          onRetry={() => submitMutation.mutate()}
        />
      );
      case 'done':           return <DoneStep firstName={data.first_name} coachDisplayName={coachDisplayName} clientEmail={data.email} />;
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-background">
      {showProgress && <StepTopBar step={step} onBack={back} coachName={coachDisplayName} />}

      <div className="relative flex-1 overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={step === 'welcome' ? {} : variants}
            initial={step === 'welcome' ? { opacity: 0 } : 'enter'}
            animate={step === 'welcome' ? { opacity: 1 } : 'center'}
            exit={step === 'welcome' ? { opacity: 0 } : 'exit'}
            transition={transition}
            className="absolute inset-0"
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
