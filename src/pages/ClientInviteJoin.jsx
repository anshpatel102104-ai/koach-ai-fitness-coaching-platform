import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import KoachLogo from '@/components/brand/KoachLogo.jsx';
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

function ProgressBar({ step }) {
  return (
    <div style={{ height: 3, background: 'color-mix(in srgb, white 7%, transparent)', width: '100%' }}>
      <div style={{
        height: '100%',
        width: `${(step / 5) * 100}%`,
        background: 'linear-gradient(90deg, var(--tc-primary), var(--tc-ai))',
        transition: 'width 0.3s ease',
      }} />
    </div>
  );
}

function TopBar({ step, onSkip }) {
  return (
    <div style={{ flexShrink: 0 }}>
      <ProgressBar step={step} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 8px' }}>
        <KoachLogo size={28} rounded="rounded-lg" glow={false} bg />
        <button onClick={onSkip} style={{ color: 'var(--tc-muted-foreground)', fontSize: 12, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}>
          Skip setup
        </button>
      </div>
    </div>
  );
}

function BackBtn({ onClick }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--tc-muted-foreground)', fontSize: 13, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 20px 0' }}>
      ← Back
    </button>
  );
}

function Label({ children }) {
  return <div style={{ color: 'var(--tc-muted-foreground)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{children}</div>;
}

function Input({ label, value, onChange, type = 'text', placeholder, required, hint }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <Label>{label}{required && <span style={{ color: 'var(--tc-primary)', marginLeft: 4 }}>*</span>}</Label>}
      <input
        type={type}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '12px 16px', borderRadius: 12, fontSize: 14,
          background: 'var(--tc-foreground)', color: 'var(--tc-sidebar-accent-foreground)', border: '1.5px solid color-mix(in srgb, white 8%, transparent)',
          outline: 'none', boxSizing: 'border-box',
        }}
        onFocus={e => e.target.style.borderColor = 'color-mix(in srgb, var(--tc-primary) 60%, transparent)'}
        onBlur={e => e.target.style.borderColor = 'color-mix(in srgb, white 8%, transparent)'}
      />
      {hint && <div style={{ color: 'var(--tc-foreground)', fontSize: 10, marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

function Textarea({ label, value, onChange, placeholder, rows = 3 }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <Label>{label}</Label>}
      <textarea
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        style={{
          width: '100%', padding: '12px 16px', borderRadius: 12, fontSize: 14,
          background: 'var(--tc-foreground)', color: 'var(--tc-sidebar-accent-foreground)', border: '1.5px solid color-mix(in srgb, white 8%, transparent)',
          outline: 'none', resize: 'none', boxSizing: 'border-box',
        }}
        onFocus={e => e.target.style.borderColor = 'color-mix(in srgb, var(--tc-primary) 60%, transparent)'}
        onBlur={e => e.target.style.borderColor = 'color-mix(in srgb, white 8%, transparent)'}
      />
    </div>
  );
}

function Select({ label, value, onChange, options, required }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <Label>{label}{required && <span style={{ color: 'var(--tc-primary)', marginLeft: 4 }}>*</span>}</Label>}
      <select
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '100%', padding: '12px 16px', borderRadius: 12, fontSize: 14,
          background: 'var(--tc-foreground)', color: value ? 'var(--tc-sidebar-accent-foreground)' : 'var(--tc-muted-foreground)', border: '1.5px solid color-mix(in srgb, white 8%, transparent)',
          outline: 'none', appearance: 'none', boxSizing: 'border-box',
        }}
      >
        <option value="" disabled style={{ color: 'var(--tc-muted-foreground)' }}>Select…</option>
        {options.map(o => (
          <option key={o.value || o} value={o.value || o} style={{ background: 'var(--tc-foreground)', color: 'var(--tc-primary-foreground)' }}>
            {o.label || o}
          </option>
        ))}
      </select>
    </div>
  );
}

