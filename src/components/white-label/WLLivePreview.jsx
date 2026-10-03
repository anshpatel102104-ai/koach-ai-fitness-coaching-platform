import React, { useState } from 'react';
import { Monitor, Smartphone, Tablet, X, Home, Dumbbell, Salad, BarChart2, MessageSquare } from 'lucide-react';
import { SignedImg } from '@/components/shared/SignedImage';

const SCREENS = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'workout', label: 'Workout', icon: Dumbbell },
  { id: 'nutrition', label: 'Nutrition', icon: Salad },
  { id: 'progress', label: 'Progress', icon: BarChart2 },
  { id: 'coach', label: 'Coach', icon: MessageSquare },
];

const DEVICES = [
  { id: 'iphone', label: 'iPhone', icon: Smartphone, width: 390, scale: 0.7 },
  { id: 'android', label: 'Android', icon: Smartphone, width: 412, scale: 0.65 },
  { id: 'ipad', label: 'iPad', icon: Tablet, width: 768, scale: 0.45 },
  { id: 'desktop', label: 'Desktop', icon: Monitor, width: 1280, scale: 0.28 },
];

function PortalMockup({ s, screen }) {
  const primary = s.primary_color || 'var(--tc-primary)';
  const secondary = s.secondary_color || 'var(--tc-ai)';
  const bg = s.bg_color || 'var(--tc-muted)';
  const card = s.card_color || 'var(--tc-card)';
  const textPrimary = s.text_primary || 'var(--tc-foreground)';
  const textSecondary = s.text_secondary || 'var(--tc-muted-foreground)';
  const navBg = s.portal_nav_bg === 'brand' ? primary : s.portal_nav_bg === 'dark' ? 'var(--kc-0a0a0a)' : 'var(--tc-card)';
  const grad = `linear-gradient(${s.gradient_direction || '135deg'}, ${primary}, ${secondary})`;
  const businessName = s.business_name || 'Your App';

  return (
    <div className="w-full h-full flex flex-col overflow-hidden text-[10px]" style={{ background: bg, fontFamily: s.font_primary === 'system' ? 'inherit' : (s.font_primary || 'Inter') }}>
      {/* Status bar */}
      <div className="flex items-center justify-between px-3 py-1.5 flex-shrink-0" style={{ background: 'transparent' }}>
        <span className="font-semibold" style={{ color: textSecondary, fontSize: 8 }}>9:41</span>
        <div className="flex gap-1">
          {[...Array(4)].map((_, i) => <div key={i} className="w-1 rounded-sm" style={{ height: 6 - i, background: textSecondary, opacity: i < 3 ? 1 : 0.3 }} />)}
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 flex-shrink-0" style={{ background: card }}>
        {s.logo_primary_url
          ? <SignedImg src={s.logo_primary_url} alt="logo" className="h-5 object-contain" />
          : <span className="font-black text-sm" style={{ color: textPrimary }}>{businessName}</span>
        }
        <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold"
          style={{ background: grad }}>JD</div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden px-2 py-2 space-y-2">
        {screen === 'home' && (
          <>
            <div className="rounded-xl p-3" style={{ background: grad }}>
              <p className="text-white font-bold" style={{ fontSize: 10 }}>Welcome back! 👋</p>
              <p className="text-white/70 mt-0.5" style={{ fontSize: 8 }}>Let's crush today's goals</p>
            </div>
            {[['Today\'s Workout', '💪'], ['Nutrition', '🥗'], ['Progress', '📈']].map(([label, emoji]) => (
              <div key={label} className="rounded-lg p-2.5 flex items-center justify-between" style={{ background: card }}>
                <div className="flex items-center gap-1.5">
                  <span>{emoji}</span>
                  <span className="font-semibold" style={{ color: textPrimary, fontSize: 9 }}>{label}</span>
                </div>
                <svg className="w-3 h-3" style={{ color: textSecondary }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </div>
            ))}
          </>
        )}
        {screen === 'workout' && (
          <div className="space-y-2">
            <p className="font-black px-1" style={{ color: textPrimary, fontSize: 11 }}>Today's Training</p>
            {['Bench Press 4×10', 'Squats 3×12', 'Pull-ups 3×8', 'Deadlifts 3×5'].map(ex => (
              <div key={ex} className="rounded-lg p-2.5 flex items-center justify-between" style={{ background: card }}>
                <span style={{ color: textPrimary, fontSize: 9 }}>{ex}</span>
                <div className="w-4 h-4 rounded-full border-2" style={{ borderColor: primary }} />
              </div>
            ))}
          </div>
        )}
        {screen === 'nutrition' && (
          <div className="space-y-2">
            <div className="rounded-xl p-3 text-center" style={{ background: card }}>
              <p className="font-black text-lg" style={{ color: primary }}>1,847</p>
              <p style={{ color: textSecondary, fontSize: 8 }}>of 2,200 calories</p>
              <div className="h-1.5 rounded-full bg-muted mt-2">
                <div className="h-full rounded-full" style={{ width: '84%', background: grad }} />
              </div>
            </div>
            {['Protein', 'Carbs', 'Fat'].map(m => (
              <div key={m} className="rounded-lg p-2.5 flex items-center justify-between" style={{ background: card }}>
                <span style={{ color: textPrimary, fontSize: 9 }}>{m}</span>
                <span className="font-bold" style={{ color: primary, fontSize: 9 }}>On track ✓</span>
              </div>
            ))}
          </div>
        )}
        {(screen === 'progress' || screen === 'coach') && (
          <div className="rounded-xl p-3" style={{ background: card }}>
            <p className="font-semibold" style={{ color: textPrimary, fontSize: 10 }}>
              {screen === 'progress' ? '📊 My Progress' : '💬 Message Coach'}
            </p>
            <p className="mt-1" style={{ color: textSecondary, fontSize: 8 }}>
              {screen === 'progress' ? 'Track your transformation journey' : 'Your coach is here to help'}
            </p>
            <button className="mt-2 px-3 py-1.5 rounded-lg text-white font-semibold" style={{ background: grad, fontSize: 8 }}>
              {screen === 'progress' ? 'View Stats' : 'Send Message'}
            </button>
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div className="flex items-center flex-shrink-0 py-1.5 px-1" style={{ background: navBg, borderTop: '1px solid color-mix(in srgb, black 6%, transparent)' }}>
        {SCREENS.map(sc => {
          const isActive = sc.id === screen;
          return (
            <div key={sc.id} className="flex-1 flex flex-col items-center gap-0.5 py-1">
              <sc.icon className="w-3.5 h-3.5" style={{ color: isActive ? primary : textSecondary, strokeWidth: isActive ? 2.5 : 1.8 }} />
              <span style={{ fontSize: 7, color: isActive ? primary : textSecondary, fontWeight: isActive ? 700 : 400 }}>{sc.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function WLLivePreview({ s, onClose, modal = false }) {
  const [device, setDevice] = useState('iphone');
  const [screen, setScreen] = useState('home');
  const dev = DEVICES.find(d => d.id === device);

  const previewContent = (
    <div className={`${modal ? 'p-4' : 'p-4'} flex flex-col h-full`}>
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Live Preview</p>
        {modal && (
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center hover:bg-border transition-colors">
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Device selector */}
      <div className="flex gap-1 mb-3 flex-shrink-0 flex-wrap">
        {DEVICES.map(d => (
          <button key={d.id} onClick={() => setDevice(d.id)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: device === d.id ? 'linear-gradient(135deg, var(--tc-primary), var(--tc-ai))' : 'var(--tc-muted)',
              color: device === d.id ? 'white' : 'var(--tc-muted-foreground)',
            }}>
            <d.icon className="w-3 h-3" />
            {d.label}
          </button>
        ))}
      </div>

      {/* Screen selector */}
      <div className="flex gap-1 mb-3 overflow-x-auto scrollbar-hide flex-shrink-0 pb-0.5">
        {SCREENS.map(sc => (
          <button key={sc.id} onClick={() => setScreen(sc.id)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0 transition-all"
            style={{
              background: screen === sc.id ? 'var(--tc-sidebar)' : 'var(--tc-muted)',
              color: screen === sc.id ? 'white' : 'var(--tc-muted-foreground)',
              border: screen === sc.id ? 'none' : '1px solid var(--tc-border)',
            }}>
            <sc.icon className="w-3 h-3" />
            {sc.label}
          </button>
        ))}
      </div>

      {/* Device frame */}
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        <div className="relative rounded-3xl border-4 border-border overflow-hidden bg-sidebar"
          style={{
            width: 240,
            height: device === 'ipad' ? 320 : device === 'desktop' ? 200 : 420,
            flexShrink: 0,
          }}>
          <div className="absolute inset-0 overflow-hidden rounded-2xl">
            <PortalMockup s={s} screen={screen} />
          </div>
          {device !== 'desktop' && <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1 rounded-full bg-muted-foreground" />}
        </div>
      </div>
    </div>
  );

  if (modal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'color-mix(in srgb, black 50%, transparent)' }}>
        <div className="bg-card rounded-3xl w-full max-w-sm" style={{ boxShadow: '0 20px 60px color-mix(in srgb, black 20%, transparent)' }}>
          <div className="h-[600px]">{previewContent}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="sticky top-4 bg-card rounded-2xl border border-border h-[600px]"
      style={{ boxShadow: '0 4px 20px color-mix(in srgb, black 8%, transparent)' }}>
      {previewContent}
    </div>
  );
}