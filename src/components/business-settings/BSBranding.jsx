import React, { useRef } from 'react';
import { Palette } from 'lucide-react';
import { Link } from 'react-router-dom';
import { db } from '@/api/supabaseClient';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { BSSection, BSRow, BSInput, BSTextarea, BSGroup } from './BSSection';
import { SignedImg } from '@/components/shared/SignedImage';

// Brand colour choices are data (the coach's own brand), so they are stored as hex.
const BRAND_COLORS = ['#0A5CFF', '#111318', '#1E7A4D', '#CD2626', '#C2410C', '#0E7490', '#5E6470'];

const DEFAULTS = {
  brand_color: '#0A5CFF', logo_url: '',
  email_signature: '', reply_to_email: '',
};

const isHex = (c) => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c);

export default function BSBranding({ s, set }) {
  const logoRef = useRef();

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { file_url } = await db.uploadFile({ file, bucket: 'branding' });
    set('logo_url', file_url);
  };

  return (
    <BSSection icon={Palette} title="Branding" subtitle="Your logo and colour, and how your emails are signed." onReset={() => Object.entries(DEFAULTS).forEach(([k, v]) => set(k, v))}>
      <BSGroup>Coach dashboard branding</BSGroup>
      <BSRow label="Business logo" hint="PNG or SVG on a transparent background works best.">
        <div className="flex flex-wrap items-center gap-3">
          {s.logo_url && (
            <SignedImg src={s.logo_url} alt="logo" className="h-12 w-auto rounded-lg border border-border object-contain bg-card p-1" />
          )}
          <Button variant="outline" onClick={() => logoRef.current?.click()}>
            {s.logo_url ? 'Change logo' : 'Upload logo'}
          </Button>
          {s.logo_url && (
            <Button variant="link" className="text-destructive" onClick={() => set('logo_url', '')}>Remove</Button>
          )}
          <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
        </div>
      </BSRow>
      <BSRow label="Brand colour" hint="One colour for accents in your dashboard.">
        <div className="flex items-center gap-2.5 flex-wrap">
          {BRAND_COLORS.map(c => (
            <button key={c} type="button" onClick={() => set('brand_color', c)} aria-label={`Use ${c}`}
              className={cn('touch-compact h-8 w-8 rounded-full transition-shadow',
                s.brand_color?.toLowerCase() === c.toLowerCase() && 'ring-2 ring-foreground ring-offset-2 ring-offset-card')}
              style={{ background: c }} />
          ))}
          <label className="flex h-10 items-center gap-2 rounded-md border border-input bg-card pl-1.5 pr-3">
            <input type="color" value={isHex(s.brand_color) ? s.brand_color : '#0A5CFF'} onChange={e => set('brand_color', e.target.value)}
              className="h-7 w-7 cursor-pointer rounded border-none bg-transparent p-0" aria-label="Custom colour" />
            <span className="font-mono text-[13px] text-muted-foreground">{isHex(s.brand_color) ? s.brand_color.toUpperCase() : 'Custom'}</span>
          </label>
        </div>
      </BSRow>
      <BSGroup>Client portal branding</BSGroup>
      <BSRow label="White label" hint="Your name, logo and colours on the client app. Elite plan and above.">
        <Button asChild variant="outline"><Link to="/white-label">Open white label settings</Link></Button>
      </BSRow>
      <BSGroup>Email branding</BSGroup>
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