import React, { useState } from 'react';
import { Salad, CheckCircle2, Plus, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { db } from '@/api/supabaseClient';
import { toast } from 'sonner';

const STARTER_PLANS = [
  {
    title: 'Fat Loss — 1800 kcal',
    tracking_mode: 'macros', calories: 1800, protein_g: 180, carbs_g: 140, fats_g: 50,
    description: 'High-protein caloric deficit for steady fat loss',
    meals: [
      { meal_name: 'Breakfast', time: '7:00 AM', foods: [{ food_name: 'Egg whites + oats', portion: '6 whites + 80g oats', calories: 380, protein: 40, carbs: 55, fats: 5 }] },
      { meal_name: 'Lunch', time: '12:00 PM', foods: [{ food_name: 'Chicken breast + rice + greens', portion: '200g + 120g + 100g', calories: 520, protein: 55, carbs: 55, fats: 8 }] },
      { meal_name: 'Snack', time: '3:30 PM', foods: [{ food_name: 'Greek yoghurt + berries', portion: '200g + 100g', calories: 200, protein: 20, carbs: 22, fats: 3 }] },
      { meal_name: 'Dinner', time: '7:00 PM', foods: [{ food_name: 'Salmon + sweet potato + veg', portion: '200g + 150g + 150g', calories: 540, protein: 45, carbs: 40, fats: 18 }] },
    ],
  },
  {
    title: 'Muscle Gain — 3000 kcal',
    tracking_mode: 'macros', calories: 3000, protein_g: 200, carbs_g: 320, fats_g: 80,
    description: 'Lean bulk with high carbs around training',
    meals: [
      { meal_name: 'Breakfast', time: '7:00 AM', foods: [{ food_name: 'Whole eggs + oats + banana', portion: '4 eggs + 100g + 1 banana', calories: 680, protein: 38, carbs: 90, fats: 18 }] },
      { meal_name: 'Pre-Workout', time: '11:00 AM', foods: [{ food_name: 'Rice cakes + peanut butter', portion: '4 cakes + 2 tbsp', calories: 320, protein: 10, carbs: 50, fats: 10 }] },
      { meal_name: 'Post-Workout', time: '2:00 PM', foods: [{ food_name: 'Protein shake + white rice', portion: '1 scoop + 150g', calories: 480, protein: 45, carbs: 80, fats: 5 }] },
      { meal_name: 'Dinner', time: '7:00 PM', foods: [{ food_name: 'Ground beef + pasta + sauce', portion: '200g + 120g + 100g', calories: 780, protein: 55, carbs: 80, fats: 28 }] },
      { meal_name: 'Before Bed', time: '10:00 PM', foods: [{ food_name: 'Cottage cheese + almonds', portion: '200g + 30g', calories: 380, protein: 32, carbs: 12, fats: 22 }] },
    ],
  },
  {
    title: 'Maintenance — Balanced Habits',
    tracking_mode: 'habits', calories: 2200, protein_g: 150, carbs_g: 230, fats_g: 70,
    description: 'Habit-based plan with flexible eating windows',
    meals: [
      { meal_name: 'Morning', time: '8:00 AM', habit_description: 'Eat a protein-rich breakfast within 1h of waking' },
      { meal_name: 'Midday', time: '12:00 PM', habit_description: 'Fill half your plate with vegetables, quarter protein, quarter carbs' },
      { meal_name: 'Afternoon', time: '3:30 PM', habit_description: 'Optional: fruit + nuts or protein snack if hungry' },
      { meal_name: 'Evening', time: '6:30 PM', habit_description: 'Balanced dinner — avoid processed foods and alcohol' },
    ],
  },
];

export default function MigrationNutrition({ onComplete, onSkip }) {
  const [selected, setSelected] = useState(new Set());
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);

  const toggle = (i) => {
    setSelected(s => {
      const n = new Set(s);
      n.has(i) ? n.delete(i) : n.add(i);
      return n;
    });
  };

  const doImport = async () => {
    setImporting(true);
    let count = 0;
    for (const i of selected) {
      try { await db.entities.NutritionPlan.create({ ...STARTER_PLANS[i], is_template: true }); count++; } catch {}
    }
    setImporting(false);
    setDone(true);
    toast.success(`${count} nutrition plan${count !== 1 ? 's' : ''} imported`);
    setTimeout(() => onComplete(), 1000);
  };

  if (done) {
    return (
      <div className="flex flex-col items-center py-6 gap-3">
        <CheckCircle2 className="w-10 h-10 text-success" />
        <p className="font-semibold text-foreground">{selected.size} plans imported</p>
        <button onClick={onComplete} className="px-6 h-11 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors">Continue</button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Select starter nutrition plans to import as templates you can assign to clients.
      </p>

      <div className="space-y-3">
        {STARTER_PLANS.map((plan, i) => {
          const sel = selected.has(i);
          return (
            <button
              key={i}
              onClick={() => toggle(i)}
              className={cn(
                'w-full text-left p-4 rounded-xl border-2 transition-all',
                sel ? 'border-foreground bg-accent' : 'border-border hover:border-input bg-card'
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', sel ? 'bg-primary' : 'bg-secondary')}>
                  <Salad className={cn('w-4 h-4', sel ? 'text-primary-foreground' : 'text-muted-foreground')} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground">{plan.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{plan.description}</p>
                  <div className="flex gap-3 mt-2">
                    {plan.protein_g && <span className="text-xs font-medium text-foreground bg-accent px-2 py-0.5 rounded-full">{plan.protein_g}g protein</span>}
                    {plan.carbs_g && <span className="text-xs font-medium text-warning bg-warning/10 px-2 py-0.5 rounded-full">{plan.carbs_g}g carbs</span>}
                    {plan.fats_g && <span className="text-xs font-medium text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">{plan.fats_g}g fats</span>}
                  </div>
                </div>
                <div className={cn(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all',
                  sel ? 'bg-primary border-primary' : 'border-border'
                )}>
                  {sel && <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex gap-3">
        <button onClick={onSkip} className="flex-1 h-11 rounded-lg border border-input bg-card text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors">
          Skip this step
        </button>
        {selected.size > 0 && (
          <button
            onClick={doImport}
            disabled={importing}
            className="flex-1 h-11 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/85 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {importing
              ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Importing...</>
              : <><Plus className="w-4 h-4" />Import {selected.size} Plan{selected.size !== 1 ? 's' : ''}</>
            }
          </button>
        )}
      </div>
    </div>
  );
}