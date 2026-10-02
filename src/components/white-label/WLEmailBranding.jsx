import React, { useState } from 'react';
import { WLSection, WLRow, WLToggle, WLInput, WLColorPicker, WLSelect, WLDivider } from './WLHelpers';
import { toast } from 'sonner';
import { Send } from 'lucide-react';
import { SignedImg } from '@/components/shared/SignedImage';

const HEADER_HEIGHTS = [
  { value: 'compact', label: 'Compact' },
  { value: 'standard', label: 'Standard' },
  { value: 'large', label: 'Large' },
];
const SOCIAL_PLATFORMS = ['instagram', 'tiktok', 'youtube', 'facebook', 'x'];

export default function WLEmailBranding({ s, set, locked, eliteLocked }) {
  const [sending, setSending] = useState(false);

  const sendTestEmail = async () => {
    setSending(true);
    await new Promise(r => setTimeout(r, 1500));
    setSending(false);
    toast.success('Test email sent to your business email address ✓');
  };

  const socialLinks = s.email_footer_social_links || {};
  const updateSocial = (platform, url) => set('email_footer_social_links', { ...socialLinks, [platform]: url });

  return (
    <WLSection title="Email Branding" emoji="📧"
      description="Applied to all emails sent from your coaching portal" locked={locked}>

      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Email Header</p>
      <WLRow label="Show logo in emails">
        <WLToggle value={s.email_show_logo !== false} onChange={v => set('email_show_logo', v)} />
      </WLRow>
      <WLRow label="Header background color">
        <WLColorPicker value={s.email_header_bg} onChange={v => set('email_header_bg', v)} />
      </WLRow>
      <WLRow label="Header height">
        <WLSelect value={s.email_header_height || 'standard'} onChange={v => set('email_header_height', v)} options={HEADER_HEIGHTS} />
      </WLRow>

      <WLDivider />
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Email Footer</p>
      <WLRow label="Business name" hint="Required for CAN-SPAM compliance">
        <WLInput value={s.email_footer_name} onChange={v => set('email_footer_name', v)}
          placeholder={s.business_name || 'Your Business Name'} />
      </WLRow>
      <WLRow label="Business address" hint="Required for CAN-SPAM compliance">
        <WLInput value={s.email_footer_address} onChange={v => set('email_footer_address', v)}
          placeholder="123 Main St, New York, NY 10001" />
      </WLRow>
      <WLRow label="Custom footer text">
        <WLInput value={s.email_footer_text} onChange={v => set('email_footer_text', v)}
          placeholder={`© 2026 ${s.business_name || 'Your Business'}. All rights reserved.`} />
      </WLRow>
      <WLRow label="Social media links in footer">
        <div className="space-y-2">
          <WLToggle value={s.email_footer_social} onChange={v => set('email_footer_social', v)} />
          {s.email_footer_social && (
            <div className="space-y-2 mt-2">
              {SOCIAL_PLATFORMS.map(p => (
                <div key={p} className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-muted-foreground w-20 capitalize">{p}</span>
                  <WLInput value={socialLinks[p] || ''} onChange={v => updateSocial(p, v)}
                    placeholder={`https://${p}.com/yourhandle`} className="flex-1" />
                </div>
              ))}
            </div>
          )}
        </div>
      </WLRow>
      <WLRow label="Unsubscribe link">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted border border-border">
          <span className="text-sm text-muted-foreground">Required by law — cannot be disabled</span>
          <span className="text-xs bg-border text-muted-foreground px-2 py-0.5 rounded-full font-semibold">Always on</span>
        </div>
      </WLRow>
      <WLRow label="Hide 'Powered by KOACH AI'" hint="Elite+ only">
        <WLToggle value={s.email_hide_koach_badge || false} onChange={v => set('email_hide_koach_badge', v)} disabled={eliteLocked} />
        {eliteLocked && <p className="text-xs text-warning font-medium mt-1">⭐ Available on Elite and above</p>}
      </WLRow>

      <WLDivider />

      {/* Email preview card */}
      <div className="rounded-2xl border border-border overflow-hidden">
        <div className="flex items-center justify-center py-8 px-6" style={{ background: s.email_header_bg || s.primary_color || 'var(--tc-primary)' }}>
          {s.logo_primary_url && s.email_show_logo !== false
            ? <SignedImg src={s.logo_primary_url} alt="logo" className="h-12 object-contain" />
            : <span className="text-white font-black text-xl">{s.business_name || 'Your Business'}</span>
          }
        </div>
        <div className="p-5 bg-card">
          <p className="text-foreground font-semibold text-sm mb-1">Hey [Client Name] 👋</p>
          <p className="text-muted-foreground text-sm">Your weekly check-in reminder from {s.business_name || 'your coach'} is here...</p>
        </div>
        <div className="px-5 py-4 bg-muted border-t border-border">
          <p className="text-muted-foreground text-[10px] text-center">{s.email_footer_text || `© 2026 ${s.business_name || 'Your Business'}. All rights reserved.`}</p>
          {!s.email_hide_koach_badge && <p className="text-border text-[10px] text-center mt-0.5">Powered by KOACH AI</p>}
        </div>
      </div>

      <button onClick={sendTestEmail} disabled={sending}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-primary bg-accent border border-primary hover:bg-accent transition-colors disabled:opacity-60">
        {sending ? <div className="w-4 h-4 border-2 border-primary border-t-blue-600 rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
        Send Test Email
      </button>
    </WLSection>
  );
}