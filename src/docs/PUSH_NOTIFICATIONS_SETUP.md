# Push Notifications Setup Guide

## Quick Start

### 1. Generate VAPID Keys

VAPID (Voluntary Application Server Identification) keys are required for web push notifications.

```bash
# Install web-push CLI globally
npm install -g web-push

# Generate keys (do this once)
web-push generate-vapid-keys

# Output will look like:
# Public Key: BFfx...
# Private Key: 3Ks...
```

### 2. Store Keys as Secrets

Store in your app's secrets (Environment Variables):

```
VAPID_PUBLIC_KEY = "BFfx..."
VAPID_PRIVATE_KEY = "3Ks..."
```

**IMPORTANT:** 
- Public key is sent to clients (safe to expose)
- Private key is ONLY server-side (keep secure!)
- Keep a backup of these keys — regenerating requires updating all existing subscriptions

### 3. Service Worker

The service worker is already set up at `public/sw.js` and handles:
- Push notification reception
- Notification display
- Click and action button handling
- Offline caching

### 4. Backend Functions

Two functions are already created:

**`getPushPublicKey`** — Returns public VAPID key to client
- Called by frontend to enable push subscription

**`storePushSubscription`** — Stores push subscription in database
- Called after user enables notifications
- Subscription stored per device

### 5. Frontend Integration

The notification prompt is integrated into `pages/ClientPortal`:

```javascript
<NotificationPrompt
  isOpen={showNotifPrompt}
  onEnable={handleEnableNotifications}
  onDismiss={() => setShowNotifPrompt(false)}
/>
```

Timing:
- Triggered after 3rd portal visit (iOS) 
- Triggered after onboarding completion (iOS + Android)
- Never on first app open
- Won't ask again for 14 days if user denies

---

## Sending Push Notifications

### From a Backend Function

```javascript
import { createClient } from 'npm:@supabase/supabase-js@2';

const db = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

Deno.serve(async (req) => {
  const { clientId, title, body } = await req.json();
  
  // 1. Get push subscriptions for this client
  const { data: subscriptions } = await db
    .from('push_subscriptions')
    .select('*')
    .eq('client_id', clientId);

  // 2. Send to each subscription
  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY');
  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY');

  for (const sub of subscriptions) {
    const subscription = JSON.parse(sub.subscription_json);
    
    await sendWebPush(subscription, {
      title,
      body,
      icon: '/icon-192x192.png',
      badge: '/icon-badge.png',
      tag: 'notification',
      data: { url: '/portal' },
    }, {
      vapidDetails: {
        subject: 'mailto:noreply@koachai.com',
        publicKey,
        privateKey,
      },
    });
  }

  return Response.json({ sent: subscriptions.length });
});
```

### Notification Payload Structure

```javascript
{
  title: "Coach Message",           // Notification title
  body: "Alex replied to your...",  // Notification body
  icon: "/icon-192x192.png",        // Large icon
  badge: "/icon-badge.png",         // Small badge icon
  tag: "messages",                  // Group similar notifications
  vibrate: [100, 50, 100],          // Vibration pattern
  sound: "notification.mp3",        // Sound file
  requireInteraction: false,        // Keep on screen
  data: {                           // Custom data
    url: "/portal/messages",
    id: "msg_123",
  },
  actions: [                        // Action buttons
    {
      action: "reply",
      title: "Reply",
      icon: "/icon-reply.png",
    },
    {
      action: "view",
      title: "View",
      icon: "/icon-view.png",
    }
  ],
}
```

---

## Notification Types & Configuration

### Message Notification
```javascript
{
  title: `${coachName} replied to your message`,
  body: message.content.substring(0, 100),
  tag: 'messages',
  vibrate: [100, 50, 100],  // Double pulse
  data: { url: '/portal/messages' },
  actions: [
    { action: 'reply', title: 'Reply' },
    { action: 'view', title: 'View' }
  ],
  requireInteraction: true,  // Keep until interacted
}
```

### Check-in Reminder
```javascript
{
  title: 'Weekly Check-in Due',
  body: 'Your coach is waiting for your check-in',
  tag: 'checkin',
  vibrate: [50, 30, 50],  // Single pulse
  data: { url: '/portal/checkin' },
  actions: [
    { action: 'start', title: 'Start Check-in' },
    { action: 'snooze', title: 'Remind in 1h' }
  ],
}
```

### Achievement Unlocked
```javascript
{
  title: '🏆 Achievement Unlocked!',
  body: '30-day streak — Consistency Master',
  tag: 'achievement',
  vibrate: [200, 100, 50, 100, 200],  // Celebration pulse
  data: { url: '/portal/progress' },
  actions: [
    { action: 'view', title: 'View Achievement' },
    { action: 'share', title: 'Share' }
  ],
}
```

### Workout Reminder
```javascript
{
  title: 'Time to Train',
  body: 'Push Day is ready — tap to start',
  tag: 'workout',
  vibrate: [50, 30, 50],
  data: { url: '/portal/workouts' },
  actions: [
    { action: 'start', title: 'Start Workout' },
    { action: 'rest', title: 'Rest Day' }
  ],
}
```

