import React from 'react';
import { Pin, X } from 'lucide-react';
import { format } from 'date-fns';

export default function PinnedNotes({ messages, onUnpin }) {
  if (!messages.length) return null;
  return (
    <div className="flex-shrink-0 border-b border-border bg-card px-4 lg:px-6 py-2.5">
      <p className="flex items-center gap-1.5 text-[13px] text-muted-foreground mb-1">
        <Pin className="w-3.5 h-3.5" /> Pinned
      </p>
      <div>
        {messages.map(m => (
          <div key={m.id} className="flex items-center gap-3 py-1">
            <p className="text-sm text-foreground line-clamp-1 flex-1">{m.content}</p>
            <span className="text-[13px] text-muted-foreground flex-shrink-0">{format(new Date(m.created_date), 'MMM d')}</span>
            <button onClick={() => onUnpin(m)} aria-label="Unpin" className="touch-compact p-1 -mr-1 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
