import React, { useState } from 'react';
import { WLSection, WLRow, WLToggle, WLSelect, WLColorPicker, WLInput, WLUploadButton, WLGroup, WLPlanNote } from './WLHelpers';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';

const NAV_STYLES = [
  { value: 'bottom', label: 'Bottom bar (default)' },
  { value: 'side', label: 'Side navigation' },
  { value: 'tab', label: 'Tab bar' },
];
const NAV_BGS = [
  { value: 'brand', label: 'Brand colour' },
  { value: 'white', label: 'White' },
  { value: 'dark', label: 'Dark' },
];
const SPLASH_ANIMATIONS = [
  { value: 'spinner', label: 'Spinner' },
  { value: 'pulse', label: 'Pulse' },
  { value: 'logo', label: 'Logo animation' },
];
// 'gradient' is the stored legacy value; it now renders as the flat brand colour.
const LOGIN_BG_TYPES = [
  { value: 'gradient', label: 'Brand colour' },
  { value: 'solid', label: 'Another colour' },
  { value: 'image', label: 'Image' },
];
const DOMAIN_STATUS = {
  pending: { icon: Clock, tone: 'text-warning', label: 'Waiting for DNS' },
  verified: { icon: CheckCircle, tone: 'text-foreground', label: 'Domain verified' },
  active: { icon: CheckCircle, tone: 'text-success', label: 'Live' },
  error: { icon: AlertCircle, tone: 'text-destructive', label: 'DNS error. Check the records below.' },
};

export default function WLPortalBranding({ s, set, locked, eliteLocked, enterpriseLocked }) {
  const [showDnsInstructions, setShowDnsInstructions] = useState(false);
  const domainStatus = DOMAIN_STATUS[s.custom_domain_status || 'pending'];
  const StatusIcon = domainStatus.icon;

  return (
    <WLSection title="Client app"
      description="Header, navigation, loading screen, login page and domain." locked={locked}>

      <WLGroup>Header and navigation</WLGroup>
      <WLRow label="Show business logo" hint="In the app header, top left.">
        <WLToggle value={s.portal_show_logo !== false} onChange={v => set('portal_show_logo', v)} />
      </WLRow>
      <WLRow label="Navigation style" hint="Where the main tabs sit in the app.">
        <WLSelect value={s.portal_nav_style || 'bottom'} onChange={v => set('portal_nav_style', v)} options={NAV_STYLES} />
      </WLRow>
      <WLRow label="Navigation bar colour">
        <WLSelect value={s.portal_nav_bg || 'white'} onChange={v => set('portal_nav_bg', v)} options={NAV_BGS} />
      </WLRow>
      <WLRow label="Hide Powered by KOACH" hint="Removes the KOACH badge from the app footer.">
        <WLToggle value={s.portal_hide_koach_badge || false} onChange={v => set('portal_hide_koach_badge', v)} disabled={eliteLocked} />
        {eliteLocked && <WLPlanNote>Elite plan and above</WLPlanNote>}
      </WLRow>
      <WLGroup>Loading screen</WLGroup>
      <WLRow label="Your own splash screen">
        <WLToggle value={s.splash_enabled !== false} onChange={v => set('splash_enabled', v)} />
      </WLRow>
      {s.splash_enabled !== false && (
        <>
          <WLRow label="Splash background">
            <WLColorPicker value={s.splash_bg_color} onChange={v => set('splash_bg_color', v)} />
          </WLRow>
          <WLRow label="Loading animation">
            <WLSelect value={s.splash_animation || 'spinner'} onChange={v => set('splash_animation', v)} options={SPLASH_ANIMATIONS} />
          </WLRow>
        </>
      )}
      <WLGroup>Login page</WLGroup>
      <WLRow label="Background type">
        <WLSelect value={s.login_bg_type || 'gradient'} onChange={v => set('login_bg_type', v)} options={LOGIN_BG_TYPES} />
      </WLRow>
      {s.login_bg_type !== 'image' ? (
        <WLRow label="Background colour">
          <WLColorPicker value={s.login_bg_color} onChange={v => set('login_bg_color', v)} />
        </WLRow>
      ) : (
        <WLRow label="Background image">
          <WLUploadButton label="Image" url={s.login_bg_image_url} onChange={v => set('login_bg_image_url', v)} hint="1920 × 1080" />
        </WLRow>
      )}
      <WLRow label="Show logo on login page">
        <WLToggle value={s.login_show_logo !== false} onChange={v => set('login_show_logo', v)} />
      </WLRow>
      <WLRow label="Welcome headline">
        <WLInput value={s.login_headline} onChange={v => set('login_headline', v)}
          placeholder={`Welcome to ${s.business_name || 'your coaching app'}`} />
      </WLRow>
      <WLRow label="Welcome subtitle">
        <WLInput value={s.login_subtitle} onChange={v => set('login_subtitle', v)}
          placeholder="Sign in to see your plan for today" />
      </WLRow>
      <WLGroup right={enterpriseLocked && <WLPlanNote>Enterprise plan</WLPlanNote>}>Custom domain</WLGroup>
      <WLRow label="Domain" hint="DNS changes can take up to 48 hours.">
        <WLInput value={s.custom_domain} onChange={v => { set('custom_domain', v); setShowDnsInstructions(!!v); }}
          placeholder="app.yourdomain.com"
          className={enterpriseLocked ? 'opacity-50 pointer-events-none' : ''} />
        {s.custom_domain && (
          <p className={`mt-2 flex items-center gap-1.5 text-[13px] font-semibold ${domainStatus.tone}`}>
            <StatusIcon className="h-4 w-4 flex-shrink-0" />
            {domainStatus.label}
            <span className="font-normal text-muted-foreground">· SSL is set up for you</span>
          </p>
        )}
        {showDnsInstructions && s.custom_domain && !enterpriseLocked && (
          <div className="mt-3 rounded-lg bg-secondary p-4">
            <p className="mb-2 text-[13px] font-semibold text-foreground">Add this CNAME record at your DNS provider</p>
            <dl className="grid grid-cols-[64px_1fr] gap-y-1 font-mono text-[13px]">
              <dt className="text-muted-foreground">Type</dt><dd className="text-foreground">CNAME</dd>
              <dt className="text-muted-foreground">Name</dt><dd className="text-foreground">{s.custom_domain.split('.')[0]}</dd>
              <dt className="text-muted-foreground">Value</dt><dd className="text-foreground">portal.koachai.net</dd>
              <dt className="text-muted-foreground">TTL</dt><dd className="text-foreground">300</dd>
            </dl>
          </div>
        )}
      </WLRow>
    </WLSection>
  );
}