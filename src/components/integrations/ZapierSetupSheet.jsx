import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { CheckCircle2, Zap, Send, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

const EVENT_GROUPS = [
  {
    label: 'Client Events',
    events: [
      { key: 'client.created', label: 'New client added' },
      { key: 'client.status_changed', label: 'Client status changed' },
      { key: 'client.at_risk', label: 'Client marked at-risk' },
    ],
  },
  {
    label: 'Check-In Events',
    events: [
      { key: 'checkin.submitted', label: 'New check-in submitted' },
      { key: 'checkin.reviewed', label: 'Check-in reviewed by coach' },
      { key: 'checkin.low_compliance', label: 'Compliance drops below 60%' },
    ],
  },
  {
    label: 'Nutrition Events',
    events: [
      { key: 'nutrition_plan.created', label: 'Nutrition plan created' },
      { key: 'nutrition_plan.assigned', label: 'Nutrition plan assigned to client' },
    ],
  },
  {
    label: 'Achievement Events',
    events: [
      { key: 'badge.awarded', label: 'Badge awarded to client' },
      { key: 'badge.streak_milestone', label: 'Client hits streak milestone' },
    ],
  },
  {
    label: 'Program Events',
    events: [
      { key: 'program.assigned', label: 'Program assigned to client' },
    ],
  },
];

const DEFAULT_EVENTS = [
  'client.created', 'checkin.submitted', 'checkin.reviewed',
  'nutrition_plan.created', 'badge.awarded', 'program.assigned',
];

export default function ZapierSetupSheet({ open, onClose }) {
  const queryClient = useQueryClient();
  const [webhookUrl, setWebhookUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState(DEFAULT_EVENTS);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // 'success' | 'error'

  const { data: settings = [] } = useQuery({
    queryKey: ['coach-settings'],
    queryFn: () => db.entities.CoachSettings.list(),
    enabled: open,
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['zapier-logs'],
    queryFn: () => db.entities.ZapierLog.list('-sent_at', 10),
    enabled: open,
  });

  const currentSettings = settings[0];

  useEffect(() => {
    if (currentSettings) {
      setWebhookUrl(currentSettings.zapier_webhook_url || '');
      setSelectedEvents(currentSettings.zapier_events?.length ? currentSettings.zapier_events : DEFAULT_EVENTS);
    }
  }, [currentSettings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        zapier_webhook_url: webhookUrl,
        zapier_events: selectedEvents,
        zapier_connected: !!webhookUrl,
      };
      if (currentSettings?.id) {
        return db.entities.CoachSettings.update(currentSettings.id, payload);
      } else {
        return db.entities.CoachSettings.create(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach-settings'] });
      toast.success('Zapier webhook saved!');
    },
  });

  const handleTest = async () => {
    if (!webhookUrl) { toast.error('Enter a webhook URL first'); return; }
    setTesting(true);
    setTestResult(null);
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'test',
          timestamp: new Date().toISOString(),
          app: 'KOACH AI',
          data: {
            client_name: 'Test Client',
            message: 'KOACH AI is successfully connected to Zapier!',
          },
        }),
      });
      setTestResult('success');
      toast.success('✓ Test event sent! Check your Zapier dashboard.');
    } catch {
      setTestResult('error');
      toast.error('✗ Failed to reach webhook. Check the URL and try again.');
    } finally {
      setTesting(false);
    }
  };

  const toggleEvent = (key) => {
    setSelectedEvents(prev =>
      prev.includes(key) ? prev.filter(e => e !== key) : [...prev, key]
    );
  };

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0">
        {/* Header */}
        <div className="bg-sidebar px-6 pt-6 pb-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-[var(--kc-ff4a00)] flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <SheetTitle className="text-white text-lg font-bold">Connect Zapier to KOACH AI</SheetTitle>
          </div>
          <p className="text-sm text-white/50">Automate workflows when coaching events happen in KOACH AI.</p>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Step 1: Webhook URL */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-sidebar text-white text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
              <p className="font-semibold text-foreground text-sm">Paste your Zapier Webhook URL</p>
            </div>
            <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
              In Zapier, create a new Zap → Trigger: <strong>Webhooks by Zapier</strong> → Event: <strong>Catch Hook</strong> → Copy the webhook URL and paste it here.
            </p>
            <Input
              placeholder="https://hooks.zapier.com/hooks/catch/..."
              value={webhookUrl}
              onChange={e => setWebhookUrl(e.target.value)}
              className="text-sm font-mono"
            />
            <div className="flex gap-2 mt-2">
              <Button size="sm" variant="outline" onClick={handleTest} disabled={testing || !webhookUrl} className="text-xs">
                {testing ? 'Sending...' : 'Test Connection'}
              </Button>
              {testResult === 'success' && (
                <span className="flex items-center gap-1 text-xs text-success font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                </span>
              )}
              {testResult === 'error' && (
                <span className="flex items-center gap-1 text-xs text-destructive font-medium">
                  <AlertCircle className="w-3.5 h-3.5" /> Failed
                </span>
              )}
            </div>
          </div>

          {/* Step 2: Events */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-sidebar text-white text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
              <p className="font-semibold text-foreground text-sm">Choose trigger events</p>
            </div>
            <div className="space-y-4">
              {EVENT_GROUPS.map(group => (
                <div key={group.label}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">{group.label}</p>
                  <div className="space-y-1">
                    {group.events.map(ev => (
                      <label key={ev.key}
                        className="flex items-center gap-3 p-2.5 rounded-xl border border-border cursor-pointer hover:bg-background transition-colors">
                        <div
                          onClick={() => toggleEvent(ev.key)}
                          className={cn(
                            'w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer',
                            selectedEvents.includes(ev.key) ? 'bg-sidebar border-foreground' : 'border-muted-foreground'
                          )}
                        >
                          {selectedEvents.includes(ev.key) && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <span className="text-sm text-foreground">{ev.label}</span>
                        <span className="ml-auto text-[10px] font-mono text-muted-foreground">{ev.key}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Step 3: Send test */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-sidebar text-white text-xs font-bold flex items-center justify-center flex-shrink-0">3</span>
              <p className="font-semibold text-foreground text-sm">Send a test event</p>
            </div>
            <div className="bg-background border border-border rounded-xl p-3 mb-3">
              <pre className="text-xs text-foreground whitespace-pre-wrap font-mono">{JSON.stringify({
                event: "test",
                timestamp: new Date().toISOString(),
                app: "KOACH AI",
                data: { client_name: "Test Client", message: "KOACH AI is successfully connected to Zapier!" }
              }, null, 2)}</pre>
            </div>
            <Button size="sm" variant="outline" onClick={handleTest} disabled={testing || !webhookUrl} className="gap-2 text-xs">
              <Send className="w-3.5 h-3.5" />
              {testing ? 'Sending...' : 'Send Test Event'}
            </Button>
          </div>

          {/* Recent logs */}
          {logs.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Recent Events</p>
              <div className="space-y-1.5">
                {logs.slice(0, 10).map(log => (
                  <div key={log.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-border bg-card">
                    <div className={cn('w-2 h-2 rounded-full flex-shrink-0', log.success !== false ? 'bg-success' : 'bg-destructive')} />
                    <span className="text-xs font-mono text-foreground flex-1 truncate">{log.event_type}</span>
                    {log.client_name && <span className="text-xs text-muted-foreground truncate max-w-[100px]">{log.client_name}</span>}
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1 flex-shrink-0">
                      <Clock className="w-3 h-3" />
                      {log.sent_at ? formatDistanceToNow(new Date(log.sent_at), { addSuffix: true }) : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Last triggered info */}
          {currentSettings?.zapier_last_triggered && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Last triggered {formatDistanceToNow(new Date(currentSettings.zapier_last_triggered), { addSuffix: true })}
            </p>
          )}

          {/* Save */}
          <Button
            className="w-full bg-sidebar hover:bg-sidebar text-white"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? 'Saving...' : 'Save Webhook Settings'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}