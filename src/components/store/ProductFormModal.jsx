import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { X, Plus, Upload, Loader2 } from 'lucide-react';
import ProductImageUpload from './ProductImageUpload';
import { db } from '@/api/supabaseClient';
import { toast } from 'sonner';

const TYPE_CATEGORY_MAP = {
  workout_program: 'workout',
  nutrition_plan: 'nutrition',
  coaching_package: 'coaching',
  guide_ebook: 'other',
  video_course: 'other',
  bundle: 'bundle',
  custom: 'other',
};

const TYPE_OPTIONS = [
  { value: 'workout_program', label: 'Workout program' },
  { value: 'nutrition_plan', label: 'Nutrition plan' },
  { value: 'coaching_package', label: 'Coaching package' },
  { value: 'guide_ebook', label: 'Guide or ebook' },
  { value: 'video_course', label: 'Video course' },
  { value: 'bundle', label: 'Bundle' },
  { value: 'custom', label: 'Custom' },
];

const DELIVERY_OPTIONS = [
  { value: 'downloadable_file', label: 'A file to download (PDF, video, zip)' },
  { value: 'app_access', label: 'Access to coaching program in app' },
  { value: 'coaching_messages', label: 'Direct coach access via messages' },
  { value: 'scheduled_calls', label: 'Scheduled calls' },
  { value: 'custom', label: 'Custom delivery' },
];

const ACCESS_DURATIONS = [
  { value: 'lifetime', label: 'Lifetime' },
  { value: '30_days', label: '30 days' },
  { value: '60_days', label: '60 days' },
  { value: '90_days', label: '90 days' },
  { value: '6_months', label: '6 months' },
  { value: '1_year', label: '1 year' },
];

const BLANK = {
  title: '', description: '', long_description: '',
  product_type: 'workout_program', category: 'workout',
  price: '', original_price: '', is_free: false,
  payment_type: 'one_time', billing_frequency: 'monthly',
  image_url: '', additional_images: [],
  features: [],
  delivery_types: [], download_file_url: '', access_duration: 'lifetime',
  scheduled_calls_count: 1, delivery_instructions: '',
  is_published: true,
};

function SectionHeader({ label }) {
  return (
    <div className="pt-5 pb-3 mt-5 first:mt-0 border-t border-border first:border-t-0 first:pt-4">
      <p className="text-[15px] font-semibold text-foreground">{label}</p>
    </div>
  );
}

