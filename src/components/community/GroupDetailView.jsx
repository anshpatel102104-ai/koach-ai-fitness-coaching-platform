import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase as base44 } from '@/api/supabaseClient';
import { ArrowLeft, Settings2, Users, MessageSquare, Trophy, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import CommunityFeed from './CommunityFeed';
import Leaderboard from './Leaderboard';
import WeeklyChallenges from './WeeklyChallenges';
import { SignedImg } from '@/components/shared/SignedImage';

const TABS = [
  { key: 'feed',        icon: MessageSquare, label: 'Feed',        settingKey: 'feed_enabled' },
  { key: 'leaderboard', icon: Trophy,        label: 'Leaderboard', settingKey: 'leaderboard_enabled' },
  { key: 'challenges',  icon: Target,        label: 'Challenges',  settingKey: 'challenges_enabled' },
];

function avatarColor(name) {
  const colors = ['bg-accent text-primary', 'bg-ai/10 text-ai', 'bg-success/10 text-success', 'bg-warning/10 text-warning', 'bg-destructive/10 text-destructive'];
  return colors[(name?.charCodeAt(0) || 0) % colors.length];
}

export default function GroupDetailView({ group, clients, currentUser, isCoach, onBack }) {
  const [activeTab, setActiveTab] = useState('feed');
  const [showSettings, setShowSettings] = useState(false);
  const queryClient = useQueryClient();

  const memberIds = group.member_ids || [];
  const members = clients.filter(c => memberIds.includes(c.id));

  const enabledTabs = TABS.filter(t => group[t.settingKey] !== false);

  const settingsObj = {
    feed_enabled: group.feed_enabled !== false,
    leaderboard_enabled: group.leaderboard_enabled !== false,
    challenges_enabled: group.challenges_enabled !== false,
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--tc-sidebar)' }}>
        {group.cover_image_url && (
          <div className="h-28 overflow-hidden relative">
            <SignedImg src={group.cover_image_url} alt={group.name} className="w-full h-full object-cover opacity-60" />
          </div>
        )}
        <div className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={onBack}
              className="w-8 h-8 rounded-lg bg-[var(--kc-w-10)] hover:bg-[var(--kc-w-20)] flex items-center justify-center transition-colors">
              <ArrowLeft className="w-4 h-4 text-white" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold text-white truncate">{group.name}</h1>
              {group.description && (
                <p className="text-xs text-white/50 truncate">{group.description}</p>
              )}
            </div>
            {isCoach && (
              <button onClick={() => setShowSettings(v => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--kc-w-10)] hover:bg-[var(--kc-w-20)] text-white rounded-lg text-xs font-semibold transition-colors">
                <Settings2 className="w-3.5 h-3.5" /> Settings
              </button>
            )}
          </div>

          {/* Members strip */}
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1.5">
              {members.slice(0, 6).map(m => (
                <div key={m.id} className={cn('w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0', avatarColor(m.name))}
                  style={{ borderColor: 'var(--tc-foreground)' }}>
                  {m.name?.[0]?.toUpperCase()}
                </div>
              ))}
              {members.length > 6 && (
                <div className="w-7 h-7 rounded-full border-2 bg-[var(--kc-w-10)] flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                  style={{ borderColor: 'var(--tc-foreground)' }}>
                  +{members.length - 6}
                </div>
              )}
            </div>
            <span className="text-xs text-white/50">
              {members.length} member{members.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Feature Settings Panel */}
      {showSettings && isCoach && (
        <GroupFeatureToggle group={group} />
      )}

      {/* Tabs */}
      {enabledTabs.length > 1 && (
        <div className="flex gap-1 bg-muted border border-border rounded-xl p-1 w-fit">
          {enabledTabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                activeTab === tab.key ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}>
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {enabledTabs.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border rounded-xl">
          <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">All features are disabled for this group.</p>
          {isCoach && <p className="text-xs text-muted-foreground mt-1">Click "Settings" to enable them.</p>}
        </div>
      ) : (
        <div className={cn(activeTab === 'feed' && 'grid grid-cols-1 lg:grid-cols-3 gap-6')}>
          {activeTab === 'feed' && (
            <>
              <div className="lg:col-span-2">
                <CommunityFeed currentUser={currentUser} groupId={group.id} />
              </div>
              <div className="space-y-5">
                {settingsObj.leaderboard_enabled && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Leaderboard</p>
                    <Leaderboard clients={members} groupId={group.id} />
                  </div>
                )}
                {settingsObj.challenges_enabled && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Active Challenges</p>
                    <WeeklyChallenges isCoach={isCoach} compact groupId={group.id} />
                  </div>
                )}
              </div>
            </>
          )}
          {activeTab === 'leaderboard' && (
            <div className="lg:col-span-3">
              <Leaderboard clients={members} groupId={group.id} />
            </div>
          )}
          {activeTab === 'challenges' && (
            <div className="lg:col-span-3">
              <WeeklyChallenges isCoach={isCoach} groupId={group.id} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Inline feature toggles for per-group settings
function GroupFeatureToggle({ group }) {
  const queryClient = useQueryClient();
  const FEATURES = [
    { key: 'feed_enabled', label: 'Feed', description: 'Posts and comments' },
    { key: 'leaderboard_enabled', label: 'Leaderboard', description: 'Rankings and scores' },
    { key: 'challenges_enabled', label: 'Challenges', description: 'Group fitness challenges' },
  ];

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.CommunityGroup.update(group.id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['community-groups'] }),
  });

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-2">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Group Features</p>
      {FEATURES.map(f => {
        const enabled = group[f.key] !== false;
        return (
          <button key={f.key} onClick={() => updateMutation.mutate({ [f.key]: !enabled })}
            className={cn('w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left',
              enabled ? 'border-primary/20 bg-accent/10' : 'border-border bg-background')}>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{f.label}</p>
              <p className="text-[10px] text-muted-foreground">{f.description}</p>
            </div>
            <div className={cn('w-9 h-5 rounded-full transition-all relative flex-shrink-0', enabled ? 'bg-primary' : 'bg-muted-foreground')}>
              <div className={cn('w-3.5 h-3.5 rounded-full bg-card absolute top-0.5 transition-all shadow-sm', enabled ? 'right-0.5' : 'left-0.5')} />
            </div>
          </button>
        );
      })}
    </div>
  );
}