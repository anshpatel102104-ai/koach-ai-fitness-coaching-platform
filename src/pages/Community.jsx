import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { isCoachRole } from '@/lib/useRoleGuard';
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

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="rounded-xl p-5 text-white flex items-center justify-between" style={{ background: 'var(--tc-sidebar)' }}>
        <div>
          <h1 className="text-xl font-semibold text-white">Community</h1>
          <p className="text-sm text-white/50 mt-0.5">
            {liveGroup ? liveGroup.name : 'Your groups and communities'}
          </p>
        </div>
        {!liveGroup && isCoach && (
          <button onClick={() => { setEditingGroup(null); setShowForm(true); }}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary transition-colors">
            + Create Community
          </button>
        )}
      </div>

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
          onCreate={() => { setEditingGroup(null); setShowForm(true); }}
        />
      )}

      <GroupFormModal
        open={showForm}
        onOpenChange={(v) => { setShowForm(v); if (!v) setEditingGroup(null); }}
        group={editingGroup}
        currentUser={currentUser}
      />
    </div>
  );
}