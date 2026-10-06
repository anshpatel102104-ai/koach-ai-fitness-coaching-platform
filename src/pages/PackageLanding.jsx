import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Check, Star, ChevronDown, ChevronUp } from 'lucide-react';
import { SignedImg } from '@/components/shared/SignedImage';

const INCLUSION_LABELS = {
  custom_program: 'Custom workout program',
  weekly_updates: 'Weekly program updates',
  meal_plan: 'Personalized meal plan',
  weekly_checkins: 'Weekly check-ins',
  unlimited_messaging: 'Unlimited messaging',
  progress_tracking: 'Progress tracking',
  nutrition_coaching: 'Nutrition coaching',
  app_access: '24/7 App access',
};

function FAQ({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="py-4">
      <button onClick={() => setOpen(o => !o)} className="flex w-full items-center justify-between gap-3 text-left" aria-expanded={open}>
        <span className="text-[15px] font-semibold text-foreground">{q}</span>
        {open ? <ChevronUp className="h-4 w-4 flex-shrink-0 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" />}
      </button>
      {open && <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{a}</p>}
    </div>
  );
}

export default function PackageLanding() {
  const { me, navigateToLogin } = useAuth();
  const { slug } = useParams();
  const [pkg, setPkg] = useState(null);
  const [coach, setCoach] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    db.entities.CoachingPackage.filter({ slug })
      .then(res => {
        if (!res?.length) { setNotFound(true); setLoading(false); return; }
        setPkg(res[0]);
        setLoading(false);
      })
      .catch(() => { setNotFound(true); setLoading(false); });
    me().then(setCoach).catch(() => {});
  }, [slug]);

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-border border-t-foreground" />
    </div>
  );

  if (notFound || !pkg) return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="bg-sidebar px-5 py-4"><img src="/koach-logo-white.png" alt="KOACH" className="h-6 w-auto" /></header>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5">
        <h1 className="text-[32px] text-foreground">This package isn't available.</h1>
        <p className="mt-2 text-[15px] text-muted-foreground">It may have been taken down, or the link is wrong. Ask your coach for a new one.</p>
      </div>
    </div>
  );

  // The coach's own brand colour drives the enroll button; KOACH blue otherwise.
  const accent = pkg.color_theme || 'rgb(var(--brand))';
  const allInclusions = [
    ...Object.entries(pkg.inclusions || {})
      .filter(([k, v]) => v === true || (k === 'video_calls' && v && v !== 'none'))
      .map(([k, v]) => k === 'video_calls' ? `Video calls (${v.replace(/_/g, ' ')})` : INCLUSION_LABELS[k] || k),
    ...(pkg.custom_inclusions || []),
  ];

  const billingLabel = pkg.billing_type === 'one_time' ? 'one-time'
    : pkg.billing_type === 'monthly' ? '/month'
    : pkg.billing_type === 'quarterly' ? '/quarter'
    : pkg.billing_type === 'annual' ? '/year' : '';

  const handleEnroll = () => {
    navigateToLogin();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Graphite header */}
      <nav className="sticky top-0 z-50 flex items-center justify-between bg-sidebar px-5 py-3 sm:px-8">
        <img src="/koach-logo-white.png" alt="KOACH" className="h-6 w-auto" />
        <button onClick={handleEnroll} className="h-9 rounded-md px-4 text-sm font-semibold text-white" style={{ background: accent }}>
          Enroll
        </button>
      </nav>

      {/* Dark hero */}
      <section className="bg-sidebar px-5 pb-10 pt-8 text-white sm:px-8 sm:pb-14">
        <div className="mx-auto grid w-full max-w-5xl items-end gap-8 md:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <p className="text-sm text-white/70">
              {pkg.billing_type === 'one_time'
                ? 'One-time program'
                : `${(pkg.billing_type || '').replace(/_/g, ' ').replace(/^./, c => c.toUpperCase())} coaching`}
            </p>
            <h1 className="mt-2 text-[36px] leading-[1.02] text-white sm:text-[52px]">{pkg.name}</h1>
            {pkg.description && <p className="mt-4 max-w-xl text-base leading-relaxed text-white/75">{pkg.description}</p>}
            <div className="mt-6 flex items-baseline gap-2">
              {pkg.original_price && <span className="text-lg text-white/40 line-through">${pkg.original_price}</span>}
              <span className="num text-[48px] leading-none text-white">${pkg.price}</span>
              <span className="text-base text-white/60">{billingLabel}</span>
            </div>
            {pkg.trial_days > 0 && <p className="mt-2 text-sm text-white/75">{pkg.trial_days}-day free trial</p>}
            <button onClick={handleEnroll} className="mt-6 h-12 w-full rounded-lg px-8 text-[15px] font-semibold text-white sm:w-auto" style={{ background: accent }}>
              Enroll now
            </button>
          </div>
          {pkg.image_url && (
            <SignedImg src={pkg.image_url} alt="" className="hidden aspect-[4/5] w-full rounded-xl object-cover md:block" />
          )}
        </div>
      </section>

      {/* Body */}
      <main className="mx-auto w-full max-w-3xl space-y-5 px-5 py-8 sm:px-8">
        {allInclusions.length > 0 && (
          <section className="panel p-5 sm:p-6">
            <h2 className="text-[22px] text-foreground">What's included</h2>
            <ul className="mt-3 grid gap-x-6 sm:grid-cols-2">
              {allInclusions.map(item => (
                <li key={item} className="flex items-center gap-3 border-b border-border py-3 text-[15px] text-foreground">
                  <Check className="h-4 w-4 flex-shrink-0 text-success" strokeWidth={2.5} />
                  {item}
                </li>
              ))}
            </ul>
          </section>
        )}

        {pkg.long_description && (
          <section className="panel p-5 sm:p-6">
            <h2 className="text-[22px] text-foreground">About this program</h2>
            <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-muted-foreground">{pkg.long_description}</p>
          </section>
        )}

        {pkg.testimonials?.length > 0 && (
          <section>
            <h2 className="mb-3 text-[22px] text-foreground">What clients say</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {pkg.testimonials.map((t, i) => (
                <figure key={i} className="panel p-5">
                  <div className="mb-2 flex gap-0.5" aria-label={`${t.rating || 5} out of 5`}>
                    {Array.from({ length: t.rating || 5 }).map((_, j) => <Star key={j} className="h-3.5 w-3.5 fill-foreground text-foreground" />)}
                  </div>
                  <blockquote className="text-[15px] leading-relaxed text-foreground">{t.text}</blockquote>
                  <figcaption className="mt-3 text-sm font-semibold text-muted-foreground">{t.name}</figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}

        {pkg.faqs?.length > 0 && (
          <section className="panel px-5 pt-5 sm:px-6 sm:pt-6">
            <h2 className="text-[22px] text-foreground">Questions</h2>
            <div className="divide-y divide-border">
              {pkg.faqs.map((faq, i) => <FAQ key={i} q={faq.question} a={faq.answer} />)}
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="rounded-xl bg-sidebar p-6 text-white sm:p-8">
          <h2 className="text-[28px] text-white">Ready when you are.</h2>
          <p className="mt-1 text-[15px] text-white/70">Enroll, answer a few questions, and your coach builds your plan.</p>
          <button onClick={handleEnroll} className="mt-5 h-12 w-full rounded-lg px-8 text-[15px] font-semibold text-white sm:w-auto" style={{ background: accent }}>
            Enroll for ${pkg.price}{billingLabel === 'one-time' ? '' : billingLabel}
          </button>
        </section>
      </main>
    </div>
  );
}
