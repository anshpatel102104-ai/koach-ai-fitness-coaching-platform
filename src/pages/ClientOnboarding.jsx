// cache-bust: 2026-06-18T19:45:00Z — force full recompile, bundle index-wl2fz097.js is stale
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import KoachLogo from '@/components/brand/KoachLogo.jsx';

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

/* ─── Shared primitives ─── */
function Screen({ children }) {
  return (
    <div className="w-full h-full flex flex-col" style={{ background: 'var(--tc-sidebar)' }}>
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, var(--tc-primary) 0%, transparent 65%)', filter: 'blur(70px)' }}
        />
      </div>
      {children}
    </div>
  );
}

function BackBtn({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 flex items-center gap-1.5 text-sm font-medium px-6 pt-5 pb-1 relative z-10"
      style={{ color: 'var(--kc-4a4a4a)' }}
    >
      <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
        <path d="M10 3L6 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Back
    </button>
  );
}

function Header({ eyebrow, headline, sub }) {
  return (
    <motion.div
      className="px-6 pt-4 pb-2 flex-shrink-0 max-w-md mx-auto w-full relative z-10"
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
    >
      {eyebrow && (
        <p className="text-[11px] uppercase tracking-[0.26em] font-bold mb-2.5" style={{ color: 'var(--tc-primary)' }}>
          {eyebrow}
        </p>
      )}
      <h2 className="font-bold text-white leading-[1.1] mb-2"
        style={{ fontSize: 'clamp(1.75rem, 5.5vw, 2.6rem)', letterSpacing: '-0.03em' }}>
        {headline}
      </h2>
      {sub && <p className="text-sm leading-relaxed" style={{ color: 'var(--kc-6a6a6a)' }}>{sub}</p>}
    </motion.div>
  );
}

function CTABtn({ label = 'Continue', onClick, disabled }) {
  return (
    <div
      className="flex-shrink-0 px-6 pt-3 pb-8 w-full max-w-md mx-auto relative z-10"
      style={{ background: 'var(--tc-sidebar)' }}
    >
      <motion.button
        onClick={onClick}
        disabled={disabled}
        whileHover={!disabled ? { scale: 1.02, boxShadow: '0 0 40px color-mix(in srgb, var(--tc-primary) 45%, transparent)' } : {}}
        whileTap={!disabled ? { scale: 0.98 } : {}}
        className="w-full py-4 rounded-2xl font-bold text-base transition-all"
        style={{
          background: disabled ? 'color-mix(in srgb, white 6%, transparent)' : 'linear-gradient(135deg, var(--tc-primary), var(--tc-primary))',
          boxShadow: disabled ? 'none' : '0 0 24px color-mix(in srgb, var(--tc-primary) 28%, transparent)',
          color: disabled ? 'var(--kc-444444)' : 'var(--tc-primary-foreground)',
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        {label}
      </motion.button>
    </div>
  );
}

function Chip({ label, selected, onClick, emoji }) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.94 }}
      className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
      style={{
        background: selected ? 'color-mix(in srgb, var(--tc-primary) 12%, transparent)' : 'color-mix(in srgb, white 4%, transparent)',
        border: selected ? '1.5px solid color-mix(in srgb, var(--tc-primary) 55%, transparent)' : '1.5px solid color-mix(in srgb, white 7%, transparent)',
        color: selected ? 'var(--tc-primary-foreground)' : 'var(--kc-6a6a6a)',
        boxShadow: selected ? '0 0 18px color-mix(in srgb, var(--tc-primary) 15%, transparent)' : 'none',
      }}
    >
      {emoji && <span className="mr-1.5">{emoji}</span>}{label}
    </motion.button>
  );
}

function BigCard({ emoji, label, sublabel, selected, onClick }) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.975 }}
      className="relative w-full text-left rounded-2xl p-4 transition-all"
      style={{
        background: selected ? 'color-mix(in srgb, var(--tc-primary) 9%, transparent)' : 'color-mix(in srgb, white 3%, transparent)',
        border: selected ? '1.5px solid color-mix(in srgb, var(--tc-primary) 60%, transparent)' : '1.5px solid color-mix(in srgb, white 7%, transparent)',
        boxShadow: selected ? '0 0 28px color-mix(in srgb, var(--tc-primary) 12%, transparent)' : 'none',
      }}
    >
      <div className="flex items-center gap-4">
        <span className="text-2xl flex-shrink-0">{emoji}</span>
        <div className="flex-1 text-left">
          <p className="font-semibold text-sm" style={{ color: selected ? 'var(--tc-primary-foreground)' : 'var(--kc-b3b3b3)' }}>{label}</p>
          {sublabel && <p className="text-xs mt-0.5" style={{ color: 'var(--kc-4a4a4a)' }}>{sublabel}</p>}
        </div>
        <div
          className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center"
          style={{
            background: selected ? 'var(--tc-primary)' : 'transparent',
            border: selected ? '2px solid var(--tc-primary)' : '2px solid color-mix(in srgb, white 12%, transparent)',
          }}
        >
          {selected && (
            <svg viewBox="0 0 10 10" fill="none" className="w-3 h-3">
              <path d="M2 5L4 7L8 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      </div>
    </motion.button>
  );
}

function PremiumField({ label, value, onChange, type = 'text', placeholder, autoFocus }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--kc-4a4a4a)' }}>{label}</p>
      <input
        type={type}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full px-5 py-4 rounded-2xl text-white text-base font-medium placeholder-[var(--kc-2e2e2e)] outline-none transition-all"
        style={{ background: 'var(--tc-foreground)', border: '1.5px solid color-mix(in srgb, white 7%, transparent)' }}
        onFocus={e => (e.target.style.borderColor = 'color-mix(in srgb, var(--tc-primary) 50%, transparent)')}
        onBlur={e => (e.target.style.borderColor = 'color-mix(in srgb, white 7%, transparent)')}
      />
    </div>
  );
}

function NumBox({ label, value, onChange, unit, placeholder }) {
  return (
    <div
      className="flex-1 flex flex-col items-center gap-2 py-5 px-3 rounded-2xl"
      style={{ background: 'var(--tc-foreground)', border: '1.5px solid color-mix(in srgb, white 7%, transparent)' }}
    >
      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--kc-4a4a4a)' }}>{label}</p>
      <input
        type="number"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full text-center text-3xl font-bold text-white bg-transparent border-0 focus:outline-none placeholder-[var(--kc-222222)]"
        style={{ minWidth: 0 }}
      />
      {unit && <p className="text-xs" style={{ color: 'var(--kc-3a3a3a)' }}>{unit}</p>}
    </div>
  );
}

