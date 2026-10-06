import React, { useState } from 'react';
import { db } from '@/api/supabaseClient';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Loader2, X, Camera, Check } from 'lucide-react';
import { toast } from 'sonner';
import { SignedImg } from '@/components/shared/SignedImage';

/* ── Steps config ── */
const STEPS = [
  { id: 'weight',     label: 'Weight',   title: 'Body weight',        sub: 'Same scale, first thing in the morning if you can.' },
  { id: 'feeling',    label: 'Feeling',  title: 'How you felt',       sub: 'Mood, sleep, energy and stress across the week.' },
  { id: 'compliance', label: 'Week',     title: 'How the week went',  sub: 'Rough is fine. Honest numbers help more than good ones.' },
  { id: 'photos',     label: 'Photos',   title: 'Progress photos',    sub: 'Same spot and lighting as last time. Only you and your coach can see these.' },
  { id: 'notes',      label: 'Notes',    title: 'Anything else',      sub: 'Wins, struggles, questions. Your coach reads every word.' },
];

const MOODS = [
  { key: 'great',    label: 'Great' },
  { key: 'good',     label: 'Good' },
  { key: 'okay',     label: 'Okay' },
  { key: 'tired',    label: 'Tired' },
  { key: 'stressed', label: 'Stressed' },
];

/* ── Reusable Slider ── */
function Slider({ label, value, onChange, min = 1, max = 10, step = 1, lowLabel, highLabel, unit = '' }) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline justify-between">
        <label className="text-[15px] font-semibold text-foreground">{label}</label>
        <span className="num text-[26px] leading-none text-foreground">{value}{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-2 cursor-pointer accent-[rgb(var(--primary))]"
        style={{ touchAction: 'none' }}
        aria-label={label}
      />
      {(lowLabel || highLabel) && (
        <div className="flex justify-between text-[13px] text-muted-foreground">
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
      <label className={cn(
        'relative flex flex-col items-center justify-center rounded-xl cursor-pointer transition-colors aspect-[3/4] overflow-hidden',
        url ? 'bg-secondary' : 'border-[1.5px] border-dashed border-input bg-secondary/60 hover:border-foreground'
      )}>
        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onUpload} disabled={uploading} />
        {uploading ? (
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        ) : url ? (
          <>
            <SignedImg src={url} alt={label} className="w-full h-full object-cover" />
            <span className="absolute left-2 bottom-2 flex h-6 w-6 items-center justify-center rounded-full bg-success text-white">
              <Check className="w-3.5 h-3.5" strokeWidth={3} />
            </span>
            <button
              type="button"
              onClick={e => { e.preventDefault(); onRemove(); }}
              aria-label={`Remove ${label} photo`}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-[rgb(17_19_24/0.6)] flex items-center justify-center"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </>
        ) : (
          <span className="flex flex-col items-center gap-1.5">
            <Camera className="w-5 h-5 text-foreground" />
            <span className="text-sm font-semibold text-foreground">Add</span>
          </span>
        )}
      </label>
      <p className="text-sm font-semibold text-foreground text-center">{label}</p>
    </div>
  );
}

