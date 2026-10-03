import React from 'react';
import { SignedImg } from '@/components/shared/SignedImage';

const OPENERS = [
  'Welcome to KOACH AI! 🎉',
  'How are you feeling this week?',
  "Let's get your program set up!",
];

export default function ConversationEmpty({ client, onSelect }) {
  const initials = (client.name || '?').split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-6 gap-4">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl overflow-hidden">
        {client.avatar_url
          ? <SignedImg src={client.avatar_url} alt={client.name} className="w-full h-full object-cover" />
          : initials
        }
      </div>
      <div>
        <p className="font-bold text-foreground text-base">{client.name}</p>
        <p className="text-sm text-muted-foreground mt-1">
          Start the conversation with {client.name?.split(' ')[0]} 👋
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2 mt-1">
        {OPENERS.map(text => (
          <button
            key={text}
            onClick={() => onSelect(text)}
            className="text-xs px-3 py-1.5 rounded-full border border-border bg-card hover:bg-accent/10 hover:border-primary hover:text-primary text-foreground transition-all font-medium"
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}