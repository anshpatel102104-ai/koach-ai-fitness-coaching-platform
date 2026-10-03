import React, { useState } from 'react';
import { supabase as base44 } from '@/api/supabaseClient';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  CheckCircle2, Loader2, Upload, X, TrendingDown, TrendingUp,
  Minus, ChevronLeft, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { SignedImg } from '@/components/shared/SignedImage';

/* ── Steps config ── */
const STEPS = [
  { id: 'weight',     emoji: '⚖️',  title: 'Body Weight' },
  { id: 'feeling',    emoji: '📊',  title: 'How Are You Feeling?' },
  { id: 'compliance', emoji: '✅',  title: 'This Week\'s Compliance' },
  { id: 'photos',     emoji: '📸',  title: 'Progress Photos' },
  { id: 'notes',      emoji: '📝',  title: 'Notes for Your Coach' },
];

const MOODS = [
  { key: 'great',    emoji: '😄', label: 'Great' },
  { key: 'good',     emoji: '🙂', label: 'Good' },
  { key: 'okay',     emoji: '😐', label: 'Okay' },
  { key: 'tired',    emoji: '😴', label: 'Tired' },
  { key: 'stressed', emoji: '😰', label: 'Stressed' },
];

/* ── Reusable Slider ── */
function Slider({ label, emoji, value, onChange, min = 1, max = 10, step = 1, lowLabel, highLabel }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-base font-semibold">
          {emoji && <span className="mr-1.5">{emoji}</span>}
          {label}
        </label>
        <span className="text-2xl font-bold text-primary tabular-nums">{value}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-4 rounded-full accent-primary cursor-pointer"
        style={{ touchAction: 'none' }}
      />
      {(lowLabel || highLabel) && (
        <div className="flex justify-between text-xs text-foreground">
          <span>{lowLabel}</span>
          <span>{highLabel}</span>
        </div>
      )}
    </div>
  );
}

/* ── Photo slot ── */
function PhotoSlot({ label, url, onUpload, onRemove, uploading }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-medium text-foreground text-center">{label}</p>
      <label className={cn(
        'relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed cursor-pointer transition-all aspect-[3/4]',
        uploading ? 'border-primary/50 bg-primary/5' :
        url ? 'border-transparent' :
        'border-border bg-secondary/30 hover:border-primary/40 active:scale-[0.97]'
      )}>
        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onUpload} disabled={uploading} />
        {uploading ? (
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
        ) : url ? (
          <>
            <SignedImg src={url} alt={label} className="w-full h-full object-cover rounded-2xl" />
            <button
              type="button"
              onClick={e => { e.preventDefault(); onRemove(); }}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 py-4 px-2">
            <Upload className="w-7 h-7 text-foreground" />
            <span className="text-xs text-foreground text-center">Tap to add</span>
          </div>
        )}
      </label>
    </div>
  );
}

/* ── Check row ── */
function CheckRow({ checked, onChange, label, sublabel }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        'w-full flex items-center gap-4 px-4 py-4 rounded-2xl border-2 transition-all active:scale-[0.98] text-left',
        checked ? 'border-primary bg-primary/8' : 'border-border bg-secondary/30'
      )}
    >
      <div className={cn(
        'w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
        checked ? 'border-primary bg-primary' : 'border-muted-foreground/40'
      )}>
        {checked && <CheckCircle2 className="w-4 h-4 text-white" strokeWidth={2.5} />}
      </div>
      <div>
        <p className="text-base font-semibold leading-tight">{label}</p>
        {sublabel && <p className="text-sm text-foreground mt-0.5">{sublabel}</p>}
      </div>
    </button>
  );
}

