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
  { value: 'workout_program', label: 'Workout Program' },
  { value: 'nutrition_plan', label: 'Nutrition Plan' },
  { value: 'coaching_package', label: 'Coaching Package' },
  { value: 'guide_ebook', label: 'Guide / Ebook' },
  { value: 'video_course', label: 'Video Course' },
  { value: 'bundle', label: 'Bundle' },
  { value: 'custom', label: 'Custom' },
];

const DELIVERY_OPTIONS = [
  { value: 'downloadable_file', label: 'Downloadable File (PDF, video, zip)' },
  { value: 'app_access', label: 'Access to coaching program in app' },
  { value: 'coaching_messages', label: 'Direct coach access via messages' },
  { value: 'scheduled_calls', label: 'Scheduled calls' },
  { value: 'custom', label: 'Custom delivery' },
];

const ACCESS_DURATIONS = [
  { value: 'lifetime', label: 'Lifetime' },
  { value: '30_days', label: '30 Days' },
  { value: '60_days', label: '60 Days' },
  { value: '90_days', label: '90 Days' },
  { value: '6_months', label: '6 Months' },
  { value: '1_year', label: '1 Year' },
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
    <div className="flex items-center gap-3 pt-4 pb-1">
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <div className="flex-1 h-px bg-muted" />
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
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-muted">
          <DialogTitle className="text-foreground font-bold text-lg">
            {editing ? 'Edit Product' : 'Create Product'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-0">

          {/* ── BASIC INFO ── */}
          <SectionHeader label="Basic Info" />

          <div className="space-y-3">
            <div>
              <Label className="text-xs font-semibold text-foreground">Product Name *</Label>
              <Input className="mt-1" value={form.title} onChange={e => set('title', e.target.value)} required placeholder="e.g. 12-Week Fat Loss Program" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-foreground">Product Type</Label>
                <Select value={form.product_type} onValueChange={handleTypeChange}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold text-foreground">Category</Label>
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
              <Label className="text-xs font-semibold text-foreground">
                Short Description <span className="text-muted-foreground font-normal">({form.description?.length || 0}/150)</span>
              </Label>
              <Input className="mt-1" value={form.description} onChange={e => set('description', e.target.value.slice(0, 150))} placeholder="One-line summary shown on card" />
            </div>

            <div>
              <Label className="text-xs font-semibold text-foreground">Full Description</Label>
              <Textarea className="mt-1" value={form.long_description} onChange={e => set('long_description', e.target.value)} rows={4} placeholder="Detailed description shown on product page…" />
            </div>

            {/* Feature bullets */}
            <div>
              <Label className="text-xs font-semibold text-foreground">Feature Bullets <span className="text-muted-foreground font-normal">(up to 8)</span></Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={featureInput}
                  onChange={e => setFeatureInput(e.target.value)}
                  placeholder="e.g. 5x per week training"
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                />
                <Button type="button" variant="outline" size="sm" onClick={addFeature} disabled={(form.features?.length || 0) >= 8}>
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
              {form.features?.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {form.features.map((f, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-1.5 bg-background border border-border rounded-lg">
                      <span className="text-xs text-foreground">{f}</span>
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
              label="Primary Product Image"
              tip="Recommended: 1200×675px (16:9)"
            />
            {/* Additional images row */}
            <div>
              <Label className="text-xs font-semibold text-foreground">Additional Images <span className="text-muted-foreground font-normal">(up to 3)</span></Label>
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
            <div className="flex items-center gap-3 p-3 bg-background rounded-xl border border-border">
              <Switch checked={form.is_free} onCheckedChange={v => set('is_free', v)} />
              <div>
                <p className="text-sm font-semibold text-foreground">Free Product</p>
                <p className="text-xs text-muted-foreground">No payment required — delivered immediately</p>
              </div>
            </div>

            {!form.is_free && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold text-foreground">Price ($) *</Label>
                    <Input className="mt-1" type="number" min="0" step="0.01" value={form.price} onChange={e => set('price', e.target.value)} placeholder="79.00" />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-foreground">Compare At Price ($) <span className="text-muted-foreground font-normal">crossed out</span></Label>
                    <Input className="mt-1" type="number" min="0" step="0.01" value={form.original_price} onChange={e => set('original_price', e.target.value)} placeholder="99.00" />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-foreground">Payment Type</Label>
                  <div className="flex gap-2 mt-1">
                    {[{ value: 'one_time', label: 'One-time' }, { value: 'subscription', label: 'Subscription' }].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => set('payment_type', opt.value)}
                        className={`flex-1 py-2 rounded-lg border text-sm font-semibold transition-all ${form.payment_type === opt.value ? 'bg-sidebar text-white border-foreground' : 'bg-card text-foreground border-border'}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {form.payment_type === 'subscription' && (
                  <div>
                    <Label className="text-xs font-semibold text-foreground">Billing Frequency</Label>
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
              <Label className="text-xs font-semibold text-foreground mb-2 block">What does the buyer receive?</Label>
              <div className="space-y-2">
                {DELIVERY_OPTIONS.map(opt => (
                  <label key={opt.value} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-background cursor-pointer hover:bg-muted transition-colors">
                    <input
                      type="checkbox"
                      checked={form.delivery_types?.includes(opt.value)}
                      onChange={() => toggleDelivery(opt.value)}
                      className="rounded"
                    />
                    <span className="text-sm text-foreground">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {hasDownload && (
              <div>
                <Label className="text-xs font-semibold text-foreground">Digital Download File</Label>
                <div className="mt-1 flex items-center gap-2">
                  <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-dashed border-muted-foreground rounded-xl bg-background cursor-pointer hover:bg-muted transition-colors text-sm text-foreground">
                    {fileUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {form.download_file_url ? 'File uploaded ✓' : 'Upload PDF, MP4, or ZIP (max 500MB)'}
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
                <Label className="text-xs font-semibold text-foreground">Access Duration</Label>
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
                <Label className="text-xs font-semibold text-foreground">Number of Scheduled Calls</Label>
                <Input className="mt-1" type="number" min="1" value={form.scheduled_calls_count} onChange={e => set('scheduled_calls_count', Number(e.target.value))} />
              </div>
            )}

            <div>
              <Label className="text-xs font-semibold text-foreground">Delivery Instructions <span className="text-muted-foreground font-normal">(shown to buyer after purchase)</span></Label>
              <Textarea
                className="mt-1"
                value={form.delivery_instructions}
                onChange={e => set('delivery_instructions', e.target.value)}
                rows={3}
                placeholder="e.g. Check your email for your download link. DM me on Instagram @yourhandle to get started!"
              />
            </div>
          </div>

          {/* ── PUBLISH ── */}
          <SectionHeader label="Visibility" />
          <div className="flex items-center gap-3 p-3 bg-background rounded-xl border border-border">
            <Switch checked={form.is_published} onCheckedChange={v => set('is_published', v)} />
            <div>
              <p className="text-sm font-semibold text-foreground">Published</p>
              <p className="text-xs text-muted-foreground">Visible to buyers on your public store page</p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-5 border-t border-border mt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="bg-sidebar hover:bg-black text-white min-w-[130px]" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editing ? 'Save Changes' : 'Create Product'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}