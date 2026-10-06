import React, { useState, useMemo } from 'react';
import { Megaphone, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { differenceInMinutes, differenceInHours, isToday, isYesterday, differenceInCalendarDays, format } from 'date-fns';
import { Initials } from '@/components/kit';
import { Button } from '@/components/ui/button';

const FILTER_CHIPS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'lead', label: 'Leads' },
  { key: 'active', label: 'Active' },
  { key: 'at_risk', label: 'At risk' },
];

/** "12m", "1h", "Sun", "Sep 26" */
function formatMsgTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isToday(d)) {
    const mins = Math.max(0, differenceInMinutes(new Date(), d));
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    return `${differenceInHours(new Date(), d)}h`;
  }
  if (isYesterday(d)) return 'Yesterday';
  if (differenceInCalendarDays(new Date(), d) < 7) return format(d, 'EEE');
  return format(d, 'MMM d');
}

function previewText(msg) {
  if (!msg) return null;
  if (msg.media_type === 'voice') return 'Voice note';
  if (msg.media_type === 'video') return 'Video';
  const text = msg.content || (msg.media_url ? 'Attachment' : '');
  return msg.sender === 'coach' ? `You: ${text}` : text;
}

function ConversationRow({ client, meta, selected, onSelect }) {
  const { lastMsg, unread } = meta;
  const hasUnread = unread > 0;
  return (
    <button
      onClick={() => onSelect(client.id)}
      aria-current={selected ? 'true' : undefined}
      className={cn(
        'relative w-full flex items-center gap-3 px-5 py-3 text-left transition-colors',
        selected ? 'bg-accent' : 'hover:bg-accent/50'
      )}
    >
      {selected && <span aria-hidden className="absolute left-0 top-0 bottom-0 w-[3px] bg-brand" />}
      <Initials name={client.name} src={client.avatar_url} size={40} tone={selected ? 'ink' : 'default'} />
      <span className="flex-1 min-w-0">
        <span className="flex items-baseline justify-between gap-2">
          <span className={cn('text-[15px] truncate text-foreground', hasUnread ? 'font-bold' : 'font-semibold')}>
            {client.name}
          </span>
          {lastMsg && (
            <span className="text-[13px] flex-shrink-0 text-muted-foreground tabular-nums">
              {formatMsgTime(lastMsg.created_date)}
            </span>
          )}
        </span>
        <span className="flex items-center gap-2">
          <span className={cn('block text-sm truncate', hasUnread ? 'text-foreground' : 'text-muted-foreground')}>
            {lastMsg ? previewText(lastMsg) : 'No messages yet'}
          </span>
          {hasUnread && unread > 1 && (
            <span className="ml-auto flex-shrink-0 text-[12px] font-bold tabular-nums text-foreground">{unread > 99 ? '99+' : unread}</span>
          )}
        </span>
      </span>
    </button>
  );
}

/**
 * Conversation list column: title, search, filters, then "Waiting on you"
 * (last word is the client's) and "Earlier".
 */
export default function ClientListSidebar({ clients, allMessages, selectedClientId, onSelectClient, onBroadcast }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const clientMeta = useMemo(() => {
    const meta = {};
    allMessages.forEach(m => {
      if (!meta[m.client_id]) meta[m.client_id] = { lastMsg: null, unread: 0 };
      const cm = meta[m.client_id];
      if (!cm.lastMsg || new Date(m.created_date) > new Date(cm.lastMsg.created_date)) {
        cm.lastMsg = m;
      }
      if (!m.is_read && m.sender === 'client') cm.unread++;
    });
    return meta;
  }, [allMessages]);

  const totalUnread = useMemo(
    () => clients.reduce((s, c) => s + (clientMeta[c.id]?.unread || 0), 0),
    [clients, clientMeta]
  );

  const filtered = useMemo(() => {
    let list = [...clients];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c => c.name?.toLowerCase().includes(q) || clientMeta[c.id]?.lastMsg?.content?.toLowerCase().includes(q));
    }
    if (filter === 'unread') list = list.filter(c => (clientMeta[c.id]?.unread || 0) > 0);
    else if (filter === 'lead') list = list.filter(c => c.lifecycle_status === 'lead');
    else if (filter === 'active') list = list.filter(c => c.lifecycle_status === 'active');
    else if (filter === 'at_risk') list = list.filter(c => c.lifecycle_status === 'at_risk');
    // Sort: unread first, then by most recent message
    return list.sort((a, b) => {
      const ua = clientMeta[a.id]?.unread || 0;
      const ub = clientMeta[b.id]?.unread || 0;
      if (ub > 0 && ua === 0) return 1;
      if (ua > 0 && ub === 0) return -1;
      const ta = clientMeta[a.id]?.lastMsg?.created_date || a.created_date || '';
      const tb = clientMeta[b.id]?.lastMsg?.created_date || b.created_date || '';
      return tb.localeCompare(ta);
    });
  }, [clients, search, filter, clientMeta]);

  // Waiting on you = unread, or the client spoke last.
  const isWaiting = (c) => {
    const m = clientMeta[c.id];
    return !!m && (m.unread > 0 || m.lastMsg?.sender === 'client');
  };
  const waiting = filtered.filter(isWaiting);
  const earlier = filtered.filter(c => !isWaiting(c));

  const renderRow = (client) => (
    <ConversationRow
      key={client.id}
      client={client}
      meta={clientMeta[client.id] || { lastMsg: null, unread: 0 }}
      selected={selectedClientId === client.id}
      onSelect={onSelectClient}
    />
  );

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="px-5 pt-6 pb-3 flex-shrink-0">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-[32px] lg:text-[36px] leading-none text-foreground">Messages</h1>
          <Button variant="outline" size="sm" onClick={onBroadcast} className="gap-1.5">
            <Megaphone /> Broadcast
          </Button>
        </div>
        <div className="relative mt-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search conversations"
            className="h-11 w-full rounded-lg bg-secondary pl-10 pr-9 text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {search && (
            <button onClick={() => setSearch('')} aria-label="Clear search" className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex gap-4 mt-3 overflow-x-auto scrollbar-hide">
          {FILTER_CHIPS.map(chip => (
            <button
              key={chip.key}
              onClick={() => setFilter(chip.key)}
              className={cn(
                'touch-compact whitespace-nowrap text-[13px] font-medium pb-1 border-b-2 transition-colors',
                filter === chip.key ? 'text-foreground border-foreground' : 'text-muted-foreground border-transparent hover:text-foreground'
              )}
            >
              {chip.label}
              {chip.key === 'unread' && totalUnread > 0 && <span className="ml-1 tabular-nums">{totalUnread}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-4">
        {filtered.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted-foreground">
            {search ? 'No conversations match that search.' : 'No conversations here yet.'}
          </p>
        ) : (
          <>
            {waiting.length > 0 && (
              <>
                <p className="px-5 pt-3 pb-1.5 text-[13px] font-medium text-destructive">Waiting on you</p>
                {waiting.map(renderRow)}
              </>
            )}
            {earlier.length > 0 && (
              <>
                <p className="px-5 pt-4 pb-1.5 text-[13px] font-medium text-muted-foreground">{waiting.length ? 'Earlier' : 'All conversations'}</p>
                {earlier.map(renderRow)}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
