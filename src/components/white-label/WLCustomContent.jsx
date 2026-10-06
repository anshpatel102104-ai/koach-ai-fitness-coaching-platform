import React from 'react';
import { Plus, X } from 'lucide-react';
import { WLSection, WLRow, WLInput, WLGroup, WLPlanNote } from './WLHelpers';
import { Button } from '@/components/ui/button';
import { textareaClass } from '@/components/settings/SettingsLayout';

export default function WLCustomContent({ s, set, locked, enterpriseLocked }) {
  const pages = s.custom_pages || [];

  const addPage = () => {
    if (pages.length >= 3) return;
    set('custom_pages', [...pages, { id: Date.now().toString(), title: '', slug: '', content: '' }]);
  };
  const updatePage = (id, field, val) => set('custom_pages', pages.map(p => p.id === id ? { ...p, [field]: val } : p));
  const removePage = (id) => set('custom_pages', pages.filter(p => p.id !== id));

  return (
    <WLSection title="Pages and policies"
      description="Your terms, privacy policy, extra pages and first-login welcome." locked={locked}>

      <WLGroup>Terms and policies</WLGroup>
      <WLRow label="Terms of service" hint="Replaces the KOACH default terms.">
        <div className="space-y-2">
          <WLInput value={s.terms_url} onChange={v => set('terms_url', v)} placeholder="https://yourdomain.com/terms" />
          <textarea value={s.terms_text || ''} onChange={e => set('terms_text', e.target.value)}
            placeholder="Or paste the text here"
            rows={3}
            className={textareaClass} />
        </div>
        <p className="mt-2 text-[13px] text-muted-foreground">You are responsible for the terms and policy you publish.</p>
      </WLRow>

      <WLRow label="Privacy policy" hint="Replaces the KOACH default policy.">
        <div className="space-y-2">
          <WLInput value={s.privacy_url} onChange={v => set('privacy_url', v)} placeholder="https://yourdomain.com/privacy" />
          <textarea value={s.privacy_text || ''} onChange={e => set('privacy_text', e.target.value)}
            placeholder="Or paste the text here"
            rows={3}
            className={textareaClass} />
        </div>
      </WLRow>
      <WLGroup right={enterpriseLocked ? <WLPlanNote>Enterprise plan</WLPlanNote> : <span className="text-[13px] tabular-nums text-muted-foreground">{pages.length} of 3</span>}>Extra pages</WLGroup>

      {!enterpriseLocked && (
        <div className="space-y-3 py-4">
          {pages.map((page, i) => (
            <div key={page.id} className="space-y-2 rounded-lg bg-secondary p-4">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-semibold text-foreground">Page {i + 1}</p>
                <button onClick={() => removePage(page.id)} aria-label="Remove page" className="touch-compact text-muted-foreground transition-colors hover:text-destructive">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <WLInput value={page.title} onChange={v => updatePage(page.id, 'title', v)} placeholder="Page title, like How I coach" />
              <div className="flex items-center gap-2">
                <span className="flex-shrink-0 font-mono text-[13px] text-muted-foreground">portal.app/</span>
                <WLInput value={page.slug} onChange={v => updatePage(page.id, 'slug', v)} placeholder="page-slug" />
              </div>
              <textarea value={page.content} onChange={e => updatePage(page.id, 'content', e.target.value)}
                placeholder="Page content"
                rows={4}
                className={textareaClass} />
            </div>
          ))}
          {pages.length < 3 && (
            <Button variant="outline" onClick={addPage}><Plus /> Add a page</Button>
          )}
        </div>
      )}
      <WLGroup>First login</WLGroup>
      <WLRow label="Welcome video" hint="Plays the first time a client logs in.">
        <WLInput value={s.welcome_video_url} onChange={v => set('welcome_video_url', v)} placeholder="https://youtube.com/..." />
      </WLRow>
      <WLRow label="Onboarding headline">
        <WLInput value={s.onboarding_headline} onChange={v => set('onboarding_headline', v)}
          placeholder={`Welcome to ${s.business_name || 'your coaching app'}`} />
      </WLRow>
      <WLRow label="Onboarding subtitle">
        <WLInput value={s.onboarding_subtitle} onChange={v => set('onboarding_subtitle', v)}
          placeholder="Five quick questions, then your plan is ready" />
      </WLRow>
    </WLSection>
  );
}