import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Download, Upload, Users, BookOpen, Dumbbell, CalendarClock, TrendingUp, Palette, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SettingsShell, SettingsPanel, SettingsRow, SaveButton } from '@/components/settings/SettingsLayout';
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
  welcome_message: "Welcome. Your program is ready in the app. Message me with any question, big or small.",
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
  brand_color: '#0A5CFF', logo_url: '', email_signature: '', reply_to_email: '',
};

export default function BusinessSettings() {
  const { me } = useAuth();
  const queryClient = useQueryClient();
  const [s, setS] = useState(EMPTY);
  const [settingsId, setSettingsId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [section, setSection] = useState('coaching');

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => me() });

  const { data: existing = [] } = useQuery({
    queryKey: ['business-settings', user?.email],
    queryFn: () => db.entities.BusinessSettings.filter({ coach_id: user.id }, '-created_date', 1),
    enabled: !!user?.id,
  });

  const { data: forms = [] } = useQuery({
    queryKey: ['checkin-forms'], queryFn: () => db.entities.CheckInForm.list('-created_date', 50),
  });
  const { data: programs = [] } = useQuery({
    queryKey: ['programs-list'], queryFn: () => db.entities.WorkoutProgram.list('-created_date', 50),
  });
  const { data: mealPlans = [] } = useQuery({
    queryKey: ['meal-plans-list'], queryFn: () => db.entities.NutritionPlan.list('-created_date', 50),
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
        await db.entities.BusinessSettings.update(settingsId, payload);
      } else {
        const created = await db.entities.BusinessSettings.create(payload);
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

  const NAV = [{
    items: [
      { id: 'coaching', label: 'Coaching', icon: Users },
      { id: 'onboarding', label: 'Onboarding', icon: BookOpen },
      { id: 'programs', label: 'Programs and nutrition', icon: Dumbbell },
      { id: 'scheduling', label: 'Scheduling', icon: CalendarClock },
      { id: 'leads', label: 'Leads and sales', icon: TrendingUp },
      { id: 'branding', label: 'Branding', icon: Palette },
      { id: 'backup', label: 'Backup and restore', icon: Archive },
    ],
  }];

  return (
    <SettingsShell
      backTo="/settings"
      title="Business settings"
      subtitle="How your coaching business runs, from the first check-in to the email signature. Changes save every 30 seconds."
      nav={NAV}
      active={section}
      onSelect={setSection}
      actions={<SaveButton onClick={save} saving={saving} saved={!!savedAt} dirty={isDirty} />}
    >
      {section === 'coaching' && <BSCoachingPrefs {...sharedProps} forms={forms} programs={programs} mealPlans={mealPlans} />}
      {section === 'onboarding' && <BSOnboarding {...sharedProps} forms={forms} />}
      {section === 'programs' && <BSProgramNutrition {...sharedProps} />}
      {section === 'scheduling' && <BSScheduling {...sharedProps} />}
      {section === 'leads' && <BSLeadSales {...sharedProps} />}
      {section === 'branding' && <BSBranding {...sharedProps} />}
      {section === 'backup' && (
        <SettingsPanel title="Backup and restore" subtitle="Keep a copy of these settings, or load them from a file.">
          <SettingsRow label="Export" help="Downloads every business setting as a JSON file.">
            <div className="flex sm:justify-end">
              <Button variant="outline" onClick={exportSettings}><Download /> Export settings</Button>
            </div>
          </SettingsRow>
          <SettingsRow label="Import" help="Loads a backup into the form. Nothing is saved until you press Save.">
            <div className="flex sm:justify-end">
              <Button asChild variant="outline">
                <label className="cursor-pointer">
                  <Upload /> Import a file
                  <input type="file" accept=".json" className="hidden" onChange={importSettings} />
                </label>
              </Button>
            </div>
          </SettingsRow>
        </SettingsPanel>
      )}

      <div className="flex justify-end">
        <SaveButton onClick={save} saving={saving} saved={!!savedAt} dirty={isDirty} label="Save all changes" />
      </div>
    </SettingsShell>
  );
}
