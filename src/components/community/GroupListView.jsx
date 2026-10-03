import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase as base44 } from '@/api/supabaseClient';
import { Users, ChevronRight, Pencil, Trash2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SignedImg } from '@/components/shared/SignedImage';

function avatarColor(name) {
  const colors = ['bg-accent text-primary', 'bg-ai/10 text-ai', 'bg-success/10 text-success', 'bg-warning/10 text-warning', 'bg-destructive/10 text-destructive'];
  return colors[(name?.charCodeAt(0) || 0) % colors.length];
}

export default function GroupListView({ groups, clients, isCoach, onSelect, onEdit, onCreate }) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CommunityGroup.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['community-groups'] }),
  });

  const getMembers = (group) => {
    const ids = group.member_ids || [];
    return clients.filter(c => ids.includes(c.id));
  };

  return (
    <div className="space-y-4">
      {/* Create button for coaches */}
      {isCoach && (
        <button onClick={onCreate}
          className="w-full flex items-center gap-3 p-4 bg-card border-2 border-dashed border-primary/30 rounded-xl hover:border-primary hover:bg-accent/10 transition-all group">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary transition-colors">
            <Plus className="w-5 h-5 text-primary group-hover:text-white transition-colors" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-primary">Create Community</p>
            <p className="text-xs text-muted-foreground">Set up a new group for your clients</p>
          </div>
        </button>
      )}

      {groups.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border rounded-xl">
          <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="font-semibold text-sm text-foreground">
            {isCoach ? 'No communities yet' : 'You are not in any groups yet'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {isCoach ? 'Create a community to get started.' : 'Ask your coach to add you to a group.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {groups.map(group => {
            const members = getMembers(group);
            return (
              <div key={group.id}
                className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/30 hover:shadow-sm transition-all">
                {/* Cover */}
                {group.cover_image_url ? (
                  <div className="h-24 overflow-hidden">
                    <SignedImg src={group.cover_image_url} alt={group.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="h-24 flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, var(--tc-foreground) 0%, var(--tc-primary) 100%)' }}>
                    <Users className="w-8 h-8 text-white/40" />
                  </div>
                )}

                {/* Body */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground leading-tight">{group.name}</p>
                      {group.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{group.description}</p>
                      )}
                    </div>
                    {isCoach && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => onEdit(group)}
                          className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center transition-colors">
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                        <button onClick={() => {
                          if (window.confirm('Delete "' + group.name + '"? This cannot be undone.')) {
                            deleteMutation.mutate(group.id);
                          }
                        }}
                          className="w-7 h-7 rounded-lg hover:bg-destructive/10 flex items-center justify-center transition-colors">
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Members preview */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex -space-x-1.5">
                      {members.slice(0, 5).map(m => (
                        <div key={m.id} className={cn('w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold flex-shrink-0', avatarColor(m.name))}>
                          {m.name?.[0]?.toUpperCase()}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {members.length === 0 ? 'No members yet' : members.length + ' member' + (members.length !== 1 ? 's' : '')}
                    </p>
                  </div>

                  {/* Feature badges */}
                  <div className="flex gap-1 flex-wrap mb-3">
                    {group.feed_enabled !== false && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-accent/10 text-primary">Feed</span>
                    )}
                    {group.leaderboard_enabled !== false && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-success/10 text-success">Leaderboard</span>
                    )}
                    {group.challenges_enabled !== false && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-warning/10 text-warning">Challenges</span>
                    )}
                  </div>

                  <button onClick={() => onSelect(group)}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold text-primary-foreground transition-colors"
                    style={{ background: 'var(--tc-primary)' }}>
                    Open Group <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}