function SliderRow({ label, value, onChange, min = 1, max = 10, leftLabel, rightLabel }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white">{label}</p>
        <span
          className="text-sm font-bold px-2.5 py-0.5 rounded-lg"
          style={{ background: 'color-mix(in srgb, var(--tc-primary) 12%, transparent)', color: 'var(--tc-primary)' }}
        >
          {value || min}/{max}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value || min}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full outline-none appearance-none"
        style={{ background: `linear-gradient(to right, var(--tc-primary) ${((value || min) - min) / (max - min) * 100}%, color-mix(in srgb, white 8%, transparent) 0%)` }}
      />
      {(leftLabel || rightLabel) && (
        <div className="flex justify-between">
          <span className="text-xs" style={{ color: 'var(--kc-3a3a3a)' }}>{leftLabel}</span>
          <span className="text-xs" style={{ color: 'var(--kc-3a3a3a)' }}>{rightLabel}</span>
        </div>
      )}
    </div>
  );
}

function SectionDivider({ label }) {
  return (
    <div className="flex items-center gap-3 my-2">
      <div className="flex-1 h-px" style={{ background: 'color-mix(in srgb, white 5%, transparent)' }} />
      <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: 'var(--kc-333333)' }}>{label}</p>
      <div className="flex-1 h-px" style={{ background: 'color-mix(in srgb, white 5%, transparent)' }} />
    </div>
  );
}

function PremiumTextarea({ value, onChange, placeholder, rows = 4 }) {
  return (
    <textarea
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-5 py-4 rounded-2xl text-white text-base leading-relaxed resize-none focus:outline-none transition-all"
      style={{ background: 'var(--tc-foreground)', border: '1.5px solid color-mix(in srgb, white 7%, transparent)' }}
      onFocus={e => (e.target.style.borderColor = 'color-mix(in srgb, var(--tc-primary) 45%, transparent)')}
      onBlur={e => (e.target.style.borderColor = 'color-mix(in srgb, white 7%, transparent)')}
    />
  );
}

/* ─────────────────────────────────── SCREENS ─────────────────────────────────── */

function WelcomeStep({ onNext }) {
  const displayName = COACH_NAME || (COACH_ID ? decodeURIComponent(COACH_ID).split('@')[0] : null);
  const totalSteps = PROGRESS_STEPS.length;
  return (
    <Screen>
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-10 relative z-10">
        <motion.div
          className="flex flex-col items-center gap-8 text-center w-full max-w-sm"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.11 } } }}
        >
          <motion.div variants={{ hidden: { opacity: 0, scale: 0.7 }, show: { opacity: 1, scale: 1, transition: { duration: 0.7, ease: [0.32, 0.72, 0, 1] } } }}>
            <KoachLogo size={80} rounded="rounded-3xl" glow bg />
          </motion.div>

          <motion.div
            variants={{ hidden: { opacity: 0, y: 28 }, show: { opacity: 1, y: 0, transition: { duration: 0.6 } } }}
            className="space-y-4"
          >
            {displayName && (
              <p className="text-sm font-semibold" style={{ color: 'var(--tc-primary)' }}>
                Coach {displayName} invited you ✦
              </p>
            )}
            <h1
              className="font-bold text-white leading-[1.05]"
              style={{ fontSize: 'clamp(2.5rem, 9vw, 4rem)', letterSpacing: '-0.035em' }}
            >
              Your next level<br />starts now.
            </h1>
            <p className="text-base leading-relaxed" style={{ color: 'var(--kc-6a6a6a)' }}>
              This personalized intake helps your coach build your training, nutrition, recovery, and success plan.
            </p>
          </motion.div>

          <motion.div
            variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.4 } } }}
            className="flex flex-wrap justify-center gap-2"
          >
            {['Personalized', 'AI-Powered', 'Science-Backed', 'Elite-Grade'].map(t => (
              <span
                key={t}
                className="px-3 py-1 rounded-full text-xs font-semibold"
                style={{ background: 'color-mix(in srgb, var(--tc-primary) 8%, transparent)', color: 'var(--tc-primary)', border: '1px solid color-mix(in srgb, var(--tc-primary) 18%, transparent)' }}
              >
                {t}
              </span>
            ))}
          </motion.div>

          <motion.div
            variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
            className="w-full space-y-3"
          >
            <motion.button
              onClick={onNext}
              whileHover={{ scale: 1.03, boxShadow: '0 0 48px color-mix(in srgb, var(--tc-primary) 50%, transparent)' }}
              whileTap={{ scale: 0.97 }}
              className="w-full py-4 rounded-2xl text-primary-foreground font-bold text-lg"
              style={{ background: 'linear-gradient(135deg, var(--tc-primary), var(--tc-primary))', boxShadow: '0 0 28px color-mix(in srgb, var(--tc-primary) 30%, transparent)' }}
            >
              Let's Go →
            </motion.button>
            <p className="text-xs" style={{ color: 'var(--kc-2e2e2e)' }}>Takes about 5 minutes · {totalSteps} steps · Private & secure</p>
          </motion.div>
        </motion.div>
      </div>
    </Screen>
  );
}

/* STEP 1: BASIC INFO */
function BasicInfoStep({ data, set, onNext, onBack }) {
  const valid = (data.first_name || '').trim() && (data.email || '').includes('@');
  return (
    <Screen>
      <BackBtn onClick={onBack} />
      <Header eyebrow="Step 1 of 13" headline="What should your coach call you?" />
      <div className="flex-1 overflow-y-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4 max-w-md mx-auto w-full pb-4"
        >
          <div className="flex gap-3">
            <div className="flex-1">
              <PremiumField label="First Name *" value={data.first_name} onChange={v => set('first_name', v)} placeholder="Alex" autoFocus />
            </div>
            <div className="flex-1">
              <PremiumField label="Last Name" value={data.last_name} onChange={v => set('last_name', v)} placeholder="Johnson" />
            </div>
          </div>
          <PremiumField label="Email Address *" value={data.email} onChange={v => set('email', v)} type="email" placeholder="alex@email.com" />
          <PremiumField label="Phone (optional)" value={data.phone} onChange={v => set('phone', v)} type="tel" placeholder="+1 (555) 000-0000" />
        </motion.div>
      </div>
      <CTABtn onClick={onNext} disabled={!valid} />
    </Screen>
  );
}