function PasswordInput({ value, onChange }) {
  const [show, setShow] = useState(false);
  const strength = !value ? 0 : value.length < 6 ? 1 : value.length < 10 ? 2 : /[A-Z]/.test(value) && /[0-9]/.test(value) ? 4 : 3;
  const colors = ['', 'var(--tc-destructive)', 'var(--tc-warning)', 'var(--tc-success)', 'var(--tc-success)'];
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  return (
    <div style={{ marginBottom: 14 }}>
      <Label>Password<span style={{ color: 'var(--tc-primary)', marginLeft: 4 }}>*</span></Label>
      <div style={{ position: 'relative' }}>
        <input
          type={show ? 'text' : 'password'}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder="Create a secure password"
          style={{
            width: '100%', padding: '12px 56px 12px 16px', borderRadius: 12, fontSize: 14,
            background: 'var(--tc-foreground)', color: 'var(--tc-sidebar-accent-foreground)', border: '1.5px solid color-mix(in srgb, white 8%, transparent)',
            outline: 'none', boxSizing: 'border-box',
          }}
          onFocus={e => e.target.style.borderColor = 'color-mix(in srgb, var(--tc-primary) 60%, transparent)'}
          onBlur={e => e.target.style.borderColor = 'color-mix(in srgb, white 8%, transparent)'}
        />
        <button type="button" onClick={() => setShow(s => !s)}
          style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--tc-muted-foreground)', fontSize: 11, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
          {show ? 'Hide' : 'Show'}
        </button>
      </div>
      {value && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
          <div style={{ display: 'flex', gap: 4, flex: 1 }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{ flex: 1, height: 3, borderRadius: 9999, background: i <= strength ? colors[strength] : 'color-mix(in srgb, white 8%, transparent)', transition: 'background 0.2s' }} />
            ))}
          </div>
          <span style={{ fontSize: 10, fontWeight: 600, color: colors[strength] }}>{labels[strength]}</span>
        </div>
      )}
    </div>
  );
}

function Chip({ label, selected, onClick }) {
  return (
    <button type="button" onClick={onClick} style={{
      padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: 'pointer',
      background: selected ? 'color-mix(in srgb, var(--tc-primary) 12%, transparent)' : 'color-mix(in srgb, white 4%, transparent)',
      border: `1.5px solid ${selected ? 'color-mix(in srgb, var(--tc-primary) 55%, transparent)' : 'color-mix(in srgb, white 7%, transparent)'}`,
      color: selected ? 'var(--tc-primary-foreground)' : 'var(--tc-muted-foreground)',
      transition: 'all 0.15s',
    }}>
      {label}
    </button>
  );
}

function CTAButton({ label, onClick, disabled }) {
  return (
    <div style={{ padding: '12px 20px 32px', flexShrink: 0, background: 'linear-gradient(to top, var(--kc-0f0f1a) 60%, transparent)' }}>
      <button onClick={onClick} disabled={disabled} style={{
        width: '100%', padding: '16px', borderRadius: 16, fontSize: 16, fontWeight: 700,
        background: disabled ? 'color-mix(in srgb, white 6%, transparent)' : 'linear-gradient(135deg, var(--tc-primary), var(--tc-ai))',
        boxShadow: disabled ? 'none' : '0 0 28px color-mix(in srgb, var(--tc-primary) 30%, transparent)',
        color: disabled ? 'var(--kc-444444)' : 'var(--tc-primary-foreground)',
        border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s',
      }}>
        {label}
      </button>
    </div>
  );
}

