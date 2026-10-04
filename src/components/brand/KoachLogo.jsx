import React from 'react';

const LOGO_URL = '/favicon-512.png';

export default function KoachLogo({ size = 32, rounded = 'rounded-xl', glow = false, bg = true }) {
  return (
    <div
      className={`flex items-center justify-center flex-shrink-0 overflow-hidden ${rounded}`}
      style={{
        width: size,
        height: size,
        background: bg ? 'var(--kc-0a0a0a)' : 'transparent',
        boxShadow: glow ? '0 0 20px color-mix(in srgb, var(--tc-primary) 40%, transparent)' : 'none',
      }}
    >
      <img
        src={LOGO_URL}
        alt="KOACH AI"
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    </div>
  );
}