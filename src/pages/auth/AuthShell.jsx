import React, { useState } from 'react';

/**
 * Shared chrome for the auth pages: a centered panel on the graphite brand
 * surface with the white KOACH AI logo. Flat and minimal by design.
 */
export default function AuthShell({ title, children }) {
  return (
    <div className="fixed inset-0 overflow-y-auto flex items-center justify-center px-5 py-10 bg-sidebar">
      <div className="w-full max-w-[400px] flex flex-col items-center gap-10">
        <img src="/koach-logo-white.png" alt="KOACH AI" className="h-10 w-auto" />
        <div className="w-full rounded-xl bg-white/[0.04] ring-1 ring-white/[0.08] p-6 sm:p-8 space-y-6">
          <h1 className="text-[32px] text-white">{title}</h1>
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
      <label className="block text-[13px] font-medium text-white/70">{label}</label>
      <div className="relative">
        <input
          type={isPassword && show ? 'text' : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="w-full h-11 px-3.5 pr-14 rounded-md bg-black/20 border border-white/10 text-white placeholder-white/30 text-[15px] focus:outline-none focus:border-white/50 transition-colors"
        />
        {isPassword && (
          <button type="button" onClick={() => setShow((s) => !s)}
            className="touch-compact absolute right-3 top-1/2 -translate-y-1/2 text-[13px] font-medium text-white/50 hover:text-white transition-colors">
            {show ? 'Hide' : 'Show'}
          </button>
        )}
      </div>
    </div>
  );
}

export function AuthError({ message }) {
  if (!message) return null;
  return <div className="px-3.5 py-3 rounded-md text-[13px] text-[#ff9b9b] bg-[#cd2626]/15 ring-1 ring-[#cd2626]/30">{message}</div>;
}

export function AuthNotice({ message }) {
  if (!message) return null;
  return <div className="px-3.5 py-3 rounded-md text-[13px] text-white/80 bg-white/5 ring-1 ring-white/10">{message}</div>;
}

export function AuthSubmit({ disabled, children }) {
  return (
    <button type="submit" disabled={disabled}
      className="w-full h-12 rounded-md font-semibold text-[15px] bg-white text-[#111318] hover:bg-white/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
      {children}
    </button>
  );
}

export const authLinkClass = 'text-white/60 underline underline-offset-4 decoration-white/30 hover:text-white hover:decoration-white transition-colors';
