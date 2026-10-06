import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { portalDb } from '@/api/supabaseClient';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Initials } from '@/components/kit';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

// We'll use CommunityPost with type='chat' as group chat messages
const CHAT_CHANNEL = 'group_chat';

function ChatBubble({ msg, isMe, isCoach }) {
  const name = msg.is_anonymous ? 'Community member' : (msg.author_name || 'Member');
  const time = msg.created_date ? format(new Date(msg.created_date), 'h:mm a') : '';

  return (
    <div className={cn('mb-3 flex gap-2', isMe ? 'flex-row-reverse' : 'flex-row')}>
      {!isMe && <Initials name={name} size={30} tone={isCoach ? 'ink' : 'default'} className="mt-auto" />}
      <div className={cn('flex max-w-[75%] flex-col', isMe ? 'items-end' : 'items-start')}>
        {!isMe && (
          <p className="mb-1 ml-1 flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground">
            {name}
            {isCoach && <span className="rounded-full bg-primary px-1.5 py-0.5 text-[11px] font-semibold text-primary-foreground">Coach</span>}
          </p>
        )}
        <div className={cn('rounded-xl px-3.5 py-2.5', isMe ? 'rounded-br-sm bg-primary text-primary-foreground' : 'rounded-bl-sm bg-card text-foreground shadow-[0_0_0_1px_rgb(var(--border))]')}>
          <p className="text-[15px] leading-relaxed">{msg.content}</p>
        </div>
        <p className="mx-1 mt-1 text-[12px] text-muted-foreground">{time}</p>
      </div>
    </div>
  );
}

export default function CommunityGroupChat({ user, myClient, allClients }) {
  const [input, setInput] = useState('');
  const bottomRef = useRef();
  const queryClient = useQueryClient();
  const userId = user?.id || myClient?.id || '';

  const { data: messages = [] } = useQuery({
    queryKey: ['group-chat-messages'],
    queryFn: () => portalDb.entities.CommunityPost.filter({ challenge_id: CHAT_CHANNEL }, 'created_date', 100),
    refetchInterval: 10000,
  });

  useEffect(() => {
    const unsub = portalDb.entities.CommunityPost.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['group-chat-messages'] });
    });
    return unsub;
  }, [queryClient]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMsg = useMutation({
    mutationFn: (content) => portalDb.entities.CommunityPost.create({
      author_id: userId,
      author_name: user?.full_name || myClient?.name || 'Member',
      content,
      challenge_id: CHAT_CHANNEL,
      type: 'post',
      is_hidden: false,
      reactions: {},
      comment_count: 0,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-chat-messages'] });
      setInput('');
    },
  });

  return (
    <section className="panel flex flex-col overflow-hidden" style={{ height: 'calc(100dvh - 300px)', minHeight: 380 }}>
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <span className="flex -space-x-1.5">
          {allClients.slice(0, 5).map(c => (
            <Initials key={c.id} name={c.name || 'Member'} size={22} className="ring-2 ring-card" />
          ))}
        </span>
        <p className="text-[13px] text-muted-foreground">{allClients.length} member{allClients.length === 1 ? '' : 's'} in this chat</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-background px-4 py-4">
        {messages.length === 0 && (
          <div className="py-8">
            <p className="text-[15px] font-semibold text-foreground">No messages yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Start the conversation. Everyone in the group will see it.</p>
          </div>
        )}
        {messages.map(msg => (
          <ChatBubble key={msg.id} msg={msg}
            isMe={msg.author_id === userId}
            isCoach={msg.is_coach} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="flex items-center gap-2 border-t border-border px-3 py-3">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && input.trim() && sendMsg.mutate(input.trim())}
          placeholder="Message the group"
          className="h-10 flex-1 text-base"
        />
        <Button size="icon" onClick={() => input.trim() && sendMsg.mutate(input.trim())} disabled={!input.trim()} aria-label="Send">
          <Send />
        </Button>
      </div>
    </section>
  );
}
