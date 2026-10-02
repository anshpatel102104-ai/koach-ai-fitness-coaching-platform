import React from 'react';
import { User, ClipboardList, MoreVertical, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { SignedImg } from '@/components/shared/SignedImage';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

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

export default function ConversationHeader({ client, allMessages, onLogCheckIn, onBack }) {
  const navigate = useNavigate();
  const online = isOnline(client, allMessages);
  const seen = lastSeen(client, allMessages);
  const initials = (client.name || '?').split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="flex-shrink-0">
      <div className="h-14 md:h-16 flex items-center px-4 md:px-5 bg-card gap-3">
        {/* Back on mobile */}
        <button onClick={onBack} className="md:hidden -ml-1 p-1.5 rounded-lg hover:bg-secondary transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm overflow-hidden">
            {client.avatar_url
              ? <SignedImg src={client.avatar_url} alt={client.name} className="w-full h-full object-cover" />
              : initials
            }
          </div>
          {online && (
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-success border-2 border-white animate-pulse" />
          )}
        </div>

        {/* Name + status */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground truncate leading-tight">{client.name}</p>
          <p className="text-xs truncate leading-tight">
            {online
              ? <span className="text-success font-medium">Online now</span>
              : seen
                ? <span className="text-muted-foreground">Last seen {seen}</span>
                : <span className="text-muted-foreground">{client.email}</span>
            }
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => navigate(`/client-profile?clientId=${client.id}`)}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title="View Profile"
          >
            <User className="w-4 h-4" />
          </button>
          <button
            onClick={onLogCheckIn}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title="Log Check-in"
          >
            <ClipboardList className="w-4 h-4" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                <MoreVertical className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => navigate(`/client-profile?clientId=${client.id}`)}>
                <ExternalLink className="w-4 h-4 mr-2" /> View Full Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`/checkin-review?clientId=${client.id}`)}>
                <ClipboardList className="w-4 h-4 mr-2" /> Check-in History
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="h-px bg-border" />
    </div>
  );
}