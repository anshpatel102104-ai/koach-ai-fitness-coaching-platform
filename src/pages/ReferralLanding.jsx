import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Check, Users } from 'lucide-react';
import { Initials } from '@/components/kit';
import { SignedImg } from '@/components/shared/SignedImage';

export default function ReferralLanding() {
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get('ref');

  // Get referral info
  const { data: referral } = useQuery({
    queryKey: ['referral-info', refCode],
    queryFn: async () => {
      const refs = await db.entities.ClientReferral.filter({ referral_code: refCode }, '-date_referred', 1);
      return refs[0];
    },
    enabled: !!refCode,
  });

  // Get referrer client
  const { data: referrerClient } = useQuery({
    queryKey: ['referrer-client', referral?.referrer_client_id],
    queryFn: () => db.entities.Client.get(referral?.referrer_client_id),
    enabled: !!referral?.referrer_client_id,
  });

  // Get coach
  const { data: coach } = useQuery({
    queryKey: ['coach-profile', referral?.coach_id],
    queryFn: async () => {
      const profiles = await db.entities.CoachProfile.filter({ coach_id: referral?.coach_id }, '-created_date', 1);
      return profiles[0];
    },
    enabled: !!referral?.coach_id,
  });

  // Get referral config
  const { data: config } = useQuery({
    queryKey: ['referral-config-landing', referral?.coach_id],
    queryFn: async () => {
      const configs = await db.entities.ReferralConfiguration.filter({ coach_id: referral?.coach_id }, '-created_date', 1);
      return configs[0];
    },
    enabled: !!referral?.coach_id,
  });

  // Get referral package
  const { data: packages = [] } = useQuery({
    queryKey: ['packages-landing', referral?.coach_id],
    queryFn: async () => {
      return db.entities.CoachingPackage.filter({ visibility: 'public' }, '-created_date', 5);
    },
    enabled: !!referral?.coach_id,
  });

  if (!referral || !coach) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-border border-t-foreground" aria-label="Loading" />
      </div>
    );
  }

  const pkg = packages[0];
  const inclusions = pkg ? [
    pkg.inclusions?.custom_program && 'Personalized workout program',
    pkg.inclusions?.weekly_checkins && 'Weekly check-ins',
    pkg.inclusions?.meal_plan && 'Meal plan and nutrition coaching',
    pkg.inclusions?.unlimited_messaging && 'Unlimited messaging',
    ...(pkg.custom_inclusions || []),
  ].filter(Boolean) : [];

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-sidebar px-5 py-4 sm:px-8">
        <img src="/koach-logo-white.png" alt="KOACH" className="h-6 w-auto" />
      </header>

      <main className="mx-auto w-full max-w-2xl space-y-5 px-5 py-8">
        {/* Intro */}
        <section className="panel p-6">
          <div className="flex items-center gap-4">
            {coach.avatar_url
              ? <SignedImg src={coach.avatar_url} alt={coach.first_name} className="h-16 w-16 flex-shrink-0 rounded-full object-cover" />
              : <Initials name={[coach.first_name, coach.last_name].filter(Boolean).join(' ') || 'Coach'} size={64} />}
            <div className="min-w-0">
              {referrerClient?.name && (
                <p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">{referrerClient.name}</span> thinks you'd like working with</p>
              )}
              <h1 className="text-[32px] leading-tight text-foreground">Coach {coach.first_name}</h1>
            </div>
          </div>
          {coach.short_bio && <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">{coach.short_bio}</p>}
          {coach.specialties?.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {coach.specialties.slice(0, 3).map((spec, i) => (
                <span key={i} className="rounded-full bg-secondary px-3 py-1 text-sm font-medium text-foreground">{spec}</span>
              ))}
            </div>
          )}
        </section>

        {/* What's included */}
        {pkg && (
          <section className="panel p-6">
            <h2 className="text-[22px] text-foreground">{pkg.name}</h2>
            <ul className="mt-2 divide-y divide-border">
              {inclusions.map((inc, i) => (
                <li key={i} className="flex items-center gap-3 py-3 text-[15px] text-foreground">
                  <Check className="h-4 w-4 flex-shrink-0 text-success" strokeWidth={2.5} /> {inc}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Special offer for referred friends */}
        {config?.reward_referred_friend_too && (
          <section className="panel flex items-start gap-3 p-5 shadow-[inset_3px_0_0_rgb(var(--brand)),0_0_0_1px_rgb(var(--border)/0.6)]">
            <div>
              <p className="text-[15px] font-semibold text-foreground">Because {referrerClient?.name || 'a friend'} sent you</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{config.new_client_reward_description || 'You get a welcome offer when you join.'}</p>
            </div>
          </section>
        )}

        {/* CTA */}
        <div className="pt-2">
          <button className="h-12 w-full rounded-lg bg-brand text-[15px] font-semibold text-brand-foreground">
            Claim your spot
          </button>
          <p className="mt-3 text-center text-sm text-muted-foreground">
            <Users className="mr-1 inline h-4 w-4 align-[-3px]" />
            You'll answer a few questions so Coach {coach.first_name} can build your plan.
          </p>
        </div>
      </main>
    </div>
  );
}
