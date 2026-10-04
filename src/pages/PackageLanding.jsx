import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Check, Star, ChevronDown, ChevronUp } from 'lucide-react';
import KoachLogo from '@/components/brand/KoachLogo.jsx';
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
    <div style={{ borderBottom: '1px solid color-mix(in srgb, white 10%, transparent)', padding: '16px 0' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', gap: 12 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--tc-primary-foreground)' }}>{q}</span>
        {open ? <ChevronUp size={16} color="color-mix(in srgb, white 50%, transparent)" /> : <ChevronDown size={16} color="color-mix(in srgb, white 50%, transparent)" />}
      </button>
      {open && <p style={{ fontSize: 14, color: 'color-mix(in srgb, white 65%, transparent)', lineHeight: 1.7, margin: '10px 0 0' }}>{a}</p>}
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
    <div style={{ minHeight: '100vh', background: 'var(--kc-0f0f1a)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid color-mix(in srgb, white 10%, transparent)', borderTopColor: 'var(--tc-primary)', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  if (notFound || !pkg) return (
    <div style={{ minHeight: '100vh', background: 'var(--kc-0f0f1a)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24 }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>😕</div>
      <h1 style={{ color: 'var(--tc-primary-foreground)', fontSize: 24, fontWeight: 800 }}>Package not found</h1>
      <p style={{ color: 'color-mix(in srgb, white 50%, transparent)', fontSize: 14 }}>This package may have been removed or the link is incorrect.</p>
    </div>
  );

  const accent = pkg.color_theme || 'var(--tc-primary)';
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
    <div style={{ minHeight: '100vh', background: 'var(--kc-0f0f1a)', fontFamily: 'Inter, -apple-system, sans-serif' }}>
      {/* Nav */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, background: 'color-mix(in srgb, var(--kc-0f0f1a) 90%, transparent)', backdropFilter: 'blur(12px)', borderBottom: '1px solid color-mix(in srgb, white 6%, transparent)', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <KoachLogo size={28} rounded="rounded-xl" glow bg />
        <button onClick={handleEnroll}
          style={{ padding: '9px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700, background: `linear-gradient(135deg, ${accent}, var(--tc-ai))`, color: 'var(--tc-primary-foreground)', border: 'none', cursor: 'pointer', boxShadow: `0 0 16px ${accent}55` }}>
          Enroll Now →
        </button>
      </nav>

      {/* Hero */}
      <div style={{ position: 'relative', minHeight: 420, display: 'flex', alignItems: 'flex-end', padding: '120px 24px 60px', overflow: 'hidden' }}>
        {pkg.image_url && (
          <SignedImg src={pkg.image_url} alt="cover" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.25 }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, transparent 0%, color-mix(in srgb, var(--kc-0f0f1a) 80%, transparent) 60%, var(--kc-0f0f1a) 100%)` }} />
        <div style={{ position: 'relative', maxWidth: 720, margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'inline-block', padding: '4px 14px', borderRadius: 9999, background: accent + '22', border: `1px solid ${accent}44`, fontSize: 12, fontWeight: 700, color: accent, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {pkg.billing_type === 'one_time' ? 'One-time Program' : `${pkg.billing_type} coaching`}
          </div>
          <h1 style={{ fontSize: 'clamp(28px,5vw,52px)', fontWeight: 900, color: 'var(--tc-primary-foreground)', margin: '0 0 16px', lineHeight: 1.15, letterSpacing: '-0.03em' }}>{pkg.name}</h1>
          <p style={{ fontSize: 16, color: 'color-mix(in srgb, white 65%, transparent)', lineHeight: 1.7, margin: '0 0 28px', maxWidth: 560 }}>{pkg.description}</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            {pkg.original_price && <span style={{ fontSize: 18, color: 'color-mix(in srgb, white 30%, transparent)', textDecoration: 'line-through' }}>${pkg.original_price}</span>}
            <span style={{ fontSize: 44, fontWeight: 900, color: 'var(--tc-primary-foreground)', letterSpacing: '-0.04em' }}>${pkg.price}</span>
            <span style={{ fontSize: 16, color: 'color-mix(in srgb, white 45%, transparent)' }}>{billingLabel}</span>
          </div>
          {pkg.trial_days > 0 && (
            <p style={{ fontSize: 13, color: accent, marginTop: 8 }}>✓ {pkg.trial_days}-day free trial</p>
          )}
          <button onClick={handleEnroll}
            style={{ marginTop: 28, padding: '16px 36px', borderRadius: 14, fontSize: 16, fontWeight: 800, background: `linear-gradient(135deg, ${accent}, var(--tc-ai))`, color: 'var(--tc-primary-foreground)', border: 'none', cursor: 'pointer', boxShadow: `0 0 32px ${accent}55`, display: 'inline-block' }}>
            Enroll Now →
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px 80px' }}>

        {/* What's included */}
        {allInclusions.length > 0 && (
          <div style={{ marginBottom: 60 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--tc-primary-foreground)', marginBottom: 24, letterSpacing: '-0.02em' }}>What's Included</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
              {allInclusions.map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderRadius: 12, background: 'color-mix(in srgb, white 4%, transparent)', border: '1px solid color-mix(in srgb, white 7%, transparent)' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: accent + '22', border: `1px solid ${accent}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Check size={11} color={accent} />
                  </div>
                  <span style={{ fontSize: 13, color: 'color-mix(in srgb, white 80%, transparent)', fontWeight: 500 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Long description */}
        {pkg.long_description && (
          <div style={{ marginBottom: 60 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--tc-primary-foreground)', marginBottom: 16, letterSpacing: '-0.02em' }}>About This Program</h2>
            <p style={{ fontSize: 15, color: 'color-mix(in srgb, white 60%, transparent)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{pkg.long_description}</p>
          </div>
        )}

        {/* Testimonials */}
        {pkg.testimonials?.length > 0 && (
          <div style={{ marginBottom: 60 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--tc-primary-foreground)', marginBottom: 24, letterSpacing: '-0.02em' }}>What Clients Say</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
              {pkg.testimonials.map((t, i) => (
                <div key={i} style={{ padding: '20px', borderRadius: 14, background: 'color-mix(in srgb, white 4%, transparent)', border: '1px solid color-mix(in srgb, white 7%, transparent)' }}>
                  <div style={{ display: 'flex', gap: 2, marginBottom: 12 }}>
                    {Array.from({ length: t.rating || 5 }).map((_, j) => <Star key={j} size={13} color="var(--tc-warning)" fill="var(--tc-warning)" />)}
                  </div>
                  <p style={{ fontSize: 14, color: 'color-mix(in srgb, white 70%, transparent)', lineHeight: 1.7, margin: '0 0 12px', fontStyle: 'italic' }}>"{t.text}"</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--tc-primary-foreground)', margin: 0 }}>— {t.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FAQs */}
        {pkg.faqs?.length > 0 && (
          <div style={{ marginBottom: 60 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--tc-primary-foreground)', marginBottom: 8, letterSpacing: '-0.02em' }}>Frequently Asked Questions</h2>
            {pkg.faqs.map((faq, i) => <FAQ key={i} q={faq.question} a={faq.answer} />)}
          </div>
        )}

        {/* CTA */}
        <div style={{ textAlign: 'center', padding: '48px 24px', borderRadius: 20, background: `linear-gradient(135deg, ${accent}18, color-mix(in srgb, var(--tc-ai) 9.41176%, transparent))`, border: `1px solid ${accent}33` }}>
          <h2 style={{ fontSize: 28, fontWeight: 900, color: 'var(--tc-primary-foreground)', marginBottom: 8 }}>Ready to get started?</h2>
          <p style={{ fontSize: 15, color: 'color-mix(in srgb, white 55%, transparent)', marginBottom: 28 }}>Join the program and start your transformation today.</p>
          <button onClick={handleEnroll}
            style={{ padding: '16px 48px', borderRadius: 14, fontSize: 17, fontWeight: 800, background: `linear-gradient(135deg, ${accent}, var(--tc-ai))`, color: 'var(--tc-primary-foreground)', border: 'none', cursor: 'pointer', boxShadow: `0 0 32px ${accent}55` }}>
            Enroll Now — ${pkg.price}{billingLabel}
          </button>
        </div>
      </div>
    </div>
  );
}