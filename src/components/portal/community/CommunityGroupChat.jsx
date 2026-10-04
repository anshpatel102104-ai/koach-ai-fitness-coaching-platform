import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { portalDb } from '@/api/supabaseClient';
import { Send, Users } from 'lucide-react';
import { format } from 'date-fns';

// We'll use CommunityPost with type='chat' as group chat messages
const CHAT_CHANNEL = 'group_chat';

function ChatBubble({ msg, isMe, isCoach }) {
  const name = msg.is_anonymous ? 'Community Member' : (msg.author_name || 'Member');
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const time = msg.created_date ? format(new Date(msg.created_date), 'h:mm a') : '';

  return (
    <div className={`flex gap-2 mb-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isMe && (
        <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white flex-shrink-0 mt-auto"
          style={{ background: isCoach ? 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--ai)))' : 'linear-gradient(135deg, rgb(var(--success)), rgb(var(--success)))' }}>
          {initials}
        </div>
      )}
      <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
        {!isMe && (
          <div className="flex items-center gap-1.5 mb-1 ml-1">
            <p className="text-muted-foreground text-[10px] font-bold">{name}</p>
            {isCoach && (
              <span className="px-1.5 py-0.5 rounded-full text-[8px] font-black text-white"
                style={{ background: 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--ai)))' }}>COACH</span>
            )}
          </div>
        )}
        <div className={`px-3.5 py-2.5 rounded-2xl ${isMe ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
          style={{
            background: isMe ? 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--ai)))' : 'rgb(var(--muted))',
          }}>
          <p className="text-sm leading-relaxed" style={{ color: isMe ? 'white' : 'rgb(var(--foreground))' }}>
            {msg.content}
          </p>
        </div>
        <p className="text-border text-[9px] mt-1 mx-1">{time}</p>
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

  const onlineCount = Math.min(allClients.length, Math.max(1, Math.floor(allClients.length * 0.3)));

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 220px)' }}>
      {/* Online indicator */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-card border-b border-border">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-success" />
          <p className="text-muted-foreground text-xs font-semibold">{onlineCount} members online</p>
        </div>
        <div className="flex -space-x-1 ml-1">
          {allClients.slice(0, 5).map((c, i) => (
            <div key={c.id} className="w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-bold text-white"
              style={{ background: `hsl(${i * 60 + 200}, 60%, 50%)` }}>
              {(c.name || 'U')[0].toUpperCase()}
            </div>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 bg-muted">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Users className="w-12 h-12 text-border mb-3" />
            <p className="text-muted-foreground font-semibold text-sm">No messages yet</p>
            <p className="text-border text-xs mt-1">Be the first to say hello! 👋</p>
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
      <div className="flex items-center gap-2 px-4 py-3 bg-card border-t border-border">
        <div className="flex-1 flex items-center gap-2 bg-muted rounded-2xl px-4 py-2.5 border border-border">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && input.trim() && sendMsg.mutate(input.trim())}
            placeholder="Message the group..."
            className="flex-1 bg-transparent text-foreground text-sm outline-none placeholder-border"
          />
        </div>
        <button onClick={() => input.trim() && sendMsg.mutate(input.trim())}
          disabled={!input.trim()}
          className="w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-30"
          style={{ background: 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--ai)))' }}>
          <Send className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  );
}