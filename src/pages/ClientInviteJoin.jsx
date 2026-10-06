import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import { Camera, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input as UIInput } from '@/components/ui/input';
import { Textarea as UITextarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { SignedImg } from '@/components/shared/SignedImage';

const SPECIALTIES = [
  'Weight Loss', 'Muscle Building', 'Athletic Performance', 'General Fitness',
  'Nutrition Coaching', 'Online Coaching', 'Bodybuilding / Competition',
  'Youth Athletics', 'Senior Fitness', 'Other',
];
const EXPERIENCE_OPTS = ['Just starting out', '1–2 years', '3–5 years', '5–10 years', '10+ years'];
const CLIENT_COUNT_OPTS = ['0 (just getting started)', '1–5', '6–15', '16–30', '30+'];
const CURRENT_TOOLS = [
  'Spreadsheets / Google Sheets', 'Trainerize', 'Everfit', 'TrueCoach',
  'Paper / manual', 'Another app', "I'm just starting out",
];
const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Phoenix', 'America/Anchorage', 'Pacific/Honolulu',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin',
  'Asia/Dubai', 'Asia/Kolkata', 'Asia/Singapore', 'Asia/Tokyo',
  'Australia/Sydney', 'Pacific/Auckland',
];

/* ── Shared chrome ── */
function Shell({ step, onSkip, children, footer }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex-shrink-0 bg-sidebar">
        <div className="mx-auto flex max-w-[560px] items-center justify-between px-5 py-3.5">
          <img src="/koach-logo-white.png" alt="KOACH AI" className="h-6 w-auto" />
          {onSkip && (
            <button type="button" onClick={onSkip} className="touch-compact text-[13px] font-medium text-white/70 underline underline-offset-4 hover:text-white">
              Skip setup
            </button>
          )}
        </div>
      </header>
      {typeof step === 'number' && (
        <div className="mx-auto w-full max-w-[560px] px-5 pt-5">
          <div className="grid grid-cols-5 gap-1.5" aria-label={`Step ${step} of 5`}>
            {[1, 2, 3, 4, 5].map(i => (
              <span key={i} className={cn('h-1 rounded-full', i < step ? 'bg-success' : i === step ? 'bg-foreground' : 'bg-input')} />
            ))}
          </div>
        </div>
      )}
      <main className="mx-auto w-full max-w-[560px] flex-1 px-5 pb-8 pt-6">{children}</main>
      {footer && (
        <div className="sticky bottom-0 border-t border-border bg-card">
          <div className="mx-auto flex max-w-[560px] gap-2 px-5 pt-3" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}>
            {footer}
          </div>
        </div>
      )}
    </div>
  );
}

function StepHeader({ step, title, sub }) {
  return (
    <div className="mb-5">
      <p className="text-[13px] font-medium text-muted-foreground">Step {step} of 5</p>
      <h1 className="mt-1 text-[32px] text-foreground">{title}</h1>
      {sub && <p className="mt-1 text-[15px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function StepFooter({ onBack, onNext, disabled, label = 'Continue' }) {
  return (
    <>
      <Button variant="outline" size="lg" className="h-12 px-6" onClick={onBack}>Back</Button>
      <Button size="lg" className="h-12 flex-1 text-base font-bold" onClick={onNext} disabled={disabled}>{label}</Button>
    </>
  );
}

function Label({ children }) {
  return <div className="mb-1.5 text-[13px] font-medium text-muted-foreground">{children}</div>;
}

function Req() {
  return <span className="ml-1 text-foreground" aria-hidden>*</span>;
}

function Input({ label, value, onChange, type = 'text', placeholder, required, hint }) {
  return (
    <div className="mb-3.5">
      {label && <Label>{label}{required && <Req />}</Label>}
      <UIInput type={type} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="h-11 text-base" />
      {hint && <div className="mt-1 text-[13px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function Textarea({ label, value, onChange, placeholder, rows = 3 }) {
  return (
    <div className="mb-3.5">
      {label && <Label>{label}</Label>}
      <UITextarea value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} className="text-base" />
    </div>
  );
}

function Select({ label, value, onChange, options, required }) {
  return (
    <div className="mb-3.5">
      {label && <Label>{label}{required && <Req />}</Label>}
      <select
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        className={cn('h-11 w-full appearance-none rounded-md border border-input bg-card px-3 text-base focus:border-foreground focus:outline-none', value ? 'text-foreground' : 'text-muted-foreground')}
      >
        <option value="" disabled>Select</option>
        {options.map(o => (
          <option key={o.value || o} value={o.value || o}>{o.label || o}</option>
        ))}
      </select>
    </div>
  );
}

function PasswordInput({ value, onChange }) {
  const [show, setShow] = useState(false);
  const strength = !value ? 0 : value.length < 6 ? 1 : value.length < 10 ? 2 : /[A-Z]/.test(value) && /[0-9]/.test(value) ? 4 : 3;
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  return (
    <div className="mb-3.5">
      <Label>Password<Req /></Label>
      <div className="relative">
        <UIInput type={show ? 'text' : 'password'} value={value || ''} onChange={e => onChange(e.target.value)}
          placeholder="At least 6 characters" className="h-11 pr-16 text-base" autoComplete="new-password" />
        <button type="button" onClick={() => setShow(s => !s)}
          className="touch-compact absolute right-3 top-1/2 -translate-y-1/2 text-[13px] font-medium text-muted-foreground hover:text-foreground">
          {show ? 'Hide' : 'Show'}
        </button>
      </div>
      {value && (
        <div className="mt-2 flex items-center gap-2">
          <div className="flex flex-1 gap-1">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className={cn('h-1 flex-1 rounded-full', i <= strength ? (strength === 1 ? 'bg-destructive' : strength === 2 ? 'bg-partial' : 'bg-success') : 'bg-input')} />
            ))}
          </div>
          <span className="text-[13px] text-muted-foreground">{labels[strength]}</span>
        </div>
      )}
    </div>
  );
}

