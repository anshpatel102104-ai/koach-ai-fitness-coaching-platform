import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { isCoachRole } from '@/lib/useRoleGuard';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Page, PageHeader } from '@/components/kit';
import GroupListView from '../components/community/GroupListView';
import GroupDetailView from '../components/community/GroupDetailView';
import GroupFormModal from '../components/community/GroupFormModal';

export default function Community() {
  const { me } = useAuth();
  const [currentUser, setCurrentUser] = useState(null);
  const [isCoach, setIsCoach] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [editingGroup, setEditingGroup] = useState(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    me().then(user => {
      setCurrentUser(user);
      // Step 6: 'admin' is platform staff; coaches carry role='user'. In the
      // coach app, any non-client session is the coach.
      setIsCoach(isCoachRole(user));
    }).catch(() => {});
  }, []);

  const { data: groups = [] } = useQuery({
    queryKey: ['community-groups'],
    queryFn: () => db.entities.CommunityGroup.list('-created_date'),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => db.entities.Client.list('name'),
  });

  const liveGroup = selectedGroup ? groups.find(g => g.id === selectedGroup.id) || selectedGroup : null;

  const openCreate = () => { setEditingGroup(null); setShowForm(true); };

  return (
    <Page>
      {!liveGroup && (
        <PageHeader
          title="Community"
          subtitle={groups.length
            ? `${groups.length} ${groups.length === 1 ? 'group' : 'groups'}. Clients post wins, compare scores and join challenges here.`
            : 'Groups where clients post wins, compare scores and join challenges.'}
          actions={isCoach ? <Button onClick={openCreate}><Plus /> New group</Button> : null}
        />
      )}

      {/* Content */}
      {liveGroup ? (
        <GroupDetailView
          group={liveGroup}
          clients={clients}
          currentUser={currentUser}
          isCoach={isCoach}
          onBack={() => setSelectedGroup(null)}
        />
      ) : (
        <GroupListView
          groups={groups}
          clients={clients}
          isCoach={isCoach}
          onSelect={setSelectedGroup}
          onEdit={(group) => { setEditingGroup(group); setShowForm(true); }}
          onCreate={openCreate}
        />
      )}

      <GroupFormModal
        open={showForm}
        onOpenChange={(v) => { setShowForm(v); if (!v) setEditingGroup(null); }}
        group={editingGroup}
        currentUser={currentUser}
      />
    </Page>
  );
}