// ── STEP 0: WELCOME ──
function Welcome({ onNext, onSkip }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--kc-0f0f1a)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 24px 48px', textAlign: 'center', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 20, right: 20 }}>
        <button onClick={onSkip} style={{ color: 'var(--tc-muted-foreground)', fontSize: 12, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}>
          Skip setup
        </button>
      </div>

      <div style={{ maxWidth: 360, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
        <KoachLogo size={80} rounded="rounded-3xl" glow bg />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ color: 'var(--tc-primary)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>KOACH AI</div>
          <h1 style={{ color: 'var(--tc-primary-foreground)', fontSize: 32, fontWeight: 900, lineHeight: 1.2, letterSpacing: '-0.03em', margin: 0 }}>
            Build your coaching<br />business with AI.
          </h1>
          <p style={{ color: 'var(--tc-muted-foreground)', fontSize: 15, lineHeight: 1.6, margin: 0 }}>
            The all-in-one coaching OS to manage clients, deliver programs, and grow your business — powered by AI.
          </p>
        </div>

        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button onClick={onNext} style={{
            width: '100%', padding: '16px', borderRadius: 16, fontSize: 16, fontWeight: 700,
            background: 'linear-gradient(135deg, var(--tc-primary), var(--tc-ai))',
            boxShadow: '0 0 28px color-mix(in srgb, var(--tc-primary) 35%, transparent)',
            color: 'var(--tc-primary-foreground)', border: 'none', cursor: 'pointer',
          }}>
            Get Started →
          </button>
          <p style={{ color: 'var(--tc-foreground)', fontSize: 12, margin: 0 }}>Takes about 3 minutes · 5 steps</p>
        </div>
      </div>
    </div>
  );
}

// ── STEP 1: CREATE ACCOUNT ──
function Step1({ data, set, onNext, onBack, onSkip }) {
  const valid = data.first_name?.trim() && data.last_name?.trim() && data.email?.includes('@') && (data.password || '').length >= 6;
  return (
    <div style={{ minHeight: '100vh', background: 'var(--kc-0f0f1a)', display: 'flex', flexDirection: 'column' }}>
      <TopBar step={1} onSkip={onSkip} />
      <BackBtn onClick={onBack} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px 0' }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <div style={{ color: 'var(--tc-primary)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Step 1 of 5</div>
          <h2 style={{ color: 'var(--tc-primary-foreground)', fontSize: 24, fontWeight: 900, margin: '0 0 4px', letterSpacing: '-0.02em' }}>Create your account</h2>
          <p style={{ color: 'var(--tc-muted-foreground)', fontSize: 12, margin: '0 0 20px' }}>Get started — it only takes a minute</p>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}><Input label="First Name" value={data.first_name} onChange={v => set('first_name', v)} placeholder="Alex" required /></div>
            <div style={{ flex: 1 }}><Input label="Last Name" value={data.last_name} onChange={v => set('last_name', v)} placeholder="Johnson" required /></div>
          </div>
          <Input label="Email Address" value={data.email} onChange={v => set('email', v)} type="email" placeholder="you@email.com" required />
          <PasswordInput value={data.password} onChange={v => set('password', v)} />
          <Input label="Phone (optional)" value={data.phone} onChange={v => set('phone', v)} type="tel" placeholder="+1 (555) 000-0000" />
        </div>
      </div>
      <CTAButton label="Continue →" onClick={onNext} disabled={!valid} />
    </div>
  );
}

