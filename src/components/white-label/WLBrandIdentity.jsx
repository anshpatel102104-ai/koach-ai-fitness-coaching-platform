import React from 'react';
import { WLSection, WLRow, WLInput, WLUploadButton, WLColorPicker, WLDivider } from './WLHelpers';
import { SignedImg } from '@/components/shared/SignedImage';

export default function WLBrandIdentity({ s, set, locked }) {
  return (
    <WLSection title="Brand Identity" emoji="🏷️"
      description="Core branding elements used across the entire client portal" locked={locked}>

      <WLRow label="Business name" hint="Shown in portal header, emails, notifications & loading screens">
        <WLInput value={s.business_name} onChange={v => set('business_name', v)} placeholder="e.g. Myles Harris Fitness" />
        {s.business_name && (
          <p className="text-xs text-muted-foreground mt-1">Clients will see: <strong className="text-muted-foreground">"{s.business_name}"</strong> instead of "KOACH AI"</p>
        )}
      </WLRow>

      <WLRow label="App name" hint="Displayed when clients add portal to home screen">
        <WLInput value={s.app_name} onChange={v => set('app_name', v)} placeholder="e.g. MHF Coaching" />
      </WLRow>

      <WLDivider />

      <WLRow label="Primary logo" hint="Recommended: 400×400px PNG with transparent background">
        <div className="space-y-3">
          <WLUploadButton label="Primary Logo" url={s.logo_primary_url} onChange={v => set('logo_primary_url', v)}
            hint="Shown in portal header and emails" />
          <WLUploadButton label="Dark Version" url={s.logo_dark_url} onChange={v => set('logo_dark_url', v)}
            hint="For use on light backgrounds" />
          <WLUploadButton label="Light Version" url={s.logo_light_url} onChange={v => set('logo_light_url', v)}
            hint="For use on dark backgrounds" />
        </div>
      </WLRow>

      <WLRow label="Favicon" hint="32×32px — shown in browser tab">
        <WLUploadButton label="Favicon" url={s.favicon_url} onChange={v => set('favicon_url', v)} hint="32×32 or 64×64 PNG/ICO" />
      </WLRow>

      <WLDivider />

      <WLRow label="App icon" hint="1024×1024px — used when clients add portal to phone home screen">
        <div className="flex items-start gap-6 flex-wrap">
          <WLUploadButton label="App Icon" url={s.app_icon_url} onChange={v => set('app_icon_url', v)} hint="1024×1024 PNG recommended" />
          {/* Phone mockup preview */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-border flex items-center justify-center flex-shrink-0"
              style={{ background: s.app_icon_url ? 'transparent' : s.app_icon_bg_color || 'var(--tc-primary)' }}>
              {s.app_icon_url
                ? <SignedImg src={s.app_icon_url} alt="icon" className="w-full h-full object-cover" />
                : <span className="text-white text-xl font-black">{(s.business_name || s.app_name || 'K')[0]}</span>
              }
            </div>
            <p className="text-[10px] text-muted-foreground truncate max-w-[60px]">{s.app_name || 'My App'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-3">
          <span className="text-sm text-muted-foreground font-medium">Icon background</span>
          <WLColorPicker value={s.app_icon_bg_color} onChange={v => set('app_icon_bg_color', v)} />
        </div>
        <p className="text-xs text-muted-foreground mt-2">💡 Appears when clients add your portal to their home screen (iOS & Android)</p>
      </WLRow>
    </WLSection>
  );
}