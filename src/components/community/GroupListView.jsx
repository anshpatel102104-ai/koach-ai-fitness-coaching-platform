import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Pencil, Trash2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Panel, EmptyState, Initials } from '@/components/kit';
import { SignedImg } from '@/components/shared/SignedImage';

export default function GroupListView({ groups, clients, isCoach, onSelect, onEdit, onCreate }) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.CommunityGroup.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['community-groups'] }),
  });

  const getMembers = (group) => {
    const ids = group.member_ids || [];
    return clients.filter(c => ids.includes(c.id));
  };

  if (groups.length === 0) {
    return (
      <Panel>
        <EmptyState
          title={isCoach ? 'No groups yet' : 'You are not in any groups yet'}
          body={isCoach ? 'Start one for a cohort, a challenge or everyone on a program.' : 'Ask your coach to add you to a group.'}
          action={isCoach ? <Button onClick={onCreate}>New group</Button> : null}
        />
      </Panel>
    );
  }

  return (
    <Panel className="overflow-hidden">
      <div className="hidden md:grid grid-cols-[1fr_200px_200px_96px] gap-4 px-6 py-3 border-b border-border text-[13px] text-muted-foreground">
        <span>Group</span><span>Members</span><span>Turned on</span><span />
      </div>
      <ul className="divide-y divide-border">
        {groups.map(group => {
          const members = getMembers(group);
          const features = [
            group.feed_enabled !== false && 'Feed',
            group.leaderboard_enabled !== false && 'Leaderboard',
            group.challenges_enabled !== false && 'Challenges',
          ].filter(Boolean);
          return (
            <li key={group.id} className="md:grid md:grid-cols-[1fr_200px_200px_96px] md:items-center gap-4 px-5 md:px-6 py-4 hover:bg-accent/40 transition-colors">
              <button onClick={() => onSelect(group)} className="flex items-center gap-4 min-w-0 text-left w-full">
                <span className="h-12 w-12 rounded-lg bg-secondary overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {group.cover_image_url
                    ? <SignedImg src={group.cover_image_url} alt="" className="w-full h-full object-cover" />
                    : <span className="display text-xl text-foreground/40">{(group.name || '?').slice(0, 1).toUpperCase()}</span>}
                </span>
                <span className="min-w-0">
                  <span className="block text-[15px] font-semibold text-foreground truncate">{group.name}</span>
                  <span className="block text-sm text-muted-foreground truncate">{group.description || 'No description'}</span>
                </span>
              </button>

              <div className="flex items-center gap-2 mt-3 md:mt-0">
                <div className="flex -space-x-1">
                  {members.slice(0, 4).map(m => (
                    <Initials key={m.id} name={m.name || ''} size={28} className="ring-2 ring-card" />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">
                  {members.length === 0 ? 'No members yet' : `${members.length} member${members.length !== 1 ? 's' : ''}`}
                </span>
              </div>

              <p className="text-sm text-foreground mt-1 md:mt-0">{features.length ? features.join(', ') : 'Everything off'}</p>

              <div className="flex items-center justify-end gap-1 -mt-2 md:mt-0">
                {isCoach && (
                  <>
                    <Button size="icon" variant="ghost" className="h-9 w-9 text-muted-foreground" onClick={() => onEdit(group)} aria-label={`Edit ${group.name}`}>
                      <Pencil />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-9 w-9 text-muted-foreground hover:text-destructive" aria-label={`Delete ${group.name}`}
                      onClick={() => {
                        if (window.confirm('Delete "' + group.name + '"? This cannot be undone.')) {
                          deleteMutation.mutate(group.id);
                        }
                      }}>
                      <Trash2 />
                    </Button>
                  </>
                )}
                <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => onSelect(group)} aria-label={`Open ${group.name}`}>
                  <ChevronRight />
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
