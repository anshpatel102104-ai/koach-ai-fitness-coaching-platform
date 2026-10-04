import React, { useState, useEffect, useRef } from 'react';
import { getMealImageUrl } from '@/lib/foodImages';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, ChevronLeft, ChevronRight, RotateCcw, Check, Flame, Zap, Leaf,
  Dumbbell, Scale, UtensilsCrossed, Pill, FileText, ChevronDown, Copy, ClipboardCheck,
  UserPlus,
} from 'lucide-react';
import Step4Assign from './Step4Assign';
import MacroSplitControl from './MacroSplitControl';
import { db } from '@/api/supabaseClient';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

// ── Constants ─────────────────────────────────────────────────────────────────
const GOALS = [
  { id: 'fat_loss',    emoji: '🔥', icon: Flame,    label: 'Fat Loss',    desc: 'Caloric deficit with high protein' },
  { id: 'muscle_gain', emoji: '💪', icon: Dumbbell, label: 'Muscle Gain', desc: 'Caloric surplus, strength focus' },
  { id: 'recomp',      emoji: '⚖️', icon: Scale,    label: 'Recomposition',desc: 'Lose fat, gain muscle simultaneously' },
  { id: 'performance', emoji: '⚡', icon: Zap,      label: 'Performance', desc: 'Fuel for training and recovery' },
  { id: 'maintenance', emoji: '🌿', icon: Leaf,     label: 'Maintenance', desc: 'Balanced macros, sustainable eating' },
];

const GOAL_SUBTYPES = {
  fat_loss:    ['Aggressive (-1000 cal)', 'Moderate (-500 cal)', 'Conservative (-250 cal)'],
  muscle_gain: ['Lean Bulk (+250 cal)', 'Aggressive Bulk (+500 cal)'],
  recomp:      ['Maintenance Calories'],
  performance: ['Athletic Performance'],
  maintenance: ['Maintenance'],
};

const BODY_TYPES = [
  { id: 'ectomorph', emoji: '🏃', label: 'Ectomorph',    desc: 'Lean, fast metabolism, hard to gain' },
  { id: 'mesomorph', emoji: '💪', label: 'Mesomorph',    desc: 'Athletic, gains/loses easily' },
  { id: 'endomorph', emoji: '🏋️', label: 'Endomorph',   desc: 'Slower metabolism, gains fat easily' },
  { id: 'ecto_meso', emoji: '🤸', label: 'Ecto-Meso',   desc: 'Naturally lean but can build muscle' },
  { id: 'endo_meso', emoji: '🏊', label: 'Endo-Meso',   desc: 'Athletic but tends to hold fat' },
];

const OCCUPATION_TYPES = [
  { value: 'desk_job',      label: '🖥️ Desk Job / Office' },
  { value: 'active_job',    label: '🚶 Active Job (standing/walking)' },
  { value: 'physical_labor',label: '🔨 Physical Labor / Trades' },
  { value: 'shift_worker',  label: '🌙 Shift Worker (irregular hours)' },
  { value: 'stay_home',     label: '🏠 Stay at Home Parent' },
  { value: 'student',       label: '📚 Student' },
  { value: 'athlete',       label: '🏅 Athlete / Full Time Training' },
];

const TRAINING_TIMES = ['Early Morning (before 8am)', 'Morning (8-11am)', 'Midday (11am-2pm)', 'Afternoon (2-5pm)', 'Evening (5-8pm)', 'Late Night (after 8pm)'];
const TRAINING_TYPES = ['Weight Training', 'Cardio Only', 'Weights + Cardio', 'CrossFit / HIIT', 'Athletic / Sport', 'Hybrid (weights + running)'];
const TRAINING_DURATIONS = ['30 min', '45 min', '60 min', '90 min+'];
const TRAINING_INTENSITIES = ['Light', 'Moderate', 'High', 'Very High'];
const COOKING_TIMES = [
  { value: 'under_15', label: 'Under 15 min' },
  { value: '15_30',    label: '15-30 min' },
  { value: '30_60',    label: '30-60 min' },
  { value: 'over_60',  label: 'Over 60 min' },
];
const CULTURAL_PREFS = ['No Preference', 'American', 'Latin / Caribbean', 'Mediterranean', 'Asian', 'African', 'Middle Eastern', 'Indian'];
const CULTURAL_PREF_VALUES = {
  'No Preference': null, 'American': 'american', 'Latin / Caribbean': 'latin_caribbean',
  'Mediterranean': 'mediterranean', 'Asian': 'asian', 'African': 'african',
  'Middle Eastern': 'middle_eastern', 'Indian': 'indian',
};
const TIMELINES = ['4 weeks', '8 weeks', '12 weeks', '6 months', 'Ongoing'];
const HUNGER_LEVELS = [
  { value: 'always_hungry', label: '🔥 Always Hungry' },
  { value: 'normal',        label: '😊 Normal' },
  { value: 'low_appetite',  label: '🙂 Low Appetite' },
];
const TRAVEL_FREQ = ['Never', 'Occasionally', 'Frequently', 'Always Traveling'];
const EATING_OUT_FREQ = ['Never', '1-2x week', '3-4x week', 'Daily'];

const ACTIVITY_LEVELS = [
  { value: 'sedentary',         label: 'Sedentary',         multiplier: 1.0 },
  { value: 'lightly_active',    label: 'Lightly Active',    multiplier: 1.1 },
  { value: 'moderately_active', label: 'Moderately Active', multiplier: 1.2 },
  { value: 'very_active',       label: 'Very Active',       multiplier: 1.3 },
  { value: 'athlete',           label: 'Athlete',           multiplier: 1.4 },
];

const DIET_PREFS = ['Standard', 'High Protein', 'Vegetarian', 'Vegan', 'Keto', 'Paleo', 'Mediterranean'];
const WORKOUT_TYPES = ['Weightlifting', 'HIIT', 'Cardio', 'CrossFit', 'Sports', 'Yoga/Pilates', 'Mixed'];
const ALLERGIES = ['Gluten Free', 'Dairy Free', 'Nut Free', 'Egg Free', 'Soy Free', 'Shellfish Free'];
const SUPPLEMENTS = ['Whey Protein', 'Creatine', 'Pre-Workout', 'BCAAs', 'Fish Oil', 'Vitamin D', 'Magnesium', 'Multivitamin', 'Caffeine', 'Collagen', 'None'];

const SUPPLEMENT_DEFAULTS = {
  'Whey Protein':  { dosage: '25-30g per serving, post-workout',            timing: 'Post-Workout', emoji: '🥛' },
  'Creatine':      { dosage: '5g daily, any time',                           timing: 'Morning',      emoji: '💪' },
  'Pre-Workout':   { dosage: '1 scoop, 20-30 min before training',           timing: 'Pre-Workout',  emoji: '⚡' },
  'BCAAs':         { dosage: '5-10g during or post-workout',                 timing: 'Post-Workout', emoji: '🔋' },
  'Fish Oil':      { dosage: '1-2g EPA/DHA daily, with meals',               timing: 'With Meals',   emoji: '🐟' },
  'Vitamin D':     { dosage: '2000-5000 IU daily, with fat-containing meal', timing: 'With Meals',   emoji: '☀️' },
  'Magnesium':     { dosage: '300-400mg daily, before bed',                  timing: 'Before Bed',   emoji: '😴' },
  'Multivitamin':  { dosage: '1 serving daily, with breakfast',              timing: 'Morning',      emoji: '💊' },
  'Caffeine':      { dosage: '100-200mg, 30-45 min pre-workout',             timing: 'Pre-Workout',  emoji: '☕' },
  'Collagen':      { dosage: '10-15g daily, with vitamin C source',          timing: 'Morning',      emoji: '✨' },
};

const SUPPLEMENT_GOAL_REASONS = {
  fat_loss: {
    'Whey Protein': 'Preserve muscle mass during caloric deficit',
    'Fish Oil':     'Reduce inflammation, support fat metabolism',
    'Caffeine':     'Boost metabolic rate and training performance',
    'Vitamin D':    'Support hormone balance and immune function',
    'Creatine':     'Maintain strength output while in a deficit',
    'Magnesium':    'Reduce cortisol and support quality sleep',
    'Multivitamin': 'Fill micronutrient gaps from reduced food intake',
    'BCAAs':        'Minimize muscle catabolism during fasted training',
    'Pre-Workout':  'Increase calorie burn and workout intensity',
    'Collagen':     'Support joint health during increased activity',
  },
  muscle_gain: {
    'Creatine':     'Increase strength output and muscle cell volume',
    'Whey Protein': 'Fast-absorbing protein to maximize muscle protein synthesis',
    'Magnesium':    'Support recovery and sleep quality for muscle repair',
    'BCAAs':        'Stimulate muscle protein synthesis between meals',
    'Pre-Workout':  'Drive heavier lifts and greater training volume',
    'Fish Oil':     'Reduce inflammation and support anabolic signaling',
    'Multivitamin': 'Ensure micronutrient sufficiency for growth',
    'Caffeine':     'Improve performance and reduce perceived exertion',
    'Vitamin D':    'Support testosterone levels and muscle function',
    'Collagen':     'Strengthen connective tissue to support heavier loads',
  },
  performance: {
    'Pre-Workout':  'Enhance focus, pump and endurance during training',
    'BCAAs':        'Reduce muscle breakdown during intense training',
    'Creatine':     'Improve power output and training capacity',
    'Caffeine':     'Delay fatigue and sharpen mental focus',
    'Fish Oil':     'Reduce exercise-induced inflammation and DOMS',
    'Magnesium':    'Prevent cramping and support energy metabolism',
    'Whey Protein': 'Accelerate post-training muscle repair',
    'Vitamin D':    'Optimize neuromuscular function and VO2 max',
    'Multivitamin': 'Support high training demands on micronutrients',
    'Collagen':     'Protect joints and tendons under high load',
  },
  maintenance: {
    'Whey Protein': 'Meet daily protein targets conveniently',
    'Fish Oil':     'Support cardiovascular health and longevity',
    'Magnesium':    'Promote relaxation and overall wellbeing',
    'Multivitamin': 'Fill daily micronutrient gaps from diet',
    'Vitamin D':    'Maintain bone density and immune resilience',
    'Creatine':     'Preserve strength and cognitive function',
    'Collagen':     'Support skin, hair and joint health',
    'Caffeine':     'Sustain training energy and motivation',
    'BCAAs':        'Support lean mass retention',
    'Pre-Workout':  'Keep training sessions focused and productive',
  },
};