function QuickPicks({ value, onPick }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {[0, 25, 50, 75, 100].map(v => (
        <button key={v} type="button"
          onClick={() => onPick(v)}
          className={cn(
            'touch-compact h-8 px-3 rounded-md text-[13px] font-medium border transition-colors tabular-nums',
            value === v ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-input text-foreground hover:bg-accent'
          )}>
          {v}%
        </button>
      ))}
    </div>
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
    const { file_url } = await db.uploadFile({ file });
    setPhotos(p => ({ ...p, [slot]: file_url }));
    setUploadingSlot(null);
  };

  const handleSubmit = async () => {
    setSaving(true);
    const photoUrls = Object.values(photos).filter(Boolean);
    await db.entities.CheckIn.create({
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
    toast.success('Check-in sent');
  };

  if (submitted) {
    return (
      <div className="py-16">
        <h2 className="text-[32px] leading-none text-foreground">Sent.</h2>
        <p className="text-[15px] text-muted-foreground mt-3 max-w-sm">Your coach has your check-in and will reply here. Nothing else to do this week.</p>
      </div>
    );
  }

  const currentStep = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const nextLabel = isLast ? 'Send check-in' : `Next: ${STEPS[step + 1].label.toLowerCase()}`;

  return (
    <div className="flex flex-col min-h-[70vh]">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[15px] text-muted-foreground">
          {clientName ? `${clientName.split(' ')[0]}'s check-in` : 'Weekly check-in'}, step {step + 1} of {STEPS.length}
        </p>
      </div>

      {/* Progress segments with labels */}
      <div className="grid gap-1.5 mt-3 mb-6" style={{ gridTemplateColumns: `repeat(${STEPS.length}, minmax(0, 1fr))` }}>
        {STEPS.map((s, i) => (
          <div key={s.id}>
            <div className={cn('h-[3px] rounded-full', i < step ? 'bg-success' : i === step ? 'bg-primary' : 'bg-border')} />
            <p className={cn('text-[12px] mt-1.5 truncate', i <= step ? 'text-foreground font-medium' : 'text-muted-foreground')}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mb-6">
        <h2 className="text-[32px] sm:text-[36px] leading-none text-foreground">{currentStep.title}</h2>
        <p className="text-[15px] text-muted-foreground mt-2">{currentStep.sub}</p>
      </div>

      <div className="flex-1 space-y-5">

        {currentStep.id === 'weight' && (
          <div className="space-y-3">
            <div className="relative">
              <Input
                type="number"
                inputMode="decimal"
                placeholder="175.0"
                value={weight}
                onChange={e => setWeight(e.target.value)}
                className="h-20 text-[40px] num text-center pr-12"
                autoFocus
                aria-label="Weight in pounds"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[15px] text-muted-foreground">lb</span>
            </div>
            <p className="text-[13px] text-muted-foreground text-center">Optional. Skip it if you didn't weigh in.</p>
            {lastWeight && (
              <div className="flex items-center justify-between rounded-lg bg-secondary px-4 py-3 text-sm">
                <span className="text-muted-foreground">Last check-in <span className="font-semibold text-foreground tabular-nums">{lastWeight} lb</span></span>
                {weightDiff !== null && (
                  <span className="font-semibold text-foreground tabular-nums">
                    {Number(weightDiff) > 0 ? '+' : Number(weightDiff) < 0 ? '−' : ''}{Math.abs(weightDiff)} lb
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {currentStep.id === 'feeling' && (
          <div className="space-y-8">
            <div className="space-y-2.5">
              <p className="text-[15px] font-semibold text-foreground">Overall mood</p>
              <div className="grid grid-cols-5 gap-1.5">
                {MOODS.map(m => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setMood(m.key)}
                    aria-pressed={mood === m.key}
                    className={cn(
                      'h-11 rounded-lg border text-[13px] font-medium transition-colors',
                      mood === m.key ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-input text-foreground hover:bg-accent'
                    )}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            <Slider label="Sleep" unit=" h" value={sleep} onChange={setSleep}
              min={1} max={12} step={0.5} lowLabel="1 hour" highLabel="12 hours" />
            <Slider label="Energy" value={energy} onChange={setEnergy}
              min={1} max={10} lowLabel="Exhausted" highLabel="Full of energy" />
            <Slider label="Stress" value={stress} onChange={setStress}
              min={1} max={10} lowLabel="Calm" highLabel="Very stressed" />
          </div>
        )}

        {currentStep.id === 'compliance' && (
          <div className="space-y-8">
            <div className="space-y-3">
              <Slider label="Workouts done" unit="%" value={trainingCompliance} onChange={setTrainingCompliance}
                min={0} max={100} step={5} lowLabel="None" highLabel="Every one" />
              <QuickPicks value={trainingCompliance} onPick={setTrainingCompliance} />
            </div>
            <div className="space-y-3">
              <Slider label="Ate to plan" unit="%" value={nutritionCompliance} onChange={setNutritionCompliance}
                min={0} max={100} step={5} lowLabel="Off track" highLabel="Every meal" />
              <QuickPicks value={nutritionCompliance} onPick={setNutritionCompliance} />
            </div>
          </div>
        )}

        {currentStep.id === 'photos' && (
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
        )}

        {currentStep.id === 'notes' && (
          <Textarea
            placeholder="What went well, what got in the way, anything you want to ask."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={7}
            className="resize-none"
            autoFocus
          />
        )}
      </div>

      <div className="flex gap-3 mt-8">
        {step > 0 && (
          <Button variant="outline" className="h-12 px-5 text-[15px]" onClick={() => setStep(s => s - 1)}>
            Back
          </Button>
        )}
        <Button
          className="flex-1 h-12 text-[15px]"
          onClick={() => isLast ? handleSubmit() : setStep(s => s + 1)}
          disabled={saving || (currentStep.id === 'photos' && !!uploadingSlot)}
        >
          {saving ? <><Loader2 className="animate-spin" /> Sending…</> : nextLabel}
        </Button>
      </div>
    </div>
  );
}
