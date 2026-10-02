import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase as base44 } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera, Plus, X, Check,
  MapPin, Award, ChevronDown, ExternalLink,
  User, Briefcase, BookOpen, Eye
} from 'lucide-react';

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
  { key: 'avatar_url', label: 'Add profile photo', section: 'photo' },
  { key: 'short_bio', label: 'Write your bio', section: 'about' },
  { key: 'certifications', label: 'Add certifications', section: 'about', isArray: true },
  { key: 'instagram', label: 'Connect Instagram', section: 'business' },
  { key: 'timezone', label: 'Set your timezone', section: 'business' },
  { key: 'specialties', label: 'Add your specialties', section: 'about', isArray: true },
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
function SectionCard({ icon: Icon, title, children }) {
  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--tc-accent), var(--tc-ai))' }}>
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <h2 className="font-bold text-foreground text-base">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function Field({ label, children, hint }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

function Input({ value, onChange, placeholder, prefix, maxLength, className = '' }) {
  return (
    <div className="relative flex items-center">
      {prefix && <span className="absolute left-3 text-muted-foreground text-sm font-medium pointer-events-none">{prefix}</span>}
      <input
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className={`w-full px-3 py-2.5 rounded-xl border border-border text-foreground text-sm placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors ${prefix ? 'pl-7' : ''} ${className}`}
      />
      {maxLength && (
        <span className="absolute right-3 text-[10px] text-border pointer-events-none">
          {(value || '').length}/{maxLength}
        </span>
      )}
    </div>
  );
}

function Textarea({ value, onChange, placeholder, maxLength, rows = 3 }) {
  return (
    <div className="relative">
      <textarea
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={rows}
        className="w-full px-3 py-2.5 rounded-xl border border-border text-foreground text-sm placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors resize-none"
      />
      {maxLength && (
        <span className="absolute bottom-3 right-3 text-[10px] text-border">
          {(value || '').length}/{maxLength}
        </span>
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
        className="w-full px-3 py-2.5 rounded-xl border border-border text-foreground text-sm focus:outline-none focus:border-primary appearance-none bg-card transition-colors"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => (
          <option key={typeof o === 'string' ? o : o.value} value={typeof o === 'string' ? o : o.value}>
            {typeof o === 'string' ? o : o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
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
      {options.map(opt => (
        <button key={opt} onClick={() => toggle(opt)}
          className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
          style={selected.includes(opt)
            ? { background: 'linear-gradient(135deg, var(--tc-primary), var(--tc-ai))', color: 'white' }
            : { background: 'var(--tc-muted)', color: 'var(--tc-muted-foreground)', border: '1px solid var(--tc-border)' }
          }>
          {opt}
        </button>
      ))}
    </div>
  );
}

function CertificationRow({ cert, onChange, onRemove }) {
  return (
    <div className="flex gap-2 items-start">
      <div className="flex-1 grid grid-cols-3 gap-2">
        <input value={cert.name || ''} onChange={e => onChange({ ...cert, name: e.target.value })}
          placeholder="Certification name"
          className="px-3 py-2 rounded-xl border border-border text-foreground text-sm placeholder-muted-foreground focus:outline-none focus:border-primary col-span-1" />
        <input value={cert.organization || ''} onChange={e => onChange({ ...cert, organization: e.target.value })}
          placeholder="Issuing organization"
          className="px-3 py-2 rounded-xl border border-border text-foreground text-sm placeholder-muted-foreground focus:outline-none focus:border-primary col-span-1" />
        <input value={cert.year || ''} onChange={e => onChange({ ...cert, year: e.target.value })}
          placeholder="Year"
          className="px-3 py-2 rounded-xl border border-border text-foreground text-sm placeholder-muted-foreground focus:outline-none focus:border-primary col-span-1" />
      </div>
      <button onClick={onRemove} className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0 mt-0.5 hover:bg-destructive/10 transition-colors">
        <X className="w-3.5 h-3.5 text-destructive" />
      </button>
    </div>
  );
}

/* ── Public Profile Preview Card ── */
function ProfilePreviewCard({ profile }) {
  const name = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Your Name';
  return (
    <div className="bg-gradient-to-br from-sidebar to-sidebar rounded-2xl p-6 text-white max-w-sm mx-auto">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-16 h-16 rounded-2xl flex-shrink-0 overflow-hidden flex items-center justify-center text-xl font-black"
          style={{ background: 'linear-gradient(135deg, var(--tc-primary), var(--tc-ai))', boxShadow: '0 0 0 3px color-mix(in srgb, var(--tc-primary) 30%, transparent)' }}>
          {profile.avatar_url
            ? <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
            : name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
          }
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-black text-lg leading-tight">{name}</h3>
          {profile.title && <p className="text-white/60 text-xs mt-0.5">{profile.title}</p>}
          {profile.location && (
            <p className="flex items-center gap-1 text-white/40 text-xs mt-1">
              <MapPin className="w-3 h-3" />{profile.location}
            </p>
          )}
        </div>
      </div>
      {profile.short_bio && (
        <p className="text-white/70 text-sm leading-relaxed mb-4 italic">"{profile.short_bio}"</p>
      )}
      {profile.specialties?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {profile.specialties.slice(0, 4).map(s => (
            <span key={s} className="px-2 py-1 rounded-full text-[10px] font-semibold" style={{ background: 'color-mix(in srgb, var(--tc-primary) 20%, transparent)', color: 'var(--tc-primary)' }}>{s}</span>
          ))}
          {profile.specialties.length > 4 && (
            <span className="px-2 py-1 rounded-full text-[10px] font-semibold" style={{ background: 'color-mix(in srgb, white 10%, transparent)', color: 'color-mix(in srgb, white 50%, transparent)' }}>+{profile.specialties.length - 4}</span>
          )}
        </div>
      )}
      {profile.certifications?.filter(c => c.name).length > 0 && (
        <div className="space-y-1 mb-4">
          {profile.certifications.filter(c => c.name).slice(0, 2).map((c, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-white/50">
              <Award className="w-3 h-3 text-warning flex-shrink-0" />
              {c.name}{c.organization ? ` · ${c.organization}` : ''}{c.year ? ` · ${c.year}` : ''}
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-3 pt-3 border-t border-white/10">
        {profile.instagram && <span className="text-white/40 text-xs">@{profile.instagram}</span>}
        {profile.website_url && <span className="text-white/40 text-xs truncate">{profile.website_url}</span>}
      </div>
    </div>
  );
}

/* ── Completion Bar ── */
function CompletionBar({ profile, onJump }) {
  const items = COMPLETION_CHECKS.map(c => {
    const val = profile[c.key];
    const done = c.isArray ? (Array.isArray(val) && val.length > 0) : !!val;
    return { ...c, done };
  });
  const done = items.filter(i => i.done).length;
  const pct = Math.round((done / items.length) * 100);

  return (
    <div className="bg-card rounded-2xl border border-border p-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-foreground">Profile Completion</h2>
        <span className="text-2xl font-black" style={{ background: 'linear-gradient(135deg, var(--tc-primary), var(--tc-ai))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{pct}%</span>
      </div>
      <div className="h-2.5 rounded-full bg-muted mb-5">
        <motion.div animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: 'easeOut' }}
          className="h-full rounded-full" style={{ background: 'linear-gradient(90deg, var(--tc-primary), var(--tc-ai))' }} />
      </div>
      <div className="space-y-2">
        {items.map(item => (
          <div key={item.key} className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${item.done ? 'bg-success' : 'bg-border'}`}>
                {item.done
                  ? <Check className="w-3 h-3 text-white" strokeWidth={3} />
                  : <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                }
              </div>
              <span className={`text-sm ${item.done ? 'text-muted-foreground line-through' : 'text-foreground font-medium'}`}>{item.label}</span>
            </div>
            {!item.done && (
              <button onClick={() => onJump(item.section)}
                className="text-xs text-primary font-semibold hover:underline">
                Complete
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── MAIN PAGE ── */
export default function CoachProfile() {
  const { me } = useAuth();
  const queryClient = useQueryClient();
  const fileRef = useRef();
  const sectionRefs = { photo: useRef(), business: useRef(), about: useRef(), preview: useRef() };

  const [profile, setProfile] = useState(EMPTY);
  const [profileId, setProfileId] = useState(null);
  const [savedAt, setSavedAt] = useState(null);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => me() });

  const { data: existing = [] } = useQuery({
    queryKey: ['coach-profile', user?.email],
    queryFn: () => base44.entities.CoachProfile.filter({ coach_id: user.id }, '-created_date', 1),
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
        await base44.entities.CoachProfile.update(profileId, payload);
      } else {
        const created = await base44.entities.CoachProfile.create({ ...payload, coach_id: user?.id });
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
    const { file_url } = await base44.uploadFile({ file });
    set('avatar_url', file_url);
  };

  const addCert = () => set('certifications', [...(profile.certifications || []), { name: '', organization: '', year: '' }]);
  const updateCert = (i, val) => {
    const arr = [...(profile.certifications || [])];
    arr[i] = val;
    set('certifications', arr);
  };
  const removeCert = (i) => set('certifications', (profile.certifications || []).filter((_, idx) => idx !== i));

  const jumpTo = (section) => sectionRefs[section]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const initials = [profile.first_name, profile.last_name].filter(Boolean).map(n => n[0]).join('').toUpperCase() || 'C';

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-foreground">My Profile</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your public coaching profile and business information</p>
        </div>
        <div className="flex items-center gap-4">
          <AnimatePresence>
            {savedAt && !isDirty && (
              <motion.p initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                className="text-xs text-success font-semibold flex items-center gap-1">
                <Check className="w-3 h-3" /> All changes saved
              </motion.p>
            )}
          </AnimatePresence>
          <button onClick={() => save()}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl font-bold text-primary-foreground text-sm flex items-center gap-2 disabled:opacity-60 transition-opacity"
            style={{ background: 'linear-gradient(135deg, var(--tc-primary), var(--tc-ai))', boxShadow: '0 4px 16px color-mix(in srgb, var(--tc-primary) 30%, transparent)' }}>
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* SECTION 1 — Photo & Identity */}
        <div ref={sectionRefs.photo}>
          <SectionCard icon={User} title="Profile Photo & Identity">
            {/* Avatar */}
            <div className="flex flex-col items-center mb-8">
              <div className="relative mb-4">
                <div className="w-28 h-28 rounded-full overflow-hidden flex items-center justify-center text-3xl font-black text-primary-foreground"
                  style={{ background: 'linear-gradient(135deg, var(--tc-primary), var(--tc-ai))', boxShadow: '0 0 0 4px white, 0 0 0 6px color-mix(in srgb, var(--tc-primary) 30%, transparent)' }}>
                  {profile.avatar_url
                    ? <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                    : initials
                  }
                </div>
                <button onClick={() => fileRef.current?.click()}
                  className="absolute bottom-0 right-0 w-9 h-9 rounded-full flex items-center justify-center text-primary-foreground"
                  style={{ background: 'linear-gradient(135deg, var(--tc-primary), var(--tc-ai))', boxShadow: '0 2px 8px color-mix(in srgb, var(--tc-primary) 40%, transparent), 0 0 0 3px white' }}>
                  <Camera className="w-4 h-4" />
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </div>
              <div className="flex gap-3">
                <button onClick={() => fileRef.current?.click()}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-primary bg-accent border border-primary hover:bg-accent transition-colors">
                  Upload Photo
                </button>
                {profile.avatar_url && (
                  <button onClick={() => set('avatar_url', '')}
                    className="px-4 py-2 rounded-xl text-sm font-semibold text-destructive bg-destructive/10 border border-destructive hover:bg-destructive/10 transition-colors">
                    Remove
                  </button>
                )}
              </div>
            </div>

            {/* Identity fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="First Name">
                <Input value={profile.first_name} onChange={v => set('first_name', v)} placeholder="First name" />
              </Field>
              <Field label="Last Name">
                <Input value={profile.last_name} onChange={v => set('last_name', v)} placeholder="Last name" />
              </Field>
              <Field label="Coach Title / Tagline" hint="Shown below your name on your public profile">
                <Input value={profile.title} onChange={v => set('title', v)} placeholder="e.g. Online Fitness Coach & Nutritionist" />
              </Field>
              <Field label="Pronouns (optional)">
                <Select value={profile.pronouns} onChange={v => set('pronouns', v)} options={PRONOUNS} placeholder="Select pronouns" />
              </Field>
            </div>
          </SectionCard>
        </div>

        {/* SECTION 2 — Business Information */}
        <div ref={sectionRefs.business}>
          <SectionCard icon={Briefcase} title="Business Information">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Business / Coaching Name">
                <Input value={profile.business_name} onChange={v => set('business_name', v)} placeholder="e.g. Myles Harris Fitness" />
              </Field>
              <Field label="Business Email" hint="Used for client communications">
                <Input value={profile.business_email} onChange={v => set('business_email', v)} placeholder="coach@yourdomain.com" />
              </Field>
              <Field label="Business Phone">
                <Input value={profile.business_phone} onChange={v => set('business_phone', v)} placeholder="+1 (555) 000-0000" />
              </Field>
              <Field label="Website URL">
                <Input value={profile.website_url} onChange={v => set('website_url', v)} placeholder="https://yourwebsite.com" />
              </Field>
              <Field label="Instagram">
                <Input value={profile.instagram} onChange={v => set('instagram', v)} placeholder="yourhandle" prefix="@" />
              </Field>
              <Field label="TikTok (optional)">
                <Input value={profile.tiktok} onChange={v => set('tiktok', v)} placeholder="yourhandle" prefix="@" />
              </Field>
              <Field label="YouTube Channel (optional)">
                <Input value={profile.youtube} onChange={v => set('youtube', v)} placeholder="https://youtube.com/@..." />
              </Field>
              <Field label="Location / City" hint="Shown on public profile">
                <Input value={profile.location} onChange={v => set('location', v)} placeholder="e.g. Los Angeles, CA" />
              </Field>
              <Field label="Timezone" hint="Important for session scheduling">
                <Select value={profile.timezone} onChange={v => set('timezone', v)} options={TIMEZONES} />
              </Field>
            </div>
          </SectionCard>
        </div>

        {/* SECTION 3 — About You */}
        <div ref={sectionRefs.about}>
          <SectionCard icon={BookOpen} title="About You">
            <div className="space-y-5">
              <Field label="Short Bio" hint="Shown as tagline on client portal (max 150 characters)">
                <Textarea value={profile.short_bio} onChange={v => set('short_bio', v)}
                  placeholder="A short punchy tagline about your coaching style..." maxLength={150} rows={2} />
              </Field>
              <Field label="Full Bio" hint="Shown on package landing pages (max 1000 characters)">
                <Textarea value={profile.full_bio} onChange={v => set('full_bio', v)}
                  placeholder="Tell potential clients your story — your background, philosophy, what makes you unique..." maxLength={1000} rows={5} />
              </Field>

              <Field label="Specialties">
                <ChipSelector options={SPECIALTIES} selected={profile.specialties || []} onChange={v => set('specialties', v)} />
              </Field>

              <Field label="Certifications">
                <div className="space-y-2 mb-3">
                  {(profile.certifications || []).map((cert, i) => (
                    <CertificationRow key={i} cert={cert} onChange={v => updateCert(i, v)} onRemove={() => removeCert(i)} />
                  ))}
                </div>
                <button onClick={addCert}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-primary bg-accent border border-primary hover:bg-accent transition-colors">
                  <Plus className="w-4 h-4" /> Add Certification
                </button>
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Years of Experience">
                  <Select value={profile.years_experience} onChange={v => set('years_experience', v)}
                    options={YEARS_EXP} placeholder="Select experience" />
                </Field>
                <Field label="Languages Spoken">
                  <ChipSelector options={LANGUAGES} selected={profile.languages || []} onChange={v => set('languages', v)} />
                </Field>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* SECTION 4 — Public Profile Preview */}
        <div ref={sectionRefs.preview}>
          <SectionCard icon={Eye} title="Public Profile Preview">
            <p className="text-sm text-muted-foreground mb-5">This is how your profile appears to clients on package landing pages. Updates live as you edit.</p>
            <ProfilePreviewCard profile={profile} />
            <div className="flex justify-center mt-5">
              <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-primary border border-primary bg-accent hover:bg-accent transition-colors">
                <ExternalLink className="w-4 h-4" /> View Public Profile
              </button>
            </div>
          </SectionCard>
        </div>

        {/* SECTION 5 — Completion */}
        <CompletionBar profile={profile} onJump={jumpTo} />

        {/* Bottom save */}
        <div className="flex justify-end pb-8">
          <button onClick={() => save()}
            disabled={saving}
            className="px-8 py-3 rounded-xl font-bold text-primary-foreground flex items-center gap-2 disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, var(--tc-primary), var(--tc-ai))', boxShadow: '0 4px 16px color-mix(in srgb, var(--tc-primary) 30%, transparent)' }}>
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}