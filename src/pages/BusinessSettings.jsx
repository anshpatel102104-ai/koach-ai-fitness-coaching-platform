import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase as base44 } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, Download, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import BSCoachingPrefs from '@/components/business-settings/BSCoachingPrefs';
import BSOnboarding from '@/components/business-settings/BSOnboarding';
import BSProgramNutrition from '@/components/business-settings/BSProgramNutrition';
import BSScheduling from '@/components/business-settings/BSScheduling';
import BSLeadSales from '@/components/business-settings/BSLeadSales';
import BSBranding from '@/components/business-settings/BSBranding';

const EMPTY = {
  checkin_frequency: 'weekly', checkin_due_day: 1, checkin_reminder_hours: 24,
  auto_assign_checkin_form: false, auto_assign_program: false, auto_assign_meal_plan: false,
  welcome_message_enabled: true,
  welcome_message: "Welcome! I'm so excited to start this journey with you. Check out your program and don't hesitate to message me with any questions 💪",
  max_clients_unlimited: true, max_clients: 50, waitlist_enabled: false, capacity_alerts: true,
  default_tags: [], auto_tag_at_risk_pct: 60, auto_tag_high_performer_pct: 90, auto_tag_new_client_days: 30,
  onboarding_items: [], onboarding_deadline_days: 7, onboarding_remind_days: 3, onboarding_notify_coach: true,
  welcome_email_enabled: true, welcome_email_template: '', welcome_video_enabled: false, welcome_video_url: '',
  intake_form_id: '', require_intake_before_program: false, intake_reminder_days: 2,
  program_progression: 'manual', progression_completion_pct: 80, progression_adherence_pct: 80, progression_adherence_weeks: 2,
  default_rest_day_text: '', default_program_notes: '',
  macro_method: 'manual', default_protein_per_lb: 1.0, default_deficit_pct: 15, default_surplus_pct: 10,
  default_water_liters: 2.5, default_meal_frequency: 3,
  working_hours: {}, response_time: '24h', auto_reply_enabled: false, auto_reply_message: '',
  allow_session_requests: true, session_types: [], booking_notice_hours: 24, max_sessions_per_month: 0, session_buffer_minutes: 0,
  pipeline_stages: [], auto_move_pipeline_enabled: false, auto_move_pipeline_days: 7,
  followup_reminder_enabled: true, followup_reminder_days: 3,
  brand_color: 'var(--tc-primary)', logo_url: '', email_signature: '', reply_to_email: '',
};

export default function BusinessSettings() {
  const { me } = useAuth();
  const queryClient = useQueryClient();
  const [s, setS] = useState(EMPTY);
  const [settingsId, setSettingsId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [isDirty, setIsDirty] = useState(false);

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => me() });

  const { data: existing = [] } = useQuery({
    queryKey: ['business-settings', user?.email],
    queryFn: () => base44.entities.BusinessSettings.filter({ coach_id: user.id }, '-created_date', 1),
    enabled: !!user?.id,
  });

  const { data: forms = [] } = useQuery({
    queryKey: ['checkin-forms'], queryFn: () => base44.entities.CheckInForm.list('-created_date', 50),
  });
  const { data: programs = [] } = useQuery({
    queryKey: ['programs-list'], queryFn: () => base44.entities.WorkoutProgram.list('-created_date', 50),
  });
  const { data: mealPlans = [] } = useQuery({
    queryKey: ['meal-plans-list'], queryFn: () => base44.entities.NutritionPlan.list('-created_date', 50),
  });

  useEffect(() => {
    if (existing.length > 0) {
      const rec = existing[0];
      setS({ ...EMPTY, ...rec });
      setSettingsId(rec.id);
    }
  }, [existing]);

  const set = useCallback((key, val) => {
    setS(prev => ({ ...prev, [key]: val }));
    setIsDirty(true);
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const payload = { ...s, coach_id: user?.id }; // coach_id is uuid (profiles.id), not email
      if (settingsId) {
        await base44.entities.BusinessSettings.update(settingsId, payload);
      } else {
        const created = await base44.entities.BusinessSettings.create(payload);
        setSettingsId(created.id);
      }
      setSavedAt(new Date());
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ['business-settings'] });
    } finally {
      setSaving(false);
    }
  }, [s, settingsId, user, queryClient]);

  // Autosave every 30s
  useEffect(() => {
    if (!isDirty) return;
    const t = setTimeout(() => save(), 30000);
    return () => clearTimeout(t);
  }, [s, isDirty, save]);

  // Unsaved changes warning
  useEffect(() => {
    const handler = (e) => { if (isDirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const exportSettings = () => {
    const blob = new Blob([JSON.stringify(s, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'business-settings.json'; a.click();
    URL.revokeObjectURL(url);
  };

  const importSettings = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        setS(prev => ({ ...prev, ...data }));
        setIsDirty(true);
      } catch {}
    };
    reader.readAsText(file);
  };

  const sharedProps = { s, set };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/settings" className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center hover:bg-border transition-colors">
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-foreground">Business Settings</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Configure how your coaching business operates</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <AnimatePresence>
            {savedAt && !isDirty && (
              <motion.p initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                className="text-xs text-success font-semibold flex items-center gap-1">
                <Check className="w-3 h-3" /> Saved ✓
              </motion.p>
            )}
          </AnimatePresence>
          <button onClick={save} disabled={saving}
            className="px-5 py-2.5 rounded-xl font-bold text-primary-foreground text-sm flex items-center gap-2 disabled:opacity-60 transition-opacity"
            style={{ background: 'linear-gradient(135deg, var(--tc-primary), var(--tc-ai))', boxShadow: '0 4px 16px color-mix(in srgb, var(--tc-primary) 30%, transparent)' }}>
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-6">
        <BSCoachingPrefs {...sharedProps} forms={forms} programs={programs} mealPlans={mealPlans} />
        <BSOnboarding {...sharedProps} forms={forms} />
        <BSProgramNutrition {...sharedProps} />
        <BSScheduling {...sharedProps} />
        <BSLeadSales {...sharedProps} />
        <BSBranding {...sharedProps} />

        {/* Export/Import */}
        <div className="bg-card rounded-2xl border border-border p-5 flex items-center justify-between shadow-sm">
          <div>
            <p className="font-bold text-foreground text-sm">Backup & Restore</p>
            <p className="text-xs text-muted-foreground mt-0.5">Export your settings as JSON or import from a backup</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportSettings}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-muted-foreground bg-muted border border-border hover:bg-border transition-colors">
              <Download className="w-4 h-4" /> Export
            </button>
            <label className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-muted-foreground bg-muted border border-border hover:bg-border transition-colors cursor-pointer">
              <Upload className="w-4 h-4" /> Import
              <input type="file" accept=".json" className="hidden" onChange={importSettings} />
            </label>
          </div>
        </div>

        {/* Bottom save */}
        <div className="flex justify-end pb-8">
          <button onClick={save} disabled={saving}
            className="px-8 py-3 rounded-xl font-bold text-primary-foreground flex items-center gap-2 disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, var(--tc-primary), var(--tc-ai))', boxShadow: '0 4px 16px color-mix(in srgb, var(--tc-primary) 30%, transparent)' }}>
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
            Save All Changes
          </button>
        </div>
      </div>
    </div>
  );
}