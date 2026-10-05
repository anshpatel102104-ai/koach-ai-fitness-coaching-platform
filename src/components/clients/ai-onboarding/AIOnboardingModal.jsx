import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { X, Sparkles, Loader2, CheckCircle } from 'lucide-react';
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

    toast.success('AI plan approved and saved to client! 🎉');
    onSaved?.();
    onClose();
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative bg-card rounded-2xl shadow-2xl w-full flex flex-col overflow-hidden"
        style={{ maxWidth: 860, height: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0"
          style={{ background: 'var(--tc-sidebar)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, var(--tc-primary), var(--tc-ai))' }}>
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">AI Onboarding</h2>
              <p className="text-[11px]" style={{ color: 'var(--tc-muted-foreground)' }}>
                {client.name} · Generating starting program &amp; meal plan
              </p>
              <AiUsageMeter className="mt-0.5" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StepIndicator step={step} />
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-white hover:bg-[var(--kc-w-10)] transition-colors">
              <X className="w-4 h-4" />
            </button>
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
    { key: 'questionnaire', label: 'Questionnaire' },
    { key: 'generating',    label: 'Generating' },
    { key: 'review',        label: 'Review' },
  ];
  const activeIdx = steps.findIndex(s => s.key === step);
  return (
    <div className="flex items-center gap-1">
      {steps.map((s, i) => (
        <React.Fragment key={s.key}>
          <div className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full transition-all ${
            i === activeIdx ? 'text-white' : i < activeIdx ? 'text-success' : 'text-muted-foreground'
          }`}>
            {i < activeIdx
              ? <CheckCircle className="w-3 h-3" />
              : <span className="w-3 h-3 rounded-full flex items-center justify-center text-[9px]"
                  style={{ background: i === activeIdx ? 'var(--tc-primary)' : 'var(--tc-foreground)' }}>
                  {i + 1}
                </span>
            }
            <span className="hidden sm:inline">{s.label}</span>
          </div>
          {i < steps.length - 1 && <div className="w-4 h-px bg-foreground" />}
        </React.Fragment>
      ))}
    </div>
  );
}

function GeneratingScreen({ client }) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-6 p-8">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--tc-primary) 13.3333%, transparent), color-mix(in srgb, var(--tc-ai) 13.3333%, transparent))' }}>
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-bold text-foreground mb-1">Generating AI Plan…</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Building a personalised training program and meal plan for {client.name}.
          This usually takes 20–40 seconds.
        </p>
      </div>
      <div className="flex flex-col gap-2 w-full max-w-xs">
        {['Analysing client profile…', 'Building training split…', 'Calculating macros…', 'Structuring meal plan…'].map((msg, i) => (
          <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: `${i * 300}ms` }} />
            {msg}
          </div>
        ))}
      </div>
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