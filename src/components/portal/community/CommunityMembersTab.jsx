import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ChevronRight } from 'lucide-react';
import { Initials } from '@/components/kit';
import { Sheet } from '@/components/portal/PortalUI';

const GOAL_LABELS = {
  weight_loss: 'Weight loss',
  muscle_gain: 'Muscle gain',
  strength: 'Strength',
  endurance: 'Endurance',
  flexibility: 'Flexibility',
  general_fitness: 'General fitness',
};

function MemberModal({ client, posts, onClose }) {
  const clientPosts = posts.filter(p => p.author_id === client.id && !p.is_anonymous && !p.is_hidden);

  return (
    <Sheet open onClose={onClose} title={client.name}>
      <div className="flex items-center gap-3">
        <Initials name={client.name} size={56} />
        <div>
          {client.goal && <p className="text-[15px] font-semibold text-foreground">{GOAL_LABELS[client.goal] || client.goal}</p>}
          {client.start_date && (
            <p className="text-[13px] text-muted-foreground">Training since {format(parseISO(client.start_date), 'MMMM yyyy')}</p>
          )}
        </div>
      </div>

      {clientPosts.length > 0 && (
        <div className="mt-5">
          <h3 className="text-lg text-foreground">Recent posts</h3>
          <ul className="mt-1 divide-y divide-border">
            {clientPosts.slice(0, 3).map(post => (
              <li key={post.id} className="py-2.5 text-[15px] text-foreground">{post.content}</li>
            ))}
          </ul>
        </div>
      )}
    </Sheet>
  );
}

function MemberCard({ client, isCoach, onClick }) {
  return (
    <li>
      <button type="button" onClick={onClick} className="flex w-full items-center gap-3 py-3 text-left">
        <Initials name={client.name || 'Member'} size={36} tone={isCoach ? 'ink' : 'default'} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold text-foreground">{client.name || 'Member'}</span>
          {client.goal && !isCoach && <span className="block text-[13px] text-muted-foreground">{GOAL_LABELS[client.goal] || client.goal}</span>}
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </button>
    </li>
  );
}

export default function CommunityMembersTab({ user, myClient, allClients, posts }) {
  const [selectedMember, setSelectedMember] = useState(null);

  return (
    <div className="space-y-3">
      <section className="panel flex items-center gap-3 p-4">
        <Initials name="Coach" size={40} tone="ink" />
        <div className="flex-1">
          <p className="text-[15px] font-semibold text-foreground">Your coach</p>
          <p className="text-[13px] text-muted-foreground">Runs this group and reviews posts</p>
        </div>
      </section>

      <section className="panel px-4 pt-4 pb-1">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl text-foreground">Members</h2>
          <span className="text-[13px] text-muted-foreground">{allClients.length} total</span>
        </div>
        {allClients.length === 0 ? (
          <p className="py-3 text-sm text-muted-foreground">No members yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {allClients.map(client => (
              <MemberCard key={client.id} client={client} isCoach={false} onClick={() => setSelectedMember(client)} />
            ))}
          </ul>
        )}
      </section>

      {selectedMember && (
        <MemberModal client={selectedMember} posts={posts} onClose={() => setSelectedMember(null)} />
      )}
    </div>
  );
}
