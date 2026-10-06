import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { portalDb } from '@/api/supabaseClient';
import { format, parseISO, differenceInDays, addDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PortalScreen, PortalHeader, Pill } from '@/components/portal/PortalUI';
import CheckInForm from '@/components/portal/checkin/CheckInForm';
import CheckInDetail, { REVIEW_STATUS } from '@/components/portal/checkin/CheckInDetailView';
import CheckInSuccess from '@/components/portal/checkin/CheckInSuccess';

const TODAY = format(new Date(), 'yyyy-MM-dd');

function getDueStatus(lastCheckIn) {
  if (!lastCheckIn) return { status: 'due', daysOverdue: 0 };
  const lastDate = parseISO(lastCheckIn.date);
  const nextDue = addDays(lastDate, 7);
  const diff = differenceInDays(new Date(), nextDue);
  if (diff > 0) return { status: 'overdue', daysOverdue: diff };
  if (diff === 0) return { status: 'due', daysOverdue: 0 };
  return { status: 'upcoming', daysUntil: Math.abs(diff) };
}

function StatusCard({ lastCheckIn, todayCheckIn, onStart }) {
  const { status, daysOverdue, daysUntil } = getDueStatus(lastCheckIn);
  const submittedToday = todayCheckIn && todayCheckIn.date === TODAY;

  if (submittedToday) {
    const reviewed = todayCheckIn.review_status === 'reviewed';
    return (
      <section className="panel relative overflow-hidden py-4 pl-5 pr-4">
        <span className="absolute inset-y-0 left-0 w-1 bg-success" aria-hidden />
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl text-foreground">Sent today</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {todayCheckIn.created_date ? `At ${format(new Date(todayCheckIn.created_date), 'h:mm a')}. ` : ''}
              {reviewed ? 'Your coach has reviewed it.' : 'Your coach will reply in your messages.'}
            </p>
          </div>
          <Pill tone={reviewed ? 'success' : 'warning'}>{reviewed ? 'Reviewed' : 'Waiting'}</Pill>
        </div>
      </section>
    );
  }

  if (status === 'overdue' || status === 'due') {
    const overdue = status === 'overdue';
    return (
      <section className="panel relative overflow-hidden py-5 pl-5 pr-4">
        <span className={cn('absolute inset-y-0 left-0 w-1', overdue ? 'bg-destructive' : 'bg-brand')} aria-hidden />
        <h2 className="text-[26px] text-foreground">
          {overdue ? `${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} late` : 'Due today'}
        </h2>
        <p className="mt-1 text-[15px] text-muted-foreground">
          {overdue ? 'Send it now so your coach can adjust next week.' : 'About two minutes. It saves as you go.'}
        </p>
        <Button variant="brand" size="lg" className="mt-4 h-[52px] w-full text-base font-bold" onClick={onStart}>
          Start check-in
        </Button>
      </section>
    );
  }

  return (
    <section className="panel p-4">
      <h2 className="text-xl text-foreground">Next one in {daysUntil} day{daysUntil !== 1 ? 's' : ''}</h2>
      <p className="mt-0.5 text-sm text-muted-foreground">
        {lastCheckIn ? `Last sent ${format(parseISO(lastCheckIn.date), 'EEEE, MMM d')}.` : 'No check-ins yet.'}
      </p>
      <button type="button" onClick={onStart} className="mt-3 text-sm font-semibold text-foreground underline underline-offset-4">
        Send this week's early
      </button>
    </section>
  );
}

