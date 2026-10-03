import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { portalDb } from '@/api/supabaseClient';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, MessageSquare, Send } from 'lucide-react';
import { SignedImg } from '@/components/shared/SignedImage';

const MOOD_EMOJI = { stressed: '😫', tired: '😕', okay: '😐', good: '🙂', great: '😄' };
const MOOD_LABEL = { stressed: 'Stressed', tired: 'Tired', okay: 'Okay', good: 'Good', great: 'Great' };

function StatRow({ label, value, emoji }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-center justify-between py-3"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <span className="text-white/40 text-sm">{emoji} {label}</span>
      <span className="text-white font-semibold text-sm">{value}</span>
    </div>
  );
}

export default function CheckInDetailView({ checkIn, client, onBack, onMessage }) {
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const handleReply = async () => {
    if (!reply.trim() || !client?.id) return;
    setSending(true);
    await portalDb.entities.Message.create({
      client_id: client.id,
      client_name: client.name,
      sender: 'client',
      content: reply,
      tag: 'check_in',
    });
    setReply('');
    setSending(false);
    onMessage();
  };

  const statusConfig = {
    reviewed: { bg: 'rgb(var(--success) / 0.12)', color: 'rgb(var(--success))', label: '✓ Reviewed by coach' },
    flagged: { bg: 'rgb(var(--destructive) / 0.12)', color: 'rgb(var(--destructive))', label: '⚑ Flagged' },
    pending: { bg: 'rgb(var(--warning) / 0.1)', color: '#FBB724', label: 'Awaiting review' },
  }[checkIn.review_status] || {};

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: '#0A0F1A' }}>
      {/* Header */}
      <div className="px-5 pt-12 pb-4 flex items-center gap-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <button onClick={onBack}
          className="w-9 h-9 flex items-center justify-center rounded-xl"
          style={{ background: 'rgba(255,255,255,0.07)' }}>
          <ArrowLeft className="w-4 h-4 text-white/50" />
        </button>
        <div className="flex-1">
          <h2 className="text-white font-bold">Check-in</h2>
          <p className="text-white/30 text-xs">{format(parseISO(checkIn.date), 'MMMM d, yyyy')}</p>
        </div>
        <span className="text-[10px] font-bold px-2.5 py-1.5 rounded-xl"
          style={{ background: statusConfig.bg, color: statusConfig.color }}>
          {statusConfig.label}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-5 py-4 space-y-4">
          {/* Mood hero */}
          {checkIn.mood && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="p-5 rounded-2xl text-center"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-6xl mb-2">{MOOD_EMOJI[checkIn.mood] || '😐'}</p>
              <p className="text-white font-bold text-lg">{MOOD_LABEL[checkIn.mood]}</p>
              <p className="text-white/30 text-xs mt-1">Overall mood this week</p>
            </motion.div>
          )}

          {/* Stats */}
          <div className="p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-white/30 text-[10px] font-bold uppercase tracking-wider mb-2">Stats</p>
            <StatRow label="Weight" value={checkIn.weight ? `${checkIn.weight} lbs` : null} emoji="⚖️" />
            <StatRow label="Energy" value={checkIn.energy_level ? `${checkIn.energy_level}/10` : null} emoji="⚡" />
            <StatRow label="Stress" value={checkIn.stress_level ? `${checkIn.stress_level}/10` : null} emoji="🧠" />
            <StatRow label="Sleep" value={checkIn.sleep_hours ? `${checkIn.sleep_hours} hrs` : null} emoji="😴" />
            <StatRow label="Training" value={checkIn.compliance_training ? `${checkIn.compliance_training}%` : null} emoji="💪" />
            <StatRow label="Nutrition" value={checkIn.compliance_nutrition ? `${checkIn.compliance_nutrition}%` : null} emoji="🥗" />
          </div>

          {/* Notes */}
          {checkIn.notes && (
            <div className="p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-white/30 text-[10px] font-bold uppercase tracking-wider mb-2">Your Notes</p>
              <p className="text-white/70 text-sm leading-relaxed">{checkIn.notes}</p>
            </div>
          )}

          {/* Photos */}
          {checkIn.photo_urls?.length > 0 && (
            <div className="p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-white/30 text-[10px] font-bold uppercase tracking-wider mb-3">Progress Photos</p>
              <div className="grid grid-cols-3 gap-2">
                {checkIn.photo_urls.map((url, i) => (
                  <SignedImg key={i} src={url} alt="" className="rounded-xl aspect-square object-cover" />
                ))}
              </div>
            </div>
          )}

          {/* Coach response */}
          {checkIn.coach_notes && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl"
              style={{ background: 'linear-gradient(135deg, rgb(var(--primary) / 0.12), rgba(99,102,241,0.08))', border: '1px solid rgb(var(--primary) / 0.25)' }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--primary)))' }}>
                  C
                </div>
                <div>
                  <p className="text-primary font-bold text-xs">Coach Response</p>
                  {checkIn.updated_date && (
                    <p className="text-white/20 text-[9px]">{format(new Date(checkIn.updated_date), 'MMM d, h:mm a')}</p>
                  )}
                </div>
              </div>
              <p className="text-white/80 text-sm leading-relaxed">{checkIn.coach_notes}</p>
            </motion.div>
          )}

          {/* Late tag */}
          {checkIn.date && (() => {
            const submitted = new Date(checkIn.created_date);
            const due = new Date(checkIn.date);
            const diffDays = Math.floor((submitted - due) / (1000 * 60 * 60 * 24));
            return diffDays > 1 ? (
              <p className="text-white/20 text-[10px] text-center">⏱ Submitted {diffDays} day{diffDays !== 1 ? 's' : ''} late</p>
            ) : null;
          })()}

          {/* Reply section */}
          {checkIn.coach_notes && (
            <div className="p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-white/30 text-[10px] font-bold uppercase tracking-wider mb-3">Reply to Coach</p>
              <div className="flex gap-2">
                <input
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  placeholder="Type your reply..."
                  className="flex-1 px-3 py-2.5 rounded-xl text-white text-sm placeholder-white/20 focus:outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '16px' }}
                />
                <button onClick={handleReply} disabled={!reply.trim() || sending}
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 disabled:opacity-30"
                  style={{ background: 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--primary)))' }}>
                  <Send className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          )}

          {!checkIn.coach_notes && (
            <button onClick={onMessage}
              className="w-full p-4 rounded-2xl flex items-center justify-center gap-2"
              style={{ background: 'rgb(var(--primary) / 0.1)', border: '1px solid rgb(var(--primary) / 0.2)' }}>
              <MessageSquare className="w-4 h-4 text-primary" />
              <span className="text-primary text-sm font-semibold">Message my coach</span>
            </button>
          )}

          <div className="h-6" />
        </div>
      </div>
    </div>
  );
}