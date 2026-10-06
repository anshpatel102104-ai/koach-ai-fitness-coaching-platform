import React from 'react';
import ReactDOM from 'react-dom';
import { X, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

const BENEFITS = [
  {
    title: 'A starting program',
    desc: 'Matched to their goal, experience and how many days they can train.',
  },
  {
    title: 'A meal plan',
    desc: 'Built around their calories, macros and diet style.',
  },
  {
    title: 'From their own data',
    desc: 'Uses goals, weight, height and your questionnaire answers, not a stock template.',
  },
  {
    title: 'You approve first',
    desc: 'Edit or throw it away on the review screen. Nothing saves until you approve.',
  },
];

const STEPS = [
  { n: '1', label: 'Pick a client', sub: 'Any existing client' },
  { n: '2', label: 'Answer a few questions', sub: 'Split, diet style, equipment' },
  { n: '3', label: 'The AI drafts the plan', sub: 'Program and meal plan, about 30 seconds' },
  { n: '4', label: 'Review and approve', sub: 'Change anything, then save' },
];

export default function AIOnboardingOverviewModal({ canUse, onGetStarted, onUpgrade, onClose }) {
  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-onboarding-title"
        className="relative w-full max-w-lg rounded-t-xl sm:rounded-xl overflow-hidden flex flex-col bg-card ring-1 ring-border max-h-[90dvh] sm:max-h-[85vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-start justify-between gap-4 flex-shrink-0">
          <div>
            <p className="text-[13px] text-muted-foreground mb-1">Pro and Elite plans</p>
            <h2 id="ai-onboarding-title" className="text-[28px] leading-tight text-foreground">AI onboarding</h2>
            <p className="text-[15px] text-muted-foreground mt-1.5">
              Draft a starting program and meal plan for a new client in one pass, then edit it like your own.
            </p>
          </div>
          <Button variant="ghost" size="icon" className="h-9 w-9 -mr-2 flex-shrink-0" onClick={onClose} aria-label="Close">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-2 space-y-5">
          <section className="rounded-xl bg-ai text-ai-foreground p-5">
            <h3 className="text-[20px] mb-3">What you get</h3>
            <ul className="space-y-3">
              {BENEFITS.map(b => (
                <li key={b.title}>
                  <p className="text-[15px] font-semibold">{b.title}</p>
                  <p className="text-sm text-ai-foreground/70 mt-0.5">{b.desc}</p>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="text-[20px] text-foreground mb-2">How it works</h3>
            <ol className="divide-y divide-border">
              {STEPS.map(s => (
                <li key={s.n} className="flex items-baseline gap-4 py-2.5">
                  <span className="num text-[20px] text-muted-foreground w-4">{s.n}</span>
                  <span>
                    <span className="block text-[15px] font-semibold text-foreground">{s.label}</span>
                    <span className="block text-sm text-muted-foreground">{s.sub}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex-shrink-0">
          {canUse ? (
            <>
              <Button size="lg" className="w-full" onClick={onGetStarted}>Get started</Button>
              <p className="text-center text-[13px] text-muted-foreground mt-2">Nothing is saved until you review and approve it.</p>
            </>
          ) : (
            <>
              <Button size="lg" className="w-full" onClick={onUpgrade}>
                <Lock className="w-4 h-4" /> Upgrade to Pro
              </Button>
              <p className="text-center text-[13px] text-muted-foreground mt-2">Available on the Pro and Elite plans.</p>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
