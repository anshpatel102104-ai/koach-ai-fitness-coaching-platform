import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/lib/theme';

const OPTIONS = [
  { key: 'light', label: 'Light', icon: Sun },
  { key: 'dark', label: 'Dark', icon: Moon },
  { key: 'system', label: 'System', icon: Monitor },
];

/** Full segmented control for Settings → Appearance. */
export function ThemeToggle({ className }) {
  const { theme, setTheme } = useTheme();
  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className={cn('inline-flex items-center gap-0.5 rounded-lg bg-card p-1 shadow-[0_0_0_1px_rgb(var(--border)/0.6)]', className)}
    >
      {OPTIONS.map(({ key, label, icon: Icon }) => {
        const active = theme === key;
        return (
          <button
            key={key}
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(key)}
            className={cn(
              'touch-compact flex h-9 items-center gap-1.5 rounded-md px-3.5 text-sm font-medium transition-colors',
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-foreground/80 hover:bg-accent hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Compact icon button that flips light/dark. Suitable for a topbar or the dark
 * sidebar header — pass `onDark` when it sits on the graphite surface so it
 * uses light-on-dark colors instead of the token foreground.
 */
export function ThemeToggleButton({ className, onDark = false }) {
  const { resolved, toggle } = useTheme();
  const isDark = resolved === 'dark';
  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
        onDark
          ? 'text-white/60 hover:bg-white/10 hover:text-white'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        className
      )}
    >
      {isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </button>
  );
}
