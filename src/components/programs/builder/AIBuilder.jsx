import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ArrowLeft, RefreshCw, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { db } from '@/api/supabaseClient';
import { toast } from 'sonner';
import AIProfileStep from './steps/AIProfileStep';
import AIPreferencesStep from './steps/AIPreferencesStep';
import AIGeneratingStep from './steps/AIGeneratingStep';
import AIReviewStep from './steps/AIReviewStep';
import AiUsageMeter from '@/components/subscription/AiUsageMeter';

const STEPS = ['profile', 'preferences', 'generating', 'review'];

export default function AIBuilder({ onBack, onProgramCreated }) {
  const [step, setStep] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [preferences, setPreferences] = useState(null);
  const [generatedProgram, setGeneratedProgram] = useState(null);
  const [rating, setRating] = useState(null);
  const [generateError, setGenerateError] = useState(null);
  const [reviewData, setReviewData] = useState(null); // tracks edits from review step

  const handleProfileSubmit = (profileData) => {
    setProfile(profileData);
    setStep('preferences');
  };

  const handlePreferencesSubmit = async (prefsData) => {
    setPreferences(prefsData);
    setStep('generating');
    await generateProgram(prefsData);
  };

  const generateProgram = async (prefs) => {
    try {
      setLoading(true);
      setGenerateError(null);
      const result = await db.functions.invoke('generateAIProgram', {
        profile,
        preferences: prefs,
      });
      // Unwrap any extra nesting (belt + suspenders after backend fix)
      let program = result.data;
      if (program?.response) program = program.response;

      // Clean monthly limit message for Starter tier
      if (program?.error === 'monthly_ai_limit_reached') {
        throw new Error(program.message || "You've reached your monthly AI generation limit — upgrade your plan for more.");
      }

      if (!program || program.error) {
        throw new Error(program?.error || 'Invalid program returned from AI');
      }
      // Resilient coercion — only fail if truly critical fields are absent
      if (!program.title) program.title = 'AI Generated Program';
      if (!Array.isArray(program.workouts) || program.workouts.length === 0) {
        throw new Error('AI did not return any workout days. Please try again.');
      }
      // Ensure every exercise has minimum required fields
      program.workouts = program.workouts.map((w, wi) => ({
        ...w,
        day_number: w.day_number ?? wi + 1,
        exercises: (w.exercises || []).map(ex => ({
          ...ex,
          sets: ex.sets ?? 3,
          reps: ex.reps ?? '8-12',
          section: ex.section || 'main',
        })),
      }));
      setGeneratedProgram(program);
      setReviewData(null); // reset edits on new generation
      setStep('review');
    } catch (error) {
      setGenerateError(error.message || 'Failed to generate program');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProgram = async (editedProgram) => {
    try {
      setLoading(true);
      const dataToSave = editedProgram || generatedProgram;
      const newProgram = await db.entities.WorkoutProgram.create({
        ...dataToSave,
        is_template: false,
        is_ai_generated: true,
      });
      toast.success('Program created!');
      onProgramCreated(newProgram);
    } catch (error) {
      toast.error('Failed to save program');
    } finally {
      setLoading(false);
    }
  };

  const isReview = step === 'review';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, height: '100%' }}>
      {/* Sticky Header */}
      <div className="flex-shrink-0 px-4 sm:px-6 pt-5 pb-4 border-b border-border space-y-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="hover:bg-accent rounded-lg p-1.5">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="font-heading text-xl">Build with AI</h2>
            <p className="text-sm text-muted-foreground">
              {{
                profile: 'Step 1 of 4 — Client Profile',
                preferences: 'Step 2 of 4 — Program Settings',
                generating: 'Step 3 of 4 — Generating',
                review: 'Step 4 of 4 — Review & Save',
              }[step]}
            </p>
          </div>
        </div>
        <AiUsageMeter />
        {/* Progress bar */}
        <div className="flex gap-1.5 h-1">
          {STEPS.map((s) => (
            <div
              key={s}
              className={`flex-1 rounded-full transition-colors ${
                STEPS.indexOf(s) <= STEPS.indexOf(step) ? 'bg-primary' : 'bg-border'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Scrollable Content */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }} className="px-4 sm:px-6 py-5">
        <AnimatePresence mode="wait">
          {step === 'profile' && (
            <AIProfileStep key="profile" onSubmit={handleProfileSubmit} />
          )}
          {step === 'preferences' && (
            <AIPreferencesStep
              key="prefs"
              profile={profile}
              onSubmit={handlePreferencesSubmit}
              isLoading={loading}
            />
          )}
          {step === 'generating' && (
            <AIGeneratingStep
              key="gen"
              error={generateError}
              onRetry={() => {
                setGenerateError(null);
                generateProgram(preferences);
              }}
              onBack={() => setStep('preferences')}
            />
          )}
          {step === 'review' && generatedProgram && (
            <AIReviewStep
              key="review"
              program={generatedProgram}
              onProgramChange={setReviewData}
              onRegenerate={() => {
                setStep('generating');
                generateProgram(preferences);
              }}
              onRating={setRating}
              currentRating={rating}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Sticky Footer — only shown on review step */}
      {isReview && (
        <div className="px-4 sm:px-6" style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', paddingBottom: '12px', borderTop: '1px solid var(--tc-border)', background: 'var(--tc-background)' }}>
          <Button
            variant="outline"
            onClick={() => {
              setStep('generating');
              generateProgram(preferences);
            }}
            disabled={loading}
            className="gap-2 text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Regenerate
          </Button>
          <Button
            onClick={() => handleSaveProgram(reviewData)}
            disabled={loading || !(reviewData?.title ?? generatedProgram?.title)}
            className="gap-2 text-sm font-semibold"
            style={{ background: 'var(--tc-primary)' }}
          >
            <Check className="w-4 h-4" />
            {loading ? 'Saving...' : 'Save & Open Builder'}
          </Button>
        </div>
      )}
    </div>
  );
}