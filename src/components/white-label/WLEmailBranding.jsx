import React, { useState } from 'react';
import { WLSection, WLRow, WLToggle, WLInput, WLColorPicker, WLSelect, WLGroup, WLPlanNote } from './WLHelpers';
import { toast } from 'sonner';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SignedImg } from '@/components/shared/SignedImage';
import { db } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { userMessage } from '@/lib/appErrors';

const escapeHtml = (v) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const HEADER_HEIGHTS = [
  { value: 'compact', label: 'Compact' },
  { value: 'standard', label: 'Standard' },
  { value: 'large', label: 'Large' },
];
const SOCIAL_PLATFORMS = ['instagram', 'tiktok', 'youtube', 'facebook', 'x'];

export default function WLEmailBranding({ s, set, locked, eliteLocked }) {
  const [sending, setSending] = useState(false);

  // A real email to the coach's own address (sendEmailNotification allows
  // sending to yourself), using the branding fields as they are now.
  const { user } = useAuth();
  const sendTestEmail = async () => {
    if (!user?.email) return;
    setSending(true);
    try {
      const name = escapeHtml(s.business_name || s.app_name || 'Your coaching business');
      const footer = s.email_footer_text ? `<p style="color:#6b7280;font-size:13px">${escapeHtml(s.email_footer_text)}</p>` : '';
      await db.functions.invoke('sendEmailNotification', {
        to: user.email,
        subject: `Test email from ${s.business_name || 'your coaching app'}`,
        html: `<div style="font-family:sans-serif"><h2 style="color:${/^#[0-9a-f]{3,8}$/i.test(s.primary_color || '') ? s.primary_color : '#111'}">${name}</h2><p>This is how emails to your clients are branded.</p>${footer}</div>`,
      });
      toast.success(`Test email sent to ${user.email}`);
    } catch (err) {
      toast.error(userMessage(err, "Couldn't send the test email. Please try again."));
    } finally {
      setSending(false);
    }
  };

  const socialLinks = s.email_footer_social_links || {};
  const updateSocial = (platform, url) => set('email_footer_social_links', { ...socialLinks, [platform]: url });

  return (
    <WLSection title="Emails"
      description="Every email your clients get from you." locked={locked}>

      <WLGroup>Email header</WLGroup>
      <WLRow label="Show logo in emails">
        <WLToggle value={s.email_show_logo !== false} onChange={v => set('email_show_logo', v)} />
      </WLRow>
      <WLRow label="Header colour">
        <WLColorPicker value={s.email_header_bg} onChange={v => set('email_header_bg', v)} />
      </WLRow>
      <WLRow label="Header height">
        <WLSelect value={s.email_header_height || 'standard'} onChange={v => set('email_header_height', v)} options={HEADER_HEIGHTS} />
      </WLRow>
      <WLGroup>Email footer</WLGroup>
      <WLRow label="Business name" hint="Required by anti-spam law.">
        <WLInput value={s.email_footer_name} onChange={v => set('email_footer_name', v)}
          placeholder={s.business_name || 'Your business name'} />
      </WLRow>
      <WLRow label="Business address" hint="Required by anti-spam law.">
        <WLInput value={s.email_footer_address} onChange={v => set('email_footer_address', v)}
          placeholder="123 Main St, New York, NY 10001" />
      </WLRow>
      <WLRow label="Custom footer text">
        <WLInput value={s.email_footer_text} onChange={v => set('email_footer_text', v)}
          placeholder={`© 2026 ${s.business_name || 'Your business'}. All rights reserved.`} />
      </WLRow>
      <WLRow label="Social media links in footer">
        <div className="space-y-2">
          <WLToggle value={s.email_footer_social} onChange={v => set('email_footer_social', v)} />
          {s.email_footer_social && (
            <div className="space-y-2 mt-2">
              {SOCIAL_PLATFORMS.map(p => (
                <div key={p} className="flex items-center gap-3">
                  <span className="w-20 text-sm capitalize text-muted-foreground">{p}</span>
                  <WLInput value={socialLinks[p] || ''} onChange={v => updateSocial(p, v)}
                    placeholder={`https://${p}.com/yourhandle`} className="flex-1" />
                </div>
              ))}
            </div>
          )}
        </div>
      </WLRow>
      <WLRow label="Unsubscribe link">
        <p className="flex min-h-10 items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary">Always on</Badge> Required by law.
        </p>
      </WLRow>
      <WLRow label="Hide Powered by KOACH" hint="Removes the KOACH line from email footers.">
        <WLToggle value={s.email_hide_koach_badge || false} onChange={v => set('email_hide_koach_badge', v)} disabled={eliteLocked} />
        {eliteLocked && <WLPlanNote>Elite plan and above</WLPlanNote>}
      </WLRow>

      <WLGroup right={
        <Button variant="outline" size="sm" onClick={sendTestEmail} disabled={sending}>
          {sending ? <Loader2 className="animate-spin" /> : <Send />} Send a test
        </Button>
      }>Preview</WLGroup>
      {/* Email preview card */}
      <div className="my-4 overflow-hidden rounded-lg border border-border">
        <div className="flex items-center justify-center px-6 py-7" style={{ background: s.email_header_bg || s.primary_color || '#0A5CFF' }}>
          {s.logo_primary_url && s.email_show_logo !== false
            ? <SignedImg src={s.logo_primary_url} alt="logo" className="h-12 object-contain" />
            : <span className="text-xl font-bold text-white">{s.business_name || 'Your business'}</span>
          }
        </div>
        <div className="bg-card p-5">
          <p className="mb-1 text-sm font-semibold text-foreground">Hi [Client name],</p>
          <p className="text-sm text-muted-foreground">Your weekly check-in is due tomorrow. It takes about four minutes.</p>
        </div>
        <div className="border-t border-border bg-secondary px-5 py-4 text-center text-xs text-muted-foreground">
          <p>{s.email_footer_text || `© 2026 ${s.business_name || 'Your business'}. All rights reserved.`}</p>
          {!s.email_hide_koach_badge && <p className="mt-0.5">Powered by KOACH</p>}
        </div>
      </div>
    </WLSection>
  );
}