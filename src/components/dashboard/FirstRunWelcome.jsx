import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { db } from '@/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { Page, TextLink } from '@/components/kit';

/**
 * Today, before the coach has any clients: five setup steps with real
 * completion state, a way to bring clients over from another app, and a
 * preview of what clients will see.
 */
const safe = (p) => p.catch(() => []);

function useSetupState(user) {
  const { data: brand = [] } = useQuery({
    queryKey: ['welcome-brand', user?.id],
    queryFn: () => safe(db.entities.WhiteLabelSettings.filter({ coach_id: user.id }, '-created_date', 1)),
    enabled: !!user?.id,
  });
  const { data: forms = [] } = useQuery({
    queryKey: ['welcome-checkin-forms'],
    queryFn: () => safe(db.entities.CheckInForm.list('-created_date', 1)),
  });
  const { data: settings = [] } = useQuery({
    queryKey: ['welcome-coach-settings'],
    queryFn: () => safe(db.entities.CoachSettings.list()),
  });
  const { data: programs = [] } = useQuery({
    queryKey: ['welcome-programs'],
    queryFn: () => safe(db.entities.WorkoutProgram.list('-created_date', 1)),
  });

  const wl = brand[0];
  const brandName = wl?.business_name || wl?.app_name || '';
  return {
    brandName,
    brandDone: !!brandName,
    checkInDone: forms.length > 0,
    stripeDone: !!settings[0]?.stripe_connected,
    programDone: programs.length > 0,
  };
}

function StepMarker({ n, done }) {
  return done ? (
    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-success text-white">
      <Check className="h-4 w-4" strokeWidth={3} />
    </span>
  ) : (
    <span className="num flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border-[1.5px] border-foreground/70 text-[17px] text-foreground">
      {n}
    </span>
  );
}

function PhonePreview({ brandName }) {
  return (
    <div className="mx-auto w-full max-w-[300px]">
      <p className="mb-3 text-sm font-semibold text-foreground">What your clients will see</p>
      {/* Device frame is intentionally dark in both themes */}
      <div className="rounded-[36px] bg-sidebar p-2.5">
        <div className="overflow-hidden rounded-[28px] bg-background">
          <div className="rounded-b-2xl bg-sidebar px-4 pb-5 pt-6 text-sidebar-accent-foreground">
            <span className="inline-block rounded border border-dashed border-white/50 px-5 py-1.5 text-[11px] text-white/80">
              Your logo
            </span>
            <p className="num mt-3 text-[26px] leading-[1.05] text-white">
              {brandName ? `Welcome to ${brandName}` : 'Welcome aboard'}
            </p>
            <span className="mt-4 flex h-10 items-center justify-center rounded-lg bg-brand text-sm font-semibold text-brand-foreground">
              Start onboarding
            </span>
          </div>
          <div className="space-y-2.5 p-3 pb-16">
            {[0, 1, 2].map(i => <div key={i} className="h-16 rounded-lg bg-card" />)}
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-[13px] leading-snug text-muted-foreground">
        Your name, logo and colours. No KOACH branding in front of your clients.
      </p>
    </div>
  );
}

export default function FirstRunWelcome({ user, clientCount = 0 }) {
  const navigate = useNavigate();
  const setup = useSetupState(user);
  const firstName = (user?.full_name || '').trim().split(/\s+/)[0];

  const steps = useMemo(() => [
    {
      id: 'brand',
      title: 'Name your coaching brand',
      body: setup.brandDone ? `${setup.brandName}. Shown on your client app.` : 'Your name, logo and colour on the client app.',
      done: setup.brandDone,
      cta: 'Set up brand',
      href: '/white-label',
    },
    {
      id: 'clients',
      title: 'Add your clients',
      body: 'Import from another app or send invite links.',
      done: clientCount > 0,
      cta: 'Add clients',
      href: '/clients?new=1',
    },
    {
      id: 'checkin',
      title: 'Set your weekly check-in',
      body: 'Pick the day and the questions. A default form is ready.',
      done: setup.checkInDone,
      cta: 'Set up check-in',
      href: '/checkin-review',
    },
    {
      id: 'stripe',
      title: 'Connect Stripe to get paid',
      body: 'Clients pay you directly. KOACH never touches your money.',
      done: setup.stripeDone,
      cta: 'Connect Stripe',
      href: '/settings',
    },
    {
      id: 'program',
      title: 'Build a first program',
      body: 'Describe the client and let AI draft it. You edit before it goes out.',
      done: setup.programDone,
      cta: 'Build with AI',
      href: '/program-builder',
    },
  ], [setup, clientCount]);

  const doneCount = steps.filter(s => s.done).length;
  const nextId = steps.find(s => !s.done)?.id;

  return (
    <Page className="pb-24 lg:pb-12">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-12">
        <div className="min-w-0 max-w-[660px]">
          <h1 className="text-[34px] leading-[1.02] sm:text-[44px]">
            {firstName ? `Welcome, ${firstName}. ` : 'Welcome. '}Let&apos;s get your first client checking in.
          </h1>
          <p className="mt-3 max-w-xl text-[15px] text-muted-foreground sm:text-base">
            Five steps, about 20 minutes. Your Today page fills in as soon as your first client logs a workout.
          </p>

          <div className="mt-7 flex items-center gap-4">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-valuemin={0} aria-valuemax={5} aria-valuenow={doneCount}>
              <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
            </div>
            <span className="text-sm font-semibold text-foreground">{doneCount} of {steps.length} done</span>
          </div>

          <ol className="mt-5 space-y-2.5">
            {steps.map((s, i) => (
              <li key={s.id} className="panel flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4 sm:flex-nowrap sm:px-5">
                <StepMarker n={i + 1} done={s.done} />
                <div className="min-w-0 flex-1 max-sm:basis-[calc(100%-52px)]">
                  <p className="text-[16px] font-semibold text-foreground">{s.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{s.body}</p>
                </div>
                {s.done ? (
                  <TextLink onClick={() => navigate(s.href)} className="flex-shrink-0 text-muted-foreground max-sm:ml-[52px]">Edit</TextLink>
                ) : (
                  <Button
                    variant={s.id === nextId ? 'default' : 'outline'}
                    onClick={() => navigate(s.href)}
                    className="flex-shrink-0 max-sm:ml-[52px]"
                  >
                    {s.cta}
                  </Button>
                )}
              </li>
            ))}
          </ol>

          <p className="mt-7 text-sm font-semibold text-foreground">Moving from another app? Bring your clients with you.</p>
          <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {[
              { label: 'From Trainerize', from: 'trainerize' },
              { label: 'From Everfit', from: 'everfit' },
              { label: 'From a spreadsheet', from: 'csv' },
            ].map(m => (
              <Button key={m.from} variant="outline" size="lg" onClick={() => navigate(`/migration?from=${m.from}`)}>
                {m.label}
              </Button>
            ))}
          </div>
        </div>

        <aside className="hidden md:block lg:pt-1">
          <PhonePreview brandName={setup.brandName} />
        </aside>
      </div>
    </Page>
  );
}
