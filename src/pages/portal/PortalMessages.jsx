import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { portalDb } from '@/api/supabaseClient';
import { format, isToday, isYesterday } from 'date-fns';
import {
  Send, ChevronLeft, Mic, Image as ImageIcon, Camera,
  Paperclip, BarChart2, ClipboardList, Plus, Play
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Initials, CountBadge } from '@/components/kit';
import { cn } from '@/lib/utils';
import { PortalScreen, PortalHeader, IconButton, Sheet } from '@/components/portal/PortalUI';

/* ── helpers ── */
function groupByDate(messages) {
  const groups = [];
  let lastDate = null;
  for (const m of messages) {
    const d = m.created_date ? format(new Date(m.created_date), 'yyyy-MM-dd') : null;
    if (d !== lastDate) {
      const date = m.created_date ? new Date(m.created_date) : new Date();
      const label = isToday(date) ? 'Today' : isYesterday(date) ? 'Yesterday' : format(date, 'MMMM d');
      groups.push({ type: 'separator', label });
      lastDate = d;
    }
    groups.push({ type: 'message', data: m });
  }
  return groups;
}

const QUICK_REPLIES = [
  'Thanks, coach', 'Got it, will work on that', 'On it',
  'Can we chat?', 'I have a question', 'Just finished my workout'
];

const SUGGESTED_OPENERS = [
  'Hi coach, I just got started',
  'I have a question about my program',
  'When should I expect my program?'
];

/* ── Message bubble: ink for you, white for your coach ── */
function MessageBubble({ msg, coachInitial }) {
  const isClient = msg.sender === 'client';
  const time = msg.created_date ? format(new Date(msg.created_date), 'h:mm a') : '';

  // System message detection
  const isSystem = msg.is_broadcast;

  return (
    <div className={cn('flex gap-2', isClient ? 'justify-end' : 'justify-start')}>
      {!isClient && <Initials name={coachInitial} tone="ink" size={30} className="mt-auto" />}
      <div className="max-w-[78%]">
        <div className={cn(
          'rounded-xl px-3.5 py-2.5',
          isClient ? 'rounded-br-sm bg-primary text-primary-foreground'
            : isSystem ? 'rounded-bl-sm bg-ai text-ai-foreground'
              : 'rounded-bl-sm bg-card text-foreground shadow-[0_0_0_1px_rgb(var(--border))]',
        )}>
          {isSystem && <p className="mb-1 text-[13px] font-semibold opacity-70">Announcement</p>}
          {msg.media_type === 'voice' && msg.media_url ? (
            <div className="flex items-center gap-3">
              <span className={cn('flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full', isClient ? 'bg-white/20' : 'bg-secondary')}>
                <Play className="h-3.5 w-3.5" fill="currentColor" />
              </span>
              <span className="text-sm">Voice note</span>
            </div>
          ) : (
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
          )}
        </div>
        <p className={cn('mt-1 text-[12px] text-muted-foreground', isClient ? 'text-right' : 'text-left')}>{time}</p>
      </div>
    </div>
  );
}

