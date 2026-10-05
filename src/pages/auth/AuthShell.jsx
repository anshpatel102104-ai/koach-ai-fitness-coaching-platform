import React, { useState } from 'react';

/**
 * Shared chrome for the auth pages: a centered card on a near-black
 * background with the white KOACH AI logo. Flat and minimal by design.
 */
export default function AuthShell({ title, children }) {
  return (
    <div className="fixed inset-0 overflow-y-auto flex items-center justify-center px-5 py-10 bg-[#0a0a0a]">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        <img src="/koach-logo-white.png" alt="KOACH AI" className="h-12 w-auto" />
        <div className="w-full rounded-xl border border-white/10 bg-[#111111] p-6 space-y-5">
          <h1 className="text-lg font-semibold text-white text-center">{title}</h1>
          {children}
        </div>
      </div>
    </div>
  );
}

export function AuthField({ label, type = 'text', value, onChange, placeholder, autoComplete }) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-white/60">{label}</label>
      <div className="relative">
        <input
          type={isPassword && show ? 'text' : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="w-full px-3 py-2.5 pr-14 rounded-lg bg-[#0a0a0a] border border-white/10 text-white placeholder-white/25 text-sm focus:outline-none focus:border-white/40 transition-colors"
        />
        {isPassword && (
          <button type="button" onClick={() => setShow((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-medium text-white/40 hover:text-white/70 transition-colors">
            {show ? 'Hide' : 'Show'}
          </button>
        )}
      </div>
    </div>
  );
}

export function AuthError({ message }) {
  if (!message) return null;
  return <div className="px-3 py-2.5 rounded-lg text-xs text-red-400 bg-red-500/10 border border-red-500/20">{message}</div>;
}

export function AuthNotice({ message }) {
  if (!message) return null;
  return <div className="px-3 py-2.5 rounded-lg text-xs text-white/70 bg-white/5 border border-white/10">{message}</div>;
}

export function AuthSubmit({ disabled, children }) {
  return (
    <button type="submit" disabled={disabled}
      className="w-full py-2.5 rounded-lg font-medium text-sm bg-white text-black hover:bg-white/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
      {children}
    </button>
  );
}

export const authLinkClass = 'text-white/50 hover:text-white transition-colors';
