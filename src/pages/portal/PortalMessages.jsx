import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { portalDb } from '@/api/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isToday, isYesterday } from 'date-fns';
import {
  Send, ArrowLeft, MessageSquare, Mic, Image as ImageIcon, Camera,
  Paperclip, BarChart2, ClipboardList, Plus
} from 'lucide-react';

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
  "Thanks coach! 🙌", "Got it, will work on that!", "On it! 💪",
  "Can we chat?", "I have a question", "Just finished my workout! 💪"
];

const SUGGESTED_OPENERS = [
  "Hey Coach, I just got started! 👋",
  "I have a question about my program",
  "When should I expect my program?"
];

/* ── Message Bubble ── */
function MessageBubble({ msg, coachInitial }) {
  const isClient = msg.sender === 'client';
  const time = msg.created_date ? format(new Date(msg.created_date), 'h:mm a') : '';

  // System message detection
  const isSystem = msg.is_broadcast;

  return (
    <div className={`flex gap-2 ${isClient ? 'justify-end' : 'justify-start'}`}>
      {!isClient && (
        <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold mt-auto text-white"
          style={{ background: 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--ai)))' }}>
          {coachInitial}
        </div>
      )}
      <div className="max-w-[78%]">
        <div className={`px-4 py-3 rounded-2xl ${isClient ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
          style={{
            background: isClient
              ? 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--ai)))'
              : isSystem ? 'rgb(var(--accent))' : 'rgb(var(--muted))',
            border: isSystem ? '1px solid rgb(var(--accent))' : 'none',
          }}>
          {isSystem && <p className="text-primary text-[9px] font-bold uppercase tracking-wider mb-1">🤖 KOACH AI</p>}
          {msg.media_type === 'voice' && msg.media_url ? (
            <div className="flex items-center gap-3">
              <button className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: isClient ? 'rgba(255,255,255,0.25)' : 'rgb(var(--border))' }}>
                <span className="text-xs">▶</span>
              </button>
              <div className="flex-1 h-1 rounded-full" style={{ background: isClient ? 'rgba(255,255,255,0.3)' : 'rgb(var(--muted-foreground))' }}>
                <div className="w-1/3 h-full rounded-full" style={{ background: isClient ? 'white' : 'rgb(var(--muted-foreground))' }} />
              </div>
              <span className="text-xs" style={{ color: isClient ? 'rgba(255,255,255,0.7)' : 'rgb(var(--muted-foreground))' }}>0:15</span>
            </div>
          ) : (
            <p className="text-sm leading-relaxed" style={{ color: isClient ? 'white' : 'rgb(var(--foreground))' }}>{msg.content}</p>
          )}
        </div>
        <p className={`text-border text-[9px] mt-1 ${isClient ? 'text-right' : 'text-left'}`}>{time}</p>
      </div>
    </div>
  );
}

/* ── Attachment Menu ── */
function AttachMenu({ onClose, onAttach }) {
  const options = [
    { icon: <Camera className="w-5 h-5 text-primary" />, label: 'Camera', bg: 'rgb(var(--accent))', action: 'camera' },
    { icon: <ImageIcon className="w-5 h-5 text-ai" />, label: 'Photo Library', bg: 'rgb(var(--ai))', action: 'photo' },
    { icon: <BarChart2 className="w-5 h-5 text-success" />, label: 'Share Progress', bg: 'rgb(var(--success))', action: 'progress' },
    { icon: <ClipboardList className="w-5 h-5 text-warning" />, label: 'Share Check-in', bg: 'rgb(var(--warning))', action: 'checkin' },
    { icon: <Paperclip className="w-5 h-5 text-muted-foreground" />, label: 'Attach File', bg: 'rgb(var(--muted))', action: 'file' },
  ];
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.3)' }}
      onClick={onClose}>
      <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }}
        className="w-full bg-card rounded-t-3xl px-5 pt-4 pb-10"
        onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 rounded-full bg-border mx-auto mb-5" />
        <p className="text-foreground font-black text-base mb-4">Add Attachment</p>
        <div className="space-y-2">
          {options.map(opt => (
            <button key={opt.action} onClick={() => { onAttach(opt.action); onClose(); }}
              className="w-full flex items-center gap-4 p-4 rounded-2xl text-left active:opacity-70 transition-opacity"
              style={{ background: opt.bg }}>
              <div className="w-10 h-10 rounded-xl bg-card flex items-center justify-center flex-shrink-0"
                style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                {opt.icon}
              </div>
              <span className="text-foreground font-semibold text-sm">{opt.label}</span>
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Conversation view ── */
function ConversationView({ myClient, onBack }) {
  const [input, setInput] = useState('');
  const [showAttach, setShowAttach] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const queryClient = useQueryClient();

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

  const coachInitial = 'C';
  const hasText = input.trim().length > 0;

  return (
    <div className="flex flex-col bg-card" style={{ height: '100dvh' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-14 pb-4 flex-shrink-0 bg-card border-b border-border"
        style={{ boxShadow: '0 1px 0 rgb(var(--muted))' }}>
        <button onClick={onBack} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--ai)))' }}>
          {coachInitial}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-foreground font-bold text-sm">Your Coach</p>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-success" />
            <p className="text-success text-[10px] font-semibold">Active</p>
          </div>
        </div>
      </div>

      {/* Messages — fills remaining space, scrollable */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 bg-muted"
        onClick={() => textareaRef.current?.blur()}>
        {sorted.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white mb-4"
              style={{ background: 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--ai)))' }}>
              {coachInitial}
            </div>
            <p className="text-muted-foreground text-sm font-bold mb-1">Say hi to your coach! 👋</p>
            <p className="text-muted-foreground text-xs mb-6">They're here to help</p>
            <div className="space-y-2 w-full max-w-xs">
              {SUGGESTED_OPENERS.map(s => (
                <button key={s} onClick={(e) => { e.stopPropagation(); sendMessage(s); }}
                  className="w-full p-3 rounded-2xl text-sm text-muted-foreground text-left bg-card border border-border font-medium"
                  style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {grouped.map((item, i) => (
          item.type === 'separator'
            ? <p key={i} className="text-center text-border text-[9px] font-bold uppercase tracking-wider py-2">{item.label}</p>
            : <MessageBubble key={item.data.id} msg={item.data} coachInitial={coachInitial} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Compose area — sticks to bottom, lifts with keyboard via 100dvh */}
      <div className="flex-shrink-0 bg-card" style={{ borderTop: '1px solid rgb(var(--muted))', boxShadow: '0 -2px 16px rgba(0,0,0,0.05)' }}>
        {/* Quick reply chips */}
        <AnimatePresence>
          {showChips && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="flex gap-2 px-4 pt-3 pb-1 overflow-x-auto scrollbar-hide">
              {SUGGESTED_OPENERS.map(r => (
                <button key={r} onClick={() => sendMessage(r)}
                  className="px-3 py-2 rounded-full text-xs text-primary whitespace-nowrap flex-shrink-0 font-semibold bg-accent border border-accent">
                  {r}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input row */}
        <div className="flex items-end gap-2 px-3 py-3"
          style={{ paddingBottom: 'max(12px, calc(env(safe-area-inset-bottom) + 80px))' }}>
          {/* Attachment button */}
          <button onClick={() => setShowAttach(true)}
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors bg-muted active:bg-border"
            style={{ border: '1.5px solid rgb(var(--border))', marginBottom: 1 }}>
            <Plus className="w-5 h-5 text-muted-foreground" />
          </button>

          {/* Textarea */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Message your coach..."
              rows={1}
              className="w-full px-4 py-2.5 rounded-3xl text-foreground text-base placeholder-muted-foreground focus:outline-none resize-none overflow-hidden"
              style={{
                border: '1.5px solid rgb(var(--border))',
                background: 'rgb(var(--card))',
                lineHeight: '1.5',
                minHeight: '42px',
                maxHeight: '96px',
                overflowY: input.length > 80 ? 'auto' : 'hidden',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => e.target.style.borderColor = 'rgb(var(--primary))'}
              onBlur={e => e.target.style.borderColor = 'rgb(var(--border))'}
            />
          </div>

          {/* Send / Mic button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={hasText ? () => sendMessage() : undefined}
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
            style={{
              background: hasText ? 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--ai)))' : 'rgb(var(--muted))',
              border: hasText ? 'none' : '1.5px solid rgb(var(--border))',
              marginBottom: 1,
            }}>
            <AnimatePresence mode="wait">
              {hasText ? (
                <motion.div key="send" initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={{ duration: 0.15 }}>
                  <Send className="w-4 h-4 text-white" />
                </motion.div>
              ) : (
                <motion.div key="mic" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ duration: 0.15 }}>
                  <Mic className="w-4 h-4 text-muted-foreground" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </div>

      {/* Attachment menu */}
      <AnimatePresence>
        {showAttach && (
          <AttachMenu onClose={() => setShowAttach(false)} onAttach={(action) => {
            // Future: handle each attachment type
          }} />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── MAIN PAGE ── */
export default function PortalMessages({ user }) {
  const [view, setView] = useState('conversation'); // auto-open conversation

  const { data: clients = [] } = useQuery({
    queryKey: ['portal-client-msgs', user?.email],
    queryFn: () => portalDb.entities.Client.filter({ email: user.email }, '-created_date', 1),
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

  if (view === 'conversation' && myClient) {
    return <ConversationView myClient={myClient} onBack={() => setView('home')} />;
  }

  return (
    <div className="px-5 pt-12 pb-28 space-y-5">
      {/* Header */}
      <div>
        <p className="text-white/40 text-xs font-semibold uppercase tracking-wider">Messages</p>
        <h1 className="text-white text-xl font-bold mt-0.5">Messages</h1>
      </div>

      {/* Coach Card */}
      <motion.button whileTap={{ scale: 0.98 }} onClick={() => setView('conversation')}
        className="w-full p-5 rounded-2xl text-left relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, rgb(var(--primary) / 0.15), rgba(99,102,241,0.1))', border: '1.5px solid rgb(var(--primary) / 0.25)' }}>
        <div className="flex items-start gap-4">
          <div className="relative flex-shrink-0">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white"
              style={{ background: 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--primary)))' }}>
              C
            </div>
            <div className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full border-2 border-[#0A0F1A] bg-success" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5">
              <p className="text-white font-bold text-base">Your Coach</p>
              {unread > 0 && (
                <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }}
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                  style={{ background: 'rgb(var(--primary))' }}>
                  {unread}
                </motion.span>
              )}
            </div>
            <p className="text-white/40 text-xs mb-3">Your Personal Coach</p>
            {lastMsg ? (
              <p className="text-white/50 text-sm line-clamp-1">{lastMsg.sender === 'coach' ? '' : 'You: '}{lastMsg.content}</p>
            ) : (
              <p className="text-white/30 text-sm italic">Start a conversation...</p>
            )}
            {lastMsg?.created_date && (
              <p className="text-white/25 text-[10px] mt-1">{format(new Date(lastMsg.created_date), 'MMM d, h:mm a')}</p>
            )}
          </div>
        </div>
        <button onClick={() => setView('conversation')}
          className="w-full mt-4 py-2.5 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--primary)))' }}>
          <MessageSquare className="w-4 h-4" />
          Message Coach
        </button>
      </motion.button>

      {/* System messages / announcements */}
      {messages.filter(m => m.is_broadcast).length > 0 && (
        <div>
          <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-3">Announcements</p>
          <div className="space-y-2">
            {messages.filter(m => m.is_broadcast).slice(0, 3).map(m => (
              <div key={m.id} className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <p className="text-primary text-[9px] font-bold uppercase tracking-wider mb-1">🤖 KOACH AI</p>
                <p className="text-white/60 text-sm">{m.content}</p>
                <p className="text-white/20 text-[9px] mt-1">{m.created_date ? format(new Date(m.created_date), 'MMM d') : ''}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {messages.length === 0 && (
        <div className="pt-8 text-center">
          <MessageSquare className="w-12 h-12 text-white/10 mx-auto mb-3" />
          <p className="text-white/30 text-sm">No messages yet</p>
          <p className="text-white/15 text-xs mt-1">Tap "Message Coach" to start</p>
        </div>
      )}
    </div>
  );
}