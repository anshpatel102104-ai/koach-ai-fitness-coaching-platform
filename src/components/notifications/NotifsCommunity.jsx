import React from 'react';
import { NSection, NRow, NDelivery, NToggle } from './NotifsHelpers';
import { toast } from 'sonner';

const DEFAULTS = {
  new_post: { enabled: false, delivery: 'push', flagged_only: true },
  post_reported: { enabled: true, delivery: 'push_email' },
  group_chat: { enabled: false, delivery: 'push' },
};

export default function NotifsCommunity({ s, set }) {
  const d = { ...DEFAULTS, ...(s.community || {}) };
  const upd = (key, val) => set('community', { ...d, [key]: { ...d[key], ...val } });

  return (
    <NSection title="Community"
      onReset={() => set('community', DEFAULTS)}
      onTest={() => toast.success('Test notification sent for community')}>

      <NRow enabled={d.new_post.enabled} onToggle={v => upd('new_post', { enabled: v })}
        title="New community post"
        description="Notify when a client posts in the community">
        <NDelivery value={d.new_post.delivery} onChange={v => upd('new_post', { delivery: v })} />
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium cursor-pointer">
          <NToggle value={d.new_post.flagged_only} onChange={v => upd('new_post', { flagged_only: v })} />
          Only flagged/reported content
        </label>
      </NRow>

      <NRow enabled={d.post_reported.enabled} onToggle={v => upd('post_reported', { enabled: v })}
        title="Post reported"
        description="Alert when a community post is reported by a member">
        <NDelivery value={d.post_reported.delivery} onChange={v => upd('post_reported', { delivery: v })} />
      </NRow>

      <NRow enabled={d.group_chat.enabled} onToggle={v => upd('group_chat', { enabled: v })}
        title="New group chat message"
        description="Notify when someone posts in the group chat">
        <NDelivery value={d.group_chat.delivery} onChange={v => upd('group_chat', { delivery: v })} />
      </NRow>
    </NSection>
  );
}