import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { Camera } from 'lucide-react';
import { portalDb } from '@/api/supabaseClient';
import { format, parseISO } from 'date-fns';
import { SignedImg } from '@/components/shared/SignedImage';

function ProgressRing({ pct = 0, size = 64, stroke = 5 }) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--border))" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="url(#prog)" strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" />
      <defs>
        <linearGradient id="prog" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgb(var(--primary))" />
          <stop offset="100%" stopColor="rgb(var(--ai))" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function ProfileHeader({ user, client, program, checkIns }) {
  const fileRef = useRef();

  const memberSince = client?.start_date
    ? format(parseISO(client.start_date), 'MMMM yyyy')
    : user?.created_date
    ? format(new Date(user.created_date), 'MMMM yyyy')
    : null;

  const progressScore = (() => {
    if (!checkIns?.length) return 0;
    const lastCI = [...checkIns].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    let score = 0;
    if (lastCI.weight) score += 25;
    if (lastCI.mood) score += 20;
    if (lastCI.compliance_training) score += lastCI.compliance_training * 0.25;
    if (lastCI.compliance_nutrition) score += lastCI.compliance_nutrition * 0.25;
    if (lastCI.energy_level) score += lastCI.energy_level * 1.5;
    return Math.min(Math.round(score), 100);
  })();

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { file_url } = await portalDb.uploadFile({ file });
    if (client?.id) {
      await portalDb.entities.Client.update(client.id, { avatar_url: file_url });
    }
  };

  const initials = (user?.full_name || client?.name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="px-5 pt-6 pb-5 flex flex-col items-center text-center bg-card"
      style={{ borderBottom: '1px solid rgb(var(--muted))' }}>
      {/* Avatar */}
      <div className="relative mb-4">
        <div className="absolute inset-0 rounded-full" style={{ padding: '3px' }}>
          <ProgressRing pct={progressScore} size={90} stroke={4} />
        </div>
        <div className="w-20 h-20 rounded-full flex items-center justify-center overflow-hidden relative"
          style={{ background: 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--ai)))' }}>
          {client?.avatar_url ? (
            <SignedImg src={client.avatar_url} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="text-white font-black text-xl">{initials}</span>
          )}
        </div>
        <button onClick={() => fileRef.current?.click()}
          className="absolute bottom-0 right-0 w-7 h-7 rounded-full flex items-center justify-center"
          style={{ background: 'rgb(var(--primary))', border: '2.5px solid white', boxShadow: '0 2px 8px rgb(var(--primary) / 0.3)' }}>
          <Camera className="w-3.5 h-3.5 text-white" />
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
      </div>

      {/* Name */}
      <h2 className="text-foreground font-black text-2xl">{user?.full_name || client?.name || 'My Profile'}</h2>

      {/* Member since */}
      {memberSince && (
        <p className="text-muted-foreground text-xs mt-1 font-medium">Member since {memberSince}</p>
      )}

      {/* Program badge */}
      {program && (
        <div className="mt-3 px-3 py-1.5 rounded-full text-xs font-semibold text-primary bg-accent border border-accent">
          📋 {program.title}
        </div>
      )}

      {/* Progress score */}
      <div className="mt-3 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-primary" />
        <p className="text-muted-foreground text-xs">Progress Score</p>
        <p className="text-foreground font-black text-sm">{progressScore}%</p>
      </div>
    </motion.div>
  );
}