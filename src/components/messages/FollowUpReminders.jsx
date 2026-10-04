import React, { useState, useMemo } from 'react';
import { Bell, Sparkles, Loader2, X } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { db } from '@/api/supabaseClient';

const FOLLOW_UP_THRESHOLD_DAYS = 5;

export default function FollowUpReminders({ clients, allMessages, checkIns, onSelectClient, onInsertMessage }) {
  const [generating, setGenerating] = useState(null);
  const [dismissed, setDismissed] = useState(new Set());

  const reminders = useMemo(() => {
    return clients
      .filter(c => c.lifecycle_status === 'active' || !c.lifecycle_status)
      .map(c => {
        const clientMsgs = allMessages.filter(m => m.client_id === c.id && m.sender === 'coach');
        const lastMsg = [...clientMsgs].sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
        const daysSince = lastMsg ? differenceInDays(new Date(), new Date(lastMsg.created_date)) : 999;
        const lastCI = [...checkIns.filter(ci => ci.client_id === c.id)].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
        return { client: c, daysSince, lastCI };
      })
      .filter(r => r.daysSince >= FOLLOW_UP_THRESHOLD_DAYS && !dismissed.has(r.client.id))
      .sort((a, b) => b.daysSince - a.daysSince)
      .slice(0, 5);
  }, [clients, allMessages, checkIns, dismissed]);

  const generateFollowUp = async (reminder) => {
    setGenerating(reminder.client.id);
    try {
      const res = await db.functions.invoke('aiMessageAssistant', {
        action: 'followUpSuggestions',
        client: reminder.client,
        checkIn: reminder.lastCI,
        daysSince: reminder.daysSince,
      });
      const msg = res.data?.message || '';
      onSelectClient(reminder.client.id);
      setTimeout(() => onInsertMessage(msg), 300);
    } catch (e) {}
    setGenerating(null);
  };

  if (reminders.length === 0) return null;

  return (
    <div className="border-b border-border bg-warning/60 px-4 py-2.5">
      <div className="flex items-center gap-1.5 mb-2">
        <Bell className="w-3.5 h-3.5 text-warning" />
        <span className="text-[11px] font-bold text-warning">Follow-up Reminders</span>
      </div>
      <div className="space-y-1.5">
        {reminders.map(r => (
          <div key={r.client.id} className="flex items-center gap-2 bg-card rounded-lg px-2.5 py-2 border border-warning shadow-sm">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-foreground truncate">
                You haven't messaged {r.client.name?.split(' ')[0]} in {r.daysSince} days
              </p>
              {r.lastCI && (
                <p className="text-[10px] text-muted-foreground">
                  Last check-in: mood {r.lastCI.mood}, {r.lastCI.compliance_training}% training
                </p>
              )}
            </div>
            <button
              onClick={() => generateFollowUp(r)}
              disabled={generating === r.client.id}
              className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-warning text-white hover:bg-warning transition-colors disabled:opacity-60 flex-shrink-0"
            >
              {generating === r.client.id
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <Sparkles className="w-3 h-3" />
              }
              Message
            </button>
            <button
              onClick={() => setDismissed(prev => new Set([...prev, r.client.id]))}
              className="text-muted-foreground hover:text-muted-foreground flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}