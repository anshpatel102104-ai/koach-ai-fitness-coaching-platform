import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { SignedImg } from '@/components/shared/SignedImage';
import {
  Camera, Plus, X, Check,
  MapPin, Award, ChevronDown, ExternalLink,
  User, Briefcase, BookOpen, Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  SettingsShell, SettingsPanel, SettingsField, SaveButton, fieldClass, textareaClass,
} from '@/components/settings/SettingsLayout';

/* ── Constants ── */
const SPECIALTIES = [
  'Weight Loss', 'Muscle Building', 'Athletic Performance', 'Nutrition Coaching',
  'Bodybuilding', 'Powerlifting', 'General Fitness', 'Senior Fitness',
  'Youth Athletics', 'Pre/Post Natal', 'Injury Rehabilitation', 'Mental Wellness'
];

const LANGUAGES = ['English', 'Spanish', 'French', 'Portuguese', 'German', 'Italian', 'Arabic', 'Mandarin', 'Japanese', 'Hindi'];

const PRONOUNS = ['He/Him', 'She/Her', 'They/Them', 'Prefer not to say', 'Custom'];

const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Phoenix', 'America/Anchorage', 'Pacific/Honolulu',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Madrid',
  'Asia/Dubai', 'Asia/Kolkata', 'Asia/Singapore', 'Asia/Tokyo',
  'Australia/Sydney', 'Pacific/Auckland'
];

const YEARS_EXP = ['Less than 1 year', '1-2 years', '3-5 years', '6-10 years', '10-15 years', '15+ years'];

const COMPLETION_CHECKS = [
  { key: 'avatar_url', label: 'Add a profile photo', section: 'photo' },
  { key: 'short_bio', label: 'Write your bio', section: 'about' },
  { key: 'certifications', label: 'List your certifications', section: 'about', isArray: true },
  { key: 'instagram', label: 'Connect Instagram', section: 'business' },
  { key: 'timezone', label: 'Set your timezone', section: 'business' },
  { key: 'specialties', label: 'Pick your specialties', section: 'about', isArray: true },
];

const EMPTY = {
  first_name: '', last_name: '', title: '', pronouns: '',
  avatar_url: '', business_name: '', business_email: '', business_phone: '',
  website_url: '', instagram: '', tiktok: '', youtube: '',
  location: '', timezone: 'America/New_York',
  short_bio: '', full_bio: '',
  specialties: [], certifications: [], years_experience: '', languages: []
};

/* ── Sub-components ── */
function Field({ label, children, hint }) {
  return <SettingsField label={label} hint={hint}>{children}</SettingsField>;
}

function Input({ value, onChange, placeholder, prefix, maxLength, className = '' }) {
  return (
    <div className="relative flex items-center">
      {prefix && <span className="pointer-events-none absolute left-3 text-[15px] text-muted-foreground">{prefix}</span>}
      <input
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className={cn(fieldClass, prefix && 'pl-7', maxLength && 'pr-16', className)}
      />
      {maxLength && (
        <span className="pointer-events-none absolute right-3 text-xs tabular-nums text-muted-foreground">
          {(value || '').length}/{maxLength}
        </span>
      )}
    </div>
  );
}

function Textarea({ value, onChange, placeholder, maxLength, rows = 3 }) {
  return (
    <div>
      <textarea
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={rows}
        className={textareaClass}
      />
      {maxLength && (
        <p className="mt-1 text-right text-xs tabular-nums text-muted-foreground">
          {(value || '').length}/{maxLength}
        </p>
      )}
    </div>
  );
}

