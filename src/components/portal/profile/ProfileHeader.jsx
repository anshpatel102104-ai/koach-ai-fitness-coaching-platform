import React, { useRef } from 'react';
import { Camera } from 'lucide-react';
import { portalDb } from '@/api/supabaseClient';
import { format, parseISO } from 'date-fns';
import { SignedImg } from '@/components/shared/SignedImage';
import { Initials } from '@/components/kit';

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


  return (
    <section className="panel flex items-center gap-4 p-5">
      <div className="relative">
        {client?.avatar_url ? (
          <span className="block h-[72px] w-[72px] overflow-hidden rounded-full bg-secondary">
            <SignedImg src={client.avatar_url} alt="" className="h-full w-full object-cover" />
          </span>
        ) : (
          <Initials name={user?.full_name || client?.name || '?'} size={72} tone="ink" />
        )}
        <button type="button" onClick={() => fileRef.current?.click()} aria-label="Change photo"
          className="touch-compact absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-secondary text-foreground">
          <Camera className="h-3.5 w-3.5" />
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-[26px] text-foreground">{user?.full_name || client?.name || 'Your profile'}</h2>
        {memberSince && <p className="text-[13px] text-muted-foreground">Coached since {memberSince}</p>}
        {program && <p className="text-[13px] text-muted-foreground">{program.title}</p>}
        <p className="mt-1 text-[13px] text-muted-foreground">Progress score <span className="font-semibold text-foreground tabular-nums">{progressScore}%</span></p>
      </div>
    </section>
  );
}
