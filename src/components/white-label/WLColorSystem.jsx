import React, { useMemo, useState } from 'react';
import { Check, AlertTriangle, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WLSection, WLRow, WLColorPicker, isHexColor } from './WLHelpers';

function expandHex(hex) {
  const c = hex.replace('#', '');
  return c.length === 3 ? c.split('').map(x => x + x).join('') : c;
}

function contrastRatio(hex1, hex2) {
  const lum = (hex) => {
    const c = expandHex(hex);
    const r = parseInt(c.substr(0, 2), 16) / 255;
    const g = parseInt(c.substr(2, 2), 16) / 255;
    const b = parseInt(c.substr(4, 2), 16) / 255;
    const toLinear = x => x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  };
  const l1 = lum(hex1), l2 = lum(hex2);
  const lighter = Math.max(l1, l2), darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function ContrastCheck({ fg, bg, what = 'Text' }) {
  const ratio = useMemo(() => {
    if (!isHexColor(fg) || !isHexColor(bg)) return null;
    try { return contrastRatio(fg, bg); } catch { return null; }
  }, [fg, bg]);
  if (!ratio) return null;
  const r = ratio.toFixed(1);
  if (ratio >= 4.5) return (
    <p className="mt-2 flex items-center gap-1.5 text-[13px] text-muted-foreground">
      <Check className="h-4 w-4 text-success" /> {what} contrast {r}:1. Easy to read.
    </p>
  );
  if (ratio >= 3) return (
    <p className="mt-2 flex items-center gap-1.5 text-[13px] text-warning">
      <AlertTriangle className="h-4 w-4" /> {what} contrast {r}:1. Some clients will struggle to read it.
    </p>
  );
  return (
    <p className="mt-2 flex items-center gap-1.5 text-[13px] text-destructive">
      <AlertTriangle className="h-4 w-4" /> {what} contrast {r}:1. Too low. Pick a darker or lighter colour.
    </p>
  );
}

/**
 * One brand colour plus an optional secondary. The old gradient fields
 * (gradient_direction, gradient_angle) stay in the record untouched; the
 * client app now renders flat colour only.
 */
export default function WLColorSystem({ s, set, locked }) {
  const [showSurfaces, setShowSurfaces] = useState(false);
  const primary = s.primary_color || '#0A5CFF';

  return (
    <WLSection title="Colour" description="One brand colour for buttons, the active tab and links." locked={locked}>
      <WLRow label="Brand colour" hint="The main action on every screen, like Start workout.">
        <WLColorPicker value={s.primary_color} onChange={v => set('primary_color', v)} />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="inline-flex h-9 items-center rounded-md px-4 text-sm font-semibold text-white" style={{ background: primary }}>Start workout</span>
          <span className="text-sm font-semibold underline underline-offset-4" style={{ color: primary }}>Link text</span>
        </div>
        <ContrastCheck fg="#FFFFFF" bg={primary} what="Button text" />
      </WLRow>

      <WLRow label="Secondary colour" hint="Optional. Used sparingly for badges and highlights.">
        <WLColorPicker value={s.secondary_color} onChange={v => set('secondary_color', v)} fallback="#111318" />
      </WLRow>

      <div className="border-t border-border py-4">
        <button
          type="button"
          onClick={() => setShowSurfaces(v => !v)}
          className="touch-compact flex w-full items-center justify-between text-left"
          aria-expanded={showSurfaces}
        >
          <span>
            <span className="block text-[15px] font-semibold text-foreground">Backgrounds and text</span>
            <span className="mt-0.5 block text-sm text-muted-foreground">The defaults match KOACH. Change them only if your brand needs it.</span>
          </span>
          <ChevronDown className={cn('h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform', showSurfaces && 'rotate-180')} />
        </button>

        {showSurfaces && (
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <div className="space-y-3">
              <p className="text-[13px] font-semibold text-muted-foreground">Backgrounds</p>
              <WLColorPicker value={s.bg_color} onChange={v => set('bg_color', v)} label="Page" fallback="#EEEFF1" />
              <WLColorPicker value={s.card_color} onChange={v => set('card_color', v)} label="Cards" fallback="#FFFFFF" />
              <WLColorPicker value={s.nav_color} onChange={v => set('nav_color', v)} label="Navigation bar" fallback="#FFFFFF" />
            </div>
            <div className="space-y-3">
              <p className="text-[13px] font-semibold text-muted-foreground">Text</p>
              <WLColorPicker value={s.text_primary} onChange={v => set('text_primary', v)} label="Main text" fallback="#111318" />
              <WLColorPicker value={s.text_secondary} onChange={v => set('text_secondary', v)} label="Secondary text" fallback="#5E6470" />
              <WLColorPicker value={s.link_color} onChange={v => set('link_color', v)} label="Links" fallback="#0A5CFF" />
              <ContrastCheck fg={s.text_primary || '#111318'} bg={s.bg_color || '#EEEFF1'} />
            </div>
          </div>
        )}
      </div>
    </WLSection>
  );
}
