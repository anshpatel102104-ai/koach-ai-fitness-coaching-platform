import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DialogTitle } from '@/components/ui/dialog';
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
      if (!program.title) program.title = 'New program';
      if (!Array.isArray(program.workouts) || program.workouts.length === 0) {
        throw new Error('The draft came back with no training days. Try again.');
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
      toast.success('Program saved');
      onProgramCreated(newProgram);
    } catch (error) {
      toast.error("Couldn't save the program. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const isReview = step === 'review';
  const STEP_LABELS = {
    profile: 'Step 1 of 4: the client',
    preferences: 'Step 2 of 4: how the program runs',
    generating: 'Step 3 of 4: drafting',
    review: 'Step 4 of 4: check it over',
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      {/* Header */}
      <div className="flex-shrink-0 space-y-3 border-b border-border px-5 pb-4 pt-5 sm:px-6">
        <div className="flex items-start gap-2 pr-8">
          <button onClick={onBack} className="touch-compact -ml-1.5 mt-1 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <DialogTitle className="text-[26px]">Generate with AI</DialogTitle>
            <p className="text-sm text-muted-foreground">{STEP_LABELS[step]}</p>
          </div>
        </div>
        <div className="flex h-1 gap-1.5" aria-hidden>
          {STEPS.map((s) => (
            <div key={s} className={`flex-1 rounded-full ${STEPS.indexOf(s) <= STEPS.indexOf(step) ? 'bg-foreground' : 'bg-secondary'}`} />
          ))}
        </div>
        <AiUsageMeter />
      </div>

      {/* Scrollable content */}
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
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
      </div>

      {/* Footer — review step only */}
      {isReview && (
        <div className="flex flex-shrink-0 items-center justify-between gap-3 border-t border-border bg-card px-5 py-3 sm:px-6">
          <Button
            variant="outline"
            onClick={() => {
              setStep('generating');
              generateProgram(preferences);
            }}
            disabled={loading}
          >
            Draft it again
          </Button>
          <Button
            onClick={() => handleSaveProgram(reviewData)}
            disabled={loading || !(reviewData?.title ?? generatedProgram?.title)}
          >
            {loading ? 'Saving…' : 'Save and open in builder'}
          </Button>
        </div>
      )}
    </div>
  );
}