function Chip({ label, selected, onClick }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={selected}
      className={cn('touch-compact rounded-md px-3 py-2 text-sm font-medium transition-colors',
        selected ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground shadow-[inset_0_0_0_1px_rgb(var(--input))] hover:bg-accent')}>
      {label}
    </button>
  );
}

// ── STEP 0: WELCOME ──
function Welcome({ onNext, onSkip }) {
  return (
    <Shell onSkip={onSkip}>
      <h1 className="text-[40px] text-foreground">Set up your coaching business</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
        Five short steps, about three minutes. Your account, your business, your profile and how you get paid.
      </p>
      <ol className="mt-6 divide-y divide-border rounded-xl bg-card shadow-[0_0_0_1px_rgb(var(--border)/0.6)]">
        {['Create your account', 'Your coaching business', 'Your coaching profile', 'Payments and packages', 'Done'].map((t, i) => (
          <li key={t} className="flex items-center gap-3 px-4 py-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full border-[1.5px] border-input text-[13px] font-semibold text-foreground">{i + 1}</span>
            <span className="text-[15px] font-semibold text-foreground">{t}</span>
          </li>
        ))}
      </ol>
      <Button size="lg" className="mt-6 h-12 w-full text-base font-bold" onClick={onNext}>Get started</Button>
    </Shell>
  );
}

// ── STEP 1: CREATE ACCOUNT ──
function Step1({ data, set, onNext, onBack, onSkip }) {
  const valid = data.first_name?.trim() && data.last_name?.trim() && data.email?.includes('@') && (data.password || '').length >= 6;
  return (
    <Shell step={1} onSkip={onSkip} footer={<StepFooter onBack={onBack} onNext={onNext} disabled={!valid} />}>
      <StepHeader step={1} title="Create your account" sub="Your name and how you'll sign in." />
      <div className="flex gap-3">
        <div className="flex-1"><Input label="First name" value={data.first_name} onChange={v => set('first_name', v)} placeholder="Alex" required /></div>
        <div className="flex-1"><Input label="Last name" value={data.last_name} onChange={v => set('last_name', v)} placeholder="Johnson" required /></div>
      </div>
      <Input label="Email" value={data.email} onChange={v => set('email', v)} type="email" placeholder="you@email.com" required />
      <PasswordInput value={data.password} onChange={v => set('password', v)} />
      <Input label="Phone (optional)" value={data.phone} onChange={v => set('phone', v)} type="tel" placeholder="+1 (555) 000-0000" />
    </Shell>
  );
}

// ── STEP 2: COACHING BUSINESS ──
function Step2({ data, set, onNext, onBack, onSkip }) {
  const specialties = data.specialties || [];
  const tools = data.current_tools || [];
  const toggle = (key, arr, val) => set(key, arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
  const valid = data.business_name?.trim() && specialties.length > 0 && data.experience && data.client_count;
  return (
    <Shell step={2} onSkip={onSkip} footer={<StepFooter onBack={onBack} onNext={onNext} disabled={!valid} />}>
      <StepHeader step={2} title="Your coaching business" sub="So we can set up the app around how you coach." />
      <Input label="Business or coaching name" value={data.business_name} onChange={v => set('business_name', v)} placeholder="e.g. Myles Harris Fitness" required />
      <div className="mb-3.5">
        <Label>What do you coach?<Req /> <span className="font-normal">Pick any that apply.</span></Label>
        <div className="flex flex-wrap gap-2">
          {SPECIALTIES.map(s => <Chip key={s} label={s} selected={specialties.includes(s)} onClick={() => toggle('specialties', specialties, s)} />)}
        </div>
      </div>
      <Select label="Years coaching" value={data.experience} onChange={v => set('experience', v)} options={EXPERIENCE_OPTS} required />
      <Select label="Clients right now" value={data.client_count} onChange={v => set('client_count', v)} options={CLIENT_COUNT_OPTS} required />
      <div className="mb-3.5">
        <Label>Where do you manage clients today? <span className="font-normal">Pick any that apply.</span></Label>
        <div className="flex flex-wrap gap-2">
          {CURRENT_TOOLS.map(t => <Chip key={t} label={t} selected={tools.includes(t)} onClick={() => toggle('current_tools', tools, t)} />)}
        </div>
      </div>
    </Shell>
  );
}

// ── STEP 3: COACHING PROFILE ──
function Step3({ data, set, onNext, onBack, onSkip }) {
  const fileRef = useRef();
  const [uploading, setUploading] = useState(false);
  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await db.uploadFile({ file, bucket: 'branding' });
    set('avatar_url', file_url);
    setUploading(false);
  };
  return (
    <Shell step={3} onSkip={onSkip} footer={<StepFooter onBack={onBack} onNext={onNext} />}>
      <StepHeader step={3} title="Your coaching profile" sub="Clients see this in their app." />
      <div className="mb-4">
        <Label>Profile photo (optional)</Label>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border-[1.5px] border-dashed border-input bg-card text-muted-foreground">
            {data.avatar_url ? <SignedImg src={data.avatar_url} alt="" className="h-full w-full object-cover" /> : <Camera className="h-5 w-5" />}
          </div>
          <div>
            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              {uploading ? 'Uploading' : data.avatar_url ? 'Change photo' : 'Upload photo'}
            </Button>
            <div className="mt-1 text-[13px] text-muted-foreground">You can add one later.</div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
          </div>
        </div>
      </div>
      <Textarea label="Short bio" value={data.bio} onChange={v => set('bio', v)} placeholder="How you coach and who you work best with." rows={3} />
      <Input label="Certifications" value={data.certifications} onChange={v => set('certifications', v)} placeholder="e.g. NASM CPT, ACE, ISSA, CrossFit L2" />
      <Input label="Instagram (optional)" value={data.instagram} onChange={v => set('instagram', v)} placeholder="@yourhandle" />
      <Input label="Website (optional)" value={data.website} onChange={v => set('website', v)} type="url" placeholder="https://yourwebsite.com" />
      <Select label="Time zone" value={data.timezone} onChange={v => set('timezone', v)} options={TIMEZONES.map(tz => ({ value: tz, label: tz.replace(/_/g, ' ') }))} />
    </Shell>
  );
}

// ── STEP 4: BUSINESS SETUP ──
function Step4({ data, set, onNext, onBack, onSkip, saving }) {
  const paymentMethod = data.payment_method || '';
  return (
    <Shell step={4} onSkip={onSkip} footer={<StepFooter onBack={onBack} onNext={onNext} disabled={saving} label={saving ? 'Saving' : 'Continue'} />}>
      <StepHeader step={4} title="Payments and packages" sub="What you charge and how clients pay you." />

      <div className="mb-3.5">
        <Label>Monthly rate per client</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base font-semibold text-muted-foreground">$</span>
          <UIInput type="number" value={data.monthly_rate || ''} onChange={e => set('monthly_rate', e.target.value)} placeholder="150" className="h-11 pl-7 pr-12 text-base" />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground">/mo</span>
        </div>
      </div>

      <label className="mb-5 flex items-center justify-between gap-3 rounded-xl bg-card px-4 py-3.5 shadow-[0_0_0_1px_rgb(var(--border)/0.6)]">
        <span>
          <span className="block text-[15px] font-semibold text-foreground">Offer different packages?</span>
          <span className="block text-[13px] text-muted-foreground">For example 1 month, 3 months or custom</span>
        </span>
        <Switch checked={!!data.has_packages} onCheckedChange={() => set('has_packages', !data.has_packages)} />
      </label>

      <Label>How do you want to get paid?</Label>
      <div className="space-y-2">
        {[
          { value: 'stripe', label: 'Stripe', sub: 'Automatic billing, receipts and payment tracking. Recommended.' },
          { value: 'manual', label: 'Manual', sub: 'Venmo, Zelle or cash. You collect payments yourself.' },
          { value: 'later', label: 'Set up later', sub: "You can choose after you've started." },
        ].map(opt => {
          const on = paymentMethod === opt.value;
          return (
            <button key={opt.value} type="button" role="radio" aria-checked={on} onClick={() => set('payment_method', opt.value)}
              className={cn('flex w-full items-start gap-3 rounded-lg bg-card px-4 py-3 text-left transition-colors',
                on ? 'shadow-[inset_0_0_0_2px_rgb(var(--foreground))]' : 'shadow-[inset_0_0_0_1px_rgb(var(--input))] hover:bg-accent')}>
              <span className={cn('mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border-2', on ? 'border-foreground' : 'border-input')}>
                {on && <span className="h-2 w-2 rounded-full bg-foreground" />}
              </span>
              <span>
                <span className="block text-[15px] font-semibold text-foreground">{opt.label}</span>
                <span className="block text-[13px] text-muted-foreground">{opt.sub}</span>
              </span>
            </button>
          );
        })}
      </div>
    </Shell>
  );
}

// ── STEP 5: ALL SET ──
function Step5({ firstName }) {
  const navigate = useNavigate();
  const go = () => {
    localStorage.setItem('koach_onboarding_complete', '1');
    localStorage.setItem('koach_banner_dismissed', '0');
    navigate('/');
  };

  const checklist = [
    { label: 'Account created', sub: 'You can change any of this in Settings.', done: true },
    { label: 'Add your first client', sub: 'Send an invite link or import a list.', done: false },
    { label: 'Build your first program', sub: 'Start from a template or draft one with AI.', done: false },
    { label: 'Connect Stripe payments', sub: 'Clients pay you directly.', done: false },
    { label: 'Finish your profile', sub: 'Photo, bio and brand colour.', done: false },
  ];
  const doneCount = checklist.filter(c => c.done).length;

  return (
    <Shell step={5}>
      <h1 className="text-[36px] text-foreground">Welcome, {firstName || 'coach'}. Let's get your first client checking in.</h1>
      <p className="mt-2 text-[15px] text-muted-foreground">Your Today page fills in as soon as a client logs a workout.</p>
      <div className="mt-5 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-input">
          <div className="h-full rounded-full bg-foreground" style={{ width: `${(doneCount / checklist.length) * 100}%` }} />
        </div>
        <span className="text-[13px] font-semibold text-foreground">{doneCount} of {checklist.length} done</span>
      </div>
      <ul className="mt-4 space-y-2">
        {checklist.map(({ label, sub, done }, i) => (
          <li key={label} className="flex items-center gap-3 rounded-xl bg-card px-4 py-3.5 shadow-[0_0_0_1px_rgb(var(--border)/0.6)]">
            <span className={cn('flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[13px] font-semibold',
              done ? 'bg-success text-white' : 'border-[1.5px] border-input text-foreground')}>
              {done ? <Check className="h-4 w-4" strokeWidth={3} /> : i + 1}
            </span>
            <span>
              <span className="block text-[15px] font-semibold text-foreground">{label}</span>
              <span className="block text-[13px] text-muted-foreground">{sub}</span>
            </span>
          </li>
        ))}
      </ul>
      <Button size="lg" className="mt-6 h-12 w-full text-base font-bold" onClick={go}>Go to your dashboard</Button>
      <button type="button" onClick={go} className="mt-3 w-full text-center text-sm font-semibold text-foreground underline underline-offset-4">
        Finish setup later
      </button>
    </Shell>
  );
}

// ── MAIN ──
export default function ClientInviteJoin() {
  const { updateMe } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setData(d => ({ ...d, [k]: v }));
  const next = () => setCurrentStep(s => s + 1);
  const back = () => setCurrentStep(s => s - 1);
  const skip = () => {
    localStorage.setItem('koach_onboarding_complete', '1');
    navigate('/');
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      await updateMe({
        onboarding_complete: true,
        business_name: data.business_name,
        coaching_specialties: data.specialties,
        coaching_experience: data.experience,
        current_client_count: data.client_count,
        bio: data.bio,
        certifications: data.certifications,
        instagram: data.instagram,
        website: data.website,
        timezone: data.timezone,
        monthly_rate: data.monthly_rate ? Number(data.monthly_rate) : undefined,
        payment_method: data.payment_method,
        phone: data.phone,
        avatar_url: data.avatar_url,
      });
      try {
        const existing = await db.entities.CoachSettings.list();
        if (existing.length > 0) {
          await db.entities.CoachSettings.update(existing[0].id, { zapier_connected: false });
        } else {
          await db.entities.CoachSettings.create({ zapier_connected: false });
        }
      } catch (_) {}
      next();
    } catch (e) {
      toast.error('That didn\'t save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const sharedProps = { data, set, onNext: next, onBack: back, onSkip: skip };

  return (
    <div className="min-h-screen bg-background">
      {currentStep === 0 && <Welcome onNext={next} onSkip={skip} />}
      {currentStep === 1 && <Step1 {...sharedProps} />}
      {currentStep === 2 && <Step2 {...sharedProps} />}
      {currentStep === 3 && <Step3 {...sharedProps} />}
      {currentStep === 4 && <Step4 {...sharedProps} onNext={handleFinish} saving={saving} />}
      {currentStep === 5 && <Step5 firstName={data.first_name} />}
    </div>
  );
}