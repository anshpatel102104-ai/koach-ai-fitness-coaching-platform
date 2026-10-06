import React, { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { portalDb } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight, Camera, User, Target, Bell, Check, X,
  CreditCard, Lock, Smartphone, Star, HelpCircle, LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Initials, Stat, CountBadge } from '@/components/kit';
import { cn } from '@/lib/utils';
import { PortalScreen, PortalHeader, Sheet, Bar } from '@/components/portal/PortalUI';
import { format, parseISO } from 'date-fns';
import { SignedImg } from '@/components/shared/SignedImage';

/* ── Sign out confirmation ── */
function SignOutModal({ onCancel }) {
  const { logout } = useAuth();
  return (
    <Sheet open onClose={onCancel} title="Sign out?"
      footer={(
        <div className="flex gap-2">
          <Button variant="outline" size="lg" className="flex-1" onClick={onCancel}>Cancel</Button>
          <Button variant="destructive" size="lg" className="flex-1" onClick={() => logout('/')}>Sign out</Button>
        </div>
      )}>
      <p className="text-[15px] text-muted-foreground">You'll need to sign in again to see your plan and messages.</p>
    </Sheet>
  );
}

/* ── Completion card ── */
function CompletionCard({ client }) {
  const [dismissed, setDismissed] = useState(false);
  const items = [
    { label: 'Add a profile photo', done: !!client?.avatar_url },
    { label: 'Set a goal weight', done: !!client?.target_weight },
    { label: 'Connect Apple Health', done: false },
    { label: 'Choose your notifications', done: false },
  ];
  const done = items.filter(i => i.done).length;
  const pct = Math.round((done / items.length) * 100);
  if (pct === 100 || dismissed) return null;

  return (
    <section className="panel p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg text-foreground">Finish your profile</h2>
          <p className="text-[13px] text-muted-foreground">{done} of {items.length} done. It helps your coach plan around you.</p>
        </div>
        <button type="button" onClick={() => setDismissed(true)} aria-label="Dismiss" className="touch-compact text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
      <Bar pct={pct} className="mt-3" />
      <ul className="mt-3 space-y-2">
        {items.map(item => (
          <li key={item.label} className="flex items-center gap-2.5 text-sm">
            <span className={cn('flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full', item.done ? 'bg-success text-white' : 'border-[1.5px] border-input')}>
              {item.done && <Check className="h-3 w-3" strokeWidth={3} />}
            </span>
            <span className={item.done ? 'text-muted-foreground line-through' : 'text-foreground'}>{item.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ── Settings row ── */
function SettingsRow({ icon: Icon, label, subtitle, onClick, badge }) {
  return (
    <li>
      <button type="button" onClick={onClick}
        className="flex w-full items-center gap-3 py-3 text-left">
        <Icon className="h-[18px] w-[18px] flex-shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold text-foreground">{label}</span>
          <span className="block text-[13px] text-muted-foreground">{subtitle}</span>
        </span>
        {badge ? <CountBadge count={badge} tone="danger" /> : null}
        <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
      </button>
    </li>
  );
}

/* ── MAIN PAGE ── */
export default function PortalProfile({ user }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileRef = useRef();
  const [showSignOut, setShowSignOut] = useState(false);

  const { data: clients = [] } = useQuery({
    queryKey: ['portal-client-profile', user?.email],
    queryFn: () => portalDb.entities.Client.filter({ portal_user_id: user.id }, '-created_date', 1),
    enabled: !!user?.email,
  });
  const myClient = clients[0];

  const { data: checkIns = [] } = useQuery({
    queryKey: ['portal-checkins-profile', myClient?.id],
    queryFn: () => portalDb.entities.CheckIn.filter({ client_id: myClient.id }, '-date', 100),
    enabled: !!myClient?.id,
  });

  const { data: badges = [] } = useQuery({
    queryKey: ['portal-badges-profile', myClient?.id],
    queryFn: () => portalDb.entities.ClientBadge.filter({ client_id: myClient.id }, '-earned_date', 50),
    enabled: !!myClient?.id,
  });

  const { data: workoutSessions = [] } = useQuery({
    queryKey: ['portal-ws-profile', myClient?.id],
    queryFn: () => portalDb.entities.WorkoutSession.filter({ client_id: myClient.id }, '-completed_at', 100),
    enabled: !!myClient?.id,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['portal-invoices-profile', myClient?.id],
    queryFn: () => portalDb.entities.Invoice.filter({ client_id: myClient.id }, '-issue_date', 50),
    enabled: !!myClient?.id,
  });
  const unpaidCount = invoices.filter(i => ['sent', 'viewed', 'overdue', 'draft'].includes(i.status)).length;

  const streak = (() => {
    let count = 0;
    const sorted = [...checkIns].sort((a, b) => new Date(b.date) - new Date(a.date));
    for (const ci of sorted) {
      if (ci.weight || ci.mood) count++;
      else break;
    }
    return count;
  })();

  const initials = (user?.full_name || myClient?.name || 'U')
    .split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const memberSince = myClient?.start_date
    ? format(parseISO(myClient.start_date), 'MMMM yyyy')
    : user?.created_date
    ? format(new Date(user.created_date), 'MMMM yyyy')
    : null;

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !myClient?.id) return;
    const { file_url } = await portalDb.uploadFile({ file });
    await portalDb.entities.Client.update(myClient.id, { avatar_url: file_url });
    queryClient.invalidateQueries({ queryKey: ['portal-client-profile'] });
  };

  const name = user?.full_name || myClient?.name || 'Your profile';

  return (
    <PortalScreen>
      <PortalHeader title="Profile" onBack={() => navigate('/portal')} backLabel="Back to today" />

      <div className="space-y-3">
        {/* Identity */}
        <section className="panel p-5">
          <div className="flex items-center gap-4">
            <div className="relative">
              {myClient?.avatar_url ? (
                <span className="block h-[72px] w-[72px] overflow-hidden rounded-full bg-secondary">
                  <SignedImg src={myClient.avatar_url} alt="" className="h-full w-full object-cover" />
                </span>
              ) : (
                <Initials name={name} size={72} tone="ink" />
              )}
              <button type="button" onClick={() => fileRef.current?.click()} aria-label="Change photo"
                className="touch-compact absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-secondary text-foreground">
                <Camera className="h-3.5 w-3.5" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-[26px] text-foreground">{name}</h2>
              {memberSince && <p className="text-[13px] text-muted-foreground">Coached since {memberSince}</p>}
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="outline" className="flex-1">Edit profile</Button>
            <Button className="flex-1" onClick={() => navigate('/portal/messages')}>Message coach</Button>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2 border-t border-border pt-4">
            {[
              { label: 'Workouts', value: workoutSessions.length, path: '/portal/workouts' },
              { label: 'Check-ins', value: checkIns.length, path: '/portal/checkin' },
              { label: 'Streak', value: `${streak}`, unit: 'wk', path: '/portal/progress' },
              { label: 'Awards', value: badges.length, path: '/portal/progress' },
            ].map(st => (
              <button key={st.label} type="button" onClick={() => navigate(st.path)} className="touch-compact text-left !p-0">
                <Stat size="sm" label={st.label} value={st.value} unit={st.unit} />
              </button>
            ))}
          </div>
        </section>

        <CompletionCard client={myClient} />

        {/* Settings */}
        <section className="panel px-4 py-1">
          <ul className="divide-y divide-border">
            <SettingsRow icon={User} label="Personal details" subtitle="Name, email, phone" onClick={() => {}} />
            <SettingsRow icon={Target} label="Goals and fitness" subtitle="Goal weight, experience, injuries" onClick={() => {}} />
            <SettingsRow icon={Bell} label="Notifications" subtitle="What we remind you about" onClick={() => navigate('/portal/notifications')} />
            <SettingsRow icon={CreditCard} label="Billing and payments" subtitle="Plan, invoices, cards"
              badge={unpaidCount > 0 ? unpaidCount : null}
              onClick={() => navigate('/portal/billing')} />
            <SettingsRow icon={Lock} label="Privacy and security" subtitle="Password and sign-in" onClick={() => {}} />
            <SettingsRow icon={Smartphone} label="Connected apps" subtitle="Apple Health, wearables" onClick={() => {}} />
            <SettingsRow icon={Star} label="Rate KOACH" subtitle="Tell us what to fix" onClick={() => {}} />
            <SettingsRow icon={HelpCircle} label="Help and support" subtitle="Questions about the app" onClick={() => {}} />
          </ul>
        </section>

        <Button variant="outline" size="lg" className="w-full text-destructive hover:text-destructive" onClick={() => setShowSignOut(true)}>
          <LogOut /> Sign out
        </Button>
      </div>

      {showSignOut && <SignOutModal onCancel={() => setShowSignOut(false)} />}
    </PortalScreen>
  );
}
