import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { portalDb } from '@/api/supabaseClient';
import { motion } from 'framer-motion';
import { format, parseISO, differenceInDays, addDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, CheckCircle2, AlertCircle, Clock, ChevronRight, MessageSquare } from 'lucide-react';
import CheckInForm from '@/components/portal/checkin/CheckInForm';
import CheckInDetail from '@/components/portal/checkin/CheckInDetailView';
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
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="mx-5 p-5 rounded-[20px] bg-card"
        style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgb(var(--muted))' }}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 bg-success/10">
            <CheckCircle2 className="w-6 h-6 text-success" />
          </div>
          <div className="flex-1">
            <p className="text-success font-bold text-sm">Check-in Submitted ✓</p>
            <p className="text-muted-foreground text-xs mt-0.5">
              {todayCheckIn.created_date ? format(new Date(todayCheckIn.created_date), 'h:mm a') : 'Today'}
            </p>
          </div>
          <span className="text-xs px-3 py-1.5 rounded-xl font-semibold"
            style={{ background: todayCheckIn.review_status === 'reviewed' ? 'rgb(var(--success))' : 'rgb(var(--warning))', color: todayCheckIn.review_status === 'reviewed' ? 'rgb(var(--success))' : 'rgb(var(--warning))' }}>
            {todayCheckIn.review_status === 'reviewed' ? 'Reviewed ✓' : 'Awaiting Review'}
          </span>
        </div>
      </motion.div>
    );
  }

  if (status === 'overdue') {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="mx-5 p-5 rounded-[20px] bg-card"
        style={{ boxShadow: '0 2px 12px rgb(var(--destructive) / 0.15)', border: '1px solid rgb(var(--destructive))' }}>
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 bg-destructive/10">
            <AlertCircle className="w-6 h-6 text-destructive" />
          </div>
          <div className="flex-1">
            <p className="text-destructive font-bold text-base">Check-in Overdue ⚠️</p>
            <p className="text-destructive text-xs mt-0.5">{daysOverdue} day{daysOverdue !== 1 ? 's' : ''} late — your coach is waiting</p>
          </div>
        </div>
        <button onClick={onStart}
          className="w-full mt-4 py-3 rounded-xl font-bold text-sm text-white"
          style={{ background: 'linear-gradient(135deg, rgb(var(--destructive)), rgb(var(--destructive)))' }}>
          Submit Now →
        </button>
      </motion.div>
    );
  }

  if (status === 'due') {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
        className="mx-5 p-5 rounded-[20px] relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, rgb(var(--primary)) 0%, rgb(var(--ai)) 100%)', boxShadow: '0 6px 28px rgb(var(--primary) / 0.3)' }}>
        {/* Pulsing glow */}
        <motion.div animate={{ opacity: [0.2, 0.4, 0.2] }} transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 rounded-[20px]"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.25) 0%, transparent 70%)' }} />
        <div className="relative" style={{ background: 'rgba(0,0,0,0.1)', padding: 20, borderRadius: 16 }}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-card animate-pulse" />
            <p className="text-white/70 text-[10px] font-bold uppercase tracking-wider">Due Today</p>
          </div>
          <h2 className="text-white text-2xl font-black">Check-in Due Today! 📋</h2>
          <p className="text-white/60 text-xs mt-1">Takes just 2 minutes</p>
          <button onClick={onStart}
            className="w-full mt-4 py-3.5 rounded-xl font-bold text-base text-white flex items-center justify-center gap-2"
            style={{ background: 'rgba(255,255,255,0.95)', color: 'rgb(var(--primary))', boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}>
            Start Check-in →
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="mx-5 p-5 rounded-[20px] bg-card"
      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgb(var(--muted))' }}>
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 bg-muted">
          <Clock className="w-6 h-6 text-muted-foreground" />
        </div>
        <div>
          <p className="text-foreground font-bold text-sm">Next Check-in in {daysUntil} day{daysUntil !== 1 ? 's' : ''}</p>
          <p className="text-muted-foreground text-xs mt-0.5">
            {lastCheckIn ? `Last: ${format(parseISO(lastCheckIn.date), 'MMM d')}` : 'No check-ins yet'}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function CheckInHistoryItem({ checkIn, onTap }) {
  const statusColor = checkIn.review_status === 'reviewed'
    ? { bg: 'rgb(var(--success) / 0.12)', text: 'rgb(var(--success))', label: '✓ Reviewed' }
    : checkIn.review_status === 'flagged'
    ? { bg: 'rgb(var(--destructive) / 0.12)', text: 'rgb(var(--destructive))', label: '⚑ Flagged' }
    : { bg: 'rgb(var(--warning) / 0.1)', text: '#FBB724', label: 'Pending' };

  const moodEmoji = { great: '😄', good: '🙂', okay: '😐', tired: '😕', stressed: '😫' }[checkIn.mood] || '—';

  return (
    <motion.button onClick={onTap} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className="w-full p-4 rounded-2xl text-left flex items-center gap-4 bg-card"
      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.05)', border: '1px solid rgb(var(--muted))' }}
      whileTap={{ scale: 0.98 }}>
      {/* Date block */}
      <div className="w-12 text-center flex-shrink-0">
        <p className="text-muted-foreground text-[9px] uppercase font-bold">{format(parseISO(checkIn.date), 'MMM')}</p>
        <p className="text-foreground font-bold text-xl leading-none">{format(parseISO(checkIn.date), 'd')}</p>
      </div>
      {/* Stats */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-base">{moodEmoji}</span>
          {checkIn.weight && <span className="text-foreground text-sm font-semibold">{checkIn.weight} lbs</span>}
          {checkIn.energy_level && <span className="text-muted-foreground text-xs">⚡{checkIn.energy_level}/10</span>}
        </div>
        {checkIn.coach_responded && (
          <div className="flex items-center gap-1 mt-1">
            <MessageSquare className="w-3 h-3 text-primary" />
            <span className="text-primary text-[10px] font-semibold">Coach responded</span>
          </div>
        )}
      </div>
      {/* Status + chevron */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-[10px] font-bold px-2 py-1 rounded-lg"
          style={{ background: statusColor.bg, color: statusColor.text }}>
          {statusColor.label}
        </span>
        <ChevronRight className="w-4 h-4 text-border" />
      </div>
    </motion.button>
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
    queryFn: () => portalDb.entities.Client.filter({ email: user.email }, '-created_date', 1),
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
    <div className="pb-28 space-y-5" style={{ background: 'rgb(var(--card))' }}>
      {/* Header */}
      <div className="bg-card px-5 flex items-center justify-between"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 14px)', paddingBottom: 14, boxShadow: '0 1px 0 rgb(var(--muted))' }}>
        <h1 className="text-foreground font-black text-[28px] leading-tight">Check-ins</h1>
      </div>

      {/* Status card */}
      <StatusCard
        lastCheckIn={lastCheckIn}
        todayCheckIn={todayCheckIn}
        onStart={() => setView('form')}
      />

      {/* History */}
      {sorted.length > 0 && (
        <div className="px-5 space-y-3">
          <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">History</p>
          {sorted.map(ci => (
            <CheckInHistoryItem key={ci.id} checkIn={ci} onTap={() => { setSelectedCheckIn(ci); setView('detail'); }} />
          ))}
        </div>
      )}

      {sorted.length === 0 && !myClient && (
        <div className="px-5">
          <div className="p-8 rounded-2xl text-center bg-card" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <ClipboardList className="w-10 h-10 text-border mx-auto mb-3" />
            <p className="text-muted-foreground text-sm font-semibold">No check-ins yet</p>
            <p className="text-muted-foreground text-xs mt-1">Your coach will set up your check-in schedule</p>
          </div>
        </div>
      )}
    </div>
  );
}