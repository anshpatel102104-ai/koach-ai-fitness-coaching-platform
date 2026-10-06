import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isToday, isYesterday, format } from 'date-fns';
import MessageBubble, { DateSeparator } from '../components/messages/MessageBubble';
import PinnedNotes from '../components/messages/PinnedNotes';
import ClientListSidebar from '../components/messages/ClientListSidebar';
import ConversationHeader from '../components/messages/ConversationHeader';
import ConversationEmpty from '../components/messages/ConversationEmpty';
import ComposeBar from '../components/messages/ComposeBar.jsx';
import BroadcastModal from '../components/messages/BroadcastModal';
import ClientInfoSidebar from '../components/messages/ClientInfoSidebar';
import { EmptyState } from '@/components/kit';


export default function Messages() {
  const urlParams = new URLSearchParams(window.location.search);
  const paramClientId = urlParams.get('clientId');
  const paramMessage  = urlParams.get('message');
  const paramBroadcast = urlParams.get('broadcast') === '1';

  const [selectedClientId, setSelectedClientId] = useState(paramClientId || null);
  const [mobileView, setMobileView] = useState(paramClientId ? 'chat' : 'list');
  const [newMessage, setNewMessage] = useState(paramMessage ? decodeURIComponent(paramMessage) : '');
  const [selectedTag, setSelectedTag] = useState('general');
  const [showBroadcast, setShowBroadcast] = useState(paramBroadcast);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const queryClient = useQueryClient();

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => db.entities.Client.list('name'),
  });

  const { data: allMessages = [] } = useQuery({
    queryKey: ['messages'],
    queryFn: () => db.entities.Message.list('-created_date', 500),
  });

  const { data: checkIns = [] } = useQuery({
    queryKey: ['checkins-messages'],
    queryFn: () => db.entities.CheckIn.list('-date', 300),
  });


  // Real-time subscription
  useEffect(() => {
    const unsub = db.entities.Message.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    });
    return unsub;
  }, [queryClient]);

  const createMutation = useMutation({
    mutationFn: (data) => db.entities.Message.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['messages'] }),
    onError: (err) => {
      console.error('Message send error:', err);
      alert('Failed to send message: ' + (err?.message || 'Unknown error'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.Message.update(id, data),
  });

  const selectedClient = clients.find(c => c.id === selectedClientId);
  const clientMessages = allMessages
    .filter(m => m.client_id === selectedClientId)
    .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

  const pinnedMessages = clientMessages.filter(m => m.is_pinned);

  // Mark unread messages as read when conversation opens
  useEffect(() => {
    if (!selectedClientId) return;
    const unread = allMessages.filter(m => m.client_id === selectedClientId && m.sender === 'client' && !m.is_read);
    unread.forEach(m => updateMutation.mutate({ id: m.id, data: { is_read: true } }));
  }, [selectedClientId]); // eslint-disable-line

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowJumpToLatest(false);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [clientMessages.length, selectedClientId]);

  const handleScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowJumpToLatest(distFromBottom > 200);
  };

  const groupedItems = (() => {
    const items = [];
    let lastDate = null;
    let lastSender = null;
    clientMessages.forEach((msg, i) => {
      const d = new Date(msg.created_date);
      const dateKey = format(d, 'yyyy-MM-dd');
      if (dateKey !== lastDate) {
        let label;
        if (isToday(d)) label = 'Today';
        else if (isYesterday(d)) label = 'Yesterday';
        else label = format(d, 'EEEE, MMMM d');
        items.push({ type: 'separator', label, key: `sep-${dateKey}` });
        lastDate = dateKey;
        lastSender = null;
      }
      const isFirst = lastSender !== msg.sender;
      const nextMsg = clientMessages[i + 1];
      const nextDate = nextMsg ? format(new Date(nextMsg.created_date), 'yyyy-MM-dd') : null;
      const isLast = !nextMsg || nextMsg.sender !== msg.sender || nextDate !== dateKey;
      items.push({ type: 'msg', msg, isFirst, isLast, key: msg.id });
      lastSender = msg.sender;
    });
    return items;
  })();

  const handleSend = () => {
    if (!newMessage.trim() || !selectedClientId) return;
    createMutation.mutate({
      client_id: selectedClientId,
      client_name: selectedClient?.name || '',
      sender: 'coach',
      content: newMessage.trim(),
      is_read: true,
      tag: selectedTag,
      media_type: 'text',
    });
    setNewMessage('');
    setSelectedTag('general');
  };

  const handleSendVoice = ({ audioUrl, durationSeconds }) => {
    if (!audioUrl || !selectedClientId) return;
    createMutation.mutate({
      client_id: selectedClientId,
      client_name: selectedClient?.name || '',
      sender: 'coach',
      content: '',
      is_read: true,
      tag: 'general',
      media_type: 'voice',
      media_url: audioUrl,
      duration_seconds: durationSeconds || 0,
    });
  };

  const handleTogglePin = (msg) => {
    updateMutation.mutate({ id: msg.id, data: { is_pinned: !msg.is_pinned } });
  };

  const handleSelectClient = (clientId) => {
    setSelectedClientId(clientId);
    setMobileView('chat');
  };

  const clientCheckIns = checkIns.filter(ci => ci.client_id === selectedClientId);

  return (
    <div className="flex overflow-hidden bg-background h-[calc(100dvh-120px-env(safe-area-inset-bottom))] -mb-24 lg:mb-0 lg:h-[calc(100dvh-76px)]">
      {/* ── Left: conversation list ── */}
      <div className={cn(
        'flex-shrink-0 flex-col border-r border-border w-full lg:w-[320px] xl:w-[340px]',
        mobileView === 'chat' ? 'hidden lg:flex' : 'flex'
      )}>
        <ClientListSidebar
          clients={clients}
          allMessages={allMessages}
          checkIns={checkIns}
          selectedClientId={selectedClientId}
          onSelectClient={handleSelectClient}
          onBroadcast={() => setShowBroadcast(true)}
        />
      </div>

      {/* ── Center: thread on the canvas ── */}
      <div className={cn(
        'flex-1 flex-col min-w-0 relative',
        mobileView === 'list' ? 'hidden lg:flex' : 'flex'
      )}>
        {selectedClient ? (
          <>
            <ConversationHeader
              client={selectedClient}
              allMessages={allMessages}
              onBack={() => setMobileView('list')}
              onLogCheckIn={() => {}}
            />

            <PinnedNotes messages={pinnedMessages} onUnpin={handleTogglePin} />

            <div
              ref={messagesContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto px-4 lg:px-6 py-4 bg-background"
            >
              {clientMessages.length === 0 ? (
                <ConversationEmpty client={selectedClient} onSelect={(text) => setNewMessage(text)} />
              ) : (
                groupedItems.map(item =>
                  item.type === 'separator'
                    ? <DateSeparator key={item.key} date={item.label} />
                    : (
                      <MessageBubble
                        key={item.key}
                        msg={item.msg}
                        isFirst={item.isFirst}
                        isLast={item.isLast}
                        onTogglePin={handleTogglePin}
                        clientName={selectedClient.name}
                        clientAvatar={selectedClient.avatar_url}
                      />
                    )
                )
              )}
              <div ref={messagesEndRef} />
            </div>

            {showJumpToLatest && (
              <button
                onClick={scrollToBottom}
                className="absolute bottom-36 right-6 z-10 flex items-center gap-1.5 rounded-lg bg-primary px-3 h-9 text-[13px] font-semibold text-primary-foreground"
              >
                <ArrowDown className="w-3.5 h-3.5" /> Latest
              </button>
            )}

            <ComposeBar
              client={selectedClient}
              allMessages={allMessages}
              checkIns={clientCheckIns}
              onSend={handleSend}
              onSendVoice={handleSendVoice}
              selectedTag={selectedTag}
              setSelectedTag={setSelectedTag}
              value={newMessage}
              onChange={setNewMessage}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-6">
            <EmptyState
              className="max-w-sm"
              title="Pick a conversation."
              body="People waiting on a reply are at the top of the list."
            />
          </div>
        )}
      </div>

      {/* ── Right: about the client (wide screens) ── */}
      {selectedClient && (
        <div className="hidden xl:block w-[300px] flex-shrink-0">
          <ClientInfoSidebar
            client={selectedClient}
            checkIns={clientCheckIns}
            allMessages={allMessages}
            onInsertMessage={(text) => setNewMessage(text)}
          />
        </div>
      )}

      {showBroadcast && (
        <BroadcastModal
          clients={clients}
          checkIns={checkIns}
          onClose={() => setShowBroadcast(false)}
          onSend={(clientIds, message, tag) => {
            clientIds.forEach(cid => {
              const cl = clients.find(c => c.id === cid);
              createMutation.mutate({
                client_id: cid,
                client_name: cl?.name || '',
                sender: 'coach',
                content: message,
                is_read: true,
                tag: tag || 'general',
                is_broadcast: true,
                media_type: 'text',
              });
            });
            setShowBroadcast(false);
          }}
        />
      )}
    </div>
  );
}