/* STEP 2: GOALS */
const GOAL_OPTIONS = [
  { id: 'fat_loss', emoji: '🔥', label: 'Lose Fat', sublabel: 'Shred body fat, get lean' },
  { id: 'muscle_gain', emoji: '💪', label: 'Build Muscle', sublabel: 'Gain size, strength & mass' },
  { id: 'strength', emoji: '🏋️', label: 'Gain Strength', sublabel: 'Move bigger weights' },
  { id: 'confidence', emoji: '⭐', label: 'Improve Confidence', sublabel: 'Feel great in your skin' },
  { id: 'energy', emoji: '⚡', label: 'Improve Energy', sublabel: 'More vitality every day' },
  { id: 'athletic', emoji: '🏆', label: 'Athletic Performance', sublabel: 'Train like an athlete' },
  { id: 'general_health', emoji: '🎯', label: 'General Health', sublabel: 'Live longer, feel better' },
  { id: 'lifestyle', emoji: '🌅', label: 'Lifestyle Change', sublabel: 'Build lasting healthy habits' },
  { id: 'hybrid', emoji: '⚡', label: 'Hybrid Performance', sublabel: 'Lose fat AND gain muscle' },
];

function GoalsStep({ data, set, onNext, onBack }) {
  const selected = data.goals || [];
  const toggle = id => set('goals', selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
  return (
    <Screen>
      <BackBtn onClick={onBack} />
      <Header eyebrow="Step 2 of 13" headline="What's your main goal right now?" sub="Select all that apply." />
      <div className="flex-1 overflow-y-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="space-y-2.5 max-w-md mx-auto w-full pb-4"
        >
          {GOAL_OPTIONS.map((g, i) => (
            <motion.div key={g.id} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
              <BigCard {...g} selected={selected.includes(g.id)} onClick={() => toggle(g.id)} />
            </motion.div>
          ))}
        </motion.div>
      </div>
      <CTABtn onClick={onNext} disabled={selected.length === 0} />
    </Screen>
  );
}

/* STEP 3: BODY METRICS */
function BodyMetricsStep({ data, set, onNext, onBack }) {
  const valid = data.age && data.current_weight && data.height;
  return (
    <Screen>
      <BackBtn onClick={onBack} />
      <Header eyebrow="Step 3 of 13" headline="Tell us about yourself." sub="Used to calculate your personalized targets." />
      <div className="flex-1 overflow-y-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4 max-w-md mx-auto w-full pb-4"
        >
          <div className="flex gap-3">
            <NumBox label="Age *" value={data.age} onChange={v => set('age', v)} unit="years" placeholder="25" />
            <NumBox label="Weight *" value={data.current_weight} onChange={v => set('current_weight', v)} unit="lbs" placeholder="170" />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <PremiumField label="Height *" value={data.height} onChange={v => set('height', v)} placeholder={`5'10"`} />
            </div>
            <div className="flex-1">
              <PremiumField label="Goal Weight" value={data.target_weight} onChange={v => set('target_weight', v)} placeholder="160 lbs" />
            </div>
          </div>
          <div className="flex gap-3">
            <NumBox label="Body Fat % (opt)" value={data.body_fat_pct} onChange={v => set('body_fat_pct', v)} unit="optional" placeholder="18" />
          </div>
        </motion.div>
      </div>
      <CTABtn onClick={onNext} disabled={!valid} />
    </Screen>
  );
}

/* STEP 4: EXPERIENCE */
const EXP_LEVELS = [
  { id: 'none', emoji: '🌱', label: 'Beginner', sublabel: 'New to structured training' },
  { id: 'some', emoji: '🔥', label: 'Intermediate', sublabel: '1–3 years of consistent training' },
  { id: 'experienced', emoji: '⚡', label: 'Advanced', sublabel: '3–5 years of serious training' },
  { id: 'advanced', emoji: '🏆', label: 'Elite', sublabel: '5+ years, competitive level' },
];
const EXP_DURATIONS = ['Never', '<1 year', '1–3 years', '3–5 years', '5+ years'];

function ExperienceStep({ data, set, onNext, onBack }) {
  return (
    <Screen>
      <BackBtn onClick={onBack} />
      <Header eyebrow="Step 4 of 13" headline="What's your fitness experience?" />
      <div className="flex-1 overflow-y-auto px-6 relative z-10">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="space-y-7 max-w-md mx-auto w-full pb-4">
          <div className="space-y-2.5">
            {EXP_LEVELS.map((l, i) => (
              <motion.div key={l.id} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                <BigCard {...l} selected={data.experience === l.id} onClick={() => set('experience', l.id)} />
              </motion.div>
            ))}
          </div>
          <SectionDivider label="Training Duration" />
          <div className="space-y-3">
            <p className="text-sm font-semibold text-white">How long have you trained consistently?</p>
            <div className="flex flex-wrap gap-2">
              {EXP_DURATIONS.map(d => (
                <Chip key={d} label={d} selected={data.training_duration === d} onClick={() => set('training_duration', d)} />
              ))}
            </div>
          </div>
          <SectionDivider label="Training History" />
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--kc-4a4a4a)' }}>
              Describe your training history (optional)
            </p>
            <PremiumTextarea
              value={data.training_history}
              onChange={v => set('training_history', v)}
              placeholder="e.g. Trained powerlifting for 2 years, took 6 months off, recently returned to gym..."
              rows={3}
            />
          </div>
        </motion.div>
      </div>
      <CTABtn onClick={onNext} disabled={!data.experience} />
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
      <Header eyebrow="Step 5 of 13" headline="What does your lifestyle look like?" sub="Recovery is half the battle." />
      <div className="flex-1 overflow-y-auto px-6 relative z-10">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="space-y-7 max-w-md mx-auto w-full pb-4">

          <div className="space-y-3">
            <p className="text-sm font-semibold text-white">Daily activity level *</p>
            <div className="flex flex-wrap gap-2">
              {ACTIVITY_OPTS.map(o => <Chip key={o} label={o} selected={data.activity_level === o} onClick={() => set('activity_level', o)} />)}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-white">Work schedule</p>
            <div className="flex flex-wrap gap-2">
              {SCHEDULE_OPTS.map(o => <Chip key={o} label={o} selected={data.work_schedule === o} onClick={() => set('work_schedule', o)} />)}
            </div>
          </div>

          <SliderRow
            label="Stress Level"
            value={data.stress_level}
            onChange={v => set('stress_level', v)}
            min={1} max={10}
            leftLabel="Very calm"
            rightLabel="Overwhelmed"
          />

          <SliderRow
            label="Sleep Quality"
            value={data.sleep_quality}
            onChange={v => set('sleep_quality', v)}
            min={1} max={10}
            leftLabel="Very poor"
            rightLabel="Excellent"
          />

          <SliderRow
            label="Daily Water Intake"
            value={data.water_intake}
            onChange={v => set('water_intake', v)}
            min={1} max={10}
            leftLabel="Barely any"
            rightLabel="Well hydrated"
          />

          <div className="space-y-3">
            <p className="text-sm font-semibold text-white">Alcohol frequency</p>
            <div className="flex flex-wrap gap-2">
              {ALCOHOL_OPTS.map(o => <Chip key={o} label={o} selected={data.alcohol_frequency === o} onClick={() => set('alcohol_frequency', o)} />)}
            </div>
          </div>
        </motion.div>
      </div>
      <CTABtn onClick={onNext} disabled={!valid} />
    </Screen>
  );
}