// ── STEP 2: COACHING BUSINESS ──
function Step2({ data, set, onNext, onBack, onSkip }) {
  const specialties = data.specialties || [];
  const tools = data.current_tools || [];
  const toggle = (key, arr, val) => set(key, arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
  const valid = data.business_name?.trim() && specialties.length > 0 && data.experience && data.client_count;
  return (
    <div style={{ minHeight: '100vh', background: 'var(--kc-0f0f1a)', display: 'flex', flexDirection: 'column' }}>
      <TopBar step={2} onSkip={onSkip} />
      <BackBtn onClick={onBack} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px 0' }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <div style={{ color: 'var(--tc-primary)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Step 2 of 5</div>
          <h2 style={{ color: 'var(--tc-primary-foreground)', fontSize: 24, fontWeight: 900, margin: '0 0 4px', letterSpacing: '-0.02em' }}>Your coaching business</h2>
          <p style={{ color: 'var(--tc-muted-foreground)', fontSize: 12, margin: '0 0 20px' }}>Tell us about your practice</p>
          <Input label="Business / Coaching Name" value={data.business_name} onChange={v => set('business_name', v)} placeholder="e.g. Myles Harris Fitness" required />
          <div style={{ marginBottom: 14 }}>
            <Label>Coaching Specialty<span style={{ color: 'var(--tc-primary)', marginLeft: 4 }}>*</span></Label>
            <div style={{ fontSize: 10, color: 'var(--tc-foreground)', marginBottom: 8 }}>Select all that apply</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {SPECIALTIES.map(s => <Chip key={s} label={s} selected={specialties.includes(s)} onClick={() => toggle('specialties', specialties, s)} />)}
            </div>
          </div>
          <Select label="Years of Experience" value={data.experience} onChange={v => set('experience', v)} options={EXPERIENCE_OPTS} required />
          <Select label="Current Client Count" value={data.client_count} onChange={v => set('client_count', v)} options={CLIENT_COUNT_OPTS} required />
          <div style={{ marginBottom: 14 }}>
            <Label>Where do you currently manage clients?</Label>
            <div style={{ fontSize: 10, color: 'var(--tc-foreground)', marginBottom: 8 }}>Select all that apply</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {CURRENT_TOOLS.map(t => <Chip key={t} label={t} selected={tools.includes(t)} onClick={() => toggle('current_tools', tools, t)} />)}
            </div>
          </div>
        </div>
      </div>
      <CTAButton label="Continue →" onClick={onNext} disabled={!valid} />
    </div>
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
    <div style={{ minHeight: '100vh', background: 'var(--kc-0f0f1a)', display: 'flex', flexDirection: 'column' }}>
      <TopBar step={3} onSkip={onSkip} />
      <BackBtn onClick={onBack} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px 0' }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <div style={{ color: 'var(--tc-primary)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Step 3 of 5</div>
          <h2 style={{ color: 'var(--tc-primary-foreground)', fontSize: 24, fontWeight: 900, margin: '0 0 4px', letterSpacing: '-0.02em' }}>Your coaching profile</h2>
          <p style={{ color: 'var(--tc-muted-foreground)', fontSize: 12, margin: '0 0 20px' }}>Clients will see this on your profile</p>
          <div style={{ marginBottom: 16 }}>
            <Label>Profile Photo (optional)</Label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 64, height: 64, borderRadius: 16, background: 'color-mix(in srgb, white 5%, transparent)', border: '1.5px dashed color-mix(in srgb, white 12%, transparent)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {data.avatar_url ? <SignedImg src={data.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 24 }}>📷</span>}
              </div>
              <div>
                <button type="button" onClick={() => fileRef.current?.click()} style={{ padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: 'color-mix(in srgb, var(--tc-primary) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--tc-primary) 30%, transparent)', color: 'var(--tc-primary)', cursor: 'pointer' }}>
                  {uploading ? 'Uploading…' : data.avatar_url ? 'Change Photo' : 'Upload Photo'}
                </button>
                <div style={{ color: 'var(--tc-foreground)', fontSize: 10, marginTop: 4 }}>You can skip and add later</div>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
              </div>
            </div>
          </div>
          <Textarea label="Short Bio" value={data.bio} onChange={v => set('bio', v)} placeholder="Tell clients about yourself and your coaching style…" rows={3} />
          <Input label="Certifications" value={data.certifications} onChange={v => set('certifications', v)} placeholder="e.g. NASM CPT, ACE, ISSA, CrossFit L2…" />
          <Input label="Instagram Handle (optional)" value={data.instagram} onChange={v => set('instagram', v)} placeholder="@yourhandle" />
          <Input label="Website (optional)" value={data.website} onChange={v => set('website', v)} type="url" placeholder="https://yourwebsite.com" />
          <Select label="Timezone" value={data.timezone} onChange={v => set('timezone', v)} options={TIMEZONES.map(tz => ({ value: tz, label: tz.replace(/_/g, ' ') }))} />
        </div>
      </div>
      <CTAButton label="Continue →" onClick={onNext} />
    </div>
  );
}

// ── STEP 4: BUSINESS SETUP ──
function Step4({ data, set, onNext, onBack, onSkip, saving }) {
  const paymentMethod = data.payment_method || '';
  return (
    <div style={{ minHeight: '100vh', background: 'var(--kc-0f0f1a)', display: 'flex', flexDirection: 'column' }}>
      <TopBar step={4} onSkip={onSkip} />
      <BackBtn onClick={onBack} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px 0' }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <div style={{ color: 'var(--tc-primary)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Step 4 of 5</div>
          <h2 style={{ color: 'var(--tc-primary-foreground)', fontSize: 24, fontWeight: 900, margin: '0 0 4px', letterSpacing: '-0.02em' }}>Set up your business</h2>
          <p style={{ color: 'var(--tc-muted-foreground)', fontSize: 12, margin: '0 0 20px' }}>Payments and packages</p>

          <div style={{ marginBottom: 14 }}>
            <Label>Monthly Rate per Client</Label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--tc-muted-foreground)', fontSize: 14, fontWeight: 600 }}>$</span>
              <input type="number" value={data.monthly_rate || ''} onChange={e => set('monthly_rate', e.target.value)} placeholder="150"
                style={{ width: '100%', padding: '12px 48px 12px 32px', borderRadius: 12, fontSize: 14, background: 'var(--tc-foreground)', color: 'var(--tc-sidebar-accent-foreground)', border: '1.5px solid color-mix(in srgb, white 8%, transparent)', outline: 'none', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = 'color-mix(in srgb, var(--tc-primary) 60%, transparent)'}
                onBlur={e => e.target.style.borderColor = 'color-mix(in srgb, white 8%, transparent)'} />
              <span style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--tc-muted-foreground)', fontSize: 12 }}>/mo</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 12, background: 'color-mix(in srgb, white 3%, transparent)', border: '1.5px solid color-mix(in srgb, white 6%, transparent)', marginBottom: 16 }}>
            <div>
              <div style={{ color: 'var(--tc-primary-foreground)', fontSize: 14, fontWeight: 600 }}>Offer different packages?</div>
              <div style={{ color: 'var(--tc-muted-foreground)', fontSize: 11 }}>E.g. 1-month, 3-month, custom</div>
            </div>
            <button type="button" onClick={() => set('has_packages', !data.has_packages)}
              style={{ width: 44, height: 24, borderRadius: 9999, background: data.has_packages ? 'var(--tc-primary)' : 'color-mix(in srgb, white 10%, transparent)', border: 'none', cursor: 'pointer', position: 'relative', flexShrink: 0 }}>
              <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--tc-card)', position: 'absolute', top: 4, left: data.has_packages ? 24 : 4, transition: 'left 0.2s' }} />
            </button>
          </div>

          <Label>How do you want to get paid?</Label>
          {[
            { value: 'stripe', label: '⚡ Stripe', sub: 'Recommended — automatic billing, receipts, payment tracking' },
            { value: 'manual', label: '💸 Manual', sub: 'Venmo, Zelle, cash — you collect payments yourself' },
            { value: 'later', label: '🕐 Set up later', sub: "I'll configure this after I get started" },
          ].map(opt => (
            <button key={opt.value} type="button" onClick={() => set('payment_method', opt.value)} style={{
              width: '100%', display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px', borderRadius: 12, textAlign: 'left', marginBottom: 10, cursor: 'pointer',
              background: paymentMethod === opt.value ? 'color-mix(in srgb, var(--tc-primary) 10%, transparent)' : 'color-mix(in srgb, white 3%, transparent)',
              border: `1.5px solid ${paymentMethod === opt.value ? 'color-mix(in srgb, var(--tc-primary) 55%, transparent)' : 'color-mix(in srgb, white 7%, transparent)'}`,
            }}>
              <div style={{ width: 16, height: 16, borderRadius: '50%', flexShrink: 0, marginTop: 2, border: `2px solid ${paymentMethod === opt.value ? 'var(--tc-primary)' : 'color-mix(in srgb, white 15%, transparent)'}`, background: paymentMethod === opt.value ? 'var(--tc-primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {paymentMethod === opt.value && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--tc-card)' }} />}
              </div>
              <div>
                <div style={{ color: 'var(--tc-primary-foreground)', fontSize: 14, fontWeight: 600 }}>{opt.label}</div>
                <div style={{ color: 'var(--tc-muted-foreground)', fontSize: 11, marginTop: 2 }}>{opt.sub}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
      <CTAButton label={saving ? 'Saving…' : 'Continue →'} onClick={onNext} disabled={saving} />
    </div>
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
    { label: 'Account created', done: true },
    { label: 'Add your first client', done: false },
    { label: 'Build your first program', done: false },
    { label: 'Connect Stripe payments', done: false },
    { label: 'Customize your profile', done: false },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--kc-0f0f1a)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', textAlign: 'center' }}>
      <div style={{ maxWidth: 360, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
        <KoachLogo size={72} rounded="rounded-2xl" glow bg />

        <div>
          <div style={{ color: 'var(--tc-success)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Welcome aboard 🎉</div>
          <h2 style={{ color: 'var(--tc-primary-foreground)', fontSize: 32, fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 8px' }}>
            Welcome to KOACH AI,<br />{firstName || 'Coach'}!
          </h2>
          <p style={{ color: 'var(--tc-muted-foreground)', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
            Your coaching OS is ready — let's build something great.
          </p>
        </div>

        <div style={{ width: '100%', borderRadius: 16, overflow: 'hidden', background: 'color-mix(in srgb, white 3%, transparent)', border: '1.5px solid color-mix(in srgb, white 8%, transparent)', textAlign: 'left' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid color-mix(in srgb, white 5%, transparent)' }}>
            <div style={{ color: 'var(--tc-primary-foreground)', fontSize: 12, fontWeight: 700 }}>Quick start checklist</div>
          </div>
          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {checklist.map(({ label, done }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: done ? 'color-mix(in srgb, var(--tc-success) 15%, transparent)' : 'color-mix(in srgb, white 5%, transparent)', border: `1.5px solid ${done ? 'var(--tc-success)' : 'color-mix(in srgb, white 10%, transparent)'}` }}>
                  {done
                    ? <svg viewBox="0 0 12 12" fill="none" style={{ width: 12, height: 12 }}><path d="M2 6L5 9L10 3" stroke="var(--tc-success)" strokeWidth="2" strokeLinecap="round" /></svg>
                    : <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'color-mix(in srgb, white 20%, transparent)' }} />}
                </div>
                <span style={{ fontSize: 14, color: done ? 'var(--tc-primary-foreground)' : 'var(--tc-muted-foreground)' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={go} style={{
            width: '100%', padding: '16px', borderRadius: 16, fontSize: 16, fontWeight: 700,
            background: 'linear-gradient(135deg, var(--tc-primary), var(--tc-ai))',
            boxShadow: '0 0 32px color-mix(in srgb, var(--tc-primary) 35%, transparent)',
            color: 'var(--tc-primary-foreground)', border: 'none', cursor: 'pointer',
          }}>
            Go to Dashboard →
          </button>
          <button onClick={go} style={{ color: 'var(--tc-foreground)', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer' }}>
            Complete setup later
          </button>
        </div>
      </div>
    </div>
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
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const sharedProps = { data, set, onNext: next, onBack: back, onSkip: skip };

  return (
    <div style={{ background: 'var(--kc-0f0f1a)', minHeight: '100vh' }}>
      {currentStep === 0 && <Welcome onNext={next} onSkip={skip} />}
      {currentStep === 1 && <Step1 {...sharedProps} />}
      {currentStep === 2 && <Step2 {...sharedProps} />}
      {currentStep === 3 && <Step3 {...sharedProps} />}
      {currentStep === 4 && <Step4 {...sharedProps} onNext={handleFinish} saving={saving} />}
      {currentStep === 5 && <Step5 firstName={data.first_name} />}
    </div>
  );
}