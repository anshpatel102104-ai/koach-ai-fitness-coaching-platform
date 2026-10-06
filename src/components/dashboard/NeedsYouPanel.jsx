import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Panel, PersonRow, TextLink } from '@/components/kit';
import { cn } from '@/lib/utils';

/**
 * The three-column "needs you" panel at the top of Today: a big count, a
 * plain label, the first three people, and an underlined way into the full
 * list. Column order is the order to work in.
 */
function Column({ count, label, tone, rows, empty, linkLabel, onLink }) {
  const toneClass = tone === 'danger' ? 'text-destructive' : tone === 'warning' ? 'text-warning' : 'text-foreground';
  return (
    <div className="flex min-w-0 flex-col px-5 py-5 sm:px-6 sm:py-6">
      <div className="flex items-end gap-3 border-b border-border pb-3">
        <span className={cn('num text-[52px] leading-[0.85] sm:text-[56px]', toneClass)}>{count}</span>
        <span className="pb-0.5 text-[16px] font-semibold text-foreground">{label}</span>
      </div>
      <div className="flex-1 divide-y divide-border">
        {rows.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">{empty}</p>
        ) : rows.map(r => (
          <PersonRow
            key={r.key}
            name={r.name}
            detail={r.detail}
            tone={r.tone}
            onClick={r.onClick}
            className="py-3.5"
          />
        ))}
      </div>
      <div className="pt-3">
        <TextLink onClick={onLink}>{linkLabel}</TextLink>
      </div>
    </div>
  );
}

export default function NeedsYouPanel({ reviews, slipping, threads, unreadCount }) {
  const navigate = useNavigate();

  return (
    <Panel className="grid grid-cols-1 divide-y divide-border md:grid-cols-3 md:divide-x md:divide-y-0">
      <Column
        count={reviews.items.length}
        label={reviews.items.length === 1 ? 'check-in to reply to' : 'check-ins to reply to'}
        tone="danger"
        rows={reviews.rows.map(r => ({ ...r, onClick: () => navigate(r.href) }))}
        empty="Every check-in has a reply."
        linkLabel="Open the review queue"
        onLink={() => navigate('/checkin-review')}
      />
      <Column
        count={slipping.items.length}
        label={slipping.items.length === 1 ? 'client slipping' : 'clients slipping'}
        tone="warning"
        rows={slipping.rows.map(r => ({ ...r, onClick: () => navigate(r.href) }))}
        empty="No one is slipping this week."
        linkLabel="See everyone at risk"
        onLink={() => navigate('/at-risk')}
      />
      <Column
        count={unreadCount}
        label={unreadCount === 1 ? 'message waiting' : 'messages waiting'}
        tone="ink"
        rows={threads.rows.map(r => ({ ...r, onClick: () => navigate(r.href) }))}
        empty="Inbox is clear."
        linkLabel="Go to inbox"
        onLink={() => navigate('/messages')}
      />
    </Panel>
  );
}
