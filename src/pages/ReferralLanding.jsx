import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase as base44 } from '@/api/supabaseClient';
import { motion } from 'framer-motion';
import { ArrowRight, Check, Users } from 'lucide-react';
import { SignedImg } from '@/components/shared/SignedImage';

export default function ReferralLanding() {
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get('ref');

  // Get referral info
  const { data: referral } = useQuery({
    queryKey: ['referral-info', refCode],
    queryFn: async () => {
      const refs = await base44.entities.ClientReferral.filter({ referral_code: refCode }, '-date_referred', 1);
      return refs[0];
    },
    enabled: !!refCode,
  });

  // Get referrer client
  const { data: referrerClient } = useQuery({
    queryKey: ['referrer-client', referral?.referrer_client_id],
    queryFn: () => base44.entities.Client.get(referral?.referrer_client_id),
    enabled: !!referral?.referrer_client_id,
  });

  // Get coach
  const { data: coach } = useQuery({
    queryKey: ['coach-profile', referral?.coach_id],
    queryFn: async () => {
      const profiles = await base44.entities.CoachProfile.filter({ coach_id: referral?.coach_id }, '-created_date', 1);
      return profiles[0];
    },
    enabled: !!referral?.coach_id,
  });

  // Get referral config
  const { data: config } = useQuery({
    queryKey: ['referral-config-landing', referral?.coach_id],
    queryFn: async () => {
      const configs = await base44.entities.ReferralConfiguration.filter({ coach_id: referral?.coach_id }, '-created_date', 1);
      return configs[0];
    },
    enabled: !!referral?.coach_id,
  });

  // Get referral package
  const { data: packages = [] } = useQuery({
    queryKey: ['packages-landing', referral?.coach_id],
    queryFn: async () => {
      return base44.entities.CoachingPackage.filter({ visibility: 'public' }, '-created_date', 5);
    },
    enabled: !!referral?.coach_id,
  });

  if (!referral || !coach) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <div className="text-center">
          <p className="text-muted-foreground font-semibold">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-card">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="pt-20 pb-12 px-5 text-center"
        style={{ background: 'linear-gradient(135deg, var(--tc-muted) 0%, var(--tc-muted) 100%)' }}>
        
        {coach.avatar_url && (
          <SignedImg src={coach.avatar_url} alt={coach.first_name}
            className="w-20 h-20 rounded-full mx-auto mb-4 object-cover border-4 border-white"
            style={{ boxShadow: '0 4px 16px color-mix(in srgb, black 10%, transparent)' }} />
        )}

        <h1 className="text-foreground font-black text-3xl mb-2">
          Meet Coach {coach.first_name}
        </h1>

        <p className="text-muted-foreground text-lg mb-6">
          <span className="font-bold text-foreground">{referrerClient?.name}</span> thinks you'd love working with them!
        </p>

        {coach.short_bio && (
          <p className="text-muted-foreground max-w-2xl mx-auto mb-8">{coach.short_bio}</p>
        )}

        {/* Specialties */}
        {coach.specialties?.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center mb-8">
            {coach.specialties.slice(0, 3).map((spec, i) => (
              <span key={i} className="px-4 py-2 rounded-full text-sm font-bold"
                style={{ background: 'var(--tc-accent)', color: 'var(--tc-primary)' }}>
                {spec}
              </span>
            ))}
          </div>
        )}
      </motion.div>

      {/* What's included */}
      <div className="max-w-2xl mx-auto px-5 py-12">
        <h2 className="text-2xl font-black text-foreground mb-6">What's Included</h2>
        
        {packages.length > 0 && (
          <div className="space-y-4 mb-8">
            {packages.slice(0, 1).map(pkg => (
              <div key={pkg.id} className="p-5 rounded-2xl bg-muted border border-border">
                <h3 className="font-bold text-foreground mb-3">{pkg.name}</h3>
                <ul className="space-y-2 text-foreground text-sm">
                  {pkg.inclusions?.custom_program && (
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-success" /> Personalized workout program</li>
                  )}
                  {pkg.inclusions?.weekly_checkins && (
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-success" /> Weekly check-ins</li>
                  )}
                  {pkg.inclusions?.meal_plan && (
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-success" /> Meal plan & nutrition coaching</li>
                  )}
                  {pkg.inclusions?.unlimited_messaging && (
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-success" /> Unlimited messaging</li>
                  )}
                  {pkg.custom_inclusions?.map((inc, i) => (
                    <li key={i} className="flex items-center gap-2"><Check className="w-4 h-4 text-success" /> {inc}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* Special offer */}
        {config?.reward_referred_friend_too && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="p-6 rounded-2xl mb-8"
            style={{ background: 'linear-gradient(135deg, var(--tc-warning) 0%, var(--tc-warning) 100%)', border: '2px solid var(--tc-warning)' }}>
            <p className="text-warning font-black text-lg text-center">
              🎁 {config.new_client_reward_description || 'Special offer for new clients'}
            </p>
          </motion.div>
        )}

        {/* Social proof */}
        <div className="flex items-center justify-center gap-2 p-4 rounded-xl bg-muted mb-8">
          <Users className="w-4 h-4 text-primary" />
          <p className="text-foreground font-semibold">
            Join other clients transforming their fitness
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="px-5 py-12 bg-gradient-to-t from-muted">
        <button className="w-full max-w-2xl mx-auto block py-4 rounded-xl font-black text-primary-foreground text-lg flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, var(--tc-primary), var(--tc-ai))', boxShadow: '0 8px 32px color-mix(in srgb, var(--tc-primary) 30%, transparent)' }}>
          Claim Your Spot <ArrowRight className="w-5 h-5" />
        </button>
        <p className="text-center text-muted-foreground text-sm mt-4">
          Start your transformation today
        </p>
      </div>
    </div>
  );
}