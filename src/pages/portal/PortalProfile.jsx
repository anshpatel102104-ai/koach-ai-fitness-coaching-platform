import React, { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabasePortal as base44 } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Camera, User, Target, Bell,
  CreditCard, Lock, Smartphone, Star, HelpCircle, MessageSquare, LogOut
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { SignedImg } from '@/components/shared/SignedImage';

/* ── Sign Out Confirmation Modal ── */
function SignOutModal({ onCancel }) {
  const { logout } = useAuth();
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={onCancel}>
      <motion.div initial={{ y: 200 }} animate={{ y: 0 }} exit={{ y: 200 }}
        className="w-full max-w-md bg-card rounded-t-3xl p-6 pb-10"
        onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 rounded-full bg-border mx-auto mb-5" />
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-3">
            <LogOut className="w-7 h-7 text-destructive" />
          </div>
          <h3 className="text-foreground font-black text-lg">Sign Out?</h3>
          <p className="text-muted-foreground text-sm mt-1">You'll need to sign in again to access your account.</p>
        </div>
        <button
          onClick={() => logout('/')}
          className="w-full py-4 rounded-2xl font-black text-white text-base mb-3"
          style={{ background: 'linear-gradient(135deg, rgb(var(--destructive)), rgb(var(--destructive)))' }}>
          Yes, Sign Out
        </button>
        <button onClick={onCancel}
          className="w-full py-4 rounded-2xl font-bold text-muted-foreground text-base bg-muted">
          Cancel
        </button>
      </motion.div>
    </motion.div>
  );
}

/* ── Completion Card ── */
function CompletionCard({ client }) {
  const [dismissed, setDismissed] = useState(false);
  const items = [
    { label: 'Add profile photo', done: !!client?.avatar_url },
    { label: 'Set goal weight', done: !!client?.target_weight },
    { label: 'Connect Apple Health', done: false },
    { label: 'Set notification preferences', done: false },
  ];
  const done = items.filter(i => i.done).length;
  const pct = Math.round((done / items.length) * 100);
  if (pct === 100 || dismissed) return null;

  return (
    <div className="mx-5 mt-4 bg-card rounded-2xl p-4 relative"
      style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.07)', border: '1px solid rgb(var(--muted))' }}>
      <button onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs font-bold">
        ✕
      </button>
      <p className="text-foreground font-black text-sm">Complete your profile</p>
      <p className="text-muted-foreground text-xs mt-0.5 mb-3">Get the most out of KOACH AI</p>
      <div className="h-2 rounded-full bg-muted mb-3">
        <motion.div animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full rounded-full" style={{ background: 'linear-gradient(90deg, rgb(var(--primary)), rgb(var(--ai)))' }} />
      </div>
      <div className="space-y-1.5">
        {items.filter(i => !i.done).map(item => (
          <div key={item.label} className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full border-2 border-border flex-shrink-0" />
            <p className="text-muted-foreground text-xs">{item.label}</p>
          </div>
        ))}
      </div>
      <p className="text-primary text-xs mt-2 font-bold">{pct}% complete</p>
    </div>
  );
}

/* ── Stats Card ── */
function StatCard({ icon: Icon, iconBg, iconColor, value, label, sublabel, onClick }) {
  return (
    <button onClick={onClick}
      className="flex-1 bg-card rounded-2xl p-3 flex flex-col items-center gap-1 min-w-0"
      style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.06)', border: '1px solid rgb(var(--muted))' }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: iconBg }}>
        <Icon className="w-4.5 h-4.5" style={{ color: iconColor }} size={18} />
      </div>
      <p className="text-foreground font-black text-lg leading-none mt-1">{value}</p>
      <p className="text-muted-foreground text-[10px] font-semibold">{sublabel}</p>
    </button>
  );
}

