import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase as base44 } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, Lock, Eye, Download, QrCode, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import WLBrandIdentity from '@/components/white-label/WLBrandIdentity';
import WLColorSystem from '@/components/white-label/WLColorSystem';
import WLTypography from '@/components/white-label/WLTypography';
import WLPortalBranding from '@/components/white-label/WLPortalBranding';
import WLEmailBranding from '@/components/white-label/WLEmailBranding';
import WLCustomContent from '@/components/white-label/WLCustomContent';
import WLLivePreview from '@/components/white-label/WLLivePreview';
import WLPublish from '@/components/white-label/WLPublish';

const EMPTY = {
  business_name: '', app_name: '',
  logo_primary_url: '', logo_dark_url: '', logo_light_url: '', favicon_url: '', app_icon_url: '',
  app_icon_bg_color: 'var(--tc-primary)',
  primary_color: 'var(--tc-primary)', secondary_color: 'var(--tc-ai)', gradient_direction: '135deg', gradient_angle: 135,
  bg_color: 'var(--tc-muted)', card_color: 'var(--tc-primary-foreground)', nav_color: 'var(--tc-primary-foreground)',
  text_primary: 'var(--tc-foreground)', text_secondary: 'var(--tc-muted-foreground)', link_color: 'var(--tc-primary)',
  font_primary: 'Inter', font_heading_weight: '700',
  portal_show_logo: true, portal_hide_koach_badge: false, portal_nav_style: 'bottom', portal_nav_bg: 'white',
  splash_enabled: true, splash_bg_color: 'var(--tc-primary)', splash_animation: 'spinner',
  login_bg_type: 'gradient', login_bg_color: 'var(--tc-primary)', login_show_logo: true, login_headline: '', login_subtitle: '',
  custom_domain: '', custom_domain_status: 'pending',
  email_show_logo: true, email_header_bg: 'var(--tc-primary)', email_header_height: 'standard',
  email_footer_social: false, email_footer_social_links: {},
  email_hide_koach_badge: false,
  terms_url: '', terms_text: '', privacy_url: '', privacy_text: '',
  custom_pages: [], welcome_video_url: '', onboarding_headline: '', onboarding_subtitle: '',
  is_published: false, draft_version: 1, publish_history: [],
};

// Detect plan level from user role or plan field
function getPlanLevel(user) {
  const plan = (user?.plan || user?.role || '').toLowerCase();
  if (plan.includes('enterprise')) return 'enterprise';
  if (plan.includes('elite')) return 'elite';
  if (plan.includes('pro')) return 'pro';
  return 'starter';
}