function CheckInHistoryItem({ checkIn, onTap }) {
  const status = REVIEW_STATUS[checkIn.review_status] || REVIEW_STATUS.pending;
  const mood = { great: 'Great', good: 'Good', okay: 'Okay', tired: 'Tired', stressed: 'Stressed' }[checkIn.mood];
  const detail = [
    mood,
    checkIn.energy_level ? `energy ${checkIn.energy_level}/10` : null,
    checkIn.coach_responded || checkIn.coach_notes ? 'coach replied' : null,
  ].filter(Boolean).join(', ');

  return (
    <li>
      <button type="button" onClick={onTap} className="flex w-full items-center gap-3 py-3 text-left">
        <span className="w-11 flex-shrink-0 text-center">
          <span className="block text-[12px] text-muted-foreground">{format(parseISO(checkIn.date), 'MMM')}</span>
          <span className="num block text-[24px] text-foreground">{format(parseISO(checkIn.date), 'd')}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold text-foreground">{checkIn.weight ? `${checkIn.weight} lb` : 'Check-in'}</span>
          {detail && <span className="block truncate text-[13px] text-muted-foreground first-letter:uppercase">{detail}</span>}
        </span>
        <Pill tone={status.tone} className="text-[12px]">{status.tone === 'warning' ? 'Waiting' : status.label}</Pill>
        <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
      </button>
    </li>
  );
}

export default function PortalCheckIn({ user }) {
  const [view, setView] = useState('home'); // home | form | detail | success
  const [selectedCheckIn, setSelectedCheckIn] = useState(null);
  const [submittedCheckIn, setSubmittedCheckIn] = useState(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: clients = [] } = useQuery({
    queryKey: ['portal-client-ci', user?.email],
    queryFn: () => portalDb.entities.Client.filter({ portal_user_id: user.id }, '-created_date', 1),
    enabled: !!user?.email,
  });
  const myClient = clients[0];

  const { data: checkIns = [], refetch } = useQuery({
    queryKey: ['portal-checkins-ci', myClient?.id],
    queryFn: () => portalDb.entities.CheckIn.filter({ client_id: myClient.id }, '-date', 30),
    enabled: !!myClient?.id,
  });

  const sorted = [...checkIns].sort((a, b) => new Date(b.date) - new Date(a.date));
  const lastCheckIn = sorted[0];
  const todayCheckIn = sorted.find(ci => ci.date === TODAY);

  const handleSubmitted = (newCheckIn) => {
    setSubmittedCheckIn(newCheckIn);
    setView('success');
    refetch();
    queryClient.invalidateQueries({ queryKey: ['portal-checkins'] });
  };

  if (view === 'form') {
    return (
      <CheckInForm
        client={myClient}
        lastCheckIn={lastCheckIn}
        totalCheckIns={checkIns.length}
        onSubmitted={handleSubmitted}
        onExit={() => setView('home')}
      />
    );
  }

  if (view === 'detail' && selectedCheckIn) {
    return (
      <CheckInDetail
        checkIn={selectedCheckIn}
        client={myClient}
        onBack={() => setView('home')}
        onMessage={() => navigate('/portal/messages')}
      />
    );
  }

  if (view === 'success') {
    return (
      <CheckInSuccess
        checkIn={submittedCheckIn}
        totalCheckIns={checkIns.length + 1}
        streak={sorted.length + 1}
        onDashboard={() => navigate('/portal')}
        onMessage={() => navigate('/portal/messages')}
      />
    );
  }

  return (
    <PortalScreen>
      <PortalHeader
        title="Check-ins"
        subtitle="One a week. Your coach uses it to adjust your plan."
        onBack={() => navigate('/portal')}
        backLabel="Back to today"
      />

      <div className="space-y-3">
        {/* Status card */}
        <StatusCard
          lastCheckIn={lastCheckIn}
          todayCheckIn={todayCheckIn}
          onStart={() => setView('form')}
        />

        {/* History */}
        {sorted.length > 0 && (
          <section className="panel px-4 pt-4 pb-1">
            <h2 className="text-xl text-foreground">Past check-ins</h2>
            <ul className="mt-1 divide-y divide-border">
              {sorted.map(ci => (
                <CheckInHistoryItem key={ci.id} checkIn={ci} onTap={() => { setSelectedCheckIn(ci); setView('detail'); }} />
              ))}
            </ul>
          </section>
        )}

        {sorted.length === 0 && !myClient && (
          <section className="panel px-4 py-6">
            <p className="text-[15px] font-semibold text-foreground">No check-ins yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Your coach will set up your check-in schedule.</p>
          </section>
        )}
      </div>
    </PortalScreen>
  );
}
