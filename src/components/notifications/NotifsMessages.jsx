import React from 'react';
import { NSection, NRow, NDelivery, NSelect, NToggle } from './NotifsHelpers';
import { toast } from 'sonner';

const UNREAD_HOURS = [
  { value: '2', label: 'After 2 hours' }, { value: '4', label: 'After 4 hours' },
  { value: '8', label: 'After 8 hours' }, { value: '24', label: 'After 24 hours' },
];

const DEFAULTS = {
  new_message: { enabled: true, delivery: 'push_email', skip_if_active: true },
  unread_reminder: { enabled: true, delivery: 'push', hours: '4' },
  read_receipt: { enabled: false, delivery: 'push' },
};

export default function NotifsMessages({ s, set }) {
  const d = { ...DEFAULTS, ...(s.messages || {}) };
  const upd = (key, val) => set('messages', { ...d, [key]: { ...d[key], ...val } });

  return (
    <NSection title="Messages"
      onReset={() => set('messages', DEFAULTS)}
      onTest={() => toast.success('Test notification sent for messages')}>

      <NRow enabled={d.new_message.enabled} onToggle={v => upd('new_message', { enabled: v })}
        title="New message from client"
        description="Get notified when a client sends you a message">
        <NDelivery value={d.new_message.delivery} onChange={v => upd('new_message', { delivery: v })} />
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium cursor-pointer">
          <NToggle value={d.new_message.skip_if_active} onChange={v => upd('new_message', { skip_if_active: v })} />
          Skip if I'm active in app
        </label>
      </NRow>

      <NRow enabled={d.unread_reminder.enabled} onToggle={v => upd('unread_reminder', { enabled: v })}
        title="Message unread reminder"
        description="Reminder if you haven't responded to a client message">
        <NDelivery value={d.unread_reminder.delivery} onChange={v => upd('unread_reminder', { delivery: v })} />
        <NSelect value={d.unread_reminder.hours} onChange={v => upd('unread_reminder', { hours: v })} options={UNREAD_HOURS} />
      </NRow>

      <NRow enabled={d.read_receipt.enabled} onToggle={v => upd('read_receipt', { enabled: v })}
        title="Client viewed your message"
        description="Notify when a client reads your message (read receipts)">
        <NDelivery value={d.read_receipt.delivery} onChange={v => upd('read_receipt', { delivery: v })} />
      </NRow>
    </NSection>
  );
}