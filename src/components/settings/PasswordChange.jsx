import React, { useState } from 'react';
import { Eye, EyeOff, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { fieldClass } from './SettingsLayout';

export function passwordStrength(pw) {
  if (!pw) return { label: '', tone: '', pct: 0 };
  if (pw.length < 8) return { label: 'Weak', tone: 'bg-destructive', text: 'text-destructive', pct: 25 };
  const hasUpper = /[A-Z]/.test(pw);
  const hasNum = /[0-9]/.test(pw);
  const hasSymbol = /[^A-Za-z0-9]/.test(pw);
  if (pw.length >= 12 && hasUpper && hasNum && hasSymbol) return { label: 'Strong', tone: 'bg-success', text: 'text-success', pct: 100 };
  if (hasNum && hasUpper) return { label: 'Good', tone: 'bg-success', text: 'text-success', pct: 75 };
  return { label: 'Fair', tone: 'bg-partial', text: 'text-warning', pct: 50 };
}

function SecretInput({ value, onChange, placeholder, autoComplete }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={cn(fieldClass, 'pr-11')}
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        aria-label={show ? 'Hide password' : 'Show password'}
        className="touch-compact absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

/**
 * Current / new / confirm password form with requirement checklist.
 * `update(next)` performs the actual change and should throw on failure.
 */
export default function PasswordChange({ update, onDone, onCancel }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const strength = passwordStrength(next);

  const reqs = [
    { label: 'At least 8 characters', met: next.length >= 8 },
    { label: 'One capital letter', met: /[A-Z]/.test(next) },
    { label: 'One number', met: /[0-9]/.test(next) },
    { label: 'One symbol', met: /[^A-Za-z0-9]/.test(next) },
  ];

  const submit = async () => {
    if (!current) return toast.error('Enter your current password');
    if (!reqs.every(r => r.met)) return toast.error('The new password does not meet every requirement');
    if (next !== confirm) return toast.error('The new passwords do not match');
    setBusy(true);
    try {
      await update(next);
      toast.success('Password updated');
      setCurrent(''); setNext(''); setConfirm('');
      onDone?.();
    } catch (err) {
      toast.error(err?.message || 'Could not update your password. Sign in again and retry.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg bg-secondary p-4">
      <SecretInput value={current} onChange={setCurrent} placeholder="Current password" autoComplete="current-password" />
      <SecretInput value={next} onChange={setNext} placeholder="New password" autoComplete="new-password" />
      {next && (
        <div>
          <div className="mb-1.5 flex items-center justify-between text-[13px]">
            <span className="text-muted-foreground">Strength</span>
            <span className={cn('font-semibold', strength.text)}>{strength.label}</span>
          </div>
          <div className="h-1.5 rounded-full bg-border">
            <div className={cn('h-full rounded-full transition-all', strength.tone)} style={{ width: `${strength.pct}%` }} />
          </div>
          <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
            {reqs.map(r => (
              <li key={r.label} className="flex items-center gap-2 text-[13px]">
                {r.met
                  ? <Check className="h-3.5 w-3.5 flex-shrink-0 text-success" />
                  : <span className="h-3.5 w-3.5 flex-shrink-0 rounded-full border border-input" />}
                <span className={r.met ? 'text-foreground' : 'text-muted-foreground'}>{r.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <input
        type="password"
        value={confirm}
        onChange={e => setConfirm(e.target.value)}
        placeholder="Confirm new password"
        autoComplete="new-password"
        className={fieldClass}
      />
      <div className="flex gap-2 pt-1">
        <Button onClick={submit} disabled={busy}>{busy ? 'Updating' : 'Update password'}</Button>
        {onCancel && <Button variant="outline" onClick={onCancel}>Cancel</Button>}
      </div>
    </div>
  );
}
