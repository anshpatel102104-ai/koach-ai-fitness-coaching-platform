import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { X, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { db } from '@/api/supabaseClient';
import { toast } from 'sonner';
import AIOnboardingQuestionnaire from './AIOnboardingQuestionnaire';
import AIOnboardingReview from './AIOnboardingReview';
import AiUsageMeter from '@/components/subscription/AiUsageMeter';

// Steps: questionnaire → generating → review
const STEPS = { questionnaire: 'questionnaire', generating: 'generating', review: 'review' };

export default function AIOnboardingModal({ client, onClose, onSaved }) {
  const [step, setStep] = useState(STEPS.questionnaire);
  const [answers, setAnswers] = useState(null);
  const [generatedProgram, setGeneratedProgram] = useState(null);
  const [generatedMealPlan, setGeneratedMealPlan] = useState(null);
  const [genError, setGenError] = useState(null);

  const handleGenerate = async (formAnswers) => {
    setAnswers(formAnswers);
    setStep(STEPS.generating);
    setGenError(null);

    // Build profile from client + questionnaire answers
    const profile = {
      goal: formAnswers.goal || client.goal || 'general_fitness',
      fitness_level: formAnswers.fitness_level || 'intermediate',
      gender: client.sex || 'not specified',
      age: client.date_of_birth
        ? Math.floor((Date.now() - new Date(client.date_of_birth)) / (365.25 * 24 * 3600 * 1000))
        : formAnswers.age || null,
      days_per_week: formAnswers.days_per_week || 4,
      session_length: formAnswers.session_length || 60,
      preferred_split: formAnswers.preferred_split || 'Let AI decide',
      equipment: formAnswers.equipment || ['full gym'],
      injuries: formAnswers.injuries || 'none',
      movements_to_avoid: formAnswers.movements_to_avoid || 'none',
      priority_muscles: [],
      current_weight: client.current_weight ? `${client.current_weight} lbs` : null,
      target_weight: client.target_weight ? `${client.target_weight} lbs` : null,
      height: client.height || null,
    };

    const preferences = {
      duration: 8,
      progression_style: 'Double progression (add reps, then weight)',
      include_deload: false,
      include_cardio: formAnswers.include_cardio || false,
      extra_notes: `Client name: ${client.name}. Diet style: ${formAnswers.diet_style || 'balanced'}. ${formAnswers.extra_notes || ''}`,
    };

    // Meal plan params
    const mealParams = {
      age: profile.age || 30,
      sex: client.sex || 'male',
      weightKg: client.current_weight ? Math.round(client.current_weight * 0.453592) : 80,
      goal: mapGoalToNutrition(formAnswers.goal || client.goal),
      diet: formAnswers.diet_style || 'Standard',
      allergies: formAnswers.allergies || 'none',
      dislikedFoods: '',
      lovedFoods: '',
      calories: formAnswers.daily_calories || estimateCalories(client, formAnswers),
      protein: formAnswers.protein_target || Math.round((formAnswers.daily_calories || estimateCalories(client, formAnswers)) * 0.3 / 4),
      carbs: formAnswers.carbs_target || Math.round((formAnswers.daily_calories || estimateCalories(client, formAnswers)) * 0.4 / 4),
      fats: formAnswers.fats_target || Math.round((formAnswers.daily_calories || estimateCalories(client, formAnswers)) * 0.3 / 9),
      trainingDaysPerWeek: formAnswers.days_per_week || 4,
      trainingTime: 'Morning',
      mealsPerDay: formAnswers.meals_per_day || 4,
      preWorkout: true,
      postWorkout: true,
      wakeTime: '07:00',
      sleepTime: '22:00',
      supplements: [],
    };

    try {
      // Run both in parallel
      const [progRes, mealRes] = await Promise.all([
        db.functions.invoke('generateAIProgram', { profile, preferences, purpose: 'onboarding' }),
        db.functions.invoke('generateMealPlan', mealParams),
      ]);

      if (progRes.data?.error) throw new Error(progRes.data.error);
      if (mealRes.data?.error) throw new Error(mealRes.data.error);

      setGeneratedProgram(progRes.data);
      setGeneratedMealPlan(mealRes.data?.plan || mealRes.data);
      setStep(STEPS.review);
    } catch (err) {
      setGenError(err.message || 'Generation failed. Please try again.');
      setStep(STEPS.questionnaire);
    }
  };

  const handleApprove = async (finalProgram, finalMealPlan) => {
    // Save program
    const programRecord = await db.entities.WorkoutProgram.create({
      title: finalProgram.title,
      description: finalProgram.description,
      category: finalProgram.category || 'custom',
      difficulty: finalProgram.difficulty || 'intermediate',
      duration_weeks: finalProgram.duration_weeks || 8,
      days_per_week: finalProgram.days_per_week || 4,
      workouts: finalProgram.workouts || [],
      is_template: false,
    });

    // Save nutrition plan
    const trainingMeals = finalMealPlan?.training_day?.meals || finalMealPlan?.meals || [];
    const totalCals = trainingMeals.reduce((s, m) => s + (m.calories || 0), 0) || 2000;
    const nutritionRecord = await db.entities.NutritionPlan.create({
      title: `${client.name} — AI Nutrition Plan`,
      description: finalMealPlan?.coach_notes?.why_these_calories || 'AI-generated nutrition plan',
      calories: totalCals,
      meals: trainingMeals,
      plan_data: finalMealPlan,
      is_template: false,
    });

    // Assign both to the client
    await db.entities.Client.update(client.id, {
      assigned_program_id: programRecord.id,
      assigned_nutrition_id: nutritionRecord.id,
    });

    toast.success('Plan approved and saved to the client');
    onSaved?.();
    onClose();
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-card rounded-xl w-full flex flex-col overflow-hidden ring-1 ring-border"
        style={{ maxWidth: 860, height: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start sm:items-center justify-between gap-4 px-5 sm:px-6 py-4 border-b border-border bg-card flex-shrink-0">
          <div className="min-w-0">
            <h2 className="text-[24px] leading-tight text-foreground">AI onboarding</h2>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              Starting program and meal plan for {client.name}. You review everything before it&apos;s saved.
            </p>
            <AiUsageMeter className="mt-1" />
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <StepIndicator step={step} />
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onClose} aria-label="Close">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {step === STEPS.questionnaire && (
            <AIOnboardingQuestionnaire
              client={client}
              onGenerate={handleGenerate}
              error={genError}
            />
          )}
          {step === STEPS.generating && (
            <GeneratingScreen client={client} />
          )}
          {step === STEPS.review && generatedProgram && (
            <AIOnboardingReview
              client={client}
              program={generatedProgram}
              mealPlan={generatedMealPlan}
              onApprove={handleApprove}
              onBack={() => setStep(STEPS.questionnaire)}
            />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function StepIndicator({ step }) {
  const steps = [
    { key: 'questionnaire', label: 'Questions' },
    { key: 'generating',    label: 'Drafting' },
    { key: 'review',        label: 'Review' },
  ];
  const activeIdx = steps.findIndex(s => s.key === step);
  return (
    <ol className="hidden sm:flex items-center gap-1 text-[13px]" aria-label="Progress">
      {steps.map((s, i) => (
        <li key={s.key} className="flex items-center gap-1">
          <span className={cn(
            'inline-flex items-center gap-1.5 px-2 py-1 rounded-md',
            i === activeIdx ? 'bg-primary text-primary-foreground font-semibold' : i < activeIdx ? 'text-foreground' : 'text-muted-foreground'
          )}>
            {i < activeIdx ? <CheckCircle className="w-3.5 h-3.5 text-success" /> : <span className="tabular-nums">{i + 1}</span>}
            {s.label}
          </span>
          {i < steps.length - 1 && <span className="w-3 h-px bg-border" />}
        </li>
      ))}
    </ol>
  );
}

function GeneratingScreen({ client }) {
  return (
    <div className="h-full flex items-center justify-center p-6 bg-background">
      <section className="w-full max-w-md rounded-xl bg-ai text-ai-foreground p-6">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin" />
          <h3 className="text-[22px]">Drafting the plan</h3>
        </div>
        <p className="mt-3 text-[15px] text-ai-foreground/80">
          Building a training split and meal plan for {client.name} from their answers. Usually 20 to 40 seconds.
        </p>
        <ul className="mt-4 space-y-1.5 text-sm text-ai-foreground/70">
          {['Reading their profile', 'Choosing a training split', 'Working out calories and macros', 'Laying out meals'].map(msg => (
            <li key={msg} className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-ai-foreground/50" />
              {msg}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

// Helpers
function mapGoalToNutrition(goal) {
  const map = {
    weight_loss: 'fat_loss', muscle_gain: 'muscle_gain', strength: 'muscle_gain',
    endurance: 'performance', general_fitness: 'maintenance', fat_loss: 'fat_loss',
  };
  return map[goal] || 'maintenance';
}

function estimateCalories(client, answers) {
  const weight = client.current_weight || 180; // lbs
  const goal = answers.goal || client.goal || 'general_fitness';
  const base = Math.round(weight * 14);
  if (goal === 'weight_loss' || goal === 'fat_loss') return base - 300;
  if (goal === 'muscle_gain' || goal === 'strength') return base + 300;
  return base;
}