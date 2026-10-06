import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, Lock, Eye, RotateCcw, Loader2 } from 'lucide-react';
import { Page, PageHeader, Panel, PanelHeader } from '@/components/kit';
import { Button } from '@/components/ui/button';
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
  // Client-app brand values are data (the coach's colours), stored as hex.
  app_icon_bg_color: '#0A5CFF',
  primary_color: '#0A5CFF', secondary_color: '#111318', gradient_direction: '135deg', gradient_angle: 135,
  bg_color: '#EEEFF1', card_color: '#FFFFFF', nav_color: '#FFFFFF',
  text_primary: '#111318', text_secondary: '#5E6470', link_color: '#0A5CFF',
  font_primary: 'Inter', font_heading_weight: '700',
  portal_show_logo: true, portal_hide_koach_badge: false, portal_nav_style: 'bottom', portal_nav_bg: 'white',
  splash_enabled: true, splash_bg_color: '#111318', splash_animation: 'spinner',
  login_bg_type: 'gradient', login_bg_color: '#0A5CFF', login_show_logo: true, login_headline: '', login_subtitle: '',
  custom_domain: '', custom_domain_status: 'pending',
  email_show_logo: true, email_header_bg: '#111318', email_header_height: 'standard',
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

// Everything that defines the branding (not bookkeeping), so a rollback restores it fully.
const NOT_BRANDING = new Set(['id', 'coach_id', 'created_at', 'updated_at', 'created_date', 'updated_date', 'created_by', 'created_by_id', 'publish_history', 'is_published', 'published_at', 'draft_version']);
function brandingSnapshot(s) {
  return Object.fromEntries(Object.entries(s).filter(([k]) => !NOT_BRANDING.has(k)));
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
    queryFn: () => db.entities.WhiteLabelSettings.filter({ coach_id: user.id }, '-created_date', 1),
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
      await db.entities.WhiteLabelSettings.update(settingsId, payload);
    } else {
      const created = await db.entities.WhiteLabelSettings.create(payload);
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
    toast.success('Draft saved');
  };

  const handlePublish = async () => {
    setPublishing(true);
    const now = new Date().toISOString();
    const newVersion = (s.draft_version || 1);
    const newHistory = [
      { version: newVersion, published_at: now, snapshot: brandingSnapshot(s) },
      ...(s.publish_history || []),
    ].slice(0, 5);
    const updated = { ...s, is_published: true, published_at: now, draft_version: newVersion + 1, publish_history: newHistory };
    setS(updated);
    await persist(updated, { silent: true });
    setPublishing(false);
    toast.success('Published. Clients see the new branding next time they open the app.');
  };

  // Restore a published version's branding as the current draft (publish to apply).
  const handleRollback = async (version) => {
    const snap = version?.snapshot || {};
    if (!Object.keys(snap).length) { toast.error('This version has no saved branding to restore.'); return; }
    const restored = { ...s, ...snap };
    setS(restored);
    await persist(restored, { silent: true });
    const partial = Object.keys(snap).length <= 2; // versions published before full snapshots were kept
    toast.success(partial
      ? `Restored the color and name from version ${version.version}. Publish to show it to clients.`
      : `Restored version ${version.version} as your draft. Publish to show it to clients.`);
  };

  const handleResetDefaults = async () => {
    if (!confirm('Reset all branding to the KOACH defaults? This cannot be undone.')) return;
    const reset = { ...EMPTY, coach_id: user?.id };
    setS(reset);
    await persist(reset);
    toast.success('Branding reset to defaults');
  };

  const sharedProps = { s, set };

  return (
    <Page>
      <Link to="/settings" className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Settings
      </Link>
      <PageHeader
        title="White label"
        subtitle="Put your name, logo and colour on the client app. Edits save as a draft; clients see them when you publish."
        actions={
          <>
            {saved && (
              <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                <Check className="h-4 w-4 text-success" /> Saved
              </span>
            )}
            {/* Mobile preview button */}
            <Button variant="outline" onClick={() => setShowPreview(true)} className="lg:hidden">
              <Eye /> Preview
            </Button>
            <Button variant="outline" onClick={handleSaveDraft} disabled={saving}>Save draft</Button>
            <Button onClick={handlePublish} disabled={publishing || isLocked}>
              {publishing && <Loader2 className="animate-spin" />}
              {isLocked && <Lock />}
              Publish
            </Button>
          </>
        }
      />

      {/* Plan gate banner */}
      {isLocked && (
        <Panel className="mb-5 flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <div>
              <p className="text-[15px] font-semibold text-foreground">White label is on the Elite and Enterprise plans</p>
              <p className="mt-0.5 text-sm text-muted-foreground">You can try settings and see the preview. Nothing reaches clients until you upgrade.</p>
            </div>
          </div>
          <Button asChild variant="outline" className="flex-shrink-0">
            <Link to="/subscription">See plans</Link>
          </Button>
        </Panel>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-10">
        {/* Settings form */}
        <div className="min-w-0 space-y-5">
          <WLBrandIdentity {...sharedProps} locked={isLocked} />
          <WLColorSystem {...sharedProps} locked={isLocked} />
          <WLTypography {...sharedProps} locked={isLocked} enterpriseLocked={isEnterpriseLocked} />
          <WLPortalBranding {...sharedProps} locked={isLocked} eliteLocked={isEliteLocked} enterpriseLocked={isEnterpriseLocked} />
          <WLEmailBranding {...sharedProps} locked={isLocked} eliteLocked={isEliteLocked} />
          <WLCustomContent {...sharedProps} locked={isLocked} enterpriseLocked={isEnterpriseLocked} />

          <Panel>
            <PanelHeader title="Start over" subtitle="Go back to the default KOACH look. Your clients see it next time they open the app." />
            <div className="flex flex-wrap gap-2 px-5 pb-5 sm:px-6">
              <Button variant="ghost" className="text-destructive" onClick={handleResetDefaults}>
                <RotateCcw /> Reset to KOACH defaults
              </Button>
            </div>
          </Panel>

          <WLPublish
            s={s}
            onPublish={handlePublish}
            onSaveDraft={handleSaveDraft}
            onRollback={handleRollback}
            onPreview={() => setShowPreview(true)}
            publishing={publishing}
            saving={saving}
          />
        </div>

        {/* Desktop live preview, sticky */}
        <aside className="hidden lg:block">
          <WLLivePreview s={s} />
        </aside>
      </div>

      {/* Mobile preview modal */}
      <AnimatePresence>
        {showPreview && <WLLivePreview s={s} modal onClose={() => setShowPreview(false)} />}
      </AnimatePresence>
    </Page>
  );
}
