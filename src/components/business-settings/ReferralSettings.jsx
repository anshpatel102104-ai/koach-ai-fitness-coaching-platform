import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Save } from 'lucide-react';
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

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-2xl p-6 border border-border">
        <h3 className="text-foreground font-black text-lg mb-4">Referral Program</h3>

        {/* Enable/Disable */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="font-semibold text-foreground">Enable Client Referral Program</p>
            <p className="text-muted-foreground text-sm mt-1">Let clients refer friends and earn rewards</p>
          </div>
          <button
            onClick={() => setSettings({ ...settings, is_enabled: !settings.is_enabled })}
            className={`w-12 h-7 rounded-full transition-colors ${
              settings.is_enabled ? 'bg-primary' : 'bg-border'
            }`}
            style={{
              background: settings.is_enabled
                ? 'linear-gradient(90deg, var(--tc-primary), var(--tc-primary))'
                : 'var(--tc-muted-foreground)',
            }} >
            <div
              className={`w-5 h-5 rounded-full bg-card transition-transform ${
                settings.is_enabled ? 'translate-x-6' : 'translate-x-1'
              }`} />
          </button>
        </div>

        {settings.is_enabled && (
          <>
            {/* Reward Type */}
            <div className="mb-6">
              <label className="block font-semibold text-foreground mb-2">Reward Type</label>
              <select
                value={settings.reward_type}
                onChange={(e) => setSettings({ ...settings, reward_type: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="discount_dollar">Dollar Discount</option>
                <option value="discount_percent">Percentage Discount</option>
                <option value="free_days">Free Days</option>
                <option value="custom">Custom Reward</option>
              </select>
            </div>

            {/* Reward Amount */}
            <div className="mb-6">
              <label className="block font-semibold text-foreground mb-2">Reward Amount</label>
              {settings.reward_type === 'custom' ? (
                <input
                  type="text"
                  value={settings.custom_reward_text || ''}
                  onChange={(e) => setSettings({ ...settings, custom_reward_text: e.target.value })}
                  placeholder="e.g., Free nutrition plan"
                  className="w-full px-4 py-2 rounded-lg border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              ) : (
                <input
                  type="number"
                  value={settings.reward_amount}
                  onChange={(e) => setSettings({ ...settings, reward_amount: parseFloat(e.target.value) })}
                  placeholder="Enter amount"
                  className="w-full px-4 py-2 rounded-lg border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              )}
            </div>

            {/* Trigger */}
            <div className="mb-6">
              <label className="block font-semibold text-foreground mb-2">When Is Reward Given?</label>
              <select
                value={settings.reward_trigger}
                onChange={(e) => setSettings({ ...settings, reward_trigger: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="on_signup">When friend signs up</option>
                <option value="on_first_payment">When friend makes first payment</option>
                <option value="on_30_days">After 30 days of active subscription</option>
              </select>
            </div>

            {/* Reward referred friend too */}
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="font-semibold text-foreground">Also reward the referred friend</p>
                <p className="text-muted-foreground text-sm mt-1">Give new clients an incentive to join</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, reward_referred_friend_too: !settings.reward_referred_friend_too })}
                className={`w-12 h-7 rounded-full transition-colors`}
                style={{
                  background: settings.reward_referred_friend_too
                    ? 'linear-gradient(90deg, var(--tc-primary), var(--tc-primary))'
                    : 'var(--tc-muted-foreground)',
                }} >
                <div
                  className={`w-5 h-5 rounded-full bg-card transition-transform ${
                    settings.reward_referred_friend_too ? 'translate-x-6' : 'translate-x-1'
                  }`} />
              </button>
            </div>

            {settings.reward_referred_friend_too && (
              <div className="mb-6">
                <label className="block font-semibold text-foreground mb-2">What do new clients get?</label>
                <input
                  type="text"
                  value={settings.new_client_reward_description || ''}
                  onChange={(e) => setSettings({ ...settings, new_client_reward_description: e.target.value })}
                  placeholder="e.g., First week free"
                  className="w-full px-4 py-2 rounded-lg border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            )}

            {/* Auto-apply rewards */}
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="font-semibold text-foreground">Auto-apply rewards</p>
                <p className="text-muted-foreground text-sm mt-1">Rewards automatically applied when earned</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, auto_apply_rewards: !settings.auto_apply_rewards })}
                className={`w-12 h-7 rounded-full transition-colors`}
                style={{
                  background: settings.auto_apply_rewards
                    ? 'linear-gradient(90deg, var(--tc-primary), var(--tc-primary))'
                    : 'var(--tc-muted-foreground)',
                }} >
                <div
                  className={`w-5 h-5 rounded-full bg-card transition-transform ${
                    settings.auto_apply_rewards ? 'translate-x-6' : 'translate-x-1'
                  }`} />
              </button>
            </div>

            {/* Message */}
            <div className="mb-6">
              <label className="block font-semibold text-foreground mb-2">Message to Clients</label>
              <textarea
                value={settings.referral_message || ''}
                onChange={(e) => setSettings({ ...settings, referral_message: e.target.value })}
                placeholder="Optional message shown on referral page"
                rows={3}
                className="w-full px-4 py-2 rounded-lg border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </>
        )}

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 rounded-xl font-bold text-primary-foreground flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, var(--tc-primary), var(--tc-ai))' }}>
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}