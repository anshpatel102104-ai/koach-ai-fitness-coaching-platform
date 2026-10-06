import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Page, PageHeader, Panel, PanelHeader } from '@/components/kit';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import MigrationClientImport from '@/components/migration/MigrationClientImport';
import MigrationWorkouts from '@/components/migration/MigrationWorkouts';
import MigrationNutrition from '@/components/migration/MigrationNutrition';
import MigrationInvites from '@/components/migration/MigrationInvites';

const STEPS = [
  { id: 'clients',  label: 'Import your clients',  desc: 'Upload a CSV exported from Trainerize, Everfit or a spreadsheet.' },
  { id: 'workouts', label: 'Bring your programs',   desc: 'Import workout templates or start from ours.' },
  { id: 'nutrition',label: 'Bring your meal plans', desc: 'Import nutrition plans or skip for now.' },
  { id: 'invites',  label: 'Invite everyone',       desc: 'One email to every imported client with their login link.' },
];

export default function Migration() {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState({});
  const [importedClients, setImportedClients] = useState([]);

  const markDone = (id) => setDone(d => ({ ...d, [id]: true }));
  const allDone = STEPS.every(s => done[s.id]);

  const doneCount = STEPS.filter(s => done[s.id]).length;

  if (allDone) {
    return (
      <Page className="max-w-2xl">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success text-white">
          <Check className="h-6 w-6" strokeWidth={3} />
        </span>
        <h1 className="mt-5 text-[32px] text-foreground sm:text-[40px]">You're moved over.</h1>
        <p className="mt-2 max-w-md text-[15px] text-muted-foreground">
          Your clients, programs and meal plans are in, and your clients have their invites. Their first check-ins will show up on Today.
        </p>
        <Button asChild className="mt-6">
          <Link to="/clients">Go to clients</Link>
        </Button>
      </Page>
    );
  }

  const current = STEPS[step];

  return (
    <Page>
      <PageHeader
        title="Move to KOACH"
        subtitle="Four steps. Bring your clients, programs and meal plans, then invite everyone at once."
      />

      <div className="mb-5 flex max-w-xl items-center gap-4">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-border">
          <div className="h-full rounded-full bg-foreground transition-[width]" style={{ width: `${(doneCount / STEPS.length) * 100}%` }} />
        </div>
        <p className="text-sm font-semibold tabular-nums text-foreground">{doneCount} of {STEPS.length} done</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start">
        {/* Step cards */}
        <ol className="space-y-2.5">
          {STEPS.map((s, i) => {
            const isDone = done[s.id];
            const isActive = i === step;
            return (
              <li key={s.id}>
                <button
                  onClick={() => setStep(i)}
                  aria-current={isActive ? 'step' : undefined}
                  className={cn(
                    'panel flex w-full items-center gap-4 p-4 text-left transition-shadow',
                    isActive && 'shadow-[inset_0_0_0_2px_rgb(var(--foreground))]'
                  )}
                >
                  {isDone ? (
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-success text-white"><Check className="h-4 w-4" strokeWidth={3} /></span>
                  ) : (
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border-[1.5px] border-foreground text-[15px] font-bold text-foreground">{i + 1}</span>
                  )}
                  <span className="min-w-0">
                    <span className="block text-[15px] font-semibold text-foreground">{s.label}</span>
                    <span className="block text-sm text-muted-foreground">{isDone ? 'Done' : s.desc}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        {/* Step panel */}
        <Panel>
          <PanelHeader
            title={current.label}
            subtitle={current.desc}
            right={<span className="text-sm text-muted-foreground">Step {step + 1} of {STEPS.length}</span>}
          />
          <div className="px-5 pb-6 sm:px-6">
          {step === 0 && (
            <MigrationClientImport
              onComplete={(clients) => { setImportedClients(clients); markDone('clients'); setStep(1); }}
              onSkip={() => { markDone('clients'); setStep(1); }}
            />
          )}
          {step === 1 && (
            <MigrationWorkouts
              onComplete={() => { markDone('workouts'); setStep(2); }}
              onSkip={() => { markDone('workouts'); setStep(2); }}
            />
          )}
          {step === 2 && (
            <MigrationNutrition
              onComplete={() => { markDone('nutrition'); setStep(3); }}
              onSkip={() => { markDone('nutrition'); setStep(3); }}
            />
          )}
          {step === 3 && (
            <MigrationInvites
              importedClients={importedClients}
              onComplete={() => markDone('invites')}
              onSkip={() => markDone('invites')}
            />
          )}
          </div>
        </Panel>
      </div>
    </Page>
  );
}