/* STEP 6: TRAINING PREFS */
const TRAINING_STYLES = [
  { id: 'gym', emoji: '🏋️', label: 'Gym Workouts', sublabel: 'Weights, machines, barbells' },
  { id: 'running', emoji: '🏃', label: 'Running', sublabel: 'Road, trail, cardio-focused' },
  { id: 'hybrid', emoji: '⚡', label: 'Hybrid Training', sublabel: 'Mix of strength and cardio' },
  { id: 'strength', emoji: '💪', label: 'Strength Training', sublabel: 'Powerlifting, barbell focus' },
  { id: 'functional', emoji: '🔄', label: 'Functional Fitness', sublabel: 'CrossFit, athletic movement' },
  { id: 'home', emoji: '🏠', label: 'Home Workouts', sublabel: 'Minimal equipment, bodyweight' },
  { id: 'cardio', emoji: '❤️', label: 'Cardio-Focused', sublabel: 'Cycling, swimming, HIIT' },
  { id: 'sports', emoji: '🏆', label: 'Sports Performance', sublabel: 'Sport-specific training' },
];

function TrainingPrefsStep({ data, set, onNext, onBack }) {
  const selected = data.training_styles || [];
  const toggle = id => set('training_styles', selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
  const DAYS = [1, 2, 3, 4, 5, 6, 7];

  return (
    <Screen>
      <BackBtn onClick={onBack} />
      <Header eyebrow="Step 6 of 13" headline="How do you enjoy training?" sub="Select all that apply." />
      <div className="flex-1 overflow-y-auto px-6 relative z-10">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="space-y-7 max-w-md mx-auto w-full pb-4">
          <div className="space-y-2.5">
            {TRAINING_STYLES.map((s, i) => (
              <motion.div key={s.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                <BigCard {...s} selected={selected.includes(s.id)} onClick={() => toggle(s.id)} />
              </motion.div>
            ))}
          </div>
          <SectionDivider label="Training Frequency" />
          <div className="space-y-3">
            <p className="text-sm font-semibold text-white">Days available to train per week *</p>
            <div className="flex gap-2">
              {DAYS.map(d => (
                <motion.button
                  key={d}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => set('training_days_per_week', d)}
                  className="flex-1 py-3.5 rounded-xl font-bold text-sm transition-all"
                  style={{
                    background: data.training_days_per_week === d ? 'color-mix(in srgb, var(--tc-primary) 14%, transparent)' : 'color-mix(in srgb, white 4%, transparent)',
                    border: data.training_days_per_week === d ? '1.5px solid color-mix(in srgb, var(--tc-primary) 55%, transparent)' : '1.5px solid color-mix(in srgb, white 7%, transparent)',
                    color: data.training_days_per_week === d ? 'var(--tc-primary-foreground)' : 'var(--kc-4a4a4a)',
                    boxShadow: data.training_days_per_week === d ? '0 0 14px color-mix(in srgb, var(--tc-primary) 12%, transparent)' : 'none',
                  }}
                >
                  {d}
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
      <CTABtn onClick={onNext} disabled={selected.length === 0 || !data.training_days_per_week} />
    </Screen>
  );
}

/* STEP 7: EQUIPMENT */
const EQUIPMENT_OPTS = [
  { id: 'full_gym', emoji: '🏋️', label: 'Full Commercial Gym', sublabel: 'Barbells, cables, machines, dumbbells' },
  { id: 'home_full', emoji: '🏠', label: 'Home Gym (Full)', sublabel: 'Barbell, rack, plates, dumbbells' },
  { id: 'home_basic', emoji: '🪬', label: 'Home Gym (Basic)', sublabel: 'Dumbbells, resistance bands, bench' },
  { id: 'bodyweight', emoji: '🤸', label: 'Bodyweight Only', sublabel: 'No equipment available' },
  { id: 'outdoor', emoji: '🏞️', label: 'Outdoors / Park', sublabel: 'Pull-up bars, open space' },
  { id: 'hotel', emoji: '🧳', label: 'Hotel / Travel Gym', sublabel: 'Limited machines, light dumbbells' },
];

function EquipmentStep({ data, set, onNext, onBack }) {
  return (
    <Screen>
      <BackBtn onClick={onBack} />
      <Header eyebrow="Step 7 of 13" headline="What equipment do you have access to?" sub="This determines what exercises we can program." />
      <div className="flex-1 overflow-y-auto px-6 relative z-10">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="space-y-4 max-w-md mx-auto w-full pb-4">
          <div className="space-y-2.5">
            {EQUIPMENT_OPTS.map((e, i) => (
              <motion.div key={e.id} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                <BigCard {...e} selected={data.equipment_access === e.id} onClick={() => set('equipment_access', e.id)} />
              </motion.div>
            ))}
          </div>
          <SectionDivider label="Specific Equipment (optional)" />
          <PremiumTextarea
            value={data.equipment_notes}
            onChange={v => set('equipment_notes', v)}
            placeholder="e.g. I have a squat rack, barbell, and dumbbells up to 50lbs. No cable machine..."
            rows={3}
          />
        </motion.div>
      </div>
      <CTABtn onClick={onNext} disabled={!data.equipment_access} />
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
      <Header eyebrow="Step 8 of 13" headline="Nutrition & dietary preferences." sub="We'll build your plan around what you actually like." />
      <div className="flex-1 overflow-y-auto px-6 relative z-10">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="space-y-7 max-w-md mx-auto w-full pb-4">

          <div className="space-y-3">
            <p className="text-sm font-semibold text-white">Foods you enjoy</p>
            <div className="flex flex-wrap gap-2">
              {FOOD_CHIPS.map(f => <Chip key={f} label={f} selected={favFoods.includes(f)} onClick={() => toggleFood(f)} />)}
            </div>
          </div>

          <SectionDivider label="Foods you dislike" />
          <PremiumField
            label="Anything you don't like?"
            value={data.disliked_foods}
            onChange={v => set('disliked_foods', v)}
            placeholder="e.g. fish, mushrooms, tofu..."
          />

          <SectionDivider label="Dietary Preferences" />
          <div className="flex flex-wrap gap-2">
            {DIET_OPTS.map(d => <Chip key={d} label={d} selected={diets.includes(d)} onClick={() => toggleDiet(d)} />)}
          </div>

          <SectionDivider label="Food Allergies *" />
          <p className="text-xs" style={{ color: 'var(--kc-5a5a5a)' }}>Select all that apply — required for safe programming.</p>
          <div className="flex flex-wrap gap-2">
            {ALLERGY_OPTS.map(a => <Chip key={a} label={a} selected={allergies.includes(a)} onClick={() => toggleAllergy(a)} />)}
          </div>

          <SectionDivider label="Other allergies or notes" />
          <PremiumTextarea
            value={data.allergy_notes}
            onChange={v => set('allergy_notes', v)}
            placeholder="Any other allergies, intolerances, or important food notes..."
            rows={2}
          />
        </motion.div>
      </div>
      <CTABtn onClick={onNext} disabled={!valid} />
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
      <Header eyebrow="Step 9 of 13" headline="Health & injury history." sub="This helps us keep your plan safe and effective." />
      <div className="flex-1 overflow-y-auto px-6 relative z-10">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="space-y-7 max-w-md mx-auto w-full pb-4">

          <div className="space-y-3">
            <p className="text-sm font-semibold text-white">Physical limitations / injuries *</p>
            <div className="flex flex-wrap gap-2">
              {INJURY_OPTS.map(o => <Chip key={o} label={o} selected={injuries.includes(o)} onClick={() => toggleInjury(o)} />)}
            </div>
          </div>

          <SectionDivider label="Medical Conditions *" />
          <div className="flex flex-wrap gap-2">
            {MEDICAL_OPTS.map(o => <Chip key={o} label={o} selected={medical.includes(o)} onClick={() => toggleMedical(o)} />)}
          </div>

          <SectionDivider label="Medications (optional)" />
          <PremiumTextarea
            value={data.medications}
            onChange={v => set('medications', v)}
            placeholder="List any medications you're currently taking that may affect exercise (e.g. beta-blockers, insulin)..."
            rows={2}
          />

          <SectionDivider label="PAR-Q Health Screening *" />
          <div className="p-4 rounded-2xl space-y-4" style={{ background: 'color-mix(in srgb, var(--tc-warning) 5%, transparent)', border: '1px solid color-mix(in srgb, var(--tc-warning) 15%, transparent)' }}>
            <div className="flex gap-2">
              <span className="text-lg flex-shrink-0">❤️</span>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--kc-d4a017)' }}>
                <strong>Has a doctor ever said you have a heart condition, or that you should only do physical activity recommended by a doctor?</strong>
              </p>
            </div>
            <div className="flex gap-3">
              {['Yes', 'No'].map(ans => (
                <motion.button
                  key={ans}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => set('parq_answer', ans)}
                  className="flex-1 py-3 rounded-xl font-bold text-sm transition-all"
                  style={{
                    background: data.parq_answer === ans
                      ? (ans === 'Yes' ? 'color-mix(in srgb, var(--tc-destructive) 12%, transparent)' : 'color-mix(in srgb, var(--tc-success) 10%, transparent)')
                      : 'color-mix(in srgb, white 4%, transparent)',
                    border: data.parq_answer === ans
                      ? (ans === 'Yes' ? '1.5px solid color-mix(in srgb, var(--tc-destructive) 55%, transparent)' : '1.5px solid color-mix(in srgb, var(--tc-success) 55%, transparent)')
                      : '1.5px solid color-mix(in srgb, white 7%, transparent)',
                    color: data.parq_answer === ans ? 'var(--tc-primary-foreground)' : 'var(--kc-4a4a4a)',
                  }}
                >
                  {ans === 'Yes' ? '⚠️ Yes' : '✅ No'}
                </motion.button>
              ))}
            </div>
            {data.parq_answer === 'Yes' && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-xl text-xs leading-relaxed"
                style={{ background: 'color-mix(in srgb, var(--tc-destructive) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--tc-destructive) 20%, transparent)', color: 'var(--tc-destructive)' }}>
                Please ensure you have medical clearance before starting any exercise program. Your coach will review this and may request documentation.
              </motion.div>
            )}
          </div>

          <SectionDivider label="Additional Health Notes" />
          <PremiumTextarea
            value={data.health_notes}
            onChange={v => set('health_notes', v)}
            placeholder="Anything else your coach should know about your health or injury history..."
            rows={3}
          />
        </motion.div>
      </div>
      <CTABtn onClick={onNext} disabled={!valid} />
    </Screen>
  );
}

/* STEP 10: CONSENT */
function ConsentStep({ data, set, onNext, onBack }) {
  const consentChecked = !!data.consent_agreed;

  return (
    <Screen>
      <BackBtn onClick={onBack} />
      <Header eyebrow="Step 10 of 13" headline="Health & coaching agreement." sub="Please read and confirm before continuing." />
      <div className="flex-1 overflow-y-auto px-6 relative z-10">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="space-y-5 max-w-md mx-auto w-full pb-4">

          {/* Disclaimer card */}
          <div className="rounded-2xl p-5 space-y-4" style={{ background: 'color-mix(in srgb, white 3%, transparent)', border: '1px solid color-mix(in srgb, white 7%, transparent)' }}>
            <div className="flex gap-3">
              <span className="text-2xl flex-shrink-0">🛡️</span>
              <div>
                <p className="text-sm font-bold text-white mb-1">Coaching is not medical advice</p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--kc-6a6a6a)' }}>
                  The coaching, training programs, and nutrition guidance provided are for general fitness and wellness purposes only. They do not constitute medical advice, diagnosis, or treatment. Always consult a qualified healthcare professional before starting any exercise or nutrition program, especially if you have any pre-existing health conditions.
                </p>
              </div>
            </div>

            <div className="h-px" style={{ background: 'color-mix(in srgb, white 5%, transparent)' }} />

            <div className="flex gap-3">
              <span className="text-2xl flex-shrink-0">✅</span>
              <div>
                <p className="text-sm font-bold text-white mb-1">Exercise clearance</p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--kc-6a6a6a)' }}>
                  By proceeding, you confirm that you are physically capable of participating in exercise, have disclosed any known medical conditions or limitations above, and are not relying on this coaching as a substitute for professional medical advice.
                </p>
              </div>
            </div>

            <div className="h-px" style={{ background: 'color-mix(in srgb, white 5%, transparent)' }} />

            <div className="flex gap-3">
              <span className="text-2xl flex-shrink-0">🔒</span>
              <div>
                <p className="text-sm font-bold text-white mb-1">Privacy</p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--kc-6a6a6a)' }}>
                  Your personal information and health data are shared only with your coach and will not be sold or shared with third parties.
                </p>
              </div>
            </div>
          </div>

          {/* Consent checkbox */}
          <motion.button
            onClick={() => set('consent_agreed', !consentChecked)}
            whileTap={{ scale: 0.98 }}
            className="w-full flex items-start gap-4 p-5 rounded-2xl text-left transition-all"
            style={{
              background: consentChecked ? 'color-mix(in srgb, var(--tc-success) 7%, transparent)' : 'color-mix(in srgb, white 3%, transparent)',
              border: consentChecked ? '1.5px solid color-mix(in srgb, var(--tc-success) 40%, transparent)' : '1.5px solid color-mix(in srgb, white 10%, transparent)',
            }}
          >
            <div
              className="w-6 h-6 rounded-md flex-shrink-0 flex items-center justify-center mt-0.5 transition-all"
              style={{
                background: consentChecked ? 'var(--tc-success)' : 'transparent',
                border: consentChecked ? '2px solid var(--tc-success)' : '2px solid color-mix(in srgb, white 20%, transparent)',
              }}
            >
              {consentChecked && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <p className="text-sm leading-relaxed" style={{ color: consentChecked ? 'var(--tc-primary-foreground)' : 'var(--kc-7a7a7a)' }}>
              I confirm I am cleared to exercise, I understand that coaching is not medical advice, and I take full responsibility for my own health and safety during this program. <span style={{ color: 'var(--tc-success)' }}>*Required</span>
            </p>
          </motion.button>

          {!consentChecked && (
            <p className="text-xs text-center" style={{ color: 'var(--kc-3a3a3a)' }}>
              You must agree to the above to continue
            </p>
          )}
        </motion.div>
      </div>
      <CTABtn onClick={onNext} disabled={!consentChecked} label="I Agree — Continue" />
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
      <Header eyebrow="Step 11 of 13" headline="Why is this important to you?" sub="This keeps you going when it gets hard. Be honest." />
      <div className="flex-1 overflow-y-auto px-6 relative z-10">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="space-y-6 max-w-md mx-auto w-full pb-4">
          <div className="relative">
            <PremiumTextarea
              value={data.motivation}
              onChange={v => set('motivation', v)}
              placeholder="I want to feel strong, confident, and show up as my best self every single day..."
              rows={6}
            />
            <span className="absolute bottom-3 right-4 text-xs" style={{ color: 'var(--kc-2e2e2e)' }}>
              {(data.motivation || '').length}/500
            </span>
          </div>
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-widest font-bold" style={{ color: 'var(--kc-2e2e2e)' }}>Quick picks</p>
            <div className="flex flex-wrap gap-2">
              {WHY_PROMPTS.map(p => (
                <motion.button
                  key={p}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => append(p)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold transition-all"
                  style={{ background: 'color-mix(in srgb, white 4%, transparent)', border: '1px solid color-mix(in srgb, white 7%, transparent)', color: 'var(--kc-5a5a5a)' }}
                >
                  {p}
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
      <CTABtn onClick={onNext} disabled={!valid} />
    </Screen>
  );
}

/* STEP 12: OBSTACLES */
const OBSTACLE_OPTS = [
  { id: 'consistency', emoji: '🔄', label: 'Consistency' },
  { id: 'motivation', emoji: '😴', label: 'Motivation' },
  { id: 'nutrition', emoji: '🍕', label: 'Nutrition' },
  { id: 'time', emoji: '⏰', label: 'Time' },
  { id: 'stress', emoji: '😤', label: 'Stress' },
  { id: 'gym_anxiety', emoji: '😰', label: 'Gym Anxiety' },
  { id: 'travel', emoji: '✈️', label: 'Travel' },
  { id: 'discipline', emoji: '🧠', label: 'Discipline' },
  { id: 'recovery', emoji: '💤', label: 'Recovery' },
  { id: 'social', emoji: '🍻', label: 'Social Events' },
  { id: 'injury', emoji: '🩹', label: 'Injuries' },
];

function ObstaclesStep({ data, set, onNext, onBack }) {
  const selected = data.obstacles || [];
  const toggle = id => set('obstacles', selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
  return (
    <Screen>
      <BackBtn onClick={onBack} />
      <Header eyebrow="Step 12 of 13" headline="What usually holds you back?" sub="Your coach will build a plan to overcome these." />
      <div className="flex-1 overflow-y-auto px-6 relative z-10">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="space-y-5 max-w-md mx-auto w-full pb-4">
          <div className="grid grid-cols-2 gap-2.5">
            {OBSTACLE_OPTS.map((o, i) => (
              <motion.button
                key={o.id}
                whileTap={{ scale: 0.94 }}
                onClick={() => toggle(o.id)}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="py-4 px-4 rounded-2xl text-left transition-all"
                style={{
                  background: selected.includes(o.id) ? 'color-mix(in srgb, var(--tc-primary) 10%, transparent)' : 'color-mix(in srgb, white 3%, transparent)',
                  border: selected.includes(o.id) ? '1.5px solid color-mix(in srgb, var(--tc-primary) 55%, transparent)' : '1.5px solid color-mix(in srgb, white 7%, transparent)',
                  boxShadow: selected.includes(o.id) ? '0 0 18px color-mix(in srgb, var(--tc-primary) 12%, transparent)' : 'none',
                }}
              >
                <div className="text-xl mb-1.5">{o.emoji}</div>
                <p className="text-sm font-semibold" style={{ color: selected.includes(o.id) ? 'var(--tc-primary-foreground)' : 'var(--kc-7a7a7a)' }}>{o.label}</p>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>
      <CTABtn onClick={onNext} disabled={selected.length === 0} />
    </Screen>
  );
}

/* STEP 13: COMMITMENT + ANYTHING ELSE */
const COMMIT_LEVELS = [
  { value: 3, emoji: '🌱', label: 'Casual', sub: "I'll try when I can" },
  { value: 6, emoji: '💪', label: 'Motivated', sub: 'Ready to put in real effort' },
  { value: 8, emoji: '🔥', label: 'Serious', sub: "I'm all in, let's go" },
  { value: 10, emoji: '⚡', label: 'Elite', sub: 'Nothing will stop me' },
];

function CommitmentStep({ data, set, onNext, onBack }) {
  const level = data.commitment_level || 0;
  return (
    <Screen>
      <BackBtn onClick={onBack} />
      <Header eyebrow="Step 13 of 13" headline="Almost done — final questions." sub="Be honest — there's no wrong answer." />
      <div className="flex-1 overflow-y-auto px-6 relative z-10">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="space-y-6 max-w-md mx-auto w-full pb-4">

          <div className="space-y-3">
            <p className="text-sm font-semibold text-white">How committed are you to changing?</p>
            <div className="grid grid-cols-2 gap-3">
              {COMMIT_LEVELS.map((c, i) => {
                const sel = level === c.value;
                return (
                  <motion.button
                    key={c.value}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => set('commitment_level', c.value)}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.07 }}
                    className="py-6 px-4 rounded-2xl text-center transition-all"
                    style={{
                      background: sel ? 'color-mix(in srgb, var(--tc-primary) 10%, transparent)' : 'color-mix(in srgb, white 3%, transparent)',
                      border: sel ? '1.5px solid color-mix(in srgb, var(--tc-primary) 55%, transparent)' : '1.5px solid color-mix(in srgb, white 7%, transparent)',
                      boxShadow: sel ? '0 0 30px color-mix(in srgb, var(--tc-primary) 18%, transparent)' : 'none',
                      transform: sel ? 'scale(1.03)' : 'scale(1)',
                    }}
                  >
                    <div className="text-3xl mb-2">{c.emoji}</div>
                    <p className="font-bold text-sm" style={{ color: sel ? 'var(--tc-primary-foreground)' : 'var(--kc-9a9a9a)' }}>{c.label}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--kc-4a4a4a)' }}>{c.sub}</p>
                  </motion.button>
                );
              })}
            </div>
          </div>

          <div className="py-3 px-5 rounded-2xl text-center space-y-1"
            style={{ background: 'color-mix(in srgb, var(--tc-primary) 5%, transparent)', border: '1px solid color-mix(in srgb, var(--tc-primary) 10%, transparent)' }}>
            <p className="text-xs" style={{ color: 'var(--kc-5a5a5a)' }}>
              Your coach uses this to calibrate your plan intensity and accountability level.
            </p>
          </div>

          <SectionDivider label="Anything else your coach should know?" />
          <PremiumTextarea
            value={data.anything_else}
            onChange={v => set('anything_else', v)}
            placeholder="Is there anything important we haven't covered? Upcoming events, special circumstances, past coaching experiences, specific requests for your coach..."
            rows={5}
          />
        </motion.div>
      </div>
      <CTABtn onClick={onNext} disabled={!level} label="Build My Coaching Plan →" />
    </Screen>
  );
}

/* AI GENERATION */
const GEN_ITEMS = [
  { label: 'Training Profile',       icon: '🏋️', activateAt: 0.5 },
  { label: 'Equipment & Access',     icon: '🏠', activateAt: 1.0 },
  { label: 'Nutrition Preferences',  icon: '🥗', activateAt: 1.6 },
  { label: 'Recovery Targets',       icon: '⚡', activateAt: 2.2 },
  { label: 'Health & Safety Notes',  icon: '🛡️', activateAt: 2.8 },
  { label: 'Obstacle Response Plan', icon: '🔄', activateAt: 3.4 },
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
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: status === 'waiting' ? 0.18 : 1, x: 0 }}
      transition={{ delay: item.activateAt * 0.3, duration: 0.4 }}
      className="flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-500"
      style={{
        background: status === 'done' ? 'color-mix(in srgb, var(--tc-success) 6%, transparent)' : status === 'loading' ? 'color-mix(in srgb, var(--tc-primary) 7%, transparent)' : 'color-mix(in srgb, white 2%, transparent)',
        border: status === 'done' ? '1px solid color-mix(in srgb, var(--tc-success) 22%, transparent)' : status === 'loading' ? '1px solid color-mix(in srgb, var(--tc-primary) 28%, transparent)' : '1px solid color-mix(in srgb, white 4%, transparent)',
      }}
    >
      <span className="text-xl">{item.icon}</span>
      <div className="flex-1">
        <p className="text-sm font-semibold" style={{ color: status === 'waiting' ? 'var(--kc-2e2e2e)' : 'var(--tc-primary-foreground)' }}>{item.label}</p>
        <p className="text-[11px] mt-0.5" style={{
          color: status === 'done' ? 'color-mix(in srgb, var(--tc-success) 80%, transparent)' : status === 'loading' ? 'color-mix(in srgb, var(--tc-primary) 80%, transparent)' : 'var(--kc-2e2e2e)',
        }}>
          {status === 'done' ? 'Personalized' : status === 'loading' ? 'Analyzing…' : 'Queued'}
        </p>
      </div>
      <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
        {status === 'loading' && (
          <motion.div className="w-4 h-4 rounded-full border-2"
            style={{ borderColor: 'var(--tc-primary)', borderTopColor: 'transparent' }}
            animate={{ rotate: 360 }} transition={{ duration: 0.65, repeat: Infinity, ease: 'linear' }} />
        )}
        {status === 'done' && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 320, damping: 18 }}
            className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'var(--tc-success)' }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 5L4 7L8 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.div>
        )}
      </div>
    </motion.div>
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
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <motion.div
          className="w-[800px] h-[800px] rounded-full"
          style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--tc-primary) 8%, transparent) 0%, transparent 65%)', filter: 'blur(80px)' }}
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
      <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full px-6 gap-7 relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-2">
          <p className="text-[11px] uppercase tracking-[0.26em] font-bold" style={{ color: 'var(--tc-primary)' }}>KOACH AI Engine</p>
          <AnimatePresence mode="wait">
            {allDone ? (
              <motion.h2 key="done" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="text-3xl font-bold" style={{ color: 'var(--tc-success)', letterSpacing: '-0.025em' }}>
                Your profile is ready.
              </motion.h2>
            ) : (
              <motion.h2 key="building" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="text-3xl font-bold text-white" style={{ letterSpacing: '-0.025em' }}>
                Personalizing your<br />coaching experience…
              </motion.h2>
            )}
          </AnimatePresence>
          <p className="text-sm" style={{ color: 'var(--kc-5a5a5a)' }}>
            {allDone ? 'Sending to your coach…' : 'Analyzing your profile for your coach'}
          </p>
        </motion.div>

        <div className="w-full h-[2px] rounded-full overflow-hidden" style={{ background: 'color-mix(in srgb, white 5%, transparent)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, var(--tc-primary), var(--tc-primary))' }}
            animate={{ width: allDone ? '100%' : `${(GEN_ITEMS.length / GEN_ITEMS.length) * 85}%` }}
            initial={{ width: '0%' }}
            transition={{ duration: lastAt * 0.9 }}
          />
        </div>

        <div className="space-y-2">
          {GEN_ITEMS.map((item, i) => <GenItemCard key={i} item={item} />)}
        </div>

        {/* Error state — shown instead of success when submission fails */}
        {submitStatus === 'error' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full space-y-3"
          >
            <div className="p-5 rounded-2xl space-y-3"
              style={{ background: 'color-mix(in srgb, var(--tc-destructive) 7%, transparent)', border: '1px solid color-mix(in srgb, var(--tc-destructive) 30%, transparent)' }}>
              <p className="text-sm font-bold text-center" style={{ color: 'var(--tc-destructive)' }}>⚠️ Submission Failed</p>
              <div className="rounded-xl p-3 text-left"
                style={{ background: 'color-mix(in srgb, black 30%, transparent)', border: '1px solid color-mix(in srgb, var(--tc-destructive) 20%, transparent)' }}>
                <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--kc-6a6a6a)' }}>Error details</p>
                <p className="text-xs leading-relaxed break-words" style={{ color: 'var(--tc-destructive)', fontFamily: 'monospace' }}>
                  {submitError || 'Unknown error — no message received.'}
                </p>
              </div>
              <p className="text-xs text-center" style={{ color: 'var(--kc-6a6a6a)' }}>
                Your answers are saved in this browser session. Tap Try Again to resubmit.
              </p>
              <button
                onClick={onRetry}
                className="w-full py-3 rounded-xl font-bold text-sm text-primary-foreground"
                style={{ background: 'linear-gradient(135deg, var(--tc-primary), var(--tc-primary))' }}
              >
                Try Again
              </button>
            </div>
          </motion.div>
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
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
        <motion.div
          className="flex flex-col items-center gap-8 text-center w-full max-w-sm"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12 } } }}
        >
          <motion.div
            variants={{ hidden: { scale: 0, opacity: 0 }, show: { scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 200, delay: 0.1 } } }}
            className="w-24 h-24 rounded-3xl flex items-center justify-center"
            style={{ background: 'color-mix(in srgb, var(--tc-success) 10%, transparent)', border: '2px solid color-mix(in srgb, var(--tc-success) 30%, transparent)' }}
          >
            <svg width="42" height="42" viewBox="0 0 42 42" fill="none">
              <path d="M9 21L17 29L33 13" stroke="var(--tc-success)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.div>

          <motion.div variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } }} className="space-y-3">
            <p className="text-xs uppercase tracking-[0.22em] font-bold" style={{ color: 'var(--tc-success)' }}>Application received</p>
            <h2 className="font-bold text-white" style={{ fontSize: 'clamp(2rem, 7vw, 2.8rem)', letterSpacing: '-0.03em' }}>
              Thanks, {name} —<br />your application<br />is in. ✅
            </h2>
            <p className="text-base leading-relaxed" style={{ color: 'var(--kc-6a6a6a)' }}>
              {coach} will review your intake and reach out shortly to get you started.
            </p>
            {clientEmail && (
              <p className="text-sm" style={{ color: 'var(--kc-4a4a4a)' }}>
                A confirmation has been sent to <span style={{ color: 'var(--kc-6a6a6a)' }}>{clientEmail}</span>
              </p>
            )}
          </motion.div>

          <motion.div
            variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
            className="w-full space-y-3"
          >
            <div className="py-5 px-5 rounded-2xl space-y-3"
              style={{ background: 'color-mix(in srgb, var(--tc-primary) 6%, transparent)', border: '1.5px solid color-mix(in srgb, var(--tc-primary) 15%, transparent)' }}>
              <p className="font-bold text-white text-sm">What happens next?</p>
              {[
                `${coach} reviews your full intake profile`,
                'Your personalised training & nutrition plan gets built',
                "You'll be contacted within 24 hours to get started",
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: 'color-mix(in srgb, var(--tc-primary) 15%, transparent)', border: '1px solid color-mix(in srgb, var(--tc-primary) 30%, transparent)' }}>
                    <span className="text-[9px] font-bold" style={{ color: 'var(--tc-primary)' }}>{i + 1}</span>
                  </div>
                  <p className="text-sm text-left" style={{ color: 'var(--kc-7a7a7a)' }}>{step}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-center gap-2 py-2">
              {['Exclusive', 'Personalised', 'Elite-Grade'].map(t => (
                <span key={t} className="px-3 py-1 rounded-full text-xs font-semibold"
                  style={{ background: 'color-mix(in srgb, var(--tc-success) 8%, transparent)', color: 'var(--tc-success)', border: '1px solid color-mix(in srgb, var(--tc-success) 20%, transparent)' }}>
                  {t}
                </span>
              ))}
            </div>
          </motion.div>
        </motion.div>
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
  const progress = showProgress ? (progressIdx + 1) / PROGRESS_STEPS.length : 0;

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
        const errMsg = res?.data?.error || res?.data?.message || JSON.stringify(res?.data) || 'Submission failed — no success confirmation received.';
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

  const variants = {
    enter: dir => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: dir => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
  };
  const transition = { type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.38 };

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
    <div className="fixed inset-0 overflow-hidden" style={{ background: 'var(--tc-sidebar)' }}>
      {showProgress && (
        <div className="absolute top-0 left-0 right-0 z-50 h-[2px]" style={{ background: 'color-mix(in srgb, white 5%, transparent)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, var(--tc-primary), var(--tc-primary))' }}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.45, ease: 'easeInOut' }}
          />
        </div>
      )}

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
  );
}