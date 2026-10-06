import React from 'react';
import { WLSection, WLRow, WLInput, WLUploadButton, WLColorPicker } from './WLHelpers';
import { SignedImg } from '@/components/shared/SignedImage';

export default function WLBrandIdentity({ s, set, locked }) {
  return (
    <WLSection title="Brand"
      description="Your name and logo, everywhere your clients look." locked={locked}>

      <WLRow label="Business name" hint="Shown in the app header, emails and notifications.">
        <WLInput value={s.business_name} onChange={v => set('business_name', v)} placeholder="Hybrid Life" />
        {s.business_name && (
          <p className="mt-1.5 text-[13px] text-muted-foreground">Clients see <strong className="text-foreground">{s.business_name}</strong>, not KOACH.</p>
        )}
      </WLRow>

      <WLRow label="App name" hint="The name under the icon on their home screen.">
        <WLInput value={s.app_name} onChange={v => set('app_name', v)} placeholder="Hybrid Life" />
      </WLRow>

      <WLRow label="Primary logo" hint="400 × 400 PNG with a transparent background.">
        <div className="space-y-3">
          <WLUploadButton label="Logo" url={s.logo_primary_url} onChange={v => set('logo_primary_url', v)}
            hint="App header and emails" />
          <WLUploadButton label="Dark version" url={s.logo_dark_url} onChange={v => set('logo_dark_url', v)}
            hint="For light backgrounds" />
          <WLUploadButton label="Light version" url={s.logo_light_url} onChange={v => set('logo_light_url', v)}
            hint="For dark backgrounds" />
        </div>
      </WLRow>

      <WLRow label="Favicon" hint="The browser tab icon.">
        <WLUploadButton label="Favicon" url={s.favicon_url} onChange={v => set('favicon_url', v)} hint="32 × 32 or 64 × 64 PNG or ICO" />
      </WLRow>

      <WLRow label="App icon" hint="1024 × 1024. Used when clients add the app to their phone.">
        <div className="flex items-start gap-6 flex-wrap">
          <WLUploadButton label="App icon" url={s.app_icon_url} onChange={v => set('app_icon_url', v)} hint="1024 × 1024 PNG" />
          {/* Phone mockup preview */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-[14px] overflow-hidden border border-border flex items-center justify-center flex-shrink-0"
              style={{ background: s.app_icon_url ? 'transparent' : s.app_icon_bg_color || '#0A5CFF' }}>
              {s.app_icon_url
                ? <SignedImg src={s.app_icon_url} alt="icon" className="w-full h-full object-cover" />
                : <span className="text-white text-xl font-bold">{(s.business_name || s.app_name || 'K')[0]}</span>
              }
            </div>
            <p className="text-xs text-muted-foreground truncate max-w-[72px]">{s.app_name || 'My App'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-3">
          <span className="text-sm text-muted-foreground">Icon background</span>
          <WLColorPicker value={s.app_icon_bg_color} onChange={v => set('app_icon_bg_color', v)} />
        </div>
              </WLRow>
    </WLSection>
  );
}