export default function CheckInSubmitForm({ clientId, clientName, lastCheckIn, onSuccess }) {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingSlot, setUploadingSlot] = useState(null);

  const [weight, setWeight] = useState('');
  const [photos, setPhotos] = useState({ front: '', side: '', back: '' });
  const [sleep, setSleep] = useState(7);
  const [energy, setEnergy] = useState(7);
  const [stress, setStress] = useState(3);
  const [mood, setMood] = useState('');
  const [trainingCompliance, setTrainingCompliance] = useState(70);
  const [nutritionCompliance, setNutritionCompliance] = useState(70);
  const [notes, setNotes] = useState('');

  const lastWeight = lastCheckIn?.weight ?? null;
  const weightDiff = weight && lastWeight ? (Number(weight) - lastWeight).toFixed(1) : null;

  const handlePhotoUpload = async (slot, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingSlot(slot);
    const { file_url } = await base44.uploadFile({ file });
    setPhotos(p => ({ ...p, [slot]: file_url }));
    setUploadingSlot(null);
  };

  const handleSubmit = async () => {
    setSaving(true);
    const photoUrls = Object.values(photos).filter(Boolean);
    await base44.entities.CheckIn.create({
      client_id: clientId,
      client_name: clientName,
      date: format(new Date(), 'yyyy-MM-dd'),
      review_status: 'pending',
      weight: weight ? Number(weight) : undefined,
      sleep_hours: sleep,
      energy_level: energy,
      stress_level: stress,
      mood: mood || undefined,
      compliance_training: trainingCompliance,
      compliance_nutrition: nutritionCompliance,
      notes: notes || undefined,
      photo_urls: photoUrls.length ? photoUrls : undefined,
    });
    setSaving(false);
    setSubmitted(true);
    onSuccess?.();
    toast.success('Check-in submitted! 🎉');
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-5 text-center fade-up">
        <div className="w-24 h-24 rounded-full bg-accent/20 flex items-center justify-center">
          <CheckCircle2 className="w-12 h-12 text-accent" />
        </div>
        <div>
          <h2 className="text-2xl font-heading font-bold">You're all set!</h2>
          <p className="text-foreground text-sm mt-2 max-w-xs">Your coach has been notified and will review your check-in shortly. Keep up the great work 💪</p>
        </div>
      </div>
    );
  }

  const currentStep = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="flex flex-col min-h-[75vh]">
      {/* ── Progress bar ── */}
      <div className="flex gap-1.5 mb-6">
        {STEPS.map((s, i) => (
          <div
            key={s.id}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-all duration-300',
              i < step ? 'bg-primary' : i === step ? 'bg-primary/60' : 'bg-secondary'
            )}
          />
        ))}
      </div>

      {/* ── Step label ── */}
      <div className="mb-6">
        <p className="text-2xl">{currentStep.emoji}</p>
        <h2 className="text-xl font-heading font-bold mt-1">{currentStep.title}</h2>
        <p className="text-sm text-foreground mt-0.5">Step {step + 1} of {STEPS.length}</p>
      </div>

      {/* ── Step content ── */}
      <div className="flex-1 space-y-5">

        {/* Weight */}
        {currentStep.id === 'weight' && (
          <div className="space-y-4">
            <Input
              type="number"
              inputMode="decimal"
              placeholder="e.g. 175"
              value={weight}
              onChange={e => setWeight(e.target.value)}
              className="h-20 text-3xl font-bold text-center tracking-tight rounded-2xl"
              autoFocus
            />
            <p className="text-center text-sm text-foreground">Weight in lbs (optional)</p>
            {lastWeight && (
              <div className="flex items-center justify-center gap-2 text-sm bg-secondary/40 rounded-xl p-3">
                <span className="text-foreground">Last week: <span className="font-semibold text-foreground">{lastWeight} lbs</span></span>
                {weightDiff !== null && (
                  <span className={cn(
                    'flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-xs',
                    Number(weightDiff) < 0 ? 'bg-accent/15 text-accent' :
                    Number(weightDiff) > 0 ? 'bg-destructive/15 text-destructive' :
                    'bg-muted text-foreground'
                  )}>
                    {Number(weightDiff) < 0 ? <TrendingDown className="w-3.5 h-3.5" /> :
                     Number(weightDiff) > 0 ? <TrendingUp className="w-3.5 h-3.5" /> :
                     <Minus className="w-3.5 h-3.5" />}
                    {Number(weightDiff) > 0 ? '+' : ''}{weightDiff} lbs
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Feeling */}
        {currentStep.id === 'feeling' && (
          <div className="space-y-8">
            {/* Mood picker */}
            <div className="space-y-3">
              <p className="text-base font-semibold">Overall mood this week?</p>
              <div className="grid grid-cols-5 gap-2">
                {MOODS.map(m => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setMood(m.key)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 py-3 rounded-2xl border-2 transition-all active:scale-[0.96]',
                      mood === m.key
                        ? 'border-primary bg-primary/8 shadow-sm'
                        : 'border-border bg-secondary/30'
                    )}
                  >
                    <span className="text-2xl">{m.emoji}</span>
                    <span className="text-[10px] font-semibold text-muted-foreground">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <Slider emoji="😴" label="Sleep" value={sleep} onChange={setSleep}
              min={1} max={12} step={0.5} lowLabel="1 hr" highLabel="12 hrs" />
            <Slider emoji="⚡" label="Energy" value={energy} onChange={setEnergy}
              min={1} max={10} lowLabel="Exhausted" highLabel="Energized" />
            <Slider emoji="🧠" label="Stress" value={stress} onChange={setStress}
              min={1} max={10} lowLabel="Super calm" highLabel="Very stressed" />
          </div>
        )}

        {/* Compliance */}
        {currentStep.id === 'compliance' && (
          <div className="space-y-8">
            <div className="space-y-4">
              <Slider
                emoji="🏋️"
                label="Training compliance"
                value={trainingCompliance}
                onChange={setTrainingCompliance}
                min={0} max={100} step={5}
                lowLabel="0% — skipped all"
                highLabel="100% — perfect"
              />
              <div className="flex justify-center gap-2 flex-wrap">
                {[0,25,50,75,100].map(v => (
                  <button key={v} type="button"
                    onClick={() => setTrainingCompliance(v)}
                    className={cn(
                      'px-3 py-1 rounded-full text-xs font-semibold border transition-colors',
                      trainingCompliance === v ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'
                    )}>
                    {v}%
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <Slider
                emoji="🥗"
                label="Nutrition compliance"
                value={nutritionCompliance}
                onChange={setNutritionCompliance}
                min={0} max={100} step={5}
                lowLabel="0% — off track"
                highLabel="100% — nailed it"
              />
              <div className="flex justify-center gap-2 flex-wrap">
                {[0,25,50,75,100].map(v => (
                  <button key={v} type="button"
                    onClick={() => setNutritionCompliance(v)}
                    className={cn(
                      'px-3 py-1 rounded-full text-xs font-semibold border transition-colors',
                      nutritionCompliance === v ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'
                    )}>
                    {v}%
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Photos */}
        {currentStep.id === 'photos' && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              {(['front', 'side', 'back']).map(slot => (
                <PhotoSlot
                  key={slot}
                  label={slot.charAt(0).toUpperCase() + slot.slice(1)}
                  url={photos[slot]}
                  uploading={uploadingSlot === slot}
                  onUpload={e => handlePhotoUpload(slot, e)}
                  onRemove={() => setPhotos(p => ({ ...p, [slot]: '' }))}
                />
              ))}
            </div>
            <p className="text-xs text-foreground text-center">Photos are private — only visible to your coach</p>
          </div>
        )}

        {/* Notes */}
        {currentStep.id === 'notes' && (
          <Textarea
            placeholder="Share wins, struggles, how you're feeling overall, or anything you want your coach to know..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={7}
            className="text-base resize-none leading-relaxed rounded-2xl"
            autoFocus
          />
        )}
      </div>

      {/* ── Navigation ── */}
      <div className="flex gap-3 mt-8 pt-4 border-t border-border">
        {step > 0 && (
          <Button
            variant="outline"
            size="lg"
            className="h-14 px-5 rounded-2xl"
            onClick={() => setStep(s => s - 1)}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
        )}
        <Button
          size="lg"
          className="flex-1 h-14 text-base font-bold rounded-2xl"
          onClick={() => isLast ? handleSubmit() : setStep(s => s + 1)}
          disabled={saving || (currentStep.id === 'photos' && !!uploadingSlot)}
        >
          {saving ? (
            <><Loader2 className="w-5 h-5 animate-spin mr-2" />Submitting...</>
          ) : isLast ? (
            'Submit Check-In ✓'
          ) : (
            <>Next <ChevronRight className="w-5 h-5 ml-1" /></>
          )}
        </Button>
      </div>
    </div>
  );
}