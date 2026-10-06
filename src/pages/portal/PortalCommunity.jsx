import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { portalDb } from '@/api/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Initials, Segmented } from '@/components/kit';
import { PortalScreen, PortalHeader } from '@/components/portal/PortalUI';
import CommunityFeedTab from '@/components/portal/community/CommunityFeedTab';
import CommunityGroupChat from '@/components/portal/community/CommunityGroupChat';
import CommunityMembersTab from '@/components/portal/community/CommunityMembersTab';
import { SignedImg } from '@/components/shared/SignedImage';

const TABS = [
  { id: 'feed', label: 'Feed' },
  { id: 'chat', label: 'Group chat' },
  { id: 'members', label: 'Members' },
];

function GroupDetail({ group, user, myClient, allClients, queryClient }) {
  const [activeTab, setActiveTab] = useState('feed');

  const memberIds = group.member_ids || [];
  const members = allClients.filter(c => memberIds.includes(c.id));

  const { data: posts = [] } = useQuery({
    queryKey: ['community-posts', group.id],
    queryFn: () => portalDb.entities.CommunityPost.filter({ group_id: group.id, is_hidden: false }, '-created_date', 50),
    refetchInterval: 30000,
  });

  useEffect(() => {
    const unsub = portalDb.entities.CommunityPost.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['community-posts', group.id] });
    });
    return unsub;
  }, [queryClient, group.id]);

  const enabledTabs = TABS.filter(t => {
    if (t.id === 'feed') return group.feed_enabled !== false;
    return true; // chat and members always available
  });

  return (
    <div className="space-y-3">
      <Segmented
        className="w-full [&>button]:flex-1 [&>button]:justify-center"
        value={activeTab}
        onChange={setActiveTab}
        options={TABS.map(t => ({ value: t.id, label: t.label }))}
      />
      {activeTab === 'feed' && (
        <CommunityFeedTab user={user} myClient={myClient} posts={posts} allClients={members} queryClient={queryClient} groupId={group.id} />
      )}
      {activeTab === 'chat' && (
        <CommunityGroupChat user={user} myClient={myClient} allClients={members} />
      )}
      {activeTab === 'members' && (
        <CommunityMembersTab user={user} myClient={myClient} allClients={members} posts={posts} />
      )}
    </div>
  );
}

export default function PortalCommunity({ user }) {
  const [selectedGroup, setSelectedGroup] = useState(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: clients = [] } = useQuery({
    queryKey: ['portal-community-client', user?.email],
    queryFn: () => portalDb.entities.Client.filter({ portal_user_id: user.id }, '-created_date', 1),
    enabled: !!user?.email,
  });
  const myClient = clients[0];

  const { data: allClients = [] } = useQuery({
    queryKey: ['community-all-clients'],
    queryFn: () => portalDb.entities.Client.list('-created_date', 100),
  });

  const { data: groups = [] } = useQuery({
    queryKey: ['community-groups'],
    queryFn: () => portalDb.entities.CommunityGroup.list('-created_date'),
  });

  // Client only sees groups they belong to
  const myGroups = groups.filter(g => {
    const ids = g.member_ids || [];
    return ids.includes(myClient?.id) || ids.includes(user?.id);
  });

  const liveGroup = selectedGroup ? myGroups.find(g => g.id === selectedGroup.id) || selectedGroup : null;

  return (
    <PortalScreen>
      <PortalHeader
        title={liveGroup ? liveGroup.name : 'Community'}
        subtitle={liveGroup ? (liveGroup.description || 'Your group') : `${myGroups.length} group${myGroups.length !== 1 ? 's' : ''} you belong to.`}
        onBack={liveGroup ? () => setSelectedGroup(null) : () => navigate('/portal')}
        backLabel={liveGroup ? 'All groups' : 'Back to today'}
      />

      {liveGroup ? (
        <GroupDetail group={liveGroup} user={user} myClient={myClient} allClients={allClients} queryClient={queryClient} />
      ) : myGroups.length === 0 ? (
        <section className="panel px-4 py-6">
          <p className="text-[15px] font-semibold text-foreground">No groups yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Your coach will add you to a group when one is set up.</p>
        </section>
      ) : (
        <section className="panel px-4 py-1">
          <ul className="divide-y divide-border">
            {myGroups.map(group => {
              const memberIds = group.member_ids || [];
              const members = allClients.filter(c => memberIds.includes(c.id));
              return (
                <li key={group.id}>
                  <button type="button" onClick={() => setSelectedGroup(group)} className="flex w-full items-center gap-3 py-3.5 text-left">
                    {group.cover_image_url ? (
                      <SignedImg src={group.cover_image_url} alt="" className="h-12 w-12 flex-shrink-0 rounded-lg object-cover" />
                    ) : (
                      <Initials name={group.name} size={48} className="rounded-lg" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold text-foreground">{group.name}</span>
                      {group.description && <span className="block truncate text-[13px] text-muted-foreground">{group.description}</span>}
                      <span className="mt-1 flex items-center gap-2">
                        <span className="flex -space-x-1.5">
                          {members.slice(0, 4).map(m => (
                            <Initials key={m.id} name={m.name} size={20} className="ring-2 ring-card" />
                          ))}
                        </span>
                        <span className="text-[13px] text-muted-foreground">{members.length} members</span>
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </PortalScreen>
  );
}
