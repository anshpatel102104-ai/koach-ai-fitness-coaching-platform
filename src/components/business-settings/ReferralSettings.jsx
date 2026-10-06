import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { SettingsPanel, SettingsRow, SettingsSwitchRow, fieldClass, textareaClass } from '@/components/settings/SettingsLayout';
import { toast } from 'sonner';

export default function ReferralSettings({ coachId }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(null);

  const { data: configs = [] } = useQuery({
    queryKey: ['referral-config', coachId],
    queryFn: () => db.entities.ReferralConfiguration.filter({ coach_id: coachId }, '-created_date', 1),
    enabled: !!coachId,
    onSuccess: (data) => {
      if (data.length > 0) {
        setSettings(data[0]);
      } else {
        setSettings({
          coach_id: coachId,
          is_enabled: true,
          reward_type: 'discount_dollar',
          reward_amount: 20,
          reward_trigger: 'on_signup',
          reward_referred_friend_too: false,
          max_referrals_per_client: 0,
          auto_apply_rewards: false,
        });
      }
    },
  });

  const mutation = useMutation({
    mutationFn: (data) => {
      if (settings.id) {
        return db.entities.ReferralConfiguration.update(settings.id, data);
      } else {
        return db.entities.ReferralConfiguration.create(data);
      }
    },
    onSuccess: () => {
      toast.success('Referral settings saved');
      queryClient.invalidateQueries({ queryKey: ['referral-config', coachId] });
    },
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await mutation.mutateAsync(settings);
    } finally {
      setSaving(false);
    }
  };

  if (!settings) return null;
  const upd = (patch) => setSettings({ ...settings, ...patch });

  return (
    <SettingsPanel
      title="Client referrals"
      subtitle="Reward clients who bring their friends to you."
      footer={<Button onClick={handleSave} disabled={saving}>{saving ? 'Saving' : 'Save referral settings'}</Button>}
    >
      <SettingsSwitchRow
        label="Referral program"
        help="Clients get a link to share and a reward when it works."
        checked={settings.is_enabled}
        onCheckedChange={v => upd({ is_enabled: v })}
      />

      {settings.is_enabled && (
        <>
          <SettingsRow label="Reward">
            <select value={settings.reward_type} onChange={(e) => upd({ reward_type: e.target.value })} className={fieldClass}>
              <option value="discount_dollar">Dollar discount</option>
              <option value="discount_percent">Percentage discount</option>
              <option value="free_days">Free days</option>
              <option value="custom">Something else</option>
            </select>
          </SettingsRow>

          <SettingsRow label="Amount">
            {settings.reward_type === 'custom' ? (
              <input type="text" value={settings.custom_reward_text || ''} onChange={(e) => upd({ custom_reward_text: e.target.value })}
                placeholder="For example, a free nutrition plan" className={fieldClass} />
            ) : (
              <input type="number" value={settings.reward_amount} onChange={(e) => upd({ reward_amount: parseFloat(e.target.value) })}
                placeholder="Amount" className={fieldClass} />
            )}
          </SettingsRow>

          <SettingsRow label="Given when">
            <select value={settings.reward_trigger} onChange={(e) => upd({ reward_trigger: e.target.value })} className={fieldClass}>
              <option value="on_signup">The friend signs up</option>
              <option value="on_first_payment">The friend makes a first payment</option>
              <option value="on_30_days">The friend stays 30 days</option>
            </select>
          </SettingsRow>

          <SettingsSwitchRow
            label="Reward the friend too"
            help="Give new clients a reason to join."
            checked={settings.reward_referred_friend_too}
            onCheckedChange={v => upd({ reward_referred_friend_too: v })}
          />

          {settings.reward_referred_friend_too && (
            <SettingsRow label="What the friend gets">
              <input type="text" value={settings.new_client_reward_description || ''} onChange={(e) => upd({ new_client_reward_description: e.target.value })}
                placeholder="For example, first week free" className={fieldClass} />
            </SettingsRow>
          )}

          <SettingsSwitchRow
            label="Apply rewards automatically"
            help="Otherwise you approve each one."
            checked={settings.auto_apply_rewards}
            onCheckedChange={v => upd({ auto_apply_rewards: v })}
          />

          <SettingsRow label="Message to clients" help="Shown on the referral page.">
            <textarea value={settings.referral_message || ''} onChange={(e) => upd({ referral_message: e.target.value })}
              placeholder="Optional" rows={3} className={textareaClass} />
          </SettingsRow>
        </>
      )}
    </SettingsPanel>
  );
}
