import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ExternalLink, Calendar, Loader2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { getCalendlyUser, getEventTypes, getScheduledEvents } from '@/lib/calendly';
import { addDays, startOfToday } from 'date-fns';

export default function CalendlyConnectModal({ open, onClose }) {
  const queryClient = useQueryClient();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const { data: coachSettingsList = [] } = useQuery({
    queryKey: ['coach-settings'],
    queryFn: () => db.entities.CoachSettings.list(),
  });
  const settings = coachSettingsList[0];
  const isConnected = !!settings?.calendly_connected;

  // Live data when connected
  const { data: eventTypesData } = useQuery({
    queryKey: ['calendly-event-types', settings?.calendly_user_uri],
    queryFn: () => getEventTypes(settings.calendly_user_uri),
    enabled: isConnected && !!settings?.calendly_user_uri,
  });

  const { data: upcomingData } = useQuery({
    queryKey: ['calendly-upcoming-7d', settings?.calendly_user_uri],
    queryFn: () => getScheduledEvents(
      settings.calendly_user_uri,
      startOfToday().toISOString(),
      addDays(startOfToday(), 7).toISOString()
    ),
    enabled: isConnected && !!settings?.calendly_user_uri,
  });

  const eventCount = eventTypesData?.collection?.length ?? 0;
  const upcomingCount = upcomingData?.collection?.length ?? 0;

  const saveMutation = useMutation({
    mutationFn: (data) =>
      settings?.id
        ? db.entities.CoachSettings.update(settings.id, data)
        : db.entities.CoachSettings.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['coach-settings'] }),
  });

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const data = await getCalendlyUser();
      if (data?.resource) {
        setTestResult(data.resource);
        toast.success(`Connected as ${data.resource.name}!`);
      } else {
        toast.error(data?.message || 'Connection failed — check your VITE_CALENDLY_TOKEN');
      }
    } catch (err) {
      toast.error('Connection failed: ' + err.message);
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!testResult) return;
    await saveMutation.mutateAsync({
      calendly_connected: true,
      calendly_user_uri: testResult.uri,
      calendly_scheduling_url: testResult.scheduling_url,
      calendly_username: testResult.slug || testResult.name,
    });
    toast.success('Calendly connected!');
  };

  const handleDisconnect = async () => {
    await saveMutation.mutateAsync({
      calendly_connected: false,
      calendly_user_uri: '',
      calendly_scheduling_url: '',
      calendly_username: '',
    });
    queryClient.invalidateQueries({ queryKey: ['calendly-event-types'] });
    toast.success('Calendly disconnected');
  };

  const copyUrl = (url) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--kc-006bff)]/10 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-[var(--kc-006bff)]" />
            </div>
            Connect Calendly
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-1">
          {isConnected ? (
            /* ── Connected State ── */
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-success/10 border border-success rounded-xl">
                <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-success">Connected</p>
                  {settings?.calendly_username && (
                    <p className="text-xs text-success truncate">{settings.calendly_username}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-background border border-border rounded-xl text-center">
                  <p className="text-xl font-bold text-foreground">{eventCount}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Event Types</p>
                </div>
                <div className="p-3 bg-background border border-border rounded-xl text-center">
                  <p className="text-xl font-bold text-foreground">{upcomingCount}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Bookings (7 days)</p>
                </div>
              </div>

              {settings?.calendly_scheduling_url && (
                <div className="flex items-center gap-2 p-3 bg-card border border-border rounded-xl">
                  <p className="text-xs text-[var(--kc-006bff)] font-mono truncate flex-1">{settings.calendly_scheduling_url}</p>
                  <button onClick={() => copyUrl(settings.calendly_scheduling_url)}
                    className="flex-shrink-0 text-muted-foreground hover:text-primary transition-colors">
                    {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              )}

              <div className="flex gap-2">
                <a href="https://calendly.com/app/dashboard" target="_blank" rel="noreferrer" className="flex-1">
                  <Button variant="outline" className="w-full gap-1.5 text-xs">
                    <ExternalLink className="w-3.5 h-3.5" /> Open Calendly
                  </Button>
                </a>
                <Button variant="outline" className="text-destructive hover:bg-destructive/10 hover:border-destructive text-xs"
                  onClick={handleDisconnect} disabled={saveMutation.isPending}>
                  Disconnect
                </Button>
              </div>
            </div>
          ) : (
            /* ── Setup State ── */
            <div className="space-y-4">
              <div className="bg-accent/10 border border-[var(--kc-006bff)]/20 rounded-xl p-4">
                <p className="text-xs font-semibold text-[var(--kc-006bff)] mb-2">Step 1 — Get your API token</p>
                <ol className="text-xs text-foreground space-y-1.5 list-decimal list-inside leading-relaxed">
                  <li>Go to <a href="https://calendly.com/integrations/api_webhooks" target="_blank"
                    className="text-[var(--kc-006bff)] underline font-medium">calendly.com/integrations/api_webhooks</a></li>
                  <li>Click <strong>Personal Access Tokens</strong> → <strong>Create New Token</strong></li>
                  <li>Copy the token</li>
                  <li>In your environment secrets, add <code className="bg-card border border-border px-1 rounded font-mono text-[10px]">VITE_CALENDLY_TOKEN</code></li>
                </ol>
                <a href="https://calendly.com/integrations/api_webhooks" target="_blank"
                  className="flex items-center gap-1 text-xs text-[var(--kc-006bff)] font-semibold mt-2.5 hover:underline">
                  Open Calendly Integrations <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="bg-background border border-border rounded-xl p-3">
                <p className="text-xs font-semibold text-foreground mb-1">Step 2 — Test your connection</p>
                <p className="text-xs text-muted-foreground">Once the token is saved in secrets, click Test Connection to verify.</p>
              </div>

              {testResult && (
                <div className="flex items-center gap-2 p-3 bg-success/10 border border-success rounded-xl">
                  <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-success">{testResult.name}</p>
                    <p className="text-xs text-success truncate">{testResult.email}</p>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button className="flex-1 bg-[var(--kc-006bff)] hover:bg-[var(--kc-0057d0)]" onClick={handleTest} disabled={testing}>
                  {testing ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> Testing...</> : 'Test Connection'}
                </Button>
                {testResult && (
                  <Button className="flex-1 bg-sidebar hover:bg-sidebar" onClick={handleSave}
                    disabled={saveMutation.isPending}>
                    Save & Connect
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}