const MEAL_COMPLEXITY = [
  { id: 'very_basic', emoji: '🥫', label: 'Very Basic',  desc: 'Simple whole foods, minimal cooking', color: 'gray' },
  { id: 'simple',     emoji: '🍳', label: 'Simple',      desc: 'Easy recipes, 15 min or less',        color: 'gray' },
  { id: 'moderate',   emoji: '🥘', label: 'Moderate',    desc: 'Balanced home cooking',                color: 'blue', popular: true },
  { id: 'upscale',    emoji: '👨‍🍳', label: 'Upscale',    desc: 'Restaurant-quality meals',            color: 'amber' },
  { id: 'gourmet',    emoji: '⭐', label: 'Gourmet',     desc: 'Complex recipes, premium ingredients', color: 'purple' },
];

const CONDIMENTS = [
  { id: 'hot_sauce',       emoji: '🌶️', label: 'Hot Sauce',        kcal: '0–5 kcal' },
  { id: 'lemon_lime',      emoji: '🍋', label: 'Lemon/Lime',        kcal: '5 kcal' },
  { id: 'fresh_herbs',     emoji: '🌿', label: 'Fresh Herbs',        kcal: '0 kcal' },
  { id: 'garlic_onion',    emoji: '🧄', label: 'Garlic & Onion',    kcal: '10 kcal' },
  { id: 'mustard',         emoji: '🥣', label: 'Mustard',            kcal: '5 kcal' },
  { id: 'soy_sauce',       emoji: '🍶', label: 'Soy Sauce',          kcal: '10 kcal' },
  { id: 'salsa',           emoji: '🫙', label: 'Salsa',              kcal: '15 kcal' },
  { id: 'sf_bbq',          emoji: '🥫', label: 'Sugar-Free BBQ',    kcal: '15 kcal' },
  { id: 'spice_blends',    emoji: '🧂', label: 'Spice Blends',       kcal: '0 kcal' },
  { id: 'balsamic',        emoji: '🍯', label: 'Balsamic Glaze',     kcal: '20 kcal' },
  { id: 'greek_yogurt',    emoji: '🥛', label: 'Greek Yogurt Sauce', kcal: '20 kcal' },
  { id: 'olive_spray',     emoji: '🫒', label: 'Olive Oil Spray',    kcal: '10 kcal' },
];
const LOADING_MESSAGES = ['Analyzing client profile...', 'Calculating TDEE & BMR...', 'Applying body type adjustments...', 'Building training day meals...', 'Building rest day meals...', '🤖 AI nutritionist at work...', 'Timing meals around training schedule...', 'Adding culturally relevant foods...', 'Generating Option B & C swaps...', 'Writing coach notes...', 'Finalizing your plan...'];

const INITIAL_DETAILS = {
  weight: '', weightUnit: 'lbs',
  heightFeet: '', heightInches: '',
  age: '', sex: 'male',
  bodyFatPct: '', bodyType: '',
  goalSubtype: '', goalWeight: '', timeline: 'Ongoing',
  activity: '', trainingDays: 4,
  trainingTime: '', trainingType: '', trainingDuration: '60 min', trainingIntensity: 'Moderate',
  workoutTime: 'Morning', workoutTypes: [],
  mealsPerDay: 4, preWorkout: true, preWorkoutTiming: '1hr', preWorkoutCarbs: true,
  postWorkout: true, mealPrepStyle: 'Mix',
  occupationType: '', wakeTime: '7:00 AM', sleepTime: '10:00 PM',
  workHours: '9am-5pm', hasLunchBreak: true, canMealPrep: 'Sometimes',
  cookingTimePerDay: '30_60', hasKitchenAtWork: false, travelFrequency: 'Never',
  diet: '', allergies: [], dislikedFoods: '', lovedFoods: '',
  culturalPreference: 'No Preference', cookingSkill: 'Intermediate',
  eatingOutFrequency: '1-2x week', fastFoodNeeded: false, favoriteFastFood: '',
  digestiveIssues: '', hungerLevel: 'normal',
  energyCrashes: false, sleepQuality: 'Average',
  supplements: [], supplementDosages: {}, notes: '',
  weightLossRate: 1,
  mealComplexity: 'moderate',
  condiments: [],
};

const WEIGHT_LOSS_RATES = [
  { value: 0.25, label: '0.25 lbs/wk', desc: 'Very Gradual',     color: 'green',  badgeColor: 'bg-success/10 text-success border-success' },
  { value: 0.5,  label: '0.5 lbs/wk',  desc: 'Slow & Steady',    color: 'green',  badgeColor: 'bg-success/10 text-success border-success' },
  { value: 1,    label: '1 lb/wk',     desc: 'Moderate',          color: 'blue',   badgeColor: 'bg-accent text-primary border-primary',   recommended: true },
  { value: 1.5,  label: '1.5 lbs/wk',  desc: 'Aggressive',        color: 'amber',  badgeColor: 'bg-warning/10 text-warning border-warning' },
  { value: 2,    label: '2 lbs/wk',    desc: 'Very Aggressive',   color: 'red',    badgeColor: 'bg-destructive/10 text-destructive border-destructive',       warning: true },
];

// ── Macro calculation ─────────────────────────────────────────────────────────
const ACTIVITY_MULTIPLIERS = {
  sedentary:         1.2,
  lightly_active:    1.375,
  moderately_active: 1.55,
  very_active:       1.725,
  athlete:           1.9,
};

const MIN_CALORIES = { male: 1500, female: 1200 };

function calcMacros(goal, weightKg, heightCm, age, sex, activityValue, diet, weightLossRate = 1, bodyType = 'mesomorph', goalSubtype = '') {
  // Step 1 — BMR (Mifflin-St Jeor)
  const base = (10 * weightKg) + (6.25 * heightCm) - (5 * (parseFloat(age) || 25));
  const bmr = sex === 'female' ? base - 161 : base + 5;

  // Step 2 — TDEE
  const multiplier = ACTIVITY_MULTIPLIERS[activityValue] || 1.2;
  const tdee = bmr * multiplier;

  // Step 3 — Goal adjustment (with goalSubtype support)
  let calories;
  let dailyDeficit = 0;
  let deficitCapped = false;

  if (goal === 'fat_loss') {
    // goalSubtype overrides weightLossRate for deficit
    let deficit = 500; // default moderate
    if (goalSubtype?.includes('1000')) deficit = 1000;
    else if (goalSubtype?.includes('250')) deficit = 250;
    else deficit = weightLossRate * 500;
    dailyDeficit = deficit;
    const minCal = MIN_CALORIES[sex] || 1500;
    const uncapped = tdee - dailyDeficit;
    calories = uncapped < minCal ? (deficitCapped = true, minCal) : uncapped;
  } else if (goal === 'recomp') {
    calories = tdee; // maintenance
  } else {
    const surplusMap = { 'Lean Bulk (+250 cal)': 250, 'Aggressive Bulk (+500 cal)': 500 };
    const surplus = surplusMap[goalSubtype] || 0;
    const baseMultipliers = { muscle_gain: 1.08, performance: 1.05, maintenance: 1.00 };
    calories = tdee * (baseMultipliers[goal] || 1.0) + surplus;
  }

  // Step 3b — Body type calorie adjustment
  const bodyTypeAdj = { ectomorph: 1.05, mesomorph: 1.0, endomorph: 0.95, ecto_meso: 1.02, endo_meso: 0.97 };
  calories *= (bodyTypeAdj[bodyType] || 1.0);

  // Step 4 — Macros (adjusted for body type)
  const proteinRatios = { fat_loss: 2.2, muscle_gain: 2.0, recomp: 2.4, performance: 1.8, maintenance: 1.6 };
  const fatRatios     = { fat_loss: 0.8, muscle_gain: 1.0, recomp: 0.85, performance: 0.9, maintenance: 0.9 };
  let protein = weightKg * (proteinRatios[goal] || 1.8);
  let fats    = weightKg * (fatRatios[goal]    || 0.9);

  // Body type macro adjustments
  if (bodyType === 'ectomorph')  { fats = Math.max(fats * 0.85, weightKg * 0.7); } // more carbs
  if (bodyType === 'endomorph')  { fats = fats * 1.1; }                             // lower carbs, slightly more fat
  if (bodyType === 'recomp')     { protein = protein * 1.1; }

  // Diet overrides
  if (diet === 'Keto')         { fats = weightKg * 1.8; }
  if (diet === 'High Protein') { protein = weightKg * 2.8; }

  let carbs = (calories - protein * 4 - fats * 9) / 4;

  // Step 5 — Sanity check
  if (carbs < 50) { carbs = 50; calories = protein * 4 + fats * 9 + carbs * 4; }

  return {
    bmr:           Math.round(bmr),
    tdee:          Math.round(tdee),
    calories:      Math.round(calories),
    protein:       Math.round(protein),
    carbs:         Math.round(carbs),
    fats:          Math.round(fats),
    dailyDeficit,
    deficitCapped,
  };
}