function Select({ value, onChange, options, placeholder }) {
  return (
    <div className="relative">
      <select
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        className={cn(fieldClass, 'appearance-none pr-9')}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => (
          <option key={typeof o === 'string' ? o : o.value} value={typeof o === 'string' ? o : o.value}>
            {typeof o === 'string' ? o : o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

function ChipSelector({ options, selected = [], onChange }) {
  const toggle = (opt) => {
    const next = selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt];
    onChange(next);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const on = selected.includes(opt);
        return (
          <button key={opt} type="button" onClick={() => toggle(opt)} aria-pressed={on}
            className={cn(
              'touch-compact inline-flex h-8 items-center gap-1 rounded-full px-3 text-sm font-medium transition-colors',
              on ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground shadow-[inset_0_0_0_1px_rgb(var(--input))] hover:bg-accent'
            )}>
            {on && <Check className="h-3.5 w-3.5" />}
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function CertificationRow({ cert, onChange, onRemove }) {
  return (
    <div className="flex items-start gap-2">
      <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-[2fr_2fr_1fr]">
        <input value={cert.name || ''} onChange={e => onChange({ ...cert, name: e.target.value })}
          placeholder="Certification" className={fieldClass} />
        <input value={cert.organization || ''} onChange={e => onChange({ ...cert, organization: e.target.value })}
          placeholder="Issued by" className={fieldClass} />
        <input value={cert.year || ''} onChange={e => onChange({ ...cert, year: e.target.value })}
          placeholder="Year" className={fieldClass} />
      </div>
      <Button variant="ghost" size="icon" onClick={onRemove} aria-label="Remove certification" className="flex-shrink-0 text-muted-foreground hover:text-destructive">
        <X />
      </Button>
    </div>
  );
}

/* ── Public Profile Preview Card (graphite, like the client app hero) ── */
function ProfilePreviewCard({ profile }) {
  const name = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Your name';
  return (
    <div className="mx-auto max-w-sm rounded-xl bg-sidebar p-6 text-white">
      <div className="mb-4 flex items-start gap-4">
        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 text-xl font-bold">
          {profile.avatar_url
            ? <SignedImg src={profile.avatar_url} alt="avatar" className="h-full w-full object-cover" />
            : name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
          }
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[22px] leading-tight">{name}</h3>
          {profile.title && <p className="mt-0.5 text-sm text-white/70">{profile.title}</p>}
          {profile.location && (
            <p className="mt-1 flex items-center gap-1 text-[13px] text-white/50">
              <MapPin className="h-3.5 w-3.5" />{profile.location}
            </p>
          )}
        </div>
      </div>
      {profile.short_bio && (
        <p className="mb-4 text-[15px] leading-relaxed text-white/80">{profile.short_bio}</p>
      )}
      {profile.specialties?.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {profile.specialties.slice(0, 4).map(s => (
            <span key={s} className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white/90">{s}</span>
          ))}
          {profile.specialties.length > 4 && (
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white/60">+{profile.specialties.length - 4}</span>
          )}
        </div>
      )}
      {profile.certifications?.filter(c => c.name).length > 0 && (
        <div className="mb-4 space-y-1">
          {profile.certifications.filter(c => c.name).slice(0, 2).map((c, i) => (
            <div key={i} className="flex items-center gap-2 text-[13px] text-white/60">
              <Award className="h-3.5 w-3.5 flex-shrink-0" />
              {c.name}{c.organization ? ` · ${c.organization}` : ''}{c.year ? ` · ${c.year}` : ''}
            </div>
          ))}
        </div>
      )}
      {(profile.instagram || profile.website_url) && (
        <div className="flex gap-3 border-t border-white/10 pt-3">
          {profile.instagram && <span className="text-[13px] text-white/50">@{profile.instagram}</span>}
          {profile.website_url && <span className="truncate text-[13px] text-white/50">{profile.website_url}</span>}
        </div>
      )}
    </div>
  );
}

/* ── Completion (sits under the section list) ── */
function CompletionBar({ profile, onJump }) {
  const items = COMPLETION_CHECKS.map(c => {
    const val = profile[c.key];
    const done = c.isArray ? (Array.isArray(val) && val.length > 0) : !!val;
    return { ...c, done };
  });
  const done = items.filter(i => i.done).length;
  const pct = Math.round((done / items.length) * 100);

  return (
    <div className="panel p-5">
      <div className="flex items-baseline justify-between">
        <p className="text-[15px] font-semibold text-foreground">Profile</p>
        <p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground tabular-nums">{done} of {items.length}</span> done</p>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-secondary" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${pct}%` }} />
      </div>
      <ul className="mt-3 space-y-1">
        {items.map(item => (
          <li key={item.key}>
            <button
              type="button"
              disabled={item.done}
              onClick={() => onJump(item.section)}
              className="touch-compact flex w-full items-center gap-2.5 rounded-md py-1 text-left text-sm disabled:cursor-default"
            >
              {item.done
                ? <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-success"><Check className="h-2.5 w-2.5 text-white" strokeWidth={3} /></span>
                : <span className="h-4 w-4 flex-shrink-0 rounded-full border border-input" />}
              <span className={item.done ? 'text-muted-foreground line-through' : 'text-foreground underline-offset-4 hover:underline'}>{item.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── MAIN PAGE ── */
export default function CoachProfile() {
  const { me } = useAuth();
  const queryClient = useQueryClient();
  const fileRef = useRef();
  const [section, setSection] = useState('photo');

  const [profile, setProfile] = useState(EMPTY);
  const [profileId, setProfileId] = useState(null);
  const [savedAt, setSavedAt] = useState(null);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => me() });

  const { data: existing = [] } = useQuery({
    queryKey: ['coach-profile', user?.email],
    queryFn: () => db.entities.CoachProfile.filter({ coach_id: user.id }, '-created_date', 1),
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (existing.length > 0) {
      const p = existing[0];
      setProfile({ ...EMPTY, ...p });
      setProfileId(p.id);
    } else if (user?.email) {
      // Pre-fill from user
      setProfile(prev => ({
        ...prev,
        first_name: user.full_name?.split(' ')[0] || '',
        last_name: user.full_name?.split(' ').slice(1).join(' ') || '',
        business_email: user.email || '',
        coach_id: user.id, // uuid (profiles.id), not email
      }));
    }
  }, [existing, user]);

  const set = useCallback((key, val) => {
    setProfile(prev => ({ ...prev, [key]: val }));
    setIsDirty(true);
  }, []);

  const save = useCallback(async (data) => {
    const payload = data || profile;
    setSaving(true);
    try {
      if (profileId) {
        await db.entities.CoachProfile.update(profileId, payload);
      } else {
        const created = await db.entities.CoachProfile.create({ ...payload, coach_id: user?.id });
        setProfileId(created.id);
      }
      setSavedAt(new Date());
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ['coach-profile'] });
    } finally {
      setSaving(false);
    }
  }, [profile, profileId, user, queryClient]);

  // Autosave every 30s
  useEffect(() => {
    if (!isDirty) return;
    const t = setTimeout(() => save(), 30000);
    return () => clearTimeout(t);
  }, [profile, isDirty, save]);

  // Unsaved changes warning
  useEffect(() => {
    const handler = (e) => {
      if (isDirty) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { file_url } = await db.uploadFile({ file, bucket: 'branding' });
    set('avatar_url', file_url);
  };

  const addCert = () => set('certifications', [...(profile.certifications || []), { name: '', organization: '', year: '' }]);
  const updateCert = (i, val) => {
    const arr = [...(profile.certifications || [])];
    arr[i] = val;
    set('certifications', arr);
  };
  const removeCert = (i) => set('certifications', (profile.certifications || []).filter((_, idx) => idx !== i));

  const jumpTo = (target) => setSection(target);

  const initials = [profile.first_name, profile.last_name].filter(Boolean).map(n => n[0]).join('').toUpperCase() || 'C';

  const NAV = [{
    items: [
      { id: 'photo', label: 'Photo and name', icon: User },
      { id: 'business', label: 'Business details', icon: Briefcase },
      { id: 'about', label: 'About you', icon: BookOpen },
      { id: 'preview', label: 'Public preview', icon: Eye },
    ],
  }];

  return (
    <SettingsShell
      backTo="/settings"
      title="Coach profile"
      subtitle="What prospective clients see on your package pages, and how clients see you in their app."
      nav={NAV}
      active={section}
      onSelect={setSection}
      actions={<SaveButton onClick={() => save()} saving={saving} saved={!!savedAt} dirty={isDirty} />}
      aside={<CompletionBar profile={profile} onJump={jumpTo} />}
    >
      {section === 'photo' && (
        <SettingsPanel title="Photo and name" bodyClassName="divide-y-0 pb-4">
          <div className="flex items-center gap-5 py-4">
            <div className="relative">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-secondary text-3xl font-bold text-foreground">
                {profile.avatar_url
                  ? <SignedImg src={profile.avatar_url} alt="avatar" className="h-full w-full object-cover" />
                  : initials
                }
              </div>
              <button onClick={() => fileRef.current?.click()} aria-label="Upload photo"
                className="touch-compact absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-card">
                <Camera className="h-4 w-4" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">A clear, well-lit face photo. Clients see it next to every message.</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>Upload photo</Button>
                {profile.avatar_url && (
                  <Button variant="link" size="sm" className="text-destructive" onClick={() => set('avatar_url', '')}>Remove</Button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="First name">
              <Input value={profile.first_name} onChange={v => set('first_name', v)} placeholder="First name" />
            </Field>
            <Field label="Last name">
              <Input value={profile.last_name} onChange={v => set('last_name', v)} placeholder="Last name" />
            </Field>
            <Field label="Title" hint="Shown under your name.">
              <Input value={profile.title} onChange={v => set('title', v)} placeholder="Online strength and nutrition coach" />
            </Field>
            <Field label="Pronouns (optional)">
              <Select value={profile.pronouns} onChange={v => set('pronouns', v)} options={PRONOUNS} placeholder="Choose" />
            </Field>
          </div>
        </SettingsPanel>
      )}

      {section === 'business' && (
        <SettingsPanel title="Business details" bodyClassName="divide-y-0 pb-4">
          <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
            <Field label="Business name">
              <Input value={profile.business_name} onChange={v => set('business_name', v)} placeholder="Hybrid Life Coaching" />
            </Field>
            <Field label="Business email" hint="Clients reply to this address.">
              <Input value={profile.business_email} onChange={v => set('business_email', v)} placeholder="coach@yourdomain.com" />
            </Field>
            <Field label="Phone">
              <Input value={profile.business_phone} onChange={v => set('business_phone', v)} placeholder="+1 (555) 000-0000" />
            </Field>
            <Field label="Website">
              <Input value={profile.website_url} onChange={v => set('website_url', v)} placeholder="https://yourwebsite.com" />
            </Field>
            <Field label="Instagram">
              <Input value={profile.instagram} onChange={v => set('instagram', v)} placeholder="yourhandle" prefix="@" />
            </Field>
            <Field label="TikTok (optional)">
              <Input value={profile.tiktok} onChange={v => set('tiktok', v)} placeholder="yourhandle" prefix="@" />
            </Field>
            <Field label="YouTube (optional)">
              <Input value={profile.youtube} onChange={v => set('youtube', v)} placeholder="https://youtube.com/@..." />
            </Field>
            <Field label="City" hint="Shown on your public profile.">
              <Input value={profile.location} onChange={v => set('location', v)} placeholder="Los Angeles, CA" />
            </Field>
            <Field label="Timezone" hint="Used for sessions and check-in reminders.">
              <Select value={profile.timezone} onChange={v => set('timezone', v)} options={TIMEZONES} />
            </Field>
          </div>
        </SettingsPanel>
      )}

      {section === 'about' && (
        <SettingsPanel title="About you" bodyClassName="divide-y-0 pb-4">
          <div className="space-y-5 pt-2">
            <Field label="Short bio" hint="One line on the client app. 150 characters.">
              <Textarea value={profile.short_bio} onChange={v => set('short_bio', v)}
                placeholder="How you coach, in one sentence" maxLength={150} rows={2} />
            </Field>
            <Field label="Full bio" hint="Shown on your package pages. 1,000 characters.">
              <Textarea value={profile.full_bio} onChange={v => set('full_bio', v)}
                placeholder="Your background, how you coach, and who you work best with" maxLength={1000} rows={5} />
            </Field>

            <Field label="Specialties">
              <ChipSelector options={SPECIALTIES} selected={profile.specialties || []} onChange={v => set('specialties', v)} />
            </Field>

            <Field label="Certifications">
              <div className="space-y-2">
                {(profile.certifications || []).map((cert, i) => (
                  <CertificationRow key={i} cert={cert} onChange={v => updateCert(i, v)} onRemove={() => removeCert(i)} />
                ))}
                <Button variant="outline" onClick={addCert}><Plus /> Add certification</Button>
              </div>
            </Field>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="Years coaching">
                <Select value={profile.years_experience} onChange={v => set('years_experience', v)}
                  options={YEARS_EXP} placeholder="Choose" />
              </Field>
              <Field label="Languages">
                <ChipSelector options={LANGUAGES} selected={profile.languages || []} onChange={v => set('languages', v)} />
              </Field>
            </div>
          </div>
        </SettingsPanel>
      )}

      {section === 'preview' && (
        <SettingsPanel
          title="Public preview"
          subtitle="How your profile appears on package pages. Updates as you type."
          bodyClassName="divide-y-0 pb-4"
        >
          <div className="pt-2">
            <ProfilePreviewCard profile={profile} />
            <div className="mt-5 flex justify-center">
              <Button variant="outline"><ExternalLink /> View public profile</Button>
            </div>
          </div>
        </SettingsPanel>
      )}

      <div className="flex justify-end">
        <SaveButton onClick={() => save()} saving={saving} saved={!!savedAt} dirty={isDirty} />
      </div>
    </SettingsShell>
  );
}