### Payment Due
```javascript
{
  title: 'Invoice Due Today',
  body: 'Your monthly coaching fee is due',
  tag: 'payment',
  vibrate: [100, 50, 100, 50, 100],  // Triple pulse (urgent)
  data: { url: '/portal/billing' },
  actions: [
    { action: 'pay', title: 'Pay Now' },
  ],
  requireInteraction: true,
}
```

---

## Testing Push Notifications

### Test in Browser DevTools

1. Open DevTools (F12)
2. Go to Application tab
3. Find Service Workers section
4. Your service worker should be listed
5. Click "Inspect" to see logs

### Test with curl (development)

```bash
# First, get a subscription from browser console:
# navigator.serviceWorker.ready.then(sw => {
#   sw.pushManager.getSubscription().then(sub => {
#     console.log(JSON.stringify(sub));
#   });
# });

curl -X POST http://localhost:8080/api/test-push \
  -H "Content-Type: application/json" \
  -d '{
    "subscription": { ... },
    "title": "Test Notification",
    "body": "This is a test"
  }'
```

### Android Testing

1. Open Chrome DevTools
2. Go to Notifications section
3. See list of active subscriptions
4. Click "Send test notification" (if available)

### iOS Testing

Since iOS PWA push requires the app to be installed to home screen:

1. Open Safari on iOS 16.4+
2. Navigate to your app
3. Tap Share > Add to Home Screen
4. Install as app
5. Launch app from home screen
6. Grant notification permission when prompted
7. Test push notifications via your backend

---

## Push Notification Limits

### Android Chrome
- Max 5,000 concurrent subscriptions per origin
- Notifications expire after 4 weeks if not delivered
- Some Android manufacturers (Samsung, Xiaomi) have their own restrictions

### iOS Safari PWA
- Requires iOS 16.4 or later
- App must be installed to home screen (not just browser)
- Subscriptions are more volatile (can be revoked by OS)
- Background notification delivery less reliable than native apps

### Frequency Limits
- No official limit, but sending too many (>10/day) will hurt retention
- Recommended: 1-3 notifications per day max
- Always provide easy "disable" option

---

## Troubleshooting

### Push notifications not showing

**Browser console shows errors?**
- Check that service worker is registered: `navigator.serviceWorker.getRegistrations()`
- Check manifest.json is linked in HTML
- Check VAPID keys are correct and stored as secrets

**iOS push not working?**
- App must be installed to home screen (not just bookmarked)
- iOS 16.4+ required
- Check Settings > Safari > Notifications is enabled for your domain
- Push may not show if app is already open (in focus)

**Android push not working?**
- Check Chrome version (must support Push API)
- Verify notification permission granted
- Check Android Vitals in Play Console for crash logs

### Service worker not updating

Service workers are cached aggressively. To force update:

1. **Dev:** Hard refresh (Cmd+Shift+R or Ctrl+Shift+R)
2. **Production:** Update version in CACHE_NAME constant
3. **Users:** Will auto-update on next visit

### Subscriptions lost after update

If you change VAPID keys, existing subscriptions become invalid. Plan key rotation carefully:
1. Gradually deprecate old key over 2-4 weeks
2. Continue accepting old subscriptions briefly
3. Clear old subscriptions from database
4. Enable new key

---

## Monitoring & Analytics

### Track Notification Engagement

Store notification events in database:

```javascript
await db.from('notification_logs').insert({
  client_id: user.id,
  type: 'notification_sent',
  notification_type: 'message',
  recipient_id: recipientId,
  timestamp: new Date().toISOString(),
});
```

Then calculate:
- **Delivery rate** = delivered / sent
- **Click-through rate** = clicked / delivered
- **Engagement rate** = clicked / sent

### App Store & Play Console Monitoring

**iOS:**
- App Store Connect > Analytics > Usage
- Monitor notification-related crashes
- Track user retention by notification frequency

**Android:**
- Google Play Console > User Reviews
- Monitor for complaints about notifications
- Track ANRs (Application Not Responding) related to push

---

## Privacy & User Control

### Always Provide Easy Opt-out

In-app Settings page:
```
Notifications
  - Messages: [Toggle ON/OFF]
  - Reminders: [Toggle ON/OFF]
  - Achievements: [Toggle ON/OFF]
  - Manage in Device Settings [Link]
```

### Unsubscribe from Push

```javascript
const registration = await navigator.serviceWorker.ready;
const subscription = await registration.pushManager.getSubscription();
if (subscription) {
  await subscription.unsubscribe();
}
```

### Respect Quiet Hours

```javascript
const notificationTime = new Date(notification.timestamp);
const hour = notificationTime.getHours();

// Don't send between 10pm - 7am
if (hour >= 22 || hour < 7) {
  // Either don't send, or set requireInteraction: false
}
```

---

## Resources

- [Web Push Protocol](https://tools.ietf.org/html/draft-thomson-webpush-protocol)
- [Push API Spec](https://w3c.github.io/push-api/)
- [Notification API](https://developer.mozilla.org/en-US/docs/Web/API/Notification_API)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [web-push npm package](https://www.npmjs.com/package/web-push)
- [iOS PWA Push Guide](https://developer.apple.com/documentation/usernotifications)