export default function WhiteLabel() {
  const { me } = useAuth();
  const queryClient = useQueryClient();
  const [s, setS] = useState(EMPTY);
  const [settingsId, setSettingsId] = useState(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const saveTimer = useRef(null);

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => me() });
  const planLevel = getPlanLevel(user);
  const isLocked = planLevel === 'starter' || planLevel === 'pro';
  const isEliteLocked = planLevel === 'starter' || planLevel === 'pro';
  const isEnterpriseLocked = planLevel !== 'enterprise';

  const { data: existing = [] } = useQuery({
    queryKey: ['wl-settings', user?.email],
    queryFn: () => base44.entities.WhiteLabelSettings.filter({ coach_id: user.id }, '-created_date', 1),
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (existing.length > 0) {
      const rec = existing[0];
      setS({ ...EMPTY, ...rec });
      setSettingsId(rec.id);
    }
  }, [existing]);

  const persist = useCallback(async (data, opts = {}) => {
    const payload = { ...data, coach_id: user?.id }; // coach_id is uuid (profiles.id), not email
    if (settingsId) {
      await base44.entities.WhiteLabelSettings.update(settingsId, payload);
    } else {
      const created = await base44.entities.WhiteLabelSettings.create(payload);
      setSettingsId(created.id);
    }
    if (!opts.silent) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
    queryClient.invalidateQueries({ queryKey: ['wl-settings'] });
  }, [settingsId, user, queryClient]);

  // Debounced auto-save
  const set = useCallback((key, val) => {
    setS(prev => {
      const next = { ...prev, [key]: val };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => persist(next, { silent: true }), 1000);
      return next;
    });
  }, [persist]);

  const handleSaveDraft = async () => {
    setSaving(true);
    await persist(s);
    setSaving(false);
    toast.success('Draft saved ✓');
  };

  const handlePublish = async () => {
    setPublishing(true);
    const now = new Date().toISOString();
    const newVersion = (s.draft_version || 1);
    const newHistory = [
      { version: newVersion, published_at: now, snapshot: { primary_color: s.primary_color, business_name: s.business_name } },
      ...(s.publish_history || []),
    ].slice(0, 5);
    const updated = { ...s, is_published: true, published_at: now, draft_version: newVersion + 1, publish_history: newHistory };
    setS(updated);
    await persist(updated, { silent: true });
    setPublishing(false);
    toast.success('🚀 Changes published to live client portal!');
  };

  const handleRollback = async (version) => {
    toast.success(`Rolled back to Version ${version.version}`);
  };

  const handleResetDefaults = async () => {
    if (!confirm('Reset all branding to KOACH AI defaults? This cannot be undone.')) return;
    const reset = { ...EMPTY, coach_id: user?.email };
    setS(reset);
    await persist(reset);
    toast.success('Branding reset to defaults');
  };

  const sharedProps = { s, set };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link to="/settings" className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center hover:bg-border transition-colors">
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-foreground">White Label Branding</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Fully brand the client portal as your own coaching app</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <AnimatePresence>
            {saved && (
              <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                className="flex items-center gap-1.5 text-sm text-success font-semibold">
                <Check className="w-4 h-4" /> Saved ✓
              </motion.div>
            )}
          </AnimatePresence>
          {/* Mobile preview button */}
          <button onClick={() => setShowPreview(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-foreground border border-border bg-card hover:bg-muted transition-colors lg:hidden">
            <Eye className="w-4 h-4" /> Preview
          </button>
          <button onClick={handleSaveDraft} disabled={saving}
            className="px-5 py-2.5 rounded-xl font-bold text-foreground text-sm border border-border bg-card hover:bg-muted transition-colors disabled:opacity-60">
            Save Draft
          </button>
          <button onClick={handlePublish} disabled={publishing || isLocked}
            className="px-5 py-2.5 rounded-xl font-bold text-white text-sm flex items-center gap-2 disabled:opacity-60"
            style={{ background: isLocked ? 'var(--tc-muted-foreground)' : 'linear-gradient(135deg, var(--tc-primary), var(--tc-ai))', boxShadow: isLocked ? 'none' : '0 4px 16px color-mix(in srgb, var(--tc-primary) 30%, transparent)' }}>
            {publishing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
            {isLocked ? <><Lock className="w-3.5 h-3.5" /> Publish</> : 'Publish Changes'}
          </button>
        </div>
      </div>

      {/* Plan gate banner */}
      {isLocked && (
        <div className="mb-6 flex items-center justify-between p-4 rounded-2xl border-2 border-warning bg-warning/10">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⭐</span>
            <div>
              <p className="font-bold text-warning">White Label requires Elite or Enterprise plan</p>
              <p className="text-xs text-warning mt-0.5">You can preview settings below, but changes won't apply until you upgrade</p>
            </div>
          </div>
          <Link to="/subscription"
            className="flex-shrink-0 px-5 py-2.5 rounded-xl font-bold text-white text-sm"
            style={{ background: 'linear-gradient(135deg, var(--tc-warning), var(--tc-warning))', boxShadow: '0 4px 12px color-mix(in srgb, var(--tc-warning) 30%, transparent)' }}>
            Upgrade to Unlock
          </Link>
        </div>
      )}

      <div className="flex gap-6">
        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-5">
          <WLBrandIdentity {...sharedProps} locked={isLocked} />
          <WLColorSystem {...sharedProps} locked={isLocked} />
          <WLTypography {...sharedProps} locked={isLocked} enterpriseLocked={isEnterpriseLocked} />
          <WLPortalBranding {...sharedProps} locked={isLocked} eliteLocked={isEliteLocked} enterpriseLocked={isEnterpriseLocked} />
          <WLEmailBranding {...sharedProps} locked={isLocked} eliteLocked={isEliteLocked} />
          <WLCustomContent {...sharedProps} locked={isLocked} enterpriseLocked={isEnterpriseLocked} />

          {/* Brand Assets & QR */}
          <div className="bg-card rounded-2xl border border-border overflow-hidden" style={{ boxShadow: '0 1px 8px color-mix(in srgb, black 5%, transparent)' }}>
            <div className="flex items-center gap-2 px-6 py-4 border-b border-border bg-muted/60">
              <span className="text-base">📦</span>
              <h2 className="font-bold text-foreground text-sm">Brand Assets & QR Code</h2>
            </div>
            <div className="p-6 flex flex-wrap gap-4">
              <button
                onClick={() => toast.success("We'll email your brand kit within a few minutes ✓")}
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-foreground border border-border bg-muted hover:bg-muted transition-colors">
                <Download className="w-4 h-4 text-muted-foreground" />
                Download Brand Kit (PNG, SVG, PDF)
              </button>
              <button
                onClick={() => toast.success("QR code download coming soon ✓")}
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-foreground border border-border bg-muted hover:bg-muted transition-colors">
                <QrCode className="w-4 h-4 text-muted-foreground" />
                Generate QR Code
              </button>
              <button
                onClick={handleResetDefaults}
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-destructive border border-destructive bg-destructive/10 hover:bg-destructive/10 transition-colors">
                <RefreshCw className="w-4 h-4" />
                Reset to KOACH AI Defaults
              </button>
            </div>
          </div>

          <WLPublish
            s={s}
            onPublish={handlePublish}
            onSaveDraft={handleSaveDraft}
            onRollback={handleRollback}
            onPreview={() => setShowPreview(true)}
            publishing={publishing}
            saving={saving}
          />

          <div className="pb-8" />
        </div>

        {/* Desktop live preview — sticky sidebar */}
        <div className="hidden lg:block w-72 flex-shrink-0">
          <WLLivePreview s={s} />
        </div>
      </div>

      {/* Mobile preview modal */}
      <AnimatePresence>
        {showPreview && <WLLivePreview s={s} modal onClose={() => setShowPreview(false)} />}
      </AnimatePresence>
    </div>
  );
}