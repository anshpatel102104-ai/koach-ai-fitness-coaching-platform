import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { differenceInDays, parseISO, format } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import {
  MessageSquare, Dumbbell, ClipboardList, TrendingUp, ChevronDown,
  Send, UserCheck, Eye, ArrowUpRight,
} from 'lucide-react';
import { compositeAdherenceScore } from '@/lib/adherence';
import { Initials, EmptyState } from '@/components/kit';
import { cn } from '@/lib/utils';

// ── Priority groups ─────────────────────────────────────────────────────────
const GROUP_CONFIG = {
  critical:      { label: 'Urgent',          tone: 'text-destructive', defaultOpen: true },
  high:          { label: 'This week',       tone: 'text-warning',     defaultOpen: true },
  informational: { label: 'When you can',    tone: 'text-muted-foreground', defaultOpen: false },
};

// ── Row actions: first is ink, the rest outline ─────────────────────────────
function Pill({ icon: Icon, label, onClick, variant = 'ghost' }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick(); }}
      className={cn(
        'touch-compact inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-3 text-[13px] font-semibold transition-colors',
        variant === 'primary'
          ? 'bg-primary text-primary-foreground hover:bg-primary/85'
          : 'border border-input bg-card text-foreground hover:bg-accent'
      )}
    >
      {variant === 'primary' && Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
      <span>{label}</span>
    </button>
  );
}

// ── One open item ───────────────────────────────────────────────────────────
function ActionCard({ id, name, subtitle, flaggedDaysAgo, badge, priority, actions, onResolve }) {
  return (
    <motion.div
      layout
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="flex items-start gap-3 border-t border-border px-5 py-3.5 first:border-t-0 sm:px-6"
    >
      <Initials name={name || '?'} size={36} tone={priority === 'critical' ? 'alert' : 'default'} className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="truncate text-[15px] font-semibold text-foreground">{name}</span>
          {badge && <span className={cn('text-[13px] font-semibold', GROUP_CONFIG[priority]?.tone)}>{badge}</span>}
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {subtitle}
          {flaggedDaysAgo != null && flaggedDaysAgo > 0 && <span> · flagged {flaggedDaysAgo}d ago</span>}
        </p>
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {actions}
          <button
            onClick={e => { e.stopPropagation(); onResolve(id); }}
            className="touch-compact ml-1 text-[13px] font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Mark done
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Collapsible priority group ──────────────────────────────────────────────
function PriorityGroup({ priority, items, onResolve }) {
  const cfg = GROUP_CONFIG[priority];
  const [open, setOpen] = useState(cfg.defaultOpen);
  if (!items.length) return null;

  return (
    <div className="border-t border-border">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center gap-2 px-5 py-3 text-left transition-colors hover:bg-accent/50 sm:px-6"
        aria-expanded={open}
      >
        <span className={cn('text-sm font-semibold', cfg.tone === 'text-muted-foreground' ? 'text-foreground' : cfg.tone)}>{cfg.label}</span>
        <span className="text-sm tabular-nums text-muted-foreground">{items.length}</span>
        <ChevronDown className={cn('ml-auto h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="border-t border-border">
          <AnimatePresence initial={false}>
            {items.map(item => (
              <ActionCard key={item.id} {...item} priority={priority} onResolve={onResolve} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export default function RunMyDayCenter({ clients, checkIns, messages, payments = [], refreshKey: externalRefreshKey = 0, onCountChange }) {
  const navigate = useNavigate();
  const [resolvedIds, setResolvedIds] = useState(new Set());
  const [resolvedToday, setResolvedToday] = useState(0);
  const [refreshKey] = useState(0);

  const go = (path) => navigate(path);
  const msgClient = (id, msg) =>
    navigate(`/messages?clientId=${id}${msg ? `&message=${encodeURIComponent(msg)}` : ''}`);

  const handleResolve = useCallback((id) => {
    setResolvedIds(prev => { const next = new Set(prev); next.add(id); return next; });
    setResolvedToday(n => n + 1);
  }, []);

  // ── Build action items ──────────────────────────────────────────────────
  const items = useMemo(() => {
    const result = [];

    // Missed check-ins
    const active = clients.filter(c => c.status === 'active' || c.lifecycle_status === 'active');
    active.forEach(client => {
      const cis = checkIns.filter(ci => ci.client_id === client.id).sort((a, b) => new Date(b.date) - new Date(a.date));
      const latest = cis[0];
      const daysAgo = latest ? differenceInDays(new Date(), parseISO(latest.date)) : 999;
      if (daysAgo < 10) return;
      const priority = daysAgo >= 21 ? 'critical' : 'high';
      result.push({
        id: `checkin-${client.id}`,
        name: client.name,
        subtitle: daysAgo === 999 ? 'No check-in on record' : `No check-in in ${daysAgo} days`,
        badge: daysAgo === 999 ? 'Never' : `${daysAgo}d`,
        flaggedDaysAgo: daysAgo === 999 ? null : Math.max(0, daysAgo - 10),
        priority,
        actions: (
          <>
            <Pill icon={Send} label="Send a nudge" variant="primary"
              onClick={() => msgClient(client.id, "Hey, haven't heard from you in a bit. How's the week going?")} />
            <Pill icon={ClipboardList} label="Log check-in" onClick={() => go(`/checkin-detail?clientId=${client.id}`)} />
            <Pill icon={Eye} label="Profile" onClick={() => go(`/client-profile?id=${client.id}`)} />
          </>
        ),
      });
    });

    // No program assigned
    clients.forEach(client => {
      if (client.assigned_program_id) return;
      if ((client.lifecycle_status || client.status) === 'lead') return;
      result.push({
        id: `noprog-${client.id}`,
        name: client.name,
        subtitle: 'No program assigned yet',
        badge: 'No program',
        flaggedDaysAgo: differenceInDays(new Date(), parseISO(client.created_date || new Date().toISOString())),
        priority: 'critical',
        actions: (
          <>
            <Pill icon={Dumbbell} label="Assign a program" variant="primary"
              onClick={() => go(`/client-profile?id=${client.id}&tab=programs`)} />
            <Pill icon={Eye} label="Profile" onClick={() => go(`/client-profile?id=${client.id}`)} />
          </>
        ),
      });
    });

    // Payment overdue
    payments.filter(p => p.status === 'failed' || p.status === 'pending').forEach(p => {
      const client = clients.find(c => c.id === p.client_id);
      if (!client) return;
      result.push({
        id: `pay-${p.id}`,
        name: client.name,
        subtitle: `$${p.amount} · ${p.status === 'failed' ? 'Payment failed' : 'Payment overdue'}${p.due_date ? ` · Due ${format(parseISO(p.due_date), 'MMM d')}` : ''}`,
        badge: p.status === 'failed' ? 'Failed' : 'Overdue',
        flaggedDaysAgo: p.due_date ? Math.max(0, differenceInDays(new Date(), parseISO(p.due_date))) : 0,
        priority: 'critical',
        actions: (
          <>
            <Pill icon={MessageSquare} label="Send a reminder" variant="primary"
              onClick={() => msgClient(client.id, "Hi, a quick note about your payment. Let me know if you have any questions.")} />
            <Pill icon={Eye} label="Billing" onClick={() => go('/revenue')} />
          </>
        ),
      });
    });

    // Inactive 7+ days (high)
    active.forEach(client => {
      const alreadyFlagged = result.some(r => r.id === `checkin-${client.id}`);
      if (alreadyFlagged) return;
      const cis = checkIns.filter(ci => ci.client_id === client.id).sort((a, b) => new Date(b.date) - new Date(a.date));
      const latest = cis[0];
      if (!latest) return;
      const daysAgo = differenceInDays(new Date(), parseISO(latest.date));
      if (daysAgo < 7 || daysAgo >= 10) return;
      result.push({
        id: `inactive-${client.id}`,
        name: client.name,
        subtitle: `No activity in ${daysAgo} days`,
        badge: `${daysAgo}d`,
        flaggedDaysAgo: 0,
        priority: 'high',
        actions: (
          <>
            <Pill icon={MessageSquare} label="Message" variant="primary" onClick={() => msgClient(client.id)} />
            <Pill icon={Eye} label="Profile" onClick={() => go(`/client-profile?id=${client.id}`)} />
          </>
        ),
      });
    });

    // Low adherence (high)
    clients.forEach(client => {
      const alreadyFlagged = result.some(r => r.id.startsWith(`checkin-${client.id}`) || r.id.startsWith(`inactive-${client.id}`));
      if (alreadyFlagged) return;
      const cis = checkIns.filter(ci => ci.client_id === client.id).sort((a, b) => new Date(b.date) - new Date(a.date));
      if (cis.length < 2) return;
      const score = compositeAdherenceScore(cis);
      if (score === null || score >= 65) return;
      result.push({
        id: `adh-${client.id}`,
        name: client.name,
        subtitle: `Adherence at ${score}%, below the 65% line`,
        badge: `${score}%`,
        flaggedDaysAgo: 0,
        priority: score < 40 ? 'critical' : 'high',
        actions: (
          <>
            <Pill icon={MessageSquare} label="Message" variant="primary"
              onClick={() => msgClient(client.id, "Hey, I want to make sure the plan is working for you. Can we talk about a few adjustments?")} />
            <Pill icon={TrendingUp} label="Progress" onClick={() => go(`/client-profile?id=${client.id}&tab=progress`)} />
            <Pill icon={Eye} label="Profile" onClick={() => go(`/client-profile?id=${client.id}`)} />
          </>
        ),
      });
    });

    // Unread messages 3+ days (high)
    if (messages) {
      const unreadByClient = {};
      messages.filter(m => m.sender === 'client' && !m.is_read).forEach(m => {
        if (!unreadByClient[m.client_id]) unreadByClient[m.client_id] = [];
        unreadByClient[m.client_id].push(m);
      });
      Object.entries(unreadByClient).forEach(([clientId, msgs]) => {
        const oldest = msgs.sort((a, b) => new Date(a.created_date) - new Date(b.created_date))[0];
        const daysOld = differenceInDays(new Date(), parseISO(oldest.created_date));
        if (daysOld < 3) return;
        const client = clients.find(c => c.id === clientId);
        if (!client) return;
        result.push({
          id: `msg-${clientId}`,
          name: client.name,
          subtitle: `${msgs.length} unread message${msgs.length > 1 ? 's' : ''} · oldest ${daysOld}d ago`,
          badge: `${msgs.length} unread`,
          flaggedDaysAgo: daysOld - 3,
          priority: 'high',
          actions: (
            <>
              <Pill icon={MessageSquare} label="Reply" variant="primary" onClick={() => go(`/messages?clientId=${clientId}`)} />
              <Pill icon={Eye} label="Profile" onClick={() => go(`/client-profile?id=${clientId}`)} />
            </>
          ),
        });
      });
    }

    // Pending check-in reviews (informational)
    checkIns
      .filter(ci => !ci.coach_responded && !ci.coach_notes)
      .filter(ci => differenceInDays(new Date(), parseISO(ci.date)) <= 14)
      .slice(0, 8)
      .forEach(ci => {
        const daysAgo = differenceInDays(new Date(), parseISO(ci.date));
        result.push({
          id: `review-${ci.id}`,
          name: ci.client_name,
          subtitle: `Check-in submitted ${format(parseISO(ci.date), 'MMM d')} · ${daysAgo}d ago`,
          badge: daysAgo > 5 ? 'Overdue' : 'New',
          flaggedDaysAgo: daysAgo,
          priority: 'informational',
          actions: (
            <>
              <Pill icon={ClipboardList} label="Review with AI" variant="primary"
                onClick={() => go(`/checkin-detail?id=${ci.id}&clientId=${ci.client_id}`)} />
              <Pill icon={ArrowUpRight} label="Fast review" onClick={() => go('/fast-review')} />
            </>
          ),
        });
      });

    // Ready for progression (informational)
    clients.forEach(client => {
      const cis = checkIns.filter(ci => ci.client_id === client.id).sort((a, b) => new Date(b.date) - new Date(a.date));
      if (cis.length < 3) return;
      const score = compositeAdherenceScore(cis);
      if (score === null || score < 80) return;
      result.push({
        id: `prog-${client.id}`,
        name: client.name,
        subtitle: `${score}% adherence for 3+ check-ins. Ready to progress`,
        badge: `${score}%`,
        flaggedDaysAgo: null,
        priority: 'informational',
        actions: (
          <>
            <Pill icon={Dumbbell} label="Progress program" variant="primary"
              onClick={() => go(`/client-profile?id=${client.id}&tab=programs`)} />
            <Pill icon={UserCheck} label="Profile" onClick={() => go(`/client-profile?id=${client.id}`)} />
            <Pill icon={MessageSquare} label="Say well done"
              onClick={() => msgClient(client.id, "Really strong few weeks. I'm moving your program up a step.")} />
          </>
        ),
      });
    });

    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients, checkIns, messages, payments, refreshKey, externalRefreshKey]);

  const visibleItems = useMemo(() => items.filter(i => !resolvedIds.has(i.id)), [items, resolvedIds]);

  const byPriority = useMemo(() => ({
    critical: visibleItems.filter(i => i.priority === 'critical'),
    high: visibleItems.filter(i => i.priority === 'high'),
    informational: visibleItems.filter(i => i.priority === 'informational'),
  }), [visibleItems]);

  const totalUnresolved = visibleItems.length;
  useEffect(() => { onCountChange?.(totalUnresolved); }, [totalUnresolved, onCountChange]);

  if (totalUnresolved === 0) {
    return (
      <EmptyState
        className="border-t border-border"
        title="Nothing open. Every client is on track."
        body={resolvedToday > 0 ? `You cleared ${resolvedToday} item${resolvedToday === 1 ? '' : 's'} today.` : 'New items show up here as check-ins, messages and payments come in.'}
      />
    );
  }

  return (
    <div>
      {resolvedToday > 0 && (
        <p className="px-5 pb-3 text-sm text-success sm:px-6">{resolvedToday} cleared today</p>
      )}
      <PriorityGroup priority="critical" items={byPriority.critical} onResolve={handleResolve} />
      <PriorityGroup priority="high" items={byPriority.high} onResolve={handleResolve} />
      <PriorityGroup priority="informational" items={byPriority.informational} onResolve={handleResolve} />
    </div>
  );
}
