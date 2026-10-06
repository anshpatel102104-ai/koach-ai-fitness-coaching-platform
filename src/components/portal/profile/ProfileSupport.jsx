import React from 'react';
import { ExternalLink, Mail, Star, Share2, LifeBuoy } from 'lucide-react';
import ProfileSectionCard from './ProfileSectionCard';
import { toast } from 'sonner';

export default function ProfileSupport() {
  const rows = [
    { icon: <ExternalLink className="w-4 h-4 text-muted-foreground" />, label: 'Help & FAQ', action: () => window.open('https://koachai.net/help', '_blank') },
    { icon: <Mail className="w-4 h-4 text-muted-foreground" />, label: 'Contact Support', action: () => window.open('mailto:support@koachai.net') },
    { icon: <Star className="w-4 h-4 text-muted-foreground" />, label: 'Rate the App', action: () => toast('Opening the App Store') },
    { icon: <Share2 className="w-4 h-4 text-muted-foreground" />, label: 'Share KOACH AI', action: () => { navigator.share?.({ title: 'KOACH AI', url: 'https://koachai.net' }) || toast.success('Link copied'); } },
  ];

  return (
    <ProfileSectionCard icon={LifeBuoy} title="About & Support">
      <div className="pt-3">
        <div className="p-3 rounded-xl mb-3" style={{ background: 'rgb(var(--secondary))' }}>
          <p className="text-foreground font-bold text-sm">KOACH AI</p>
          <p className="text-muted-foreground text-[12px] mt-0.5">Version 1.0.0</p>
          <div className="flex gap-3 mt-2">
            <button className="text-primary text-[12px] underline">Terms of Service</button>
            <button className="text-primary text-[12px] underline">Privacy Policy</button>
          </div>
        </div>

        {rows.map(({ icon, label, action }) => (
          <button key={label} onClick={action}
            className="flex items-center gap-3 py-3 border-b border-border last:border-0 w-full text-left">
            {icon}
            <p className="text-foreground text-sm flex-1">{label}</p>
            <ExternalLink className="w-3 h-3 text-muted-foreground" />
          </button>
        ))}
      </div>
    </ProfileSectionCard>
  );
}