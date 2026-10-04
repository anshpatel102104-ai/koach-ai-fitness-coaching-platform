import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { X, Plus, Trash2 } from 'lucide-react';

const PRESET_IMAGES = [
  'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&q=80',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80',
  'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&q=80',
  'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=600&q=80',
  'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=600&q=80',
  'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&q=80',
];

const COLOR_PRESETS = ['var(--tc-primary)', 'var(--tc-ai)', 'var(--tc-destructive)', 'var(--tc-success)', 'var(--tc-warning)', 'var(--kc-0891b2)', 'var(--kc-db2777)', 'var(--tc-foreground)'];

const INCLUSION_KEYS = [
  { key: 'custom_program', label: 'Custom workout program' },
  { key: 'weekly_updates', label: 'Weekly program updates' },
  { key: 'meal_plan', label: 'Personalized meal plan' },
  { key: 'weekly_checkins', label: 'Weekly check-ins' },
  { key: 'unlimited_messaging', label: 'Unlimited messaging' },
  { key: 'progress_tracking', label: 'Progress tracking' },
  { key: 'nutrition_coaching', label: 'Nutrition coaching' },
  { key: 'app_access', label: '24/7 App access' },
];

const VIDEO_CALL_OPTIONS = [
  { value: 'none', label: 'Not included' },
  { value: '1x_month', label: '1x / month' },
  { value: '2x_month', label: '2x / month' },
  { value: 'weekly', label: 'Weekly' },
];

const defaultForm = () => ({
  name: '',
  description: '',
  long_description: '',
  image_url: '',
  color_theme: 'var(--tc-primary)',
  price: '',
  original_price: '',
  billing_type: 'monthly',
  contract_type: 'month_to_month',
  contract_months: 3,
  trial_days: 0,
  duration_weeks: 0,
  inclusions: {
    custom_program: true,
    weekly_checkins: true,
    unlimited_messaging: true,
    app_access: true,
    meal_plan: false,
    weekly_updates: false,
    progress_tracking: true,
    nutrition_coaching: false,
    video_calls: 'none',
  },
  custom_inclusions: [],
  max_clients: 0,
  waitlist_enabled: false,
  visibility: 'private',
  auto_assign_program_id: '',
  auto_assign_nutrition_id: '',
  auto_welcome_message: '',
  auto_schedule_call: false,
  is_active: true,
  testimonials: [],
  faqs: [],
});

const S = {
  label: { fontSize: 11, fontWeight: 700, color: 'var(--tc-muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, display: 'block' },
  input: { width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 14, background: 'var(--tc-background)', color: 'var(--tc-foreground)', border: '1.5px solid var(--tc-border)', outline: 'none', boxSizing: 'border-box' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 13, fontWeight: 800, color: 'var(--tc-foreground)', marginBottom: 14, paddingBottom: 8, borderBottom: '1px solid var(--tc-muted)' },
};

export default function PackageFormModal({ pkg, onClose, onSave }) {
  const isEdit = !!pkg?.id;
  const [form, setForm] = useState(pkg ? { ...defaultForm(), ...pkg } : defaultForm());
  const [tab, setTab] = useState('basic');
  const [newInclusion, setNewInclusion] = useState('');

  const { data: programs = [] } = useQuery({
    queryKey: ['programs-pkg'],
    queryFn: () => db.entities.WorkoutProgram.list('-created_date', 100),
  });
  const { data: nutritionPlans = [] } = useQuery({
    queryKey: ['nutrition-pkg'],
    queryFn: () => db.entities.NutritionPlan.list('-created_date', 100),
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setInclusion = (k, v) => setForm(f => ({ ...f, inclusions: { ...f.inclusions, [k]: v } }));

  const addCustomInclusion = () => {
    if (!newInclusion.trim()) return;
    setForm(f => ({ ...f, custom_inclusions: [...(f.custom_inclusions || []), newInclusion.trim()] }));
    setNewInclusion('');
  };

  const removeCustomInclusion = (i) => {
    setForm(f => ({ ...f, custom_inclusions: f.custom_inclusions.filter((_, idx) => idx !== i) }));
  };

  const handleSave = () => {
    if (!form.name || !form.price) return;
    const slug = form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    onSave({ ...form, price: Number(form.price), original_price: form.original_price ? Number(form.original_price) : undefined, slug });
  };

  const TABS = [
    { key: 'basic', label: 'Basic Info' },
    { key: 'pricing', label: 'Pricing' },
    { key: 'inclusions', label: "What's Included" },
    { key: 'settings', label: 'Settings' },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'color-mix(in srgb, black 55%, transparent)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--tc-card)', borderRadius: 20, width: '100%', maxWidth: 680, maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px color-mix(in srgb, black 20%, transparent)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--tc-foreground)', margin: 0 }}>{isEdit ? 'Edit Package' : 'Create Package'}</h2>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--tc-muted)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={16} color="var(--tc-muted-foreground)" />
            </button>
          </div>
          {/* Tab nav */}
          <div style={{ display: 'flex', gap: 2 }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                style={{ padding: '9px 16px', fontSize: 13, fontWeight: tab === t.key ? 700 : 500, color: tab === t.key ? 'var(--tc-primary)' : 'var(--tc-muted-foreground)', border: 'none', borderBottom: `2px solid ${tab === t.key ? 'var(--tc-primary)' : 'transparent'}`, background: 'transparent', cursor: 'pointer' }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

          {/* ── BASIC INFO ── */}
          {tab === 'basic' && (
            <div>
              <div style={S.section}>
                <label style={S.label}>Package Name *</label>
                <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. 12-Week Transformation" style={S.input} />
              </div>
              <div style={S.section}>
                <label style={S.label}>Short Description</label>
                <input value={form.description} onChange={e => set('description', e.target.value)} placeholder="1-2 line summary shown on card" style={S.input} />
              </div>
              <div style={S.section}>
                <label style={S.label}>Full Sales Copy</label>
                <textarea value={form.long_description} onChange={e => set('long_description', e.target.value)} rows={5} placeholder="Describe what makes this package amazing…" style={{ ...S.input, resize: 'none' }} />
              </div>
              <div style={S.section}>
                <label style={S.label}>Cover Image</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 10 }}>
                  {PRESET_IMAGES.map(url => (
                    <div key={url} onClick={() => set('image_url', url)}
                      style={{ height: 80, borderRadius: 10, overflow: 'hidden', cursor: 'pointer', border: `2.5px solid ${form.image_url === url ? 'var(--tc-primary)' : 'transparent'}`, transition: 'border-color 0.15s' }}>
                      <img src={url} alt="preset" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ))}
                </div>
                <input value={form.image_url} onChange={e => set('image_url', e.target.value)} placeholder="Or paste image URL" style={S.input} />
              </div>
              <div style={S.section}>
                <label style={S.label}>Brand Color</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {COLOR_PRESETS.map(c => (
                    <button key={c} onClick={() => set('color_theme', c)}
                      style={{ width: 32, height: 32, borderRadius: 9999, background: c, border: `3px solid ${form.color_theme === c ? 'var(--tc-foreground)' : 'transparent'}`, cursor: 'pointer', flexShrink: 0 }} />
                  ))}
                  <input type="color" value={form.color_theme} onChange={e => set('color_theme', e.target.value)}
                    style={{ width: 32, height: 32, borderRadius: 9999, border: '2px solid var(--tc-border)', cursor: 'pointer', padding: 0, overflow: 'hidden' }} />
                </div>
              </div>
            </div>
          )}

          {/* ── PRICING ── */}
          {tab === 'pricing' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div>
                  <label style={S.label}>Price (USD) *</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--tc-muted-foreground)', fontSize: 14, fontWeight: 600 }}>$</span>
                    <input type="number" value={form.price} onChange={e => set('price', e.target.value)} placeholder="0" style={{ ...S.input, paddingLeft: 28 }} />
                  </div>
                </div>
                <div>
                  <label style={S.label}>Original Price (optional)</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--tc-muted-foreground)', fontSize: 14 }}>$</span>
                    <input type="number" value={form.original_price} onChange={e => set('original_price', e.target.value)} placeholder="Strike-through price" style={{ ...S.input, paddingLeft: 28 }} />
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={S.label}>Billing Type</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    { value: 'one_time', label: 'One-time Payment', icon: '💳' },
                    { value: 'monthly', label: 'Monthly Recurring', icon: '📅' },
                    { value: 'quarterly', label: 'Quarterly', icon: '🗓' },
                    { value: 'annual', label: 'Annual', icon: '📆' },
                    { value: 'custom', label: 'Custom Plan', icon: '⚙️' },
                  ].map(opt => (
                    <button key={opt.value} type="button" onClick={() => set('billing_type', opt.value)}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px', borderRadius: 10, textAlign: 'left', cursor: 'pointer', border: `1.5px solid ${form.billing_type === opt.value ? 'var(--tc-primary)' : 'var(--tc-border)'}`, background: form.billing_type === opt.value ? 'var(--tc-accent)' : 'var(--tc-card)', fontSize: 13, fontWeight: form.billing_type === opt.value ? 600 : 400, color: form.billing_type === opt.value ? 'var(--tc-primary)' : 'var(--tc-foreground)' }}>
                      <span>{opt.icon}</span>{opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {form.billing_type !== 'one_time' && (
                <div style={{ marginBottom: 20 }}>
                  <label style={S.label}>Contract Length</label>
                  {[
                    { value: 'month_to_month', label: 'Month to month (cancel anytime)' },
                    { value: 'minimum_months', label: `Minimum ${form.contract_months || 3} months commitment` },
                    { value: 'fixed_term', label: 'Fixed term (auto-cancels at end)' },
                  ].map(opt => (
                    <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, cursor: 'pointer', fontSize: 13, color: 'var(--tc-foreground)' }}>
                      <input type="radio" checked={form.contract_type === opt.value} onChange={() => set('contract_type', opt.value)} />
                      {opt.label}
                    </label>
                  ))}
                  {form.contract_type !== 'month_to_month' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                      <input type="number" value={form.contract_months} onChange={e => set('contract_months', Number(e.target.value))} style={{ ...S.input, width: 80 }} min={1} />
                      <span style={{ fontSize: 13, color: 'var(--tc-muted-foreground)' }}>months</span>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div>
                  <label style={S.label}>Trial Period (days)</label>
                  <input type="number" value={form.trial_days} onChange={e => set('trial_days', Number(e.target.value))} min={0} style={S.input} />
                </div>
                <div>
                  <label style={S.label}>Duration (weeks, 0 = ongoing)</label>
                  <input type="number" value={form.duration_weeks} onChange={e => set('duration_weeks', Number(e.target.value))} min={0} style={S.input} />
                </div>
              </div>
            </div>
          )}

          {/* ── INCLUSIONS ── */}
          {tab === 'inclusions' && (
            <div>
              <div style={S.section}>
                <div style={S.sectionTitle}>Service Inclusions</div>
                {INCLUSION_KEYS.map(({ key, label }) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--tc-background)' }}>
                    <span style={{ fontSize: 13, color: 'var(--tc-foreground)' }}>{label}</span>
                    <button type="button" onClick={() => setInclusion(key, !form.inclusions?.[key])}
                      style={{ width: 40, height: 22, borderRadius: 9999, border: 'none', cursor: 'pointer', background: form.inclusions?.[key] ? 'var(--tc-primary)' : 'var(--tc-border)', position: 'relative', flexShrink: 0, transition: 'background 0.2s' }}>
                      <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--tc-card)', position: 'absolute', top: 3, left: form.inclusions?.[key] ? 20 : 3, transition: 'left 0.2s', boxShadow: '0 1px 4px color-mix(in srgb, black 20%, transparent)' }} />
                    </button>
                  </div>
                ))}

                {/* Video calls special */}
                <div style={{ padding: '12px 0', borderBottom: '1px solid var(--tc-background)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, color: 'var(--tc-foreground)' }}>Video check-in calls</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {VIDEO_CALL_OPTIONS.map(opt => (
                      <button key={opt.value} type="button" onClick={() => setInclusion('video_calls', opt.value)}
                        style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: `1.5px solid ${form.inclusions?.video_calls === opt.value ? 'var(--tc-primary)' : 'var(--tc-border)'}`, background: form.inclusions?.video_calls === opt.value ? 'var(--tc-accent)' : 'var(--tc-card)', color: form.inclusions?.video_calls === opt.value ? 'var(--tc-primary)' : 'var(--tc-muted-foreground)' }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div style={S.section}>
                <div style={S.sectionTitle}>Custom Inclusions</div>
                {(form.custom_inclusions || []).map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ flex: 1, fontSize: 13, color: 'var(--tc-foreground)', padding: '8px 12px', background: 'var(--tc-background)', borderRadius: 8 }}>{item}</span>
                    <button type="button" onClick={() => removeCustomInclusion(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tc-destructive)', padding: 6 }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <input value={newInclusion} onChange={e => setNewInclusion(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addCustomInclusion()}
                    placeholder="Add custom inclusion…" style={{ ...S.input, flex: 1 }} />
                  <button type="button" onClick={addCustomInclusion}
                    style={{ padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: 'var(--tc-accent)', color: 'var(--tc-primary)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Plus size={14} /> Add
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── SETTINGS ── */}
          {tab === 'settings' && (
            <div>
              <div style={S.section}>
                <div style={S.sectionTitle}>Capacity & Visibility</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 14 }}>
                  <div>
                    <label style={S.label}>Max Clients (0 = unlimited)</label>
                    <input type="number" value={form.max_clients} onChange={e => set('max_clients', Number(e.target.value))} min={0} style={S.input} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 2 }}>
                    <ToggleRow label="Enable waitlist" value={form.waitlist_enabled} onChange={v => set('waitlist_enabled', v)} />
                  </div>
                </div>

                <label style={S.label}>Visibility</label>
                {[
                  { value: 'public', label: '🌐 Public — appears on your booking page' },
                  { value: 'private', label: '🔗 Private — only via direct link' },
                  { value: 'hidden', label: '👁 Hidden — coach assigns manually only' },
                ].map(opt => (
                  <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, cursor: 'pointer', fontSize: 13, color: 'var(--tc-foreground)' }}>
                    <input type="radio" checked={form.visibility === opt.value} onChange={() => set('visibility', opt.value)} />
                    {opt.label}
                  </label>
                ))}
              </div>

              <div style={S.section}>
                <div style={S.sectionTitle}>Onboarding Automation</div>
                <div style={{ marginBottom: 12 }}>
                  <label style={S.label}>Auto-assign Program</label>
                  <select value={form.auto_assign_program_id} onChange={e => set('auto_assign_program_id', e.target.value)} style={S.input}>
                    <option value="">None</option>
                    {programs.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={S.label}>Auto-assign Meal Plan</label>
                  <select value={form.auto_assign_nutrition_id} onChange={e => set('auto_assign_nutrition_id', e.target.value)} style={S.input}>
                    <option value="">None</option>
                    {nutritionPlans.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={S.label}>Welcome Message (sent on purchase)</label>
                  <textarea value={form.auto_welcome_message} onChange={e => set('auto_welcome_message', e.target.value)} rows={3}
                    placeholder="Hi [First Name]! Welcome to [Package Name]! I'm so excited to start this journey with you…"
                    style={{ ...S.input, resize: 'none' }} />
                </div>
                <ToggleRow label="Auto-schedule onboarding call on purchase" value={form.auto_schedule_call} onChange={v => set('auto_schedule_call', v)} />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--tc-muted)', display: 'flex', gap: 10, justifyContent: 'flex-end', flexShrink: 0 }}>
          <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600, background: 'var(--tc-muted)', color: 'var(--tc-foreground)', border: 'none', cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={!form.name || !form.price}
            style={{ padding: '10px 24px', borderRadius: 10, fontSize: 14, fontWeight: 700, background: (!form.name || !form.price) ? 'var(--tc-border)' : 'linear-gradient(135deg, var(--tc-primary), var(--tc-ai))', color: (!form.name || !form.price) ? 'var(--tc-muted-foreground)' : 'var(--tc-primary-foreground)', border: 'none', cursor: (!form.name || !form.price) ? 'not-allowed' : 'pointer' }}>
            {isEdit ? 'Save Changes' : 'Create Package'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({ label, value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
      <span style={{ fontSize: 13, color: 'var(--tc-foreground)' }}>{label}</span>
      <button type="button" onClick={() => onChange(!value)}
        style={{ width: 40, height: 22, borderRadius: 9999, border: 'none', cursor: 'pointer', background: value ? 'var(--tc-primary)' : 'var(--tc-border)', position: 'relative', flexShrink: 0, transition: 'background 0.2s' }}>
        <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--tc-card)', position: 'absolute', top: 3, left: value ? 20 : 3, transition: 'left 0.2s', boxShadow: '0 1px 4px color-mix(in srgb, black 20%, transparent)' }} />
      </button>
    </div>
  );
}