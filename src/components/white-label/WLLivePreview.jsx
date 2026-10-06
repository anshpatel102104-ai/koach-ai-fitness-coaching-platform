import React, { useState } from 'react';
import { X, Home, Dumbbell, Salad, BarChart2, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Segmented } from '@/components/kit';
import { SignedImg } from '@/components/shared/SignedImage';

const SCREENS = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'workout', label: 'Workout', icon: Dumbbell },
  { id: 'nutrition', label: 'Food', icon: Salad },
  { id: 'progress', label: 'Progress', icon: BarChart2 },
  { id: 'coach', label: 'Coach', icon: MessageSquare },
];

const DEVICES = [
  { id: 'iphone', label: 'iPhone', w: 256, h: 520, radius: 40, bezel: 10 },
  { id: 'android', label: 'Android', w: 256, h: 540, radius: 30, bezel: 9 },
  { id: 'ipad', label: 'iPad', w: 300, h: 400, radius: 26, bezel: 12 },
  { id: 'desktop', label: 'Desktop', w: 320, h: 210, radius: 12, bezel: 8 },
];

// The client app's own palette. These are the coach's brand values (data), so
// they are applied inline; fallbacks match the KOACH client app.
function palette(s) {
  const primary = s.primary_color || '#0A5CFF';
  return {
    primary,
    hero: '#16181D',
    bg: s.bg_color || '#EEEFF1',
    card: s.card_color || '#FFFFFF',
    text: s.text_primary || '#111318',
    muted: s.text_secondary || '#5E6470',
    nav: s.portal_nav_bg === 'brand' ? primary : s.portal_nav_bg === 'dark' ? '#16181D' : (s.nav_color || '#FFFFFF'),
    navDark: s.portal_nav_bg === 'brand' || s.portal_nav_bg === 'dark',
  };
}

function Line({ w = '70%', c, h = 6 }) {
  return <span className="block rounded-full" style={{ width: w, height: h, background: c, opacity: 0.18 }} />;
}

function PortalMockup({ s, screen, compact }) {
  const p = palette(s);
  const headline = {
    home: s.onboarding_headline || (s.business_name ? `Welcome to ${s.business_name}` : 'Welcome to your app'),
    workout: 'Upper body A',
    nutrition: '1,850 kcal today',
    progress: 'Last 8 weeks',
    coach: 'Message your coach',
  }[screen];
  const cta = {
    home: 'Start onboarding',
    workout: 'Start workout',
    nutrition: 'Log a meal',
    progress: 'Add a check-in',
    coach: 'Send a message',
  }[screen];

  return (
    <div className="flex h-full w-full flex-col overflow-hidden"
      style={{ background: p.bg, fontFamily: s.font_primary && s.font_primary !== 'system' ? s.font_primary : undefined }}>
      {/* Dark hero with the one action in the brand colour */}
      <div className={cn('flex-shrink-0 rounded-b-[18px] px-4 pb-4', compact ? 'pt-3' : 'pt-7')} style={{ background: p.hero }}>
        {s.portal_show_logo !== false && (
          s.logo_light_url || s.logo_primary_url
            ? <SignedImg src={s.logo_light_url || s.logo_primary_url} alt="logo" className="mb-3 h-6 max-w-[110px] object-contain object-left" />
            : <span className="mb-3 inline-flex h-6 items-center rounded border border-dashed border-white/40 px-2.5 text-xs text-white/80">Your logo</span>
        )}
        <p className="display text-[22px] leading-[1.02] text-white" style={{ fontWeight: Number(s.font_heading_weight) || 800 }}>{headline}</p>
        <span className="mt-3 flex h-9 items-center justify-center rounded-md text-[13px] font-semibold text-white" style={{ background: p.primary }}>
          {cta}
        </span>
      </div>

      {/* Body: quiet placeholder cards in the client's surfaces */}
      <div className="flex-1 space-y-2 overflow-hidden px-3 py-3">
        {[0, 1, 2].map(i => (
          <div key={i} className="space-y-1.5 rounded-[10px] p-3" style={{ background: p.card }}>
            <Line w={i === 0 ? '55%' : '45%'} c={p.text} h={7} />
            <Line w="80%" c={p.muted} />
            {i === 0 && screen === 'progress' && (
              <div className="flex gap-1 pt-1">
                {Array.from({ length: 8 }).map((_, k) => (
                  <span key={k} className="h-3 flex-1 rounded-[3px]" style={{ background: k === 7 ? p.primary : p.text, opacity: k === 7 ? 1 : 0.12 }} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Bottom nav, active tab in the brand colour */}
      {!compact && (
        <div className="flex flex-shrink-0 items-center px-1 py-1.5" style={{ background: p.nav, boxShadow: '0 -1px 0 rgba(17,19,24,0.06)' }}>
          {SCREENS.map(sc => {
            const isActive = sc.id === screen;
            const idle = p.navDark ? 'rgba(255,255,255,0.6)' : p.muted;
            return (
              <div key={sc.id} className="flex flex-1 flex-col items-center gap-0.5 py-1">
                <sc.icon className="h-3.5 w-3.5" style={{ color: isActive ? (p.navDark ? '#FFFFFF' : p.primary) : idle }} strokeWidth={isActive ? 2.4 : 1.8} />
                <span style={{ fontSize: 8, color: isActive ? (p.navDark ? '#FFFFFF' : p.primary) : idle, fontWeight: isActive ? 700 : 500 }}>{sc.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function WLLivePreview({ s, onClose, modal = false }) {
  const [device, setDevice] = useState('iphone');
  const [screen, setScreen] = useState('home');
  const dev = DEVICES.find(d => d.id === device) || DEVICES[0];

  const previewContent = (
    <div className="flex flex-col items-center">
      <div className="mb-3 flex w-full items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">What your clients will see</p>
        {modal && (
          <button onClick={onClose} aria-label="Close preview" className="touch-compact flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <Segmented
        size="sm"
        className="mb-4 w-full"
        value={screen}
        onChange={setScreen}
        options={SCREENS.map(sc => ({ value: sc.id, label: sc.label }))}
      />

      {/* Device frame */}
      <div
        className="relative flex-shrink-0 bg-sidebar"
        style={{ width: dev.w, height: dev.h, borderRadius: dev.radius, padding: dev.bezel }}
      >
        <div className="h-full w-full overflow-hidden" style={{ borderRadius: Math.max(dev.radius - dev.bezel, 4) }}>
          <PortalMockup s={s} screen={screen} compact={device === 'desktop'} />
        </div>
      </div>

      <p className="mt-4 max-w-[280px] text-center text-[13px] leading-snug text-muted-foreground">
        Your name, logo and colours.{' '}
        {s.portal_hide_koach_badge ? 'No KOACH branding in front of your clients.' : 'A small Powered by KOACH line sits in the footer.'}
      </p>

      <div className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1" role="tablist" aria-label="Device">
        {DEVICES.map(d => (
          <button
            key={d.id}
            role="tab"
            aria-selected={device === d.id}
            onClick={() => setDevice(d.id)}
            className={cn(
              'touch-compact text-[13px] underline-offset-4',
              device === d.id ? 'font-semibold text-foreground underline' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {d.label}
          </button>
        ))}
      </div>
    </div>
  );

  if (modal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
        <div className="max-h-[92vh] w-full max-w-sm overflow-y-auto rounded-xl bg-card p-5" onClick={e => e.stopPropagation()}>
          {previewContent}
        </div>
      </div>
    );
  }

  return <div className="lg:sticky lg:top-6">{previewContent}</div>;
}
