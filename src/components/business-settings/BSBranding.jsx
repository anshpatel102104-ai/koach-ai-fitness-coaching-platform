import React, { useRef } from 'react';
import { Palette, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { db } from '@/api/supabaseClient';
import { BSSection, BSRow, BSInput, BSTextarea, BSDivider } from './BSSection';
import { SignedImg } from '@/components/shared/SignedImage';

const BRAND_COLORS = ['var(--tc-primary)', 'var(--tc-ai)', 'var(--tc-destructive)', 'var(--tc-success)', 'var(--tc-warning)', 'var(--kc-0891b2)', 'var(--kc-db2777)', 'var(--tc-foreground)'];

const DEFAULTS = {
  brand_color: 'var(--tc-primary)', logo_url: '',
  email_signature: '', reply_to_email: '',
};

export default function BSBranding({ s, set }) {
  const logoRef = useRef();

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { file_url } = await db.uploadFile({ file, bucket: 'branding' });
    set('logo_url', file_url);
  };

  return (
    <BSSection icon={Palette} title="Branding & Appearance" onReset={() => Object.entries(DEFAULTS).forEach(([k, v]) => set(k, v))}>
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Coach Dashboard Branding</p>
      <BSRow label="Business logo">
        <div className="flex items-center gap-4">
          {s.logo_url && (
            <SignedImg src={s.logo_url} alt="logo" className="h-12 w-auto rounded-xl border border-border object-contain bg-card p-1" />
          )}
          <button onClick={() => logoRef.current?.click()}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-primary bg-accent border border-primary hover:bg-accent transition-colors">
            {s.logo_url ? 'Change Logo' : 'Upload Logo'}
          </button>
          {s.logo_url && (
            <button onClick={() => set('logo_url', '')} className="text-xs text-destructive hover:text-destructive font-medium">Remove</button>
          )}
          <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
        </div>
      </BSRow>
      <BSRow label="Primary brand color" hint="Used for accents in your dashboard">
        <div className="flex items-center gap-3 flex-wrap">
          {BRAND_COLORS.map(c => (
            <button key={c} onClick={() => set('brand_color', c)}
              className="w-8 h-8 rounded-full transition-all"
              style={{ background: c, boxShadow: s.brand_color === c ? `0 0 0 3px white, 0 0 0 5px ${c}` : 'none' }} />
          ))}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full border-2 border-border overflow-hidden">
              <input type="color" value={s.brand_color || 'var(--tc-primary)'} onChange={e => set('brand_color', e.target.value)}
                className="w-full h-full scale-125 cursor-pointer border-none outline-none" />
            </div>
            <span className="text-xs text-muted-foreground font-mono">{s.brand_color || 'var(--tc-primary)'}</span>
          </div>
        </div>
      </BSRow>

      <BSDivider />
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Client Portal Branding</p>
      <BSRow label="White label settings" hint="Full branding customization for your client portal">
        <Link to="/white-label"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-primary bg-accent border border-primary hover:bg-accent transition-colors">
          <ExternalLink className="w-4 h-4" /> Open White Label Settings
        </Link>
        <p className="text-xs text-warning mt-2 font-medium">⚡ Full white label branding available on Elite plan and above</p>
      </BSRow>

      <BSDivider />
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Email Branding</p>
      <BSRow label="Email signature">
        <BSTextarea value={s.email_signature} onChange={v => set('email_signature', v)}
          placeholder="[Coach Name] | [Business Name] | [Website]" rows={3} />
      </BSRow>
      <BSRow label="Reply-to email">
        <BSInput value={s.reply_to_email} onChange={v => set('reply_to_email', v)} placeholder="coach@yourdomain.com" />
      </BSRow>
    </BSSection>
  );
}