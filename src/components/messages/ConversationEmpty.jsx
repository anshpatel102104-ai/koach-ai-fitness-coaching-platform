import React from 'react';
import { Button } from '@/components/ui/button';

const OPENERS = [
  'Welcome aboard. Message me here any time.',
  'How is the week going so far?',
  'Your program is set up. Start with day 1 when you are ready.',
];

export default function ConversationEmpty({ client, onSelect }) {
  const first = client.name?.split(' ')[0] || 'them';

  return (
    <div className="flex-1 flex flex-col items-start justify-center px-2 py-10 gap-3 max-w-md mx-auto">
      <p className="text-[15px] font-semibold text-foreground">No messages with {first} yet.</p>
      <p className="text-sm text-muted-foreground">Start with one of these, or write your own below.</p>
      <div className="flex flex-col items-start gap-2 mt-1">
        {OPENERS.map(text => (
          <Button key={text} variant="outline" size="sm" className="h-auto py-2 whitespace-normal text-left" onClick={() => onSelect(text)}>
            {text}
          </Button>
        ))}
      </div>
    </div>
  );
}