/* ── Settings Row ── */
function SettingsRow({ icon: Icon, iconBg, iconColor, label, subtitle, onClick, badge }) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 bg-card text-left active:bg-muted transition-colors">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: iconBg }}>
        <Icon size={16} style={{ color: iconColor }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-foreground font-semibold text-sm">{label}</p>
        <p className="text-muted-foreground text-xs mt-0.5">{subtitle}</p>
      </div>
      {badge ? (
        <span className="w-5 h-5 rounded-full bg-destructive flex items-center justify-center text-[9px] font-black text-white flex-shrink-0">
          {badge}
        </span>
      ) : (
        <ChevronRight className="w-4 h-4 text-border flex-shrink-0" />
      )}
    </button>
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
    queryFn: () => base44.entities.Client.filter({ email: user.email }, '-created_date', 1),
    enabled: !!user?.email,
  });
  const myClient = clients[0];

  const { data: checkIns = [] } = useQuery({
    queryKey: ['portal-checkins-profile', myClient?.id],
    queryFn: () => base44.entities.CheckIn.filter({ client_id: myClient.id }, '-date', 100),
    enabled: !!myClient?.id,
  });

  const { data: badges = [] } = useQuery({
    queryKey: ['portal-badges-profile', myClient?.id],
    queryFn: () => base44.entities.ClientBadge.filter({ client_id: myClient.id }, '-earned_date', 50),
    enabled: !!myClient?.id,
  });

  const { data: workoutSessions = [] } = useQuery({
    queryKey: ['portal-ws-profile', myClient?.id],
    queryFn: () => base44.entities.WorkoutSession.filter({ client_id: myClient.id }, '-completed_at', 100),
    enabled: !!myClient?.id,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['portal-invoices-profile', myClient?.id],
    queryFn: () => base44.entities.Invoice.filter({ client_id: myClient.id }, '-issue_date', 50),
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
    const { file_url } = await base44.uploadFile({ file });
    await base44.entities.Client.update(myClient.id, { avatar_url: file_url });
    queryClient.invalidateQueries({ queryKey: ['portal-client-profile'] });
  };

  return (
    <div className="pb-32 min-h-screen" style={{ background: 'rgb(var(--muted))' }}>

      {/* ── Top Nav ── */}
      <div className="flex items-center gap-3 px-5 pt-14 pb-4 bg-card" style={{ boxShadow: '0 1px 0 rgb(var(--muted))' }}>
        <button onClick={() => navigate('/portal')}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
          <ChevronLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <h1 className="text-foreground font-black text-lg">Profile & Settings</h1>
      </div>

      {/* ── SECTION 1: Profile Header ── */}
      <div className="bg-card pt-8 pb-6 flex flex-col items-center text-center border-b border-border">
        {/* Avatar */}
        <div className="relative mb-4">
          <div className="w-20 h-20 rounded-full flex items-center justify-center overflow-hidden"
            style={{ background: 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--ai)))' }}>
            {myClient?.avatar_url
              ? <SignedImg src={myClient.avatar_url} alt="avatar" className="w-full h-full object-cover" />
              : <span className="text-white font-black text-2xl">{initials}</span>
            }
          </div>
          <button onClick={() => fileRef.current?.click()}
            className="absolute bottom-0 right-0 w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: 'rgb(var(--primary))', border: '2.5px solid white', boxShadow: '0 2px 8px rgb(var(--primary) / 0.35)' }}>
            <Camera className="w-3.5 h-3.5 text-white" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
        </div>

        {/* Name */}
        <h2 className="text-foreground font-black text-2xl leading-tight">
          {user?.full_name || myClient?.name || 'My Profile'}
        </h2>

        {/* Member since */}
        {memberSince && (
          <p className="text-muted-foreground text-xs mt-1 font-medium">Member since {memberSince}</p>
        )}

        {/* Edit Profile button */}
        <button className="mt-3 px-5 py-2 rounded-xl text-sm font-bold text-primary border-2 border-primary bg-accent">
          Edit Profile
        </button>
      </div>

      {/* ── SECTION 2: Quick Stats ── */}
      <div className="px-5 py-4 bg-card border-b border-border">
        <div className="flex gap-3">
          <StatCard icon={User} iconBg="rgb(var(--accent))" iconColor="rgb(var(--primary))"
            value={workoutSessions.length} sublabel="Workouts"
            onClick={() => navigate('/portal/workouts')} />
          <StatCard icon={Target} iconBg="rgb(var(--success))" iconColor="rgb(var(--success))"
            value={checkIns.length} sublabel="Check-ins"
            onClick={() => navigate('/portal/checkin')} />
          <StatCard icon={Bell} iconBg="rgb(var(--warning))" iconColor="rgb(var(--warning))"
            value={`${streak}d`} sublabel="Streak"
            onClick={() => navigate('/portal/progress')} />
          <StatCard icon={Star} iconBg="#FDF4FF" iconColor="rgb(var(--ai))"
            value={badges.length} sublabel="Awards"
            onClick={() => navigate('/portal/progress')} />
        </div>
      </div>

      {/* ── SECTION 3: Complete Your Profile ── */}
      <CompletionCard client={myClient} />

      {/* ── SECTION 4: Settings List ── */}
      <div className="mx-5 mt-4 bg-card rounded-2xl overflow-hidden"
        style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgb(var(--muted))' }}>
        <SettingsRow icon={User} iconBg="rgb(var(--accent))" iconColor="rgb(var(--primary))"
          label="Personal Information" subtitle="Update your details"
          onClick={() => {}} />
        <div className="mx-4 h-px bg-muted" />
        <SettingsRow icon={Target} iconBg="rgb(var(--success))" iconColor="rgb(var(--success))"
          label="Goals & Fitness" subtitle="Your fitness profile"
          onClick={() => {}} />
        <div className="mx-4 h-px bg-muted" />
        <SettingsRow icon={Bell} iconBg="rgb(var(--warning))" iconColor="rgb(var(--warning))"
          label="Notifications" subtitle="Manage your alerts"
          onClick={() => {}} />
        <div className="mx-4 h-px bg-muted" />
        <SettingsRow icon={CreditCard} iconBg="rgb(var(--accent))" iconColor="rgb(var(--primary))"
          label="Billing & Payments" subtitle="Invoices and payment methods"
          badge={unpaidCount > 0 ? unpaidCount : null}
          onClick={() => navigate('/portal/billing')} />
        <div className="mx-4 h-px bg-muted" />
        <SettingsRow icon={Lock} iconBg="#FFF1F2" iconColor="rgb(var(--destructive))"
          label="Privacy & Security" subtitle="Password and account security"
          onClick={() => {}} />
        <div className="mx-4 h-px bg-muted" />
        <SettingsRow icon={Smartphone} iconBg="rgb(var(--success))" iconColor="rgb(var(--success))"
          label="Connected Apps" subtitle="Sync your devices"
          onClick={() => {}} />
        <div className="mx-4 h-px bg-muted" />
        <SettingsRow icon={Star} iconBg="#FDF4FF" iconColor="rgb(var(--ai))"
          label="Rate KOACH AI" subtitle="Share your feedback"
          onClick={() => {}} />
        <div className="mx-4 h-px bg-muted" />
        <SettingsRow icon={HelpCircle} iconBg="rgb(var(--muted))" iconColor="rgb(var(--muted-foreground))"
          label="Help & Support" subtitle="Get assistance"
          onClick={() => {}} />
      </div>

      {/* ── SECTION 5: Coach Card ── */}
      <div className="mx-5 mt-4 bg-card rounded-2xl p-4"
        style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgb(var(--muted))' }}>
        <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mb-3">Your Coach</p>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center font-black text-base text-white flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--ai)))',
              boxShadow: '0 0 0 3px white, 0 0 0 5px rgb(var(--primary) / 0.2)',
            }}>
            C
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-foreground font-bold text-sm">Your Coach</p>
            <p className="text-muted-foreground text-xs">KOACH AI Platform</p>
          </div>
          <button onClick={() => navigate('/portal/messages')}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--ai)))', boxShadow: '0 2px 10px rgb(var(--primary) / 0.25)' }}>
            <MessageSquare className="w-3.5 h-3.5" />
            Message
          </button>
        </div>
      </div>

      {/* ── SECTION 6: Sign Out ── */}
      <div className="px-5 mt-6 mb-8">
        <button onClick={() => setShowSignOut(true)}
          className="w-full py-4 rounded-2xl font-bold text-destructive text-base border-2 border-destructive bg-card"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          Sign Out
        </button>
      </div>

      <AnimatePresence>
        {showSignOut && <SignOutModal onCancel={() => setShowSignOut(false)} />}
      </AnimatePresence>
    </div>
  );
}