/* ── Attachment menu ── */
function AttachMenu({ onClose, onAttach }) {
  const options = [
    { icon: Camera, label: 'Camera', action: 'camera' },
    { icon: ImageIcon, label: 'Photo library', action: 'photo' },
    { icon: BarChart2, label: 'Share progress', action: 'progress' },
    { icon: ClipboardList, label: 'Share a check-in', action: 'checkin' },
    { icon: Paperclip, label: 'Attach a file', action: 'file' },
  ];
  return (
    <Sheet open onClose={onClose} title="Attach">
      <ul className="divide-y divide-border">
        {options.map(opt => (
          <li key={opt.action}>
            <button type="button" onClick={() => { onAttach(opt.action); onClose(); }}
              className="flex w-full items-center gap-3 py-3.5 text-left">
              <opt.icon className="h-5 w-5 text-muted-foreground" />
              <span className="text-[15px] font-semibold text-foreground">{opt.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}

/* ── Conversation view ── */
function ConversationView({ myClient, onBack }) {
  const [input, setInput] = useState('');
  const [showAttach, setShowAttach] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  const { data: messages = [], refetch } = useQuery({
    queryKey: ['portal-msgs-conv', myClient?.id],
    queryFn: () => portalDb.entities.Message.filter({ client_id: myClient.id }, '-created_date', 100),
    enabled: !!myClient?.id,
    refetchInterval: 10000,
  });

  const sorted = [...messages].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
  const grouped = groupByDate(sorted);

  // Show quick replies when empty or right after coach message
  const lastMsg = sorted[sorted.length - 1];
  const showChips = showQuickReplies && (sorted.length === 0 || lastMsg?.sender === 'coach');

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Mark read
  useEffect(() => {
    const unread = messages.filter(m => m.sender === 'coach' && !m.is_read);
    unread.forEach(m => portalDb.entities.Message.update(m.id, { is_read: true }).catch(() => {}));
  }, [messages]);

  // Auto-resize textarea
  const handleInput = (e) => {
    setInput(e.target.value);
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 96) + 'px'; // max ~4 lines
    }
  };

  const sendMessage = useCallback(async (text) => {
    const content = (text !== undefined ? text : input).trim();
    if (!content || !myClient?.id) return;
    setInput('');
    setShowQuickReplies(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.focus();
    }
    await portalDb.entities.Message.create({
      client_id: myClient.id,
      client_name: myClient.name,
      sender: 'client',
      content,
    });
    refetch();
  }, [input, myClient, refetch]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const coachInitial = 'Coach';
  const hasText = input.trim().length > 0;

  return (
    <div className="flex flex-col bg-background" style={{ height: '100dvh' }}>
      {/* Header */}
      <div className="flex flex-shrink-0 items-center gap-3 border-b border-border bg-card px-4 pb-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 14px)' }}>
        <IconButton onClick={onBack} label="All messages"><ChevronLeft className="h-5 w-5" /></IconButton>
        <Initials name={coachInitial} tone="ink" size={40} />
        <div className="min-w-0 flex-1">
          <p className="text-[17px] font-bold text-foreground">Your coach</p>
          <p className="text-[13px] text-muted-foreground">Only you and your coach can see this</p>
        </div>
      </div>

      {/* Messages — fills remaining space, scrollable */}
      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4"
        onClick={() => textareaRef.current?.blur()}>
        {sorted.length === 0 && (
          <div className="py-10">
            <h2 className="text-[26px] text-foreground">Say hello</h2>
            <p className="mt-1 text-[15px] text-muted-foreground">Questions about training, food or your week all go here. Pick one to start:</p>
            <div className="mt-4 space-y-2">
              {SUGGESTED_OPENERS.map(s => (
                <button key={s} type="button" onClick={(e) => { e.stopPropagation(); sendMessage(s); }}
                  className="panel block w-full px-4 py-3 text-left text-[15px] font-medium text-foreground hover:bg-accent/60">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {grouped.map((item, i) => (
          item.type === 'separator'
            ? <p key={i} className="py-2 text-center text-[13px] font-semibold text-muted-foreground">{item.label}</p>
            : <MessageBubble key={item.data.id} msg={item.data} coachInitial={coachInitial} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Compose area — sticks to bottom, lifts with keyboard via 100dvh */}
      <div className="flex-shrink-0 border-t border-border bg-card">
        {/* Quick reply chips */}
        {showChips && sorted.length > 0 && (
          <div className="flex gap-2 overflow-x-auto px-4 pt-3 pb-1 scrollbar-hide">
            {SUGGESTED_OPENERS.map(r => (
              <button key={r} type="button" onClick={() => sendMessage(r)}
                className="touch-compact flex-shrink-0 whitespace-nowrap rounded-full border border-input bg-card px-3 py-1.5 text-[13px] font-semibold text-foreground hover:bg-accent">
                {r}
              </button>
            ))}
          </div>
        )}

        {/* Input row */}
        <div className="flex items-end gap-2 px-3 py-3"
          style={{ paddingBottom: 'max(12px, calc(env(safe-area-inset-bottom) + 80px))' }}>
          <button type="button" onClick={() => setShowAttach(true)} aria-label="Attach"
            className="touch-compact mb-px flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-input bg-card text-foreground hover:bg-accent">
            <Plus className="h-5 w-5" />
          </button>

          <div className="relative flex-1">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Message your coach"
              rows={1}
              className="w-full resize-none rounded-[20px] border border-input bg-card px-4 py-2.5 text-base text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none"
              style={{
                lineHeight: '1.5',
                minHeight: '42px',
                maxHeight: '96px',
                overflowY: input.length > 80 ? 'auto' : 'hidden',
              }}
            />
          </div>

          <button
            type="button"
            onClick={hasText ? () => sendMessage() : undefined}
            aria-label={hasText ? 'Send' : 'Voice note'}
            className={cn('touch-compact mb-px flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-colors',
              hasText ? 'bg-primary text-primary-foreground' : 'border border-input bg-card text-muted-foreground')}
          >
            {hasText ? <Send className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Attachment menu */}
      {showAttach && (
        <AttachMenu onClose={() => setShowAttach(false)} onAttach={(action) => {
          // Future: handle each attachment type
        }} />
      )}
    </div>
  );
}

/* ── MAIN PAGE ── */
export default function PortalMessages({ user }) {
  const [view, setView] = useState('conversation'); // auto-open conversation

  const { data: clients = [] } = useQuery({
    queryKey: ['portal-client-msgs', user?.email],
    queryFn: () => portalDb.entities.Client.filter({ portal_user_id: user.id }, '-created_date', 1),
    enabled: !!user?.email,
  });
  const myClient = clients[0];

  const { data: messages = [] } = useQuery({
    queryKey: ['portal-msgs-home', myClient?.id],
    queryFn: () => portalDb.entities.Message.filter({ client_id: myClient.id }, '-created_date', 20),
    enabled: !!myClient?.id,
    refetchInterval: 15000,
  });

  const sorted = [...messages].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  const lastMsg = sorted[0];
  const unread = messages.filter(m => m.sender === 'coach' && !m.is_read).length;
  const broadcasts = messages.filter(m => m.is_broadcast);

  if (view === 'conversation' && myClient) {
    return <ConversationView myClient={myClient} onBack={() => setView('home')} />;
  }

  return (
    <PortalScreen>
      <PortalHeader title="Coach" subtitle="Your conversation and announcements." />

      <div className="space-y-3">
        <button type="button" onClick={() => setView('conversation')}
          className="panel flex w-full items-start gap-3 p-4 text-left hover:bg-accent/50">
          <Initials name="Coach" tone="ink" size={44} />
          <span className="min-w-0 flex-1">
            <span className="flex items-center justify-between gap-2">
              <span className="text-[15px] font-semibold text-foreground">Your coach</span>
              <CountBadge count={unread} />
            </span>
            {lastMsg ? (
              <span className="mt-0.5 block text-[15px] text-foreground line-clamp-2">
                {lastMsg.sender === 'coach' ? '' : 'You: '}{lastMsg.content}
              </span>
            ) : (
              <span className="mt-0.5 block text-[15px] text-muted-foreground">No messages yet.</span>
            )}
            {lastMsg?.created_date && (
              <span className="mt-1 block text-[13px] text-muted-foreground">{format(new Date(lastMsg.created_date), 'MMM d, h:mm a')}</span>
            )}
          </span>
        </button>

        <Button size="lg" className="w-full" onClick={() => setView('conversation')}>
          Message your coach
        </Button>

        {/* System messages / announcements */}
        {broadcasts.length > 0 && (
          <section className="panel px-4 pt-4 pb-1">
            <h2 className="text-xl text-foreground">Announcements</h2>
            <ul className="mt-1 divide-y divide-border">
              {broadcasts.slice(0, 3).map(m => (
                <li key={m.id} className="py-3">
                  <p className="text-[15px] text-foreground">{m.content}</p>
                  <p className="mt-1 text-[13px] text-muted-foreground">{m.created_date ? format(new Date(m.created_date), 'MMM d') : ''}</p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </PortalScreen>
  );
}