// ── Small helpers ─────────────────────────────────────────────────────────────
function PillToggle({ options, value, onChange, multi = false }) {
  function handleClick(opt) {
    if (multi) {
      onChange(value.includes(opt) ? value.filter(v => v !== opt) : [...value, opt]);
    } else {
      onChange(opt);
    }
  }
  const isActive = (opt) => multi ? value.includes(opt) : value === opt;
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => handleClick(opt)}
          className={cn(
            'px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
            isActive(opt) ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function UnitToggle({ options, value, onChange }) {
  return (
    <div className="flex border border-input rounded-lg overflow-hidden text-xs font-semibold h-9 shrink-0">
      {options.map(u => (
        <button key={u} type="button" onClick={() => onChange(u)}
          className={cn('px-3 transition-colors', value === u ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-secondary')}
        >
          {u}
        </button>
      ))}
    </div>
  );
}

function YesNoToggle({ value, onChange }) {
  return (
    <div className="flex border border-input rounded-lg overflow-hidden text-xs font-semibold h-8 w-20 shrink-0">
      {[true, false].map(v => (
        <button key={String(v)} type="button" onClick={() => onChange(v)}
          className={cn('flex-1 transition-colors', value === v ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-secondary')}
        >
          {v ? 'Yes' : 'No'}
        </button>
      ))}
    </div>
  );
}

// ── Accordion Section ─────────────────────────────────────────────────────────
function AccordionSection({ icon: Icon, title, complete, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2.5 px-4 py-3 bg-card hover:bg-secondary/30 transition-colors text-left"
      >
        <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0', complete ? 'bg-success/10' : 'bg-secondary')}>
          {complete ? <Check className="w-3.5 h-3.5 text-success" /> : <Icon className="w-3.5 h-3.5 text-muted-foreground" />}
        </div>
        <span className="text-sm font-bold flex-1">{title}</span>
        {complete && <span className="text-[10px] font-semibold text-success bg-success/10 px-2 py-0.5 rounded-full">Done</span>}
        <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 py-4 border-t border-border space-y-4 bg-background">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Step dots ─────────────────────────────────────────────────────────────────
function StepDots({ current, total }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={cn('rounded-full transition-all duration-300', i === current ? 'w-6 h-2 bg-primary' : 'w-2 h-2 bg-border')} />
      ))}
    </div>
  );
}

const slideVariants = {
  enter:  (dir) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:   (dir) => ({ x: dir > 0 ? -40 : 40, opacity: 0 }),
};

// ── Weight Loss Rate Selector ─────────────────────────────────────────────────
function WeightLossRateSelector({ value, onChange }) {
  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap gap-2">
        {WEIGHT_LOSS_RATES.map(rate => (
          <button
            key={rate.value}
            type="button"
            onClick={() => onChange(rate.value)}
            className={cn(
              'relative flex flex-col items-start px-3 py-2 rounded-xl border-2 text-left transition-all text-xs',
              value === rate.value
                ? rate.color === 'green'  ? 'border-success bg-success/10'
                : rate.color === 'blue'   ? 'border-primary bg-accent'
                : rate.color === 'amber'  ? 'border-warning bg-warning/10'
                : 'border-destructive bg-destructive/10'
                : 'border-border bg-background hover:border-muted-foreground/40'
            )}
          >
            <div className="flex items-center gap-1.5">
              <span className={cn('font-bold', value === rate.value
                ? rate.color === 'green'  ? 'text-success'
                : rate.color === 'blue'   ? 'text-primary'
                : rate.color === 'amber'  ? 'text-warning'
                : 'text-destructive'
                : 'text-foreground'
              )}>
                {rate.label}
              </span>
              {rate.warning && <span className="text-xs">⚠️</span>}
            </div>
            <span className="text-[10px] text-muted-foreground mt-0.5">{rate.desc}</span>
            {rate.recommended && (
              <span className="absolute -top-2 -right-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">
                Recommended
              </span>
            )}
          </button>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground bg-secondary/50 px-2.5 py-1.5 rounded-lg">
        1 lb of fat = ~3,500 calories. Higher deficits risk muscle loss.
      </p>
    </div>
  );
}

// ── Step 1 — Goal ─────────────────────────────────────────────────────────────
function Step1Goal({ goal, setGoal, details, setDetails }) {
  const u = (k, v) => setDetails(d => ({ ...d, [k]: v }));
  const subtypes = goal ? GOAL_SUBTYPES[goal] : [];

  return (
    <div>
      <h2 className="text-xl font-bold font-heading mb-1">What's the goal?</h2>
      <p className="text-sm text-muted-foreground mb-4">Select the primary objective for this plan</p>
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        {GOALS.map(g => (
          <button key={g.id} onClick={() => { setGoal(g.id); u('goalSubtype', GOAL_SUBTYPES[g.id]?.[0] || ''); }}
            className={cn('flex flex-col items-start gap-1.5 p-3.5 rounded-2xl border-2 text-left transition-all duration-150 hover:shadow-md',
              goal === g.id ? 'border-primary bg-accent/60' : 'border-border bg-card hover:border-primary/40')}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-xl">{g.emoji}</span>
              {goal === g.id && <span className="w-4 h-4 rounded-full bg-primary flex items-center justify-center"><Check className="w-2.5 h-2.5 text-white" /></span>}
            </div>
            <p className="text-sm font-bold text-foreground">{g.label}</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{g.desc}</p>
          </button>
        ))}
      </div>

      {/* Goal subtype */}
      {goal && subtypes.length > 1 && (
        <div>
          <p className="text-xs font-bold text-muted-foreground mb-2">Approach</p>
          <div className="flex flex-wrap gap-1.5">
            {subtypes.map(s => (
              <button key={s} onClick={() => u('goalSubtype', s)}
                className={cn('px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
                  details.goalSubtype === s ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:border-primary/40'
                )}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="mt-3">
        <p className="text-xs font-bold text-muted-foreground mb-2">Timeline</p>
        <div className="flex flex-wrap gap-1.5">
          {TIMELINES.map(t => (
            <button key={t} onClick={() => u('timeline', t)}
              className={cn('px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
                details.timeline === t ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:border-primary/40'
              )}>
              {t}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Step 2 — Detailed Intake ──────────────────────────────────────────────────
function Step2Details({ details, setDetails, goal, macroApproach, setMacroApproach, customSplit, setCustomSplit, calcedCalories }) {
  const u = (key, val) => setDetails(d => ({ ...d, [key]: val }));

  const s1Complete = !!details.weight;
  const s2Complete = !!details.bodyType;
  const s3Complete = !!details.activity;
  const s4Complete = !!details.occupationType;
  const s5Complete = !!details.mealsPerDay;
  const s6Complete = !!details.diet;
  const s7Complete = details.supplements.length > 0;
  const s8Complete = !!details.notes;
  const completedCount = [s1Complete, s2Complete, s3Complete, s4Complete, s5Complete, s6Complete, s7Complete, s8Complete].filter(Boolean).length;

  return (
    <div>
      <h2 className="text-xl font-bold font-heading mb-1">Tell us about your client</h2>
      <p className="text-sm text-muted-foreground mb-2">We'll use this to calculate precise macros</p>
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
          <motion.div className="h-full bg-primary rounded-full" animate={{ width: `${(completedCount / 6) * 100}%` }} transition={{ duration: 0.3 }} />
        </div>
        <span className="text-xs font-semibold text-muted-foreground shrink-0">{completedCount} of 8 sections</span>
      </div>

      <div className="space-y-2.5 max-h-[55vh] overflow-y-auto pr-1">

        {/* Section 1 — Physical Stats */}
        <AccordionSection icon={Scale} title="Body & Stats" complete={s1Complete} defaultOpen>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Label className="text-xs font-semibold mb-1.5 block">Body Weight <span className="text-destructive">*</span></Label>
              <Input type="number" placeholder="e.g. 80" value={details.weight} onChange={e => u('weight', e.target.value)} />
            </div>
            <UnitToggle options={['kg', 'lbs']} value={details.weightUnit} onChange={v => {
              const cur = parseFloat(details.weight);
              if (!isNaN(cur)) {
                const converted = v === 'lbs' ? Math.round(cur * 2.20462 * 10) / 10 : Math.round(cur * 0.453592 * 10) / 10;
                u('weight', String(converted));
              }
              u('weightUnit', v);
            }} />
          </div>
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Height</Label>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <Input type="number" placeholder="5" min={1} max={8} value={details.heightFeet} onChange={e => u('heightFeet', e.target.value)} className="w-16 text-center" />
                <span className="text-xs font-semibold text-muted-foreground">ft</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Input type="number" placeholder="10" min={0} max={11} value={details.heightInches} onChange={e => u('heightInches', e.target.value)} className="w-16 text-center" />
                <span className="text-xs font-semibold text-muted-foreground">in</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Age</Label>
              <Input type="number" placeholder="e.g. 28" value={details.age} onChange={e => u('age', e.target.value)} />
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Biological Sex</Label>
              <div className="flex gap-2">
                {['male', 'female'].map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => u('sex', s)}
                    className={cn(
                      'flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize',
                      details.sex === s ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                    )}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Body Fat % <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input type="number" placeholder="e.g. 18" value={details.bodyFatPct} onChange={e => u('bodyFatPct', e.target.value)} />
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Goal Weight <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input type="number" placeholder={`e.g. ${details.weightUnit === 'lbs' ? '165' : '75'}`} value={details.goalWeight} onChange={e => u('goalWeight', e.target.value)} />
            </div>
          </div>
          {goal === 'fat_loss' && (
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Weekly Weight Loss Goal</Label>
              <WeightLossRateSelector value={details.weightLossRate} onChange={v => u('weightLossRate', v)} />
            </div>
          )}
        </AccordionSection>

        {/* Section — Body Type */}
        <AccordionSection icon={Dumbbell} title="Body Type" complete={s2Complete}>
          <p className="text-xs text-muted-foreground -mt-1 mb-2">This adjusts calorie & macro calculations significantly.</p>
          <div className="grid grid-cols-1 gap-2">
            {BODY_TYPES.map(bt => (
              <button key={bt.id} type="button" onClick={() => u('bodyType', bt.id)}
                className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 text-left transition-all',
                  details.bodyType === bt.id ? 'border-primary bg-accent/50' : 'border-border hover:border-primary/30'
                )}>
                <span className="text-lg">{bt.emoji}</span>
                <div>
                  <p className="text-sm font-bold">{bt.label}</p>
                  <p className="text-[11px] text-muted-foreground">{bt.desc}</p>
                </div>
                {details.bodyType === bt.id && <Check className="w-4 h-4 text-primary ml-auto" />}
              </button>
            ))}
          </div>
        </AccordionSection>

        {/* Section 2 — Training */}
        <AccordionSection icon={Dumbbell} title="Training Schedule" complete={s3Complete}>
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Activity Level <span className="text-destructive">*</span></Label>
            <Select value={details.activity} onValueChange={v => u('activity', v)}>
              <SelectTrigger><SelectValue placeholder="Select activity level" /></SelectTrigger>
              <SelectContent>
                {ACTIVITY_LEVELS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Training Days / Week</Label>
            <PillToggle options={[1, 2, 3, 4, 5, 6, 7]} value={details.trainingDays} onChange={v => u('trainingDays', v)} />
          </div>
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Training Time</Label>
            <div className="flex flex-wrap gap-1.5">
              {TRAINING_TIMES.map(t => (
                <button key={t} type="button" onClick={() => u('trainingTime', t)}
                  className={cn('px-2.5 py-1 rounded-full text-xs font-semibold border transition-all',
                    details.trainingTime === t ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:border-primary/40'
                  )}>{t}</button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Training Type</Label>
            <PillToggle options={TRAINING_TYPES} value={details.trainingType} onChange={v => u('trainingType', v)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Duration</Label>
              <PillToggle options={TRAINING_DURATIONS} value={details.trainingDuration} onChange={v => u('trainingDuration', v)} />
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Intensity</Label>
              <PillToggle options={TRAINING_INTENSITIES} value={details.trainingIntensity} onChange={v => u('trainingIntensity', v)} />
            </div>
          </div>
        </AccordionSection>

        {/* Section — Lifestyle & Schedule */}
        <AccordionSection icon={FileText} title="Lifestyle & Schedule" complete={s4Complete}>
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Occupation</Label>
            <div className="grid grid-cols-1 gap-1.5">
              {OCCUPATION_TYPES.map(o => (
                <button key={o.value} type="button" onClick={() => u('occupationType', o.value)}
                  className={cn('flex items-center gap-2 px-3 py-2 rounded-xl border text-left text-xs font-semibold transition-all',
                    details.occupationType === o.value ? 'border-primary bg-accent/50 text-foreground' : 'border-border text-muted-foreground hover:border-primary/30'
                  )}>{o.label}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Wake Up Time</Label>
              <Input type="time" value={details.wakeTime?.replace(' AM','').replace(' PM','') || '07:00'} onChange={e => u('wakeTime', e.target.value)} />
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Sleep Time</Label>
              <Input type="time" value={details.sleepTime?.replace(' AM','').replace(' PM','') || '22:00'} onChange={e => u('sleepTime', e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Work Hours (e.g. 9am-5pm)</Label>
            <Input placeholder="e.g. 9am-5pm or 10pm-6am" value={details.workHours} onChange={e => u('workHours', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Lunch Break?</Label>
              <YesNoToggle value={details.hasLunchBreak} onChange={v => u('hasLunchBreak', v)} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Kitchen at Work?</Label>
              <YesNoToggle value={details.hasKitchenAtWork} onChange={v => u('hasKitchenAtWork', v)} />
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Can Meal Prep?</Label>
            <PillToggle options={['Yes', 'Sometimes', 'No']} value={details.canMealPrep} onChange={v => u('canMealPrep', v)} />
          </div>
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Time to Cook Per Day</Label>
            <div className="flex flex-wrap gap-1.5">
              {COOKING_TIMES.map(c => (
                <button key={c.value} type="button" onClick={() => u('cookingTimePerDay', c.value)}
                  className={cn('px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
                    details.cookingTimePerDay === c.value ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:border-primary/40'
                  )}>{c.label}</button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Travel Frequency</Label>
            <PillToggle options={TRAVEL_FREQ} value={details.travelFrequency} onChange={v => u('travelFrequency', v)} />
          </div>
        </AccordionSection>

        {/* Section 3 — Meal Preferences */}
        <AccordionSection icon={UtensilsCrossed} title="Meal Preferences" complete={s5Complete}>
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Meals Per Day <span className="text-destructive">*</span></Label>
            <PillToggle options={[2, 3, 4, 5, 6]} value={details.mealsPerDay} onChange={v => u('mealsPerDay', v)} />
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label className="text-xs font-semibold">Include Pre-Workout Meal?</Label>
            <YesNoToggle value={details.preWorkout} onChange={v => u('preWorkout', v)} />
          </div>
          {details.preWorkout && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pl-3 border-l-2 border-primary/30 space-y-3">
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">Timing Before Workout</Label>
                <PillToggle options={['30min', '1hr', '2hr']} value={details.preWorkoutTiming} onChange={v => u('preWorkoutTiming', v)} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Carb Focus Pre-Workout?</Label>
                <YesNoToggle value={details.preWorkoutCarbs} onChange={v => u('preWorkoutCarbs', v)} />
              </div>
            </motion.div>
          )}
          <div className="flex items-center justify-between gap-4">
            <Label className="text-xs font-semibold">Include Post-Workout Meal?</Label>
            <YesNoToggle value={details.postWorkout} onChange={v => u('postWorkout', v)} />
          </div>
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Meal Prep Style</Label>
            <PillToggle options={['Fresh Daily', 'Meal Prep Weekly', 'Mix']} value={details.mealPrepStyle} onChange={v => u('mealPrepStyle', v)} />
          </div>

          {/* Meal Complexity */}
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Meal Style</Label>
            <div className="flex flex-wrap gap-2">
              {MEAL_COMPLEXITY.map(opt => {
                const active = details.mealComplexity === opt.id;
                const borderColor =
                  opt.color === 'blue'   ? (active ? 'border-primary bg-accent'     : 'border-border hover:border-primary') :
                  opt.color === 'amber'  ? (active ? 'border-warning bg-warning/10'   : 'border-border hover:border-warning') :
                  opt.color === 'purple' ? (active ? 'border-ai bg-ai/10' : 'border-border hover:border-ai') :
                                          (active ? 'border-border bg-muted'     : 'border-border hover:border-border');
                const labelColor =
                  active
                    ? opt.color === 'blue'   ? 'text-primary'
                    : opt.color === 'amber'  ? 'text-warning'
                    : opt.color === 'purple' ? 'text-ai'
                    : 'text-foreground'
                    : 'text-foreground';
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => u('mealComplexity', opt.id)}
                    className={`relative flex flex-col items-start px-3 py-2 rounded-xl border-2 text-left transition-all text-xs ${borderColor}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{opt.emoji}</span>
                      <span className={`font-bold ${labelColor}`}>{opt.label}</span>
                      {opt.popular && (
                        <span className="absolute -top-2 -right-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">Popular</span>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-0.5">{opt.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sauces & Seasonings */}
          <div>
            <Label className="text-xs font-semibold mb-0.5 block">Sauces & Seasonings</Label>
            <p className="text-[10px] text-muted-foreground mb-2">Low calorie options to keep meals flavorful</p>
            <div className="flex flex-wrap gap-1.5">
              {CONDIMENTS.map(c => {
                const active = details.condiments.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => u('condiments', active ? details.condiments.filter(x => x !== c.id) : [...details.condiments, c.id])}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full border text-xs font-semibold transition-all ${
                      active ? 'border-primary bg-accent text-primary' : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
                    }`}
                  >
                    <span>{c.emoji}</span>
                    <span>{c.label}</span>
                    <span className={`text-[10px] font-normal ${active ? 'text-primary/70' : 'text-muted-foreground'}`}>{c.kcal}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 bg-secondary/50 px-2.5 py-1.5 rounded-lg">
              These add flavor without significantly impacting your macros
            </p>
          </div>
        </AccordionSection>

        {/* Section 4 — Diet & Restrictions */}
        <AccordionSection icon={Leaf} title="Diet, Food Preferences & Culture" complete={s6Complete}>
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Dietary Style</Label>
            <Select value={details.diet} onValueChange={v => u('diet', v)}>
              <SelectTrigger><SelectValue placeholder="Select dietary style" /></SelectTrigger>
              <SelectContent>
                {DIET_PREFS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Allergies / Restrictions <span className="text-destructive font-bold text-[10px]">CRITICAL</span></Label>
            <PillToggle options={ALLERGIES} value={details.allergies} onChange={v => u('allergies', v)} multi />
          </div>
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Foods They HATE <span className="text-muted-foreground font-normal">(AI will never include these)</span></Label>
            <Input placeholder="e.g. mushrooms, tofu, olives, fish" value={details.dislikedFoods} onChange={e => u('dislikedFoods', e.target.value)} />
          </div>
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Foods They LOVE <span className="text-muted-foreground font-normal">(AI prioritizes these)</span></Label>
            <Input placeholder="e.g. chicken, eggs, sweet potato, berries" value={details.lovedFoods} onChange={e => u('lovedFoods', e.target.value)} />
          </div>
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Cultural Food Preference</Label>
            <div className="flex flex-wrap gap-1.5">
              {CULTURAL_PREFS.map(c => (
                <button key={c} type="button" onClick={() => u('culturalPreference', c)}
                  className={cn('px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
                    details.culturalPreference === c ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:border-primary/40'
                  )}>{c}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Cooking Skill</Label>
              <PillToggle options={['Beginner', 'Intermediate', 'Advanced']} value={details.cookingSkill} onChange={v => u('cookingSkill', v)} />
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Eating Out</Label>
              <PillToggle options={EATING_OUT_FREQ} value={details.eatingOutFrequency} onChange={v => u('eatingOutFrequency', v)} />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs font-semibold block">Fast Food Options Needed?</Label>
              <p className="text-[10px] text-muted-foreground">AI adds exact restaurant orders as alternatives</p>
            </div>
            <YesNoToggle value={details.fastFoodNeeded} onChange={v => u('fastFoodNeeded', v)} />
          </div>
          {details.fastFoodNeeded && (
            <Input placeholder="Favorite restaurants (e.g. Chipotle, McDonald's, Chick-fil-A)" value={details.favoriteFastFood} onChange={e => u('favoriteFastFood', e.target.value)} />
          )}
        </AccordionSection>

        {/* Section — Digestion & Health */}
        <AccordionSection icon={Zap} title="Digestion & Hunger" complete={false}>
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Hunger Level</Label>
            <div className="flex gap-2">
              {HUNGER_LEVELS.map(h => (
                <button key={h.value} type="button" onClick={() => u('hungerLevel', h.value)}
                  className={cn('flex-1 py-2 rounded-xl border text-xs font-semibold transition-all',
                    details.hungerLevel === h.value ? 'border-primary bg-accent/50 text-foreground' : 'border-border text-muted-foreground hover:border-primary/30'
                  )}>{h.label}</button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Digestive Issues <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input placeholder="e.g. IBS, bloating, acid reflux, lactose intolerant" value={details.digestiveIssues} onChange={e => u('digestiveIssues', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Sleep Quality</Label>
              <PillToggle options={['Good', 'Average', 'Poor']} value={details.sleepQuality} onChange={v => u('sleepQuality', v)} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Energy Crashes?</Label>
              <YesNoToggle value={details.energyCrashes} onChange={v => u('energyCrashes', v)} />
            </div>
          </div>
        </AccordionSection>

        {/* Section 5 — Supplements */}
        <AccordionSection icon={Pill} title="Current Supplements" complete={s7Complete}>
          <div className="flex flex-wrap gap-1.5">
            {SUPPLEMENTS.filter(s => s !== 'None').map(s => {
              const active = details.supplements.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    const next = active
                      ? details.supplements.filter(x => x !== s)
                      : [...details.supplements, s];
                    u('supplements', next);
                    if (!active && !details.supplementDosages[s]) {
                      u('supplementDosages', { ...details.supplementDosages, [s]: SUPPLEMENT_DEFAULTS[s]?.dosage || '' });
                    }
                  }}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
                    active ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'
                  )}
                >
                  <span>{SUPPLEMENT_DEFAULTS[s]?.emoji || '💊'}</span>
                  {s}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => { u('supplements', []); u('supplementDosages', {}); }}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
                details.supplements.length === 0 ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:border-primary/40'
              )}
            >
              None
            </button>
          </div>

          {details.supplements.length > 0 && (
            <div className="space-y-2 mt-2">
              {details.supplements.map(s => {
                const def = SUPPLEMENT_DEFAULTS[s] || {};
                return (
                  <div key={s} className="rounded-xl border border-border bg-card p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{def.emoji || '💊'}</span>
                        <span className="text-sm font-bold text-foreground">{s}</span>
                        {def.timing && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-ai/10 text-ai">
                            {def.timing}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => u('supplements', details.supplements.filter(x => x !== s))}
                        className="text-muted-foreground hover:text-destructive text-xs"
                      >×</button>
                    </div>
                    <input
                      type="text"
                      value={details.supplementDosages[s] ?? def.dosage ?? ''}
                      onChange={e => u('supplementDosages', { ...details.supplementDosages, [s]: e.target.value })}
                      placeholder="e.g. 5g daily, any time"
                      className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                );
              })}
            </div>
          )}
        </AccordionSection>

        {/* Section — Macro Approach */}
        <AccordionSection icon={Zap} title="Macro Split" complete={macroApproach === 'custom'}>
          <p className="text-xs text-muted-foreground -mt-1 mb-3">
            Control how protein, carbs, and fat are distributed within the calculated calorie target.
          </p>
          {/* Toggle */}
          <div className="flex border border-input rounded-lg overflow-hidden w-fit text-xs font-semibold mb-3">
            {[
              { id: 'auto',   label: 'Auto (AI decides)' },
              { id: 'custom', label: 'Custom macros' },
            ].map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setMacroApproach(opt.id)}
                className={cn(
                  'px-4 py-2 transition-colors',
                  macroApproach === opt.id ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-secondary'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {macroApproach === 'auto' && (
            <p className="text-[11px] text-muted-foreground bg-secondary/50 px-3 py-2 rounded-lg">
              The AI will choose the optimal macro split based on the client's goal, body type, and diet style.
            </p>
          )}

          {macroApproach === 'custom' && (
            <MacroSplitControl
              split={customSplit}
              onChange={setCustomSplit}
              totalCalories={calcedCalories}
              weightLbs={details.weightUnit === 'lbs' ? details.weight : (parseFloat(details.weight) * 2.20462 || '')}
            />
          )}
        </AccordionSection>

        {/* Section 6 — Notes */}
        <AccordionSection icon={FileText} title="Additional Notes" complete={s8Complete}>
          <Textarea
            placeholder="Any other context for the coach (medical conditions, preferences, special requirements)..."
            value={details.notes}
            onChange={e => u('notes', e.target.value)}
            className="resize-none h-20"
          />
        </AccordionSection>
      </div>
    </div>
  );
}

// ── Step 3 — Generating ───────────────────────────────────────────────────────
function Step3Generating({ onDone, macroPayload }) {
  const [progress, setProgress] = useState(0);
  const [msgIndex, setMsgIndex] = useState(0);
  const [error, setError] = useState(null);
  const doneRef = useRef(false);
  const apiCalledRef = useRef(false);

  useEffect(() => {
    doneRef.current = false;
    apiCalledRef.current = false;
    setProgress(0);
    setMsgIndex(0);

    // Progress bar: goes to 85% quickly then waits for API
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 85) return p;
        return p + 1.5;
      });
    }, 50);
    const msgTimer = setInterval(() => setMsgIndex(i => (i + 1) % LOADING_MESSAGES.length), 1000);

    // Call the API
    if (!apiCalledRef.current) {
      apiCalledRef.current = true;
      db.functions.invoke('generateSmartMeals', macroPayload)
        .then(res => {
          clearInterval(interval);
          const body = res.data;
          if (body?.error === 'monthly_ai_limit_reached') {
            setProgress(0);
            setError(body.message || "You've hit your monthly AI limit — upgrade to Pro for unlimited AI generations.");
            return;
          }
          if (body?.error) {
            setProgress(0);
            setError(body.error);
            return;
          }
          setProgress(100);
          // generateSmartMeals returns { meals, draft_plan_id } — pass meals as the raw array
          // so handleGeneratingDone's Array.isArray(rawData) fallback picks them up correctly
          const fullData = body?.meals || body?.plan?.meals || [];
          setTimeout(() => { if (!doneRef.current) { doneRef.current = true; onDone(fullData); } }, 400);
        })
        .catch(err => {
          clearInterval(interval);
          setProgress(0);
          setError(err?.message || 'Generation failed. Please try again.');
        });
    }

    return () => { clearInterval(interval); clearInterval(msgTimer); };
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <span className="text-2xl">❌</span>
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground mb-1">Generation Failed</h2>
          <p className="text-sm text-muted-foreground max-w-sm">{error}</p>
        </div>
        <Button variant="outline" onClick={() => { setError(null); doneRef.current = false; apiCalledRef.current = false; onDone({ plan: null, meals: [] }); }}>
          ← Go Back & Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-10 gap-6">
      <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.8, 1, 0.8] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-ai flex items-center justify-center shadow-lg"
      >
        <Sparkles className="w-8 h-8 text-white" />
      </motion.div>
      <div className="text-center">
        <h2 className="text-xl font-bold font-heading mb-1">Building your plan...</h2>
        <AnimatePresence mode="wait">
          <motion.p key={msgIndex} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.3 }} className="text-sm text-muted-foreground">
            {LOADING_MESSAGES[msgIndex]}
          </motion.p>
        </AnimatePresence>
      </div>
      <div className="w-full max-w-xs">
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <motion.div className="h-full bg-gradient-to-r from-primary to-ai rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
        </div>
        <p className="text-xs text-muted-foreground text-right mt-1">{Math.round(progress)}%</p>
      </div>
    </div>
  );
}

// ── Meal Card ─────────────────────────────────────────────────────────────────
function MealCard({ meal }) {
  const [open, setOpen] = useState(false);
  const isPre  = meal.type === 'pre_workout'  || meal.name?.toLowerCase().includes('pre-workout');
  const isPost = meal.type === 'post_workout' || meal.name?.toLowerCase().includes('post-workout');
  const bg = isPre ? 'bg-warning/10 border-warning' : isPost ? 'bg-accent border-primary' : 'bg-card border-border';
  const emoji = isPre ? '⚡' : isPost ? '💪' : '🍽️';

  return (
    <div className={cn('rounded-xl border overflow-hidden', bg)}>
      <button type="button" onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-3 p-3 text-left hover:bg-black/5 transition-colors">
        <span className="text-lg">{emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-foreground">{meal.name}</span>
            {meal.time && <span className="text-[10px] text-muted-foreground font-medium">{meal.time}</span>}
            {meal.prepTime && <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded-full text-muted-foreground">⏱ {meal.prepTime}</span>}
          </div>
          <div className="flex gap-2 mt-1 flex-wrap">
            <span className="text-[10px] font-bold text-orange-600">{meal.calories} kcal</span>
            <span className="text-[10px] font-semibold text-destructive">P {meal.protein}g</span>
            <span className="text-[10px] font-semibold text-warning">C {meal.carbs}g</span>
            <span className="text-[10px] font-semibold text-primary">F {meal.fats}g</span>
          </div>
        </div>
        <ChevronDown className={cn('w-4 h-4 text-muted-foreground shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="px-3 pb-3 space-y-2 border-t border-border/50">
              <img
                src={getMealImageUrl(meal.name, meal.foods)}
                alt={meal.name}
                loading="lazy"
                className="w-full h-24 object-cover rounded-xl mt-2"
                onError={e => { e.target.style.display = 'none'; }}
              />
              {/* Foods */}
              {meal.why_this_meal && (
                <p className="text-[11px] text-primary bg-accent px-2.5 py-1.5 rounded-lg mt-1 italic">💡 {meal.why_this_meal}</p>
              )}

              {meal.foods?.map((food, i) => (
                <div key={i} className="flex items-start gap-2 pt-2">
                  <span className="text-base mt-0.5">🥗</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs font-semibold text-foreground">{food.name}</span>
                      <span className="text-[10px] text-orange-600 font-bold shrink-0">{food.calories} kcal</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-0.5">
                      {food.amount_grams ? (
                        <span className="text-[10px] text-muted-foreground">{food.amount_grams}g {food.amount_household ? `(${food.amount_household})` : ''}</span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">{food.amount_household || food.amount}</span>
                      )}
                      {food.prep_method && <span className="text-[10px] text-ai italic">{food.prep_method}</span>}
                    </div>
                    <div className="flex gap-2 mt-0.5">
                      <span className="text-[10px] text-destructive">P {food.protein}g</span>
                      <span className="text-[10px] text-warning">C {food.carbs}g</span>
                      <span className="text-[10px] text-primary">F {food.fats}g</span>
                    </div>
                  </div>
                </div>
              ))}
              {/* Instructions */}
              {meal.instructions && (
                <div className="mt-2 p-2 bg-secondary/40 rounded-lg">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-0.5">How to prepare</p>
                  <p className="text-xs text-foreground">{meal.instructions}</p>
                </div>
              )}
              {/* Option B & C */}
              {(meal.option_b || meal.option_c) && (
                <div className="mt-2 space-y-1">
                  {meal.option_b && (
                    <div className="px-2.5 py-1.5 rounded-lg bg-success/10 border border-success">
                      <span className="text-[10px] font-bold text-success">Option B (Quick): </span>
                      <span className="text-[10px] text-foreground">{meal.option_b}</span>
                    </div>
                  )}
                  {meal.option_c && (
                    <div className="px-2.5 py-1.5 rounded-lg bg-orange-50 border border-orange-100">
                      <span className="text-[10px] font-bold text-orange-700">Option C (Out/Fast Food): </span>
                      <span className="text-[10px] text-foreground">{meal.option_c}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Step 4 — Result ───────────────────────────────────────────────────────────
function Step4Result({ result }) {
  const [copied, setCopied] = useState(false);
  const [dayTab, setDayTab] = useState('training');
  const goalMeta = GOALS.find(g => g.id === result.goal);
  const actLabel = ACTIVITY_LEVELS.find(a => a.value === result.activity)?.label;
  const displayMeals = dayTab === 'training' ? (result.meals || []) : (result.rest_day_meals || []);
  const perMealCal = Math.round(result.calories / (displayMeals.length || result.mealsPerDay || 4));

  function copyPlan() {
    const lines = [`=== AI Nutrition Plan ===`, `Goal: ${goalMeta?.label} | Diet: ${result.diet} | ${actLabel}`,
      `Calories: ${result.calories} kcal (BMR: ${result.bmr} | TDEE: ${result.tdee})`,
      `Protein: ${result.protein}g | Carbs: ${result.carbs}g | Fats: ${result.fats}g`, ''];
    (result.meals || []).forEach(meal => {
      lines.push(`--- ${meal.name} (${meal.time || ''}) ---`);
      lines.push(`${meal.calories} kcal | P ${meal.protein}g | C ${meal.carbs}g | F ${meal.fats}g`);
      (meal.foods || []).forEach(f => lines.push(`  • ${f.name} — ${f.amount} (${f.calories} kcal)`));
      if (meal.instructions) lines.push(`  How to prep: ${meal.instructions}`);
      lines.push('');
    });
    if (result.supplements?.filter(s => s !== 'None').length > 0) {
      lines.push(`Supplements: ${result.supplements.filter(s => s !== 'None').join(', ')}`);
    }
    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="pr-1 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold font-heading mb-1">Your AI Plan is Ready ✨</h2>
          <p className="text-sm text-muted-foreground">Review the detailed meal plan below</p>
        </div>
        <button type="button" onClick={copyPlan} className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-secondary">
          {copied ? <ClipboardCheck className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {/* Summary card */}
      <div className="bg-gradient-to-br from-accent to-ai/10 border border-accent rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xl">{goalMeta?.emoji}</span>
          <span className="text-sm font-bold px-3 py-1 rounded-full bg-card border border-primary/20 text-primary shadow-sm">{goalMeta?.label}</span>
          {result.diet && <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-card border border-border text-muted-foreground">{result.diet}</span>}
          <span className="text-xs text-muted-foreground ml-auto">{actLabel}</span>
        </div>
        <div className="text-center">
          <p className="text-4xl font-extrabold text-foreground tracking-tight">{result.calories}</p>
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mt-0.5">calories / day · ~{perMealCal} kcal per meal</p>
          {result.goal === 'fat_loss' && result.weightLossRate && (
            <p className="text-[11px] text-primary font-semibold mt-1">
              Target: lose {result.weightLossRate} lb/week · {result.dailyDeficit} kcal/day deficit
            </p>
          )}
          {result.deficitCapped && (
            <p className="text-[11px] text-warning font-semibold mt-0.5 bg-warning/10 px-3 py-1 rounded-full inline-block">
              ⚠️ Deficit capped to protect minimum healthy intake
            </p>
          )}
          <div className="flex justify-center gap-3 mt-2">
            <span className="text-[11px] text-muted-foreground bg-[var(--kc-w-70)] px-2 py-0.5 rounded-full border border-border">BMR: {result.bmr} kcal</span>
            <span className="text-[11px] text-muted-foreground bg-[var(--kc-w-70)] px-2 py-0.5 rounded-full border border-border">TDEE: {result.tdee} kcal</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Protein', value: result.protein, color: 'text-destructive' },
            { label: 'Carbs',   value: result.carbs,   color: 'text-warning' },
            { label: 'Fats',    value: result.fats,    color: 'text-primary' },
          ].map(m => (
            <div key={m.label} className="bg-card rounded-xl p-2.5 text-center shadow-sm">
              <p className={cn('text-xl font-extrabold', m.color)}>{m.value}<span className="text-xs font-semibold text-muted-foreground">g</span></p>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">{m.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Training / Rest Day tabs */}
      {result.rest_day_meals?.length > 0 && (
        <div className="flex gap-1 bg-secondary rounded-lg p-0.5">
          {[['training', '🏋️ Training Day'], ['rest', '😴 Rest Day']].map(([id, label]) => (
            <button key={id} onClick={() => setDayTab(id)}
              className={cn('flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors',
                dayTab === id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}>
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Meal cards */}
      {displayMeals.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
            {dayTab === 'training' ? '🏋️ Training Day' : '😴 Rest Day'} — {displayMeals.length} meals
          </p>
          {displayMeals.map((meal, i) => <MealCard key={i} meal={meal} />)}
        </div>
      ) : (
        <div className="text-xs text-muted-foreground text-center py-4">No meal data available</div>
      )}

      {/* Supplement Protocol — Morning & Night stacks */}
      {(() => {
        const sups = (result.supplements || []).filter(s => s !== 'None');
        const hasTiming = sups.some(s => typeof s === 'object' && s.timing);
        const morning = hasTiming
          ? sups.filter(s => typeof s === 'object' && ['Morning','morning'].includes(s.timing))
          : sups.filter(s => typeof s === 'object').length === 0 ? [] : sups; // fallback
        const night = hasTiming
          ? sups.filter(s => typeof s === 'object' && ['Night','night','Before Bed'].includes(s.timing))
          : [];

        const renderRow = (s, badge, badgeColor) => {
          const name = typeof s === 'object' ? s.name : s;
          const dosage = typeof s === 'object' ? (s.dosage || s.dose || '') : (SUPPLEMENT_DEFAULTS[s]?.dosage || '');
          const purpose = typeof s === 'object' ? (s.purpose || s.why || '') : ((SUPPLEMENT_GOAL_REASONS[result.goal] || {})[s] || '');
          return (
            <div key={name} className="flex items-start gap-3 p-3 rounded-xl bg-secondary/40 border border-border">
              <span className="text-lg shrink-0 mt-0.5">💊</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-foreground">{name}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badgeColor}`}>{badge}</span>
                </div>
                {dosage && <p className="text-xs text-foreground font-medium mt-0.5">{dosage}</p>}
                {purpose && <p className="text-[11px] text-muted-foreground mt-0.5 italic">{purpose}</p>}
              </div>
            </div>
          );
        };

        if (morning.length === 0 && night.length === 0 && sups.length === 0) return null;

        return (
          <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">💊 Supplement Protocol</p>
            {morning.length > 0 && (
              <div>
                <p className="text-[11px] font-bold text-warning uppercase tracking-wide mb-2">☀️ Morning Stack</p>
                <div className="space-y-2">{morning.map(s => renderRow(s, 'Morning', 'bg-warning/10 text-warning'))}</div>
              </div>
            )}
            {night.length > 0 && (
              <div>
                <p className="text-[11px] font-bold text-primary uppercase tracking-wide mb-2 mt-3">🌙 Night Stack</p>
                <div className="space-y-2">{night.map(s => renderRow(s, 'Before Bed', 'bg-accent text-primary'))}</div>
              </div>
            )}
            {!hasTiming && sups.length > 0 && (
              <div className="space-y-2">{sups.map(s => renderRow(s, 'Daily', 'bg-ai/10 text-ai'))}</div>
            )}
            <p className="text-[11px] text-warning bg-warning/10 rounded-xl px-3 py-2">
              ⚠️ General recommendations. Coach may adjust based on your specific needs.
            </p>
          </div>
        );
      })()}

      {/* Hydration protocol */}
      {result.hydration && (
        <div className="bg-accent border border-accent rounded-2xl p-4 space-y-2">
          <p className="text-xs font-bold text-primary uppercase tracking-wide">💧 Hydration Protocol</p>
          <p className="text-sm font-bold text-primary">Daily Target: {result.hydration.daily_oz} oz / ~{Math.round(result.hydration.daily_oz * 0.0296)} L</p>
          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
            {[['Morning', result.hydration.morning], ['Pre-Workout', result.hydration.pre_workout], ['During', result.hydration.during_workout], ['Post-Workout', result.hydration.post_workout]].map(([label, val]) => val && (
              <div key={label} className="bg-card rounded-lg px-2.5 py-1.5 border border-accent">
                <p className="font-bold text-primary">{label}</p>
                <p className="text-primary">{val}</p>
              </div>
            ))}
          </div>
          {result.hydration.electrolytes && (
            <p className="text-[11px] text-primary">⚡ {result.hydration.electrolytes}</p>
          )}
        </div>
      )}

      {/* Macro flexibility rules */}
      {result.macro_flexibility?.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-4 space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">🔄 Macro Flexibility Rules</p>
          <div className="space-y-1.5">
            {result.macro_flexibility.map((rule, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className="text-primary font-bold shrink-0">→</span>
                <span className="text-foreground">{rule}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Coach notes */}
      {result.coach_notes && (
        <div className="bg-warning/10 border border-warning rounded-2xl p-4 space-y-3">
          <p className="text-xs font-bold text-warning uppercase tracking-wide">📋 Coach Notes</p>
          {result.coach_notes.why_these_calories && (
            <div><p className="text-[11px] font-bold text-warning">Why these calories</p><p className="text-xs text-foreground">{result.coach_notes.why_these_calories}</p></div>
          )}
          {result.coach_notes.key_priorities && (
            <div><p className="text-[11px] font-bold text-warning">Key priorities</p><p className="text-xs text-foreground">{result.coach_notes.key_priorities}</p></div>
          )}
          {result.coach_notes.first_2_weeks && (
            <div><p className="text-[11px] font-bold text-warning">First 2 weeks</p><p className="text-xs text-foreground">{result.coach_notes.first_2_weeks}</p></div>
          )}
          {result.coach_notes.body_type_advice && (
            <div><p className="text-[11px] font-bold text-warning">Body type advice</p><p className="text-xs text-foreground">{result.coach_notes.body_type_advice}</p></div>
          )}
        </div>
      )}

      {/* Client notes */}
      {result.client_notes && (
        <div className="bg-success/10 border border-success rounded-2xl p-4">
          <p className="text-xs font-bold text-success uppercase tracking-wide mb-2">💬 Client Summary</p>
          <p className="text-xs text-foreground leading-relaxed">{result.client_notes}</p>
        </div>
      )}

      {/* Shopping list */}
      {result.shopping_list?.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-4 space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">🛒 Shopping List</p>
          <div className="grid grid-cols-2 gap-1">
            {result.shopping_list.map((item, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                <span className="text-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weekly overview */}
      {result.weekly_overview && (
        <div className="bg-secondary/40 border border-border rounded-2xl p-4">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">📅 Weekly Overview</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-card rounded-xl p-2 border border-border">
              <p className="text-sm font-bold text-foreground">{result.weekly_overview.training_days || result.trainingDays || 4}</p>
              <p className="text-[10px] text-muted-foreground">Training Days</p>
            </div>
            <div className="bg-card rounded-xl p-2 border border-border">
              <p className="text-sm font-bold text-foreground">{result.weekly_overview.avg_daily_calories || result.calories}</p>
              <p className="text-[10px] text-muted-foreground">Avg Daily Cal</p>
            </div>
            <div className="bg-card rounded-xl p-2 border border-border">
              <p className="text-sm font-bold text-foreground">${result.weekly_overview.estimated_weekly_cost_usd || '—'}</p>
              <p className="text-[10px] text-muted-foreground">Est. Weekly Cost</p>
            </div>
          </div>
        </div>
      )}

      {result.allergies?.length > 0 && (
        <div className="text-xs text-muted-foreground bg-secondary/40 rounded-xl px-3 py-2">
          ⚠️ Plan excludes: {result.allergies.join(', ')}
        </div>
      )}

    </div>
  );
}

// ── Main Modal ────────────────────────────────────────────────────────────────
export default function AIGeneratorModal({ open, onOpenChange, onApply }) {
  const [step, setStep]           = useState(0);
  const [dir, setDir]             = useState(1);
  const [goal, setGoal]           = useState(null);
  const [details, setDetails]     = useState(INITIAL_DETAILS);
  const [result, setResult]       = useState(null);
  const [macroPayload, setMacroPayload] = useState(null);
  const [macroApproach, setMacroApproach] = useState('auto'); // 'auto' | 'custom'
  const [customSplit, setCustomSplit] = useState({ p: 30, c: 40, f: 30 }); // %
  // step 4 = assign — no separate state needed; Step4Assign handles internally

  function go(next) { setDir(next > step ? 1 : -1); setStep(next); }

  function handleStartGenerating() {
    const weightKg = details.weightUnit === 'lbs'
      ? parseFloat(details.weight) / 2.2046
      : parseFloat(details.weight);
    const heightCm = (parseFloat(details.heightFeet) || 0) * 30.48 + (parseFloat(details.heightInches) || 0) * 2.54;
    const macros = calcMacros(goal, weightKg, heightCm, details.age, details.sex, details.activity, details.diet, details.weightLossRate || 1, details.bodyType || 'mesomorph', details.goalSubtype || '');

    // If custom macro split is selected, override protein/carbs/fats
    let finalProtein = macros.protein;
    let finalCarbs   = macros.carbs;
    let finalFats    = macros.fats;
    if (macroApproach === 'custom') {
      finalProtein = Math.round((customSplit.p / 100) * macros.calories / 4);
      finalCarbs   = Math.round((customSplit.c / 100) * macros.calories / 4);
      finalFats    = Math.round((customSplit.f / 100) * macros.calories / 9);
    }

    const payload = {
      // Body
      age: details.age || 25,
      sex: details.sex || 'male',
      weightKg: Math.round(weightKg * 10) / 10,
      heightCm: Math.round(heightCm),
      bodyFatPct: details.bodyFatPct || null,
      bodyType: details.bodyType || 'mesomorph',
      // Goal
      goal,
      goalSubtype: details.goalSubtype || '',
      goalWeight: details.goalWeight || null,
      timeline: details.timeline || 'Ongoing',
      // Macros
      diet: details.diet || 'Standard',
      calories: macros.calories,
      protein: finalProtein,
      carbs: finalCarbs,
      fats: finalFats,
      macroApproach,
      // Training
      trainingDaysPerWeek: details.trainingDays || 4,
      trainingTime: details.trainingTime || details.workoutTime || 'Morning',
      trainingType: details.trainingType || '',
      trainingDuration: details.trainingDuration || '60 min',
      trainingIntensity: details.trainingIntensity || 'Moderate',
      mealsPerDay: details.mealsPerDay || 4,
      preWorkout: details.preWorkout,
      preWorkoutCarbs: details.preWorkoutCarbs,
      postWorkout: details.postWorkout,
      // Lifestyle
      occupationType: details.occupationType || 'desk_job',
      wakeTime: details.wakeTime || '7:00 AM',
      sleepTime: details.sleepTime || '10:00 PM',
      workHours: details.workHours || '9am-5pm',
      hasLunchBreak: details.hasLunchBreak,
      canMealPrep: details.canMealPrep || 'Sometimes',
      cookingTimePerDay: details.cookingTimePerDay || '30_60',
      hasKitchenAtWork: details.hasKitchenAtWork,
      travelFrequency: details.travelFrequency || 'Never',
      // Food preferences
      allergies: (details.allergies || []).join(', '),
      dislikedFoods: details.dislikedFoods || '',
      lovedFoods: details.lovedFoods || '',
      culturalPreference: CULTURAL_PREF_VALUES[details.culturalPreference] || null,
      cookingSkill: details.cookingSkill || 'Intermediate',
      eatingOutFrequency: details.eatingOutFrequency || '1-2x week',
      fastFoodNeeded: details.fastFoodNeeded || false,
      favoriteFastFood: details.favoriteFastFood || '',
      // Digestion
      digestiveIssues: details.digestiveIssues || '',
      hungerLevel: details.hungerLevel || 'normal',
      energyCrashes: details.energyCrashes || false,
      sleepQuality: details.sleepQuality || 'Average',
      // Misc
      restrictions: [...(details.allergies || []), details.dislikedFoods].filter(Boolean).join(', '),
      supplements: details.supplements,
      supplementDosages: details.supplementDosages || {},
      mealComplexity: details.mealComplexity || 'moderate',
      condiments: (details.condiments || []).map(id => CONDIMENTS.find(c => c.id === id)?.label).filter(Boolean),
      notes: details.notes || '',
    };
    setMacroPayload({ ...payload, _macros: { ...macros, protein: finalProtein, carbs: finalCarbs, fats: finalFats, weightLossRate: details.weightLossRate || 1 } });
    go(2);
  }

  function normalizeMeals(rawMeals) {
    return (rawMeals || []).map(meal => {
      // generateSmartMeals returns meals with options[].foods (SmartNutrition format)
      // generateMealPlan returns meals with top-level foods array
      // Flatten the first option's foods if needed
      const firstOptionFoods = meal.options?.[0]?.foods || [];
      const rawFoods = meal.foods?.length ? meal.foods : firstOptionFoods;

      // Aggregate macros from foods if not on the meal directly
      const aggCalories = rawFoods.reduce((s, f) => s + (Number(f.calories) || 0), 0);
      const aggProtein  = rawFoods.reduce((s, f) => s + (Number(f.protein)  || 0), 0);
      const aggCarbs    = rawFoods.reduce((s, f) => s + (Number(f.carbs)    || 0), 0);
      const aggFats     = rawFoods.reduce((s, f) => s + (Number(f.fats)     || 0), 0);

      return {
        ...meal,
        name:          meal.name || meal.meal_name || '',
        meal_name:     meal.name || meal.meal_name || '',
        time:          meal.time || '',
        calories:      Number(meal.calories) || aggCalories,
        protein:       Number(meal.protein)  || aggProtein,
        carbs:         Number(meal.carbs)    || aggCarbs,
        fats:          Number(meal.fats)     || aggFats,
        instructions:  meal.instructions || meal.prep || '',
        why_this_meal: meal.why_this_meal || '',
        option_b:      meal.option_b || '',
        option_c:      meal.option_c || '',
        foods: rawFoods.map(food => {
          const amountGrams = Number(food.amount_grams ?? food.amount) || null;
          const household = food.amount_household || food.serving || food.portion || (amountGrams ? `${amountGrams}g` : '');
          return {
            name:             food.name || food.food_name || food.item || '',
            food_name:        food.name || food.food_name || food.item || '',
            amount_grams:     amountGrams,
            amount_household: household,
            amount:           household,
            portion:          household,
            unit:             food.unit || 'g',
            prep_method:      food.prep_method || food.prep || '',
            calories:         Number(food.calories) || 0,
            protein:          Number(food.protein)  || 0,
            carbs:            Number(food.carbs)    || 0,
            fats:             Number(food.fats)     || Number(food.fat) || 0,
          };
        }),
      };
    });
  }

  function handleGeneratingDone(rawData) {
    const m = macroPayload._macros;
    // rawData is the full plan object OR a flat meals array (backward compat)
    const plan = rawData?.plan || rawData;
    const trainingMeals = plan?.training_day?.meals || (Array.isArray(rawData) ? rawData : []);
    const restMeals     = plan?.rest_day?.meals || [];

    setResult({
      ...m, goal,
      diet:              details.diet || 'Standard',
      activity:          details.activity || 'sedentary',
      mealsPerDay:       details.mealsPerDay || 4,
      preWorkout:        details.preWorkout,
      postWorkout:       details.postWorkout,
      supplements:       plan?.supplements || details.supplements,
      supplementDosages: details.supplementDosages || {},
      allergies:         details.allergies,
      weightLossRate:    details.weightLossRate || 1,
      bodyType:          details.bodyType || '',
      culturalPreference: details.culturalPreference || '',
      meals:             normalizeMeals(trainingMeals), // primary (training day)
      rest_day_meals:    normalizeMeals(restMeals),
      hydration:         plan?.hydration || null,
      coach_notes:       plan?.coach_notes || null,
      client_notes:      plan?.client_notes || '',
      shopping_list:     plan?.shopping_list || [],
      weekly_overview:   plan?.weekly_overview || null,
      macro_flexibility: plan?.macro_flexibility_rules || [],
    });
    setDir(1); setStep(3);
  }

  function handleApply() {
    const goalMeta = GOALS.find(g => g.id === result.goal);
    const emojiMap = { fat_loss: '🔥', muscle_gain: '💪', performance: '⚡', maintenance: '🌿' };
    const condimentLabels = (result.condiments || []);

    onApply?.({
      title: `${goalMeta?.label || result.goal} Plan - AI Generated`,
      description: `AI-generated ${(goalMeta?.label || result.goal).toLowerCase()} plan. ${result.diet || 'Standard'} diet, ${result.mealsPerDay} meals/day.${result.goal === 'fat_loss' && result.weightLossRate ? ` Target: lose ${result.weightLossRate} lb/week.` : ''}`,
      emoji: emojiMap[result.goal] || '🥗',
      tracking_mode: 'macros',
      calories: result.calories,
      protein_g: result.protein,
      carbs_g: result.carbs,
      fats_g: result.fats,
      meals: (result.meals || []).map(meal => ({
        name:              meal.name,
        meal_name:         meal.name,
        time:              meal.time,
        calories:          meal.calories,
        protein:           meal.protein,
        carbs:             meal.carbs,
        fats:              meal.fats,
        instructions:      meal.instructions,
        why_this_meal:     meal.why_this_meal,
        option_b:          meal.option_b,
        option_c:          meal.option_c,
        foods: (meal.foods || []).map(f => ({
          name:             f.name,
          food_name:        f.name,
          amount:           f.amount,
          amount_grams:     f.amount_grams,
          amount_household: f.amount_household,
          unit:             f.unit || 'g',
          portion:          f.amount,
          prep_method:      f.prep_method,
          calories:         f.calories,
          protein:          f.protein,
          carbs:            f.carbs,
          fats:             f.fats,
        })),
      })),
      supplements: (result.supplements || []).filter(s => s !== 'None' && typeof s === 'object' ? s : s).map(s =>
        typeof s === 'object' ? s : { name: s, category: 'supplement' }
      ),
      notes: condimentLabels.length > 0 ? `Seasonings: ${condimentLabels.join(', ')}` : '',
    });
    onOpenChange(false);
    reset();
  }

  function reset() {
    setStep(0); setDir(1); setGoal(null); setDetails({ ...INITIAL_DETAILS, supplementDosages: {} }); setResult(null); setMacroPayload(null);
    setMacroApproach('auto'); setCustomSplit({ p: 30, c: 40, f: 30 });
  }

  function goToAssign() { setDir(1); setStep(4); }

  function canNext() {
    if (step === 0) return !!goal;
    if (step === 1) return !!details.weight && !!details.activity;
    return true;
  }

  // step 2 = generating (no footer); step 4 = assign (footer is handled inside)
  const showFooter = step !== 2 && step !== 4;

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent
        className="max-w-2xl p-0 overflow-hidden"
        style={{ display: 'flex', flexDirection: 'column', height: '90vh', maxHeight: '90vh' }}
      >
        {/* Fixed header — step dots */}
        <div className="px-8 pt-6 pb-3 shrink-0 border-b border-border/50">
          <StepDots current={step} total={5} />
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }} className="px-8 py-5">
          <AnimatePresence custom={dir} mode="wait">
            <motion.div key={step} custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25, ease: 'easeInOut' }}>
              {step === 0 && <Step1Goal goal={goal} setGoal={setGoal} details={details} setDetails={setDetails} />}
              {step === 1 && (() => {
                const _wKg = details.weightUnit === 'lbs' ? parseFloat(details.weight) / 2.2046 : parseFloat(details.weight);
                const _hCm = (parseFloat(details.heightFeet) || 0) * 30.48 + (parseFloat(details.heightInches) || 0) * 2.54;
                const _mc  = (!isNaN(_wKg) && _wKg > 0 && details.activity)
                  ? calcMacros(goal, _wKg, _hCm, details.age, details.sex, details.activity, details.diet, details.weightLossRate || 1, details.bodyType || 'mesomorph', details.goalSubtype || '')
                  : null;
                return (
                  <Step2Details
                    details={details}
                    setDetails={setDetails}
                    goal={goal}
                    macroApproach={macroApproach}
                    setMacroApproach={setMacroApproach}
                    customSplit={customSplit}
                    setCustomSplit={setCustomSplit}
                    calcedCalories={_mc?.calories || 0}
                  />
                );
              })()}
              {step === 2 && <Step3Generating onDone={handleGeneratingDone} macroPayload={macroPayload} />}
              {step === 3 && result && <Step4Result result={result} />}
              {step === 4 && result && (
                <Step4Assign
                  result={result}
                  onRegenerate={() => go(2)}
                  onOpenChange={onOpenChange}
                  onReset={reset}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Fixed footer */}
        {showFooter && (
          <div className="shrink-0 border-t border-border bg-secondary/30 px-8 py-4">
            {step === 3 ? (
              /* Result step — Regenerate + Save & Assign + quick-use */
              <div className="flex flex-col gap-2.5">
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => go(2)} className="gap-1.5 shrink-0">
                    <RotateCcw className="w-3.5 h-3.5" /> Regenerate
                  </Button>
                  <Button
                    onClick={goToAssign}
                    className="flex-1 gap-2 bg-gradient-to-r from-primary to-ai hover:from-primary hover:to-ai border-0 text-white font-bold"
                  >
                    <UserPlus className="w-4 h-4" /> Save & Assign
                  </Button>
                </div>
                <button
                  type="button"
                  onClick={handleApply}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors text-center"
                >
                  or just open in plan editor →
                </button>
              </div>
            ) : (
              /* Steps 0 & 1 — Back + Next/Generate */
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={step === 0 ? () => onOpenChange(false) : () => go(step - 1)}
                  className="sm:w-auto w-full gap-1.5"
                >
                  {step === 0 ? 'Cancel' : <><ChevronLeft className="w-4 h-4" /> Back</>}
                </Button>
                {step === 1 ? (
                  <Button
                    size="sm"
                    disabled={!canNext()}
                    onClick={handleStartGenerating}
                    className="flex-1 gap-2 bg-gradient-to-r from-primary to-ai hover:from-primary hover:to-ai border-0 text-white font-bold"
                  >
                    <Sparkles className="w-4 h-4" /> Generate Plan ✨
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    disabled={!canNext()}
                    onClick={() => go(step + 1)}
                    className="flex-1 sm:flex-none gap-1.5 bg-gradient-to-r from-primary to-ai hover:from-primary hover:to-ai border-0 text-white font-bold"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}