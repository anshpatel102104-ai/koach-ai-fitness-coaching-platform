import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { MessageSquare, Trophy, Target, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const FEATURES = [
  { key: 'feed_enabled', icon: MessageSquare, label: 'Community Feed', description: 'Posts, wins & comments' },
  { key: 'leaderboard_enabled', icon: Trophy, label: 'Leaderboard', description: 'Steps, workouts & streaks' },
  { key: 'challenges_enabled', icon: Target, label: 'Weekly Challenges', description: 'Group fitness challenges' },
];

export default function CommunityToggle({ settings, settingsId }) {
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (data) => settingsId
      ? db.entities.CommunitySettings.update(settingsId, data)
      : db.entities.CommunitySettings.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['community-settings'] }),
  });

  const toggle = (key) => {
    updateMutation.mutate({ ...settings, [key]: !settings[key] });
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Settings2 className="w-4 h-4 text-primary" />
        <h3 className="font-heading font-semibold text-sm">Community Features</h3>
        <span className="ml-auto text-[10px] text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-full">Coach Controls</span>
      </div>
      <div className="space-y-2">
        {FEATURES.map(f => {
          const enabled = settings[f.key] !== false;
          return (
            <button key={f.key} onClick={() => toggle(f.key)} className={cn(
              "w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
              enabled ? "border-primary/20 bg-primary/5" : "border-border bg-secondary/10"
            )}>
              <f.icon className={cn("w-4 h-4 flex-shrink-0", enabled ? "text-primary" : "text-muted-foreground")} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{f.label}</p>
                <p className="text-[10px] text-muted-foreground">{f.description}</p>
              </div>
              <div className={cn(
                "w-9 h-5 rounded-full transition-all relative flex-shrink-0",
                enabled ? "bg-primary" : "bg-secondary"
              )}>
                <div className={cn(
                  "w-3.5 h-3.5 rounded-full bg-card absolute top-0.5 transition-all shadow-sm",
                  enabled ? "right-0.5" : "left-0.5"
                )} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}