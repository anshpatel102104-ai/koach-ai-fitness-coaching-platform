import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { ArrowLeft, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { PageHeader, Panel, PanelHeader, Segmented, EmptyState, Initials } from '@/components/kit';
import { cn } from '@/lib/utils';
import { SignedImg } from '@/components/shared/SignedImage';
import CommunityFeed from './CommunityFeed';
import Leaderboard from './Leaderboard';
import WeeklyChallenges from './WeeklyChallenges';

const TABS = [
  { key: 'feed',        label: 'Feed',        settingKey: 'feed_enabled' },
  { key: 'leaderboard', label: 'Leaderboard', settingKey: 'leaderboard_enabled' },
  { key: 'challenges',  label: 'Challenges',  settingKey: 'challenges_enabled' },
];

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
      {group.cover_image_url && (
        <div className="h-28 sm:h-36 rounded-xl overflow-hidden bg-secondary">
          <SignedImg src={group.cover_image_url} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <PageHeader
        className="mb-0"
        eyebrow={<button onClick={onBack} className="inline-flex items-center gap-1 hover:text-foreground"><ArrowLeft className="w-4 h-4" /> All groups</button>}
        title={group.name}
        subtitle={[group.description, `${members.length} member${members.length !== 1 ? 's' : ''}`].filter(Boolean).join('. ') + '.'}
        actions={isCoach ? (
          <Button variant="outline" onClick={() => setShowSettings(v => !v)} aria-expanded={showSettings}>
            <Settings2 /> {showSettings ? 'Close settings' : 'Settings'}
          </Button>
        ) : null}
      >
        {members.length > 0 && (
          <div className="flex -space-x-1 mt-3">
            {members.slice(0, 8).map(m => <Initials key={m.id} name={m.name || ''} size={30} className="ring-2 ring-background" />)}
            {members.length > 8 && <Initials name={`+ ${members.length - 8}`} size={30} className="ring-2 ring-background" />}
          </div>
        )}
      </PageHeader>

      {showSettings && isCoach && (
        <GroupFeatureToggle group={group} />
      )}

      {enabledTabs.length > 1 && (
        <Segmented
          value={activeTab}
          onChange={setActiveTab}
          options={enabledTabs.map(t => ({ value: t.key, label: t.label }))}
        />
      )}

      {/* Content */}
      {enabledTabs.length === 0 ? (
        <Panel>
          <EmptyState title="Everything is turned off for this group" body={isCoach ? 'Open settings to turn the feed, leaderboard or challenges back on.' : undefined} />
        </Panel>
      ) : (
        <div className={cn(activeTab === 'feed' && 'grid grid-cols-1 lg:grid-cols-3 gap-5 items-start')}>
          {activeTab === 'feed' && (
            <>
              <div className="lg:col-span-2">
                <CommunityFeed currentUser={currentUser} groupId={group.id} />
              </div>
              <div className="space-y-5">
                {settingsObj.leaderboard_enabled && (
                  <div>
                    <h2 className="text-[22px] mb-3">Leaderboard</h2>
                    <Leaderboard clients={members} groupId={group.id} />
                  </div>
                )}
                {settingsObj.challenges_enabled && (
                  <div>
                    <h2 className="text-[22px] mb-3">Challenges</h2>
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
    { key: 'feed_enabled', label: 'Feed', description: 'Posts, photos and comments' },
    { key: 'leaderboard_enabled', label: 'Leaderboard', description: 'Members ranked by points' },
    { key: 'challenges_enabled', label: 'Challenges', description: 'Group challenges with a target and a leaderboard' },
  ];

  const updateMutation = useMutation({
    mutationFn: (data) => db.entities.CommunityGroup.update(group.id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['community-groups'] }),
  });

  return (
    <Panel>
      <PanelHeader title="Group settings" subtitle="Turn parts of the group on or off. Members see the change straight away." />
      <ul className="divide-y divide-border px-5 sm:px-6 pb-2">
        {FEATURES.map(f => {
          const enabled = group[f.key] !== false;
          return (
            <li key={f.key} className="flex items-center gap-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-semibold text-foreground">{f.label}</p>
                <p className="text-sm text-muted-foreground">{f.description}</p>
              </div>
              <Switch checked={enabled} onCheckedChange={() => updateMutation.mutate({ [f.key]: !enabled })} aria-label={f.label} />
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
