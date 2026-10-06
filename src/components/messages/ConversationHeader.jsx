import React, { useMemo } from 'react';
import { ChevronLeft, MoreHorizontal } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

function isOnline(client, allMessages) {
  return allMessages.some(
    m => m.client_id === client.id && m.sender === 'client' &&
    (Date.now() - new Date(m.created_date)) < 5 * 60 * 1000
  );
}

function lastSeen(client, allMessages) {
  const msgs = allMessages
    .filter(m => m.client_id === client.id && m.sender === 'client')
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  if (!msgs.length) return null;
  return formatDistanceToNow(new Date(msgs[0].created_date), { addSuffix: true });
}

/** Median time the client takes to answer a coach message, from real history. */
function replyHabit(client, allMessages) {
  const thread = allMessages
    .filter(m => m.client_id === client.id)
    .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
  const gaps = [];
  for (let i = 0; i < thread.length; i++) {
    if (thread[i].sender !== 'coach') continue;
    const reply = thread.slice(i + 1).find(m => m.sender === 'client');
    if (!reply) continue;
    const next = thread[i + 1];
    if (next && next.sender === 'coach') continue; // only count the last coach message before a reply
    gaps.push((new Date(reply.created_date) - new Date(thread[i].created_date)) / 60000);
  }
  if (gaps.length < 2) return null;
  gaps.sort((a, b) => a - b);
  const median = gaps[Math.floor(gaps.length / 2)];
  if (median <= 60) return 'Usually replies within an hour';
  if (median <= 240) return 'Usually replies within a few hours';
  if (median <= 60 * 24) return 'Usually replies within a day';
  return 'Usually takes a few days to reply';
}

export default function ConversationHeader({ client, allMessages, onLogCheckIn, onBack }) {
  const navigate = useNavigate();
  const online = isOnline(client, allMessages);
  const habit = useMemo(() => replyHabit(client, allMessages), [client, allMessages]);
  const seen = lastSeen(client, allMessages);
  const subline = online ? 'Active now' : habit || (seen ? `Last message ${seen}` : client.email);

  return (
    <div className="flex-shrink-0 border-b border-border bg-card">
      <div className="h-16 lg:h-[72px] flex items-center gap-3 px-4 lg:px-6">
        <button onClick={onBack} aria-label="Back to conversations" className="lg:hidden -ml-1 flex h-10 w-10 items-center justify-center rounded-lg hover:bg-accent transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>

        <h2 className="text-[24px] lg:text-[28px] leading-none text-foreground truncate min-w-0">{client.name}</h2>

        <p className="ml-auto hidden sm:block text-sm text-muted-foreground truncate">{subline}</p>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0 ml-auto sm:ml-1" aria-label="Conversation options">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={() => navigate(`/client-profile?clientId=${client.id}`)}>
              Open full profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(`/checkin-review?clientId=${client.id}`)}>
              Check-in history
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onLogCheckIn}>
              Log a check-in
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
