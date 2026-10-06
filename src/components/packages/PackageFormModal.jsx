import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Segmented } from '@/components/kit';

const PRESET_IMAGES = [
  'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&q=80',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80',
  'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&q=80',
  'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=600&q=80',
  'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=600&q=80',
  'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&q=80',
];

const COLOR_PRESETS = ['var(--tc-primary)', 'var(--tc-brand)', 'var(--tc-success)', 'var(--tc-warning)', 'var(--tc-destructive)', 'var(--kc-0891b2)'];

const INCLUSION_KEYS = [
  { key: 'custom_program', label: 'Custom workout program' },
  { key: 'weekly_updates', label: 'Weekly program updates' },
  { key: 'meal_plan', label: 'Personalized meal plan' },
  { key: 'weekly_checkins', label: 'Weekly check-ins' },
  { key: 'unlimited_messaging', label: 'Unlimited messaging' },
  { key: 'progress_tracking', label: 'Progress tracking' },
  { key: 'nutrition_coaching', label: 'Nutrition coaching' },
  { key: 'app_access', label: 'App access' },
];

const VIDEO_CALL_OPTIONS = [
  { value: 'none', label: 'Not included' },
  { value: '1x_month', label: 'Once a month' },
  { value: '2x_month', label: 'Twice a month' },
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

function Section({ title, children }) {
  return (
    <div className="mb-6">
      <h3 className="text-lg text-foreground pb-2 mb-1 border-b border-border">{title}</h3>
      {children}
    </div>
  );
}

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
    { key: 'basic', label: 'Basics' },
    { key: 'pricing', label: 'Price' },
    { key: 'inclusions', label: 'Includes' },
    { key: 'settings', label: 'Settings' },
  ];

  const chip = (on) => cn(
    'touch-compact rounded-md border px-3 py-2 text-left text-sm transition-colors',
    on ? 'border-primary bg-primary text-primary-foreground font-medium' : 'border-input bg-card text-foreground hover:bg-accent'
  );
  const radioRow = (on) => cn(
    'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm cursor-pointer transition-colors',
    on ? 'bg-secondary text-foreground font-medium' : 'text-foreground hover:bg-accent/60'
  );

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="p-0 sm:p-0 sm:max-w-[680px] sm:flex sm:flex-col sm:gap-0 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border flex-shrink-0">
          <DialogTitle className="mb-4">{isEdit ? 'Edit package' : 'New package'}</DialogTitle>
          <Segmented size="sm" value={tab} onChange={setTab} options={TABS.map(t => ({ value: t.key, label: t.label }))} />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {tab === 'basic' && (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="12-week transformation" />
              </div>
              <div className="space-y-1.5">
                <Label>One-line summary</Label>
                <Input value={form.description} onChange={e => set('description', e.target.value)} placeholder="Shown in your list and at the top of the page" />
              </div>
              <div className="space-y-1.5">
                <Label>Sales page copy</Label>
                <Textarea value={form.long_description} onChange={e => set('long_description', e.target.value)} rows={5} placeholder="Who it's for, what they get, what changes in 12 weeks" />
              </div>
              <div className="space-y-1.5">
                <Label>Cover image</Label>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {PRESET_IMAGES.map(url => (
                    <button
                      type="button"
                      key={url}
                      onClick={() => set('image_url', url)}
                      className={cn('touch-compact h-20 rounded-md overflow-hidden ring-offset-2 ring-offset-card transition-shadow', form.image_url === url ? 'ring-2 ring-foreground' : 'ring-0')}
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
                <Input value={form.image_url} onChange={e => set('image_url', e.target.value)} placeholder="Or paste an image URL" />
              </div>
              <div className="space-y-1.5">
                <Label>Page colour</Label>
                <div className="flex gap-2 flex-wrap items-center">
                  {COLOR_PRESETS.map(c => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => set('color_theme', c)}
                      aria-label="Pick colour"
                      className={cn('touch-compact h-8 w-8 rounded-full ring-offset-2 ring-offset-card', form.color_theme === c ? 'ring-2 ring-foreground' : '')}
                      style={{ background: c }}
                    />
                  ))}
                  <input
                    type="color"
                    value={form.color_theme?.startsWith('#') ? form.color_theme : '#111318'}
                    onChange={e => set('color_theme', e.target.value)}
                    className="h-8 w-8 rounded-full border border-input cursor-pointer p-0 overflow-hidden"
                    aria-label="Custom colour"
                  />
                </div>
              </div>
            </div>
          )}

          {tab === 'pricing' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Price (USD)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <Input type="number" value={form.price} onChange={e => set('price', e.target.value)} placeholder="0" className="pl-7" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Was <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <Input type="number" value={form.original_price} onChange={e => set('original_price', e.target.value)} placeholder="Shown struck through" className="pl-7" />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Billed</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { value: 'one_time', label: 'Once' },
                    { value: 'monthly', label: 'Monthly' },
                    { value: 'quarterly', label: 'Quarterly' },
                    { value: 'annual', label: 'Yearly' },
                    { value: 'custom', label: 'Custom plan' },
                  ].map(opt => (
                    <button key={opt.value} type="button" onClick={() => set('billing_type', opt.value)} className={chip(form.billing_type === opt.value)}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {form.billing_type !== 'one_time' && (
                <div className="space-y-1.5">
                  <Label>Commitment</Label>
                  <div className="space-y-0.5">
                    {[
                      { value: 'month_to_month', label: 'Month to month, cancel any time' },
                      { value: 'minimum_months', label: `At least ${form.contract_months || 3} months` },
                      { value: 'fixed_term', label: 'Fixed term, ends on its own' },
                    ].map(opt => (
                      <label key={opt.value} className={radioRow(form.contract_type === opt.value)}>
                        <input type="radio" className="accent-[rgb(var(--foreground))]" checked={form.contract_type === opt.value} onChange={() => set('contract_type', opt.value)} />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                  {form.contract_type !== 'month_to_month' && (
                    <div className="flex items-center gap-2 pt-1">
                      <Input type="number" value={form.contract_months} onChange={e => set('contract_months', Number(e.target.value))} className="w-20" min={1} />
                      <span className="text-sm text-muted-foreground">months</span>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Free trial (days)</Label>
                  <Input type="number" value={form.trial_days} onChange={e => set('trial_days', Number(e.target.value))} min={0} />
                </div>
                <div className="space-y-1.5">
                  <Label>Length in weeks</Label>
                  <Input type="number" value={form.duration_weeks} onChange={e => set('duration_weeks', Number(e.target.value))} min={0} />
                  <p className="text-[13px] text-muted-foreground">0 means ongoing.</p>
                </div>
              </div>
            </div>
          )}

          {tab === 'inclusions' && (
            <div>
              <Section title="What clients get">
                {INCLUSION_KEYS.map(({ key, label }) => (
                  <label key={key} className="flex items-center justify-between gap-4 py-2.5 border-b border-border last:border-b-0 cursor-pointer">
                    <span className="text-sm text-foreground">{label}</span>
                    <Switch checked={!!form.inclusions?.[key]} onCheckedChange={v => setInclusion(key, v)} />
                  </label>
                ))}
                <div className="pt-3">
                  <p className="text-sm text-foreground mb-2">Video calls</p>
                  <div className="flex gap-2 flex-wrap">
                    {VIDEO_CALL_OPTIONS.map(opt => (
                      <button key={opt.value} type="button" onClick={() => setInclusion('video_calls', opt.value)} className={chip(form.inclusions?.video_calls === opt.value)}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </Section>

              <Section title="Anything else">
                {(form.custom_inclusions || []).map((item, i) => (
                  <div key={i} className="flex items-center gap-2 py-2 border-b border-border">
                    <span className="flex-1 text-sm text-foreground">{item}</span>
                    <button type="button" onClick={() => removeCustomInclusion(i)} className="touch-compact p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-accent" aria-label="Remove">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2 mt-3">
                  <Input
                    value={newInclusion}
                    onChange={e => setNewInclusion(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addCustomInclusion()}
                    placeholder="Monthly form review video"
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" onClick={addCustomInclusion}><Plus /> Add</Button>
                </div>
              </Section>
            </div>
          )}

          {tab === 'settings' && (
            <div>
              <Section title="Capacity and visibility">
                <div className="grid grid-cols-2 gap-4 py-3">
                  <div className="space-y-1.5">
                    <Label>Client limit</Label>
                    <Input type="number" value={form.max_clients} onChange={e => set('max_clients', Number(e.target.value))} min={0} />
                    <p className="text-[13px] text-muted-foreground">0 means no limit.</p>
                  </div>
                  <label className="flex items-center justify-between gap-3 self-start mt-7 cursor-pointer">
                    <span className="text-sm text-foreground">Waitlist when full</span>
                    <Switch checked={!!form.waitlist_enabled} onCheckedChange={v => set('waitlist_enabled', v)} />
                  </label>
                </div>
                <p className="text-sm text-foreground mb-1">Who can see it</p>
                <div className="space-y-0.5">
                  {[
                    { value: 'public', label: 'Public, listed on your booking page' },
                    { value: 'private', label: 'Private, only people with the link' },
                    { value: 'hidden', label: 'Hidden, you assign it yourself' },
                  ].map(opt => (
                    <label key={opt.value} className={radioRow(form.visibility === opt.value)}>
                      <input type="radio" className="accent-[rgb(var(--foreground))]" checked={form.visibility === opt.value} onChange={() => set('visibility', opt.value)} />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </Section>

              <Section title="When someone signs up">
                <div className="space-y-4 pt-3">
                  <div className="space-y-1.5">
                    <Label>Assign a program</Label>
                    <Select value={form.auto_assign_program_id || '__none'} onValueChange={v => set('auto_assign_program_id', v === '__none' ? '' : v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">None</SelectItem>
                        {programs.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Assign a meal plan</Label>
                    <Select value={form.auto_assign_nutrition_id || '__none'} onValueChange={v => set('auto_assign_nutrition_id', v === '__none' ? '' : v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">None</SelectItem>
                        {nutritionPlans.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Welcome message</Label>
                    <Textarea
                      value={form.auto_welcome_message}
                      onChange={e => set('auto_welcome_message', e.target.value)}
                      rows={3}
                      placeholder="Hi [First Name], welcome to [Package Name]. Your first check-in is Friday."
                    />
                  </div>
                  <label className="flex items-center justify-between gap-3 cursor-pointer">
                    <span className="text-sm text-foreground">Book an onboarding call automatically</span>
                    <Switch checked={!!form.auto_schedule_call} onCheckedChange={v => set('auto_schedule_call', v)} />
                  </label>
                </div>
              </Section>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-border flex-shrink-0">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!form.name || !form.price}>
            {isEdit ? 'Save changes' : 'Create package'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