export default function ProductFormModal({ open, onClose, editing, onCreate, onUpdate }) {
  const [form, setForm] = useState(BLANK);
  const [featureInput, setFeatureInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [fileUploading, setFileUploading] = useState(false);

  useEffect(() => {
    if (editing) {
      setForm({ ...BLANK, ...editing, price: editing.price ?? '', original_price: editing.original_price ?? '' });
    } else {
      setForm(BLANK);
    }
    setFeatureInput('');
  }, [editing, open]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleTypeChange = (type) => {
    setForm(f => ({ ...f, product_type: type, category: TYPE_CATEGORY_MAP[type] || 'other' }));
  };

  const addFeature = () => {
    if (featureInput.trim() && (form.features?.length || 0) < 8) {
      setForm(f => ({ ...f, features: [...(f.features || []), featureInput.trim()] }));
      setFeatureInput('');
    }
  };

  const removeFeature = (idx) => setForm(f => ({ ...f, features: f.features.filter((_, i) => i !== idx) }));

  const toggleDelivery = (val) => {
    setForm(f => {
      const cur = f.delivery_types || [];
      return { ...f, delivery_types: cur.includes(val) ? cur.filter(v => v !== val) : [...cur, val] };
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileUploading(true);
    const { file_url } = await db.uploadFile({ file, bucket: 'branding' });
    set('download_file_url', file_url);
    setFileUploading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title) return toast.error('Product name is required');
    if (!form.is_free && !form.price) return toast.error('Price is required');

    setSaving(true);
    const data = {
      ...form,
      price: form.is_free ? 0 : Number(form.price),
      original_price: Number(form.original_price) || undefined,
      slug: form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    };

    try {
      if (editing) {
        await onUpdate(editing.id, data);
        // If price changed and stripe ids exist, we don't auto-update to keep it simple
      } else {
        const created = await onCreate(data);
        // Attempt to create Stripe product in background
        if (data.price > 0) {
          db.functions.invoke('storeCreateProduct', { listing: { ...data, id: created?.id } })
            .then(res => {
              if (res?.data?.stripe_price_id && created?.id) {
                db.entities.PlanListing.update(created.id, {
                  stripe_product_id: res.data.stripe_product_id,
                  stripe_price_id: res.data.stripe_price_id,
                });
              }
            })
            .catch(() => {});
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const hasAppAccess = form.delivery_types?.includes('app_access');
  const hasDownload = form.delivery_types?.includes('downloadable_file');
  const hasCalls = form.delivery_types?.includes('scheduled_calls');

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle>
            {editing ? 'Edit product' : 'New product'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-0">

          {/* ── BASIC INFO ── */}
          <SectionHeader label="Basics" />

          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input className="mt-1" value={form.title} onChange={e => set('title', e.target.value)} required placeholder="12-week fat loss program" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={form.product_type} onValueChange={handleTypeChange}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => set('category', v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="workout">Workout</SelectItem>
                    <SelectItem value="nutrition">Nutrition</SelectItem>
                    <SelectItem value="coaching">Coaching</SelectItem>
                    <SelectItem value="bundle">Bundle</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>
                Short description <span className="text-muted-foreground font-normal">({form.description?.length || 0}/150)</span>
              </Label>
              <Input className="mt-1" value={form.description} onChange={e => set('description', e.target.value.slice(0, 150))} placeholder="One line, shown on the product card" />
            </div>

            <div>
              <Label>Full description</Label>
              <Textarea className="mt-1" value={form.long_description} onChange={e => set('long_description', e.target.value)} rows={4} placeholder="What it is, who it is for, what a week looks like" />
            </div>

            {/* Feature bullets */}
            <div>
              <Label>What's included <span className="text-muted-foreground font-normal">(up to 8)</span></Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={featureInput}
                  onChange={e => setFeatureInput(e.target.value)}
                  placeholder="5 sessions a week, 45 minutes each"
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                />
                <Button type="button" variant="outline" size="sm" onClick={addFeature} disabled={(form.features?.length || 0) >= 8}>
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
              {form.features?.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {form.features.map((f, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 bg-secondary rounded-lg">
                      <span className="text-sm text-foreground">{f}</span>
                      <button type="button" onClick={() => removeFeature(i)} className="text-muted-foreground hover:text-destructive">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── MEDIA ── */}
          <SectionHeader label="Media" />
          <div className="space-y-3">
            <ProductImageUpload
              value={form.image_url}
              onChange={v => set('image_url', v)}
              label="Main image"
              tip="1200 × 675 px works best"
            />
            {/* Additional images row */}
            <div>
              <Label>More images <span className="text-muted-foreground font-normal">(up to 3)</span></Label>
              <div className="flex gap-2 mt-1.5">
                {[0, 1, 2].map(idx => (
                  <ProductImageUpload
                    key={idx}
                    value={form.additional_images?.[idx] || ''}
                    onChange={v => {
                      const imgs = [...(form.additional_images || [])];
                      imgs[idx] = v;
                      set('additional_images', imgs.filter(Boolean));
                    }}
                    label=""
                    tip="Optional"
                    className="flex-1"
                  />
                ))}
              </div>
            </div>
          </div>

          {/* ── PRICING ── */}
          <SectionHeader label="Pricing" />
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary">
              <Switch checked={form.is_free} onCheckedChange={v => set('is_free', v)} />
              <div>
                <p className="text-sm font-semibold text-foreground">Free</p>
                <p className="text-xs text-muted-foreground">No payment. Buyers get it straight away.</p>
              </div>
            </div>

            {!form.is_free && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label>Price ($)</Label>
                    <Input className="mt-1" type="number" min="0" step="0.01" value={form.price} onChange={e => set('price', e.target.value)} placeholder="79.00" />
                  </div>
                  <div>
                    <Label>Was ($) <span className="text-muted-foreground font-normal">shown crossed out</span></Label>
                    <Input className="mt-1" type="number" min="0" step="0.01" value={form.original_price} onChange={e => set('original_price', e.target.value)} placeholder="99.00" />
                  </div>
                </div>

                <div>
                  <Label>Payment</Label>
                  <div className="flex gap-2 mt-1">
                    {[{ value: 'one_time', label: 'One-time' }, { value: 'subscription', label: 'Subscription' }].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => set('payment_type', opt.value)}
                        className={`flex-1 h-10 rounded-md border text-sm font-semibold transition-colors ${form.payment_type === opt.value ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-input hover:bg-accent'}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {form.payment_type === 'subscription' && (
                  <div>
                    <Label>Billing</Label>
                    <Select value={form.billing_frequency} onValueChange={v => set('billing_frequency', v)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly (every 3 months)</SelectItem>
                        <SelectItem value="annual">Annual (yearly)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── DELIVERY ── */}
          <SectionHeader label="Delivery" />
          <div className="space-y-3">
            <div>
              <Label className="mb-2 block">What does the buyer receive?</Label>
              <div className="space-y-2">
                {DELIVERY_OPTIONS.map(opt => (
                  <label key={opt.value} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border cursor-pointer hover:bg-accent/60 transition-colors">
                    <input
                      type="checkbox"
                      checked={form.delivery_types?.includes(opt.value)}
                      onChange={() => toggleDelivery(opt.value)}
                      className="rounded accent-[rgb(var(--primary))] h-4 w-4"
                    />
                    <span className="text-sm text-foreground">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {hasDownload && (
              <div>
                <Label>Download file</Label>
                <div className="mt-1 flex items-center gap-2">
                  <label className="flex-1 flex items-center justify-center gap-2 px-4 h-11 border border-dashed border-input rounded-lg cursor-pointer hover:bg-accent/60 transition-colors text-sm font-medium text-foreground">
                    {fileUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {form.download_file_url ? 'File uploaded. Click to replace' : 'Upload a PDF, MP4 or ZIP, up to 500 MB'}
                    <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.mp4,.zip,.mov" />
                  </label>
                  {form.download_file_url && (
                    <button type="button" onClick={() => set('download_file_url', '')} className="text-muted-foreground hover:text-destructive">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {hasAppAccess && (
              <div>
                <Label>Access lasts</Label>
                <Select value={form.access_duration} onValueChange={v => set('access_duration', v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ACCESS_DURATIONS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {hasCalls && (
              <div>
                <Label>Number of calls</Label>
                <Input className="mt-1" type="number" min="1" value={form.scheduled_calls_count} onChange={e => set('scheduled_calls_count', Number(e.target.value))} />
              </div>
            )}

            <div>
              <Label>After purchase <span className="text-muted-foreground font-normal">shown to the buyer</span></Label>
              <Textarea
                className="mt-1"
                value={form.delivery_instructions}
                onChange={e => set('delivery_instructions', e.target.value)}
                rows={3}
                placeholder="Check your email for the download link, then message me to book your first call."
              />
            </div>
          </div>

          {/* ── PUBLISH ── */}
          <SectionHeader label="Visibility" />
          <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary">
            <Switch checked={form.is_published} onCheckedChange={v => set('is_published', v)} />
            <div>
              <p className="text-sm font-semibold text-foreground">Published</p>
              <p className="text-xs text-muted-foreground">Shows on your public store page</p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-5 border-t border-border mt-6">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="min-w-[130px]" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editing ? 'Save changes' : 'Create product'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}