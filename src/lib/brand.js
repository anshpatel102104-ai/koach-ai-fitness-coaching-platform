import { track } from '@/lib/telemetry';

/**
 * White-label runtime theming. A coach's brand color overrides the `--brand`
 * accent family at runtime (active nav, badges, focus rings, the client app's
 * main call to action), so rebranding is a token swap rather than a
 * find-replace. Primary actions stay ink so any brand color reads well.
 */

/** Parse "#rrggbb" / "#rgb" into a "r g b" triplet string, or null if invalid. */
export function hexToRgbTriplet(hex) {
  if (typeof hex !== 'string') return null;
  let h = hex.trim().replace(/^#/, '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}

/** Relative luminance → pick a readable foreground ("255 255 255" or "17 24 39"). */
function readableForeground(triplet) {
  const [r, g, b] = triplet.split(' ').map(Number);
  const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return L > 0.5 ? '17 24 39' : '255 255 255';
}

const BRAND_VARS = ['--brand', '--sidebar-primary', '--ring', '--sidebar-ring', '--chart-1'];

/**
 * Apply a coach brand color across the app. Pass a falsy value to clear the
 * override and fall back to the default token palette.
 * @param {string | null | undefined} hex
 */
export function applyBrandColor(hex) {
  const root = document.documentElement;
  const triplet = hex ? hexToRgbTriplet(hex) : null;

  if (!triplet) {
    for (const v of BRAND_VARS) root.style.removeProperty(v);
    root.style.removeProperty('--brand-foreground');
    return false;
  }

  for (const v of BRAND_VARS) root.style.setProperty(v, triplet);
  root.style.setProperty('--brand-foreground', readableForeground(triplet));
  track('brand.apply', { color: hex });
  return true;
}
