import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, ExternalLink, Loader2 } from 'lucide-react';
import { SettingsPanel } from '@/components/settings/SettingsLayout';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';
import { userMessage } from '@/lib/appErrors';

// ── Logo helper (third-party brand colours stay as-is) ─────────
function Logo({ text, bg, textColor = 'text-white' }) {
  return (
    <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0 ${bg} ${textColor}`}>
      {text}
    </div>
  );
}

// ── Integration row ───────────────────────────────────────────
function IntegrationCard({ logo, name, tag, description, connected, onConnect, onManage }) {
  return (
    <div className="flex items-start gap-4 py-4">
      {logo}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[15px] font-semibold text-foreground">{name}</p>
          <span className="text-[13px] text-muted-foreground">{tag}</span>
          {connected && <Badge variant="success" className="gap-1"><CheckCircle2 className="w-3 h-3" /> Connected</Badge>}
        </div>
        <p className="text-sm text-muted-foreground mt-0.5 leading-snug">{description}</p>
      </div>
      <div className="flex-shrink-0">
        {connected ? (
          <Button variant="outline" size="sm" onClick={onManage}>Manage</Button>
        ) : (
          <Button size="sm" onClick={onConnect}>Connect</Button>
        )}
      </div>
    </div>
  );
}

// Numbered setup steps used inside each connect dialog.
function SetupSteps({ children, link }) {
  return (
    <div className="rounded-lg bg-secondary p-4">
      <p className="text-[13px] font-semibold text-foreground mb-2">How to set it up</p>
      <ol className="text-sm text-foreground space-y-1.5 list-decimal list-inside leading-relaxed">{children}</ol>
      {link}
    </div>
  );
}

// ── Zapier Modal ──────────────────────────────────────────────
function ZapierModal({ open, onClose, settings }) {
  const queryClient = useQueryClient();
  const [webhookUrl, setWebhookUrl] = useState(settings?.zapier_webhook_url || '');

  const saveMutation = useMutation({
    mutationFn: (data) =>
      settings?.id
        ? db.entities.CoachSettings.update(settings.id, data)
        : db.entities.CoachSettings.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach-settings'] });
      toast.success('Zapier webhook saved');
      onClose();
    },
  });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--kc-ff4a00)] flex items-center justify-center text-white font-bold text-sm">Z</div>
            Connect Zapier
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-1">
          <SetupSteps>
            <li>Go to <a href="https://zapier.com" target="_blank" rel="noreferrer" className="underline underline-offset-2 font-medium">zapier.com</a> and create a new Zap</li>
            <li>Choose <strong>Webhooks by Zapier</strong> as the trigger</li>
            <li>Select <strong>Catch Hook</strong> and copy the webhook URL</li>
            <li>Paste it below and save</li>
          </SetupSteps>
          <div>
            <Label className="mb-1.5 block">Webhook URL</Label>
            <Input
              value={webhookUrl}
              onChange={e => setWebhookUrl(e.target.value)}
              placeholder="https://hooks.zapier.com/hooks/catch/..."
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button
              className="flex-1"
              onClick={() => saveMutation.mutate({ zapier_webhook_url: webhookUrl, zapier_connected: !!webhookUrl })}
              disabled={!webhookUrl || saveMutation.isPending}
            >
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Resend Modal ──────────────────────────────────────────────
function ResendModal({ open, onClose, settings }) {
  // Client email is a platform service: KOACH sends it from its own verified
  // sender (server env FROM_EMAIL/FROM_NAME via sendEmailNotification). There
  // is no key for a coach to add and no per-coach sender. (This dialog used to
  // ask coaches to put an API key in a VITE_ variable — which would ship it to
  // every browser — and its "Test connection" reported success without testing.)
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [sending, setSending] = useState(false);
  const enabled = !!settings?.resend_connected;

  const saveMutation = useMutation({
    mutationFn: (data) =>
      settings?.id
        ? db.entities.CoachSettings.update(settings.id, data)
        : db.entities.CoachSettings.create(data),
    onSuccess: (_row, data) => {
      queryClient.invalidateQueries({ queryKey: ['coach-settings'] });
      toast.success(data.resend_connected ? 'Welcome emails turned on' : 'Welcome emails turned off');
      onClose();
    },
  });

  const sendTest = async () => {
    if (!user?.email) return;
    setSending(true);
    try {
      await db.functions.invoke('sendEmailNotification', {
        to: user.email,
        subject: 'KOACH test email',
        html: '<p>This is a test from KOACH. If you can read it, emails to you are being delivered.</p>',
      });
      toast.success(`Test email sent to ${user.email}. It can take a minute to arrive.`);
    } catch (err) {
      toast.error(userMessage(err, "The test email couldn't be sent. Please contact support."));
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Client emails</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-1">
          <p className="text-sm text-muted-foreground">
            KOACH emails your clients for you: invites, check-in reminders and, if you turn them on, a welcome email when you add a client. There is nothing to connect.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={sendTest} disabled={sending} className="flex-1">
              {sending ? <><Loader2 className="animate-spin" /> Sending</> : 'Send me a test email'}
            </Button>
            <Button
              className="flex-1"
              onClick={() => saveMutation.mutate({ resend_connected: !enabled })}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : enabled ? 'Turn off welcome emails' : 'Turn on welcome emails'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Zoom Modal ────────────────────────────────────────────────
function ZoomModal({ open, onClose, settings }) {
  const queryClient = useQueryClient();
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');

  const saveMutation = useMutation({
    mutationFn: (data) =>
      settings?.id
        ? db.entities.CoachSettings.update(settings.id, data)
        : db.entities.CoachSettings.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach-settings'] });
      toast.success('Zoom connected');
      onClose();
    },
  });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--kc-2d8cff)] flex items-center justify-center text-white font-bold text-sm">Z</div>
            Connect Zoom
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-1">
          <SetupSteps link={
            <a href="https://marketplace.zoom.us/develop/create" target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm text-foreground font-semibold mt-3 underline underline-offset-4">
              Open Zoom Marketplace <ExternalLink className="w-3.5 h-3.5" />
            </a>
          }>
            <li>Go to <a href="https://marketplace.zoom.us/develop/create" target="_blank" rel="noreferrer" className="underline underline-offset-2 font-medium">Zoom Marketplace</a></li>
            <li>Create an <strong>OAuth app</strong></li>
            <li>Copy your Client ID and Client Secret</li>
          </SetupSteps>
          <div>
            <Label className="mb-1.5 block">Client ID</Label>
            <Input value={clientId} onChange={e => setClientId(e.target.value)} placeholder="Your Zoom Client ID" />
          </div>
          <div>
            <Label className="mb-1.5 block">Client secret</Label>
            <Input value={clientSecret} onChange={e => setClientSecret(e.target.value)} placeholder="Your Zoom Client Secret" type="password" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button
              className="flex-1"
              onClick={() => saveMutation.mutate({ zoom_connected: true })}
              disabled={!clientId || !clientSecret || saveMutation.isPending}
            >
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save and connect'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Calendly Modal ────────────────────────────────────────────
function CalendlyModal({ open, onClose, settings }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState('');

  const saveMutation = useMutation({
    mutationFn: (data) =>
      settings?.id
        ? db.entities.CoachSettings.update(settings.id, data)
        : db.entities.CoachSettings.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach-settings'] });
      toast.success('Calendly connected');
      onClose();
    },
  });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--kc-006bff)] flex items-center justify-center text-white font-bold text-sm">C</div>
            Connect Calendly
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-1">
          <SetupSteps>
            <li>Go to <a href="https://app.calendly.com/integrations/api_webhooks" target="_blank" rel="noreferrer" className="underline underline-offset-2 font-medium">Calendly integrations</a></li>
            <li>Generate a personal access token</li>
            <li>Paste it below</li>
          </SetupSteps>
          <div>
            <Label className="mb-1.5 block">Personal access token</Label>
            <Input value={token} onChange={e => setToken(e.target.value)} placeholder="eyJhbGci..." type="password" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button
              className="flex-1"
              onClick={() => saveMutation.mutate({ calendly_connected: true })}
              disabled={!token || saveMutation.isPending}
            >
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save and connect'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main component ────────────────────────────────────────────
export default function IntegrationsTab() {
  const navigate = useNavigate();
  const [modal, setModal] = useState(null); // 'zapier' | 'resend' | 'zoom' | 'calendly'

  const { data: settingsList = [] } = useQuery({
    queryKey: ['coach-settings'],
    queryFn: () => db.entities.CoachSettings.list(),
  });
  const settings = settingsList[0];

  // SECURITY (S3): do NOT derive "connected" from VITE_* secrets — referencing
  // them inlines their values into the browser bundle. Connection state comes
  // from server-managed settings flags only.
  const stripeConnected = !!settings?.stripe_connected;
  const calendlyConnected = !!settings?.calendly_connected;
  const resendConnected = !!settings?.resend_connected;
  const zapierConnected = !!settings?.zapier_webhook_url;
  const zoomConnected = !!settings?.zoom_connected;
  const gcalConnected = !!settings?.google_calendar_connected;

  const integrations = [
    {
      logo: <Logo text="S" bg="bg-[var(--kc-6772e5)]" />,
      name: 'Stripe',
      tag: 'Payments',
      description: 'Accept payments, manage subscriptions, and track revenue from clients.',
      connected: stripeConnected,
      onConnect: () => navigate('/revenue'),
      onManage: () => navigate('/revenue'),
    },
    {
      logo: <Logo text="G" bg="bg-[var(--kc-4285f4)]" />,
      name: 'Google Calendar',
      tag: 'Scheduling',
      description: 'Sync sessions, schedule calls, and manage availability directly from Google Calendar.',
      connected: gcalConnected,
      onConnect: () => navigate('/schedule'),
      onManage: () => navigate('/schedule'),
    },
    {
      logo: <Logo text="C" bg="bg-[var(--kc-006bff)]" />,
      name: 'Calendly',
      tag: 'Scheduling',
      description: 'Share booking links with clients and auto-sync new bookings to your calendar.',
      connected: calendlyConnected,
      onConnect: () => setModal('calendly'),
      onManage: () => setModal('calendly'),
    },
    {
      logo: <Logo text="@" bg="bg-primary" textColor="text-primary-foreground" />,
      name: 'Client emails',
      tag: 'Email',
      description: 'Invites and check-in reminders are always on. Turn welcome emails for new clients on or off.',
      connected: resendConnected,
      onConnect: () => setModal('resend'),
      onManage: () => setModal('resend'),
    },
    {
      logo: <Logo text="Z" bg="bg-[var(--kc-ff4a00)]" />,
      name: 'Zapier',
      tag: 'Automation',
      description: 'Send KOACH events to 5,000+ apps. Trigger a Zap when a client checks in, earns a badge or hits a milestone.',
      connected: zapierConnected,
      onConnect: () => setModal('zapier'),
      onManage: () => setModal('zapier'),
    },
    {
      logo: <Logo text="Z" bg="bg-[var(--kc-2d8cff)]" />,
      name: 'Zoom',
      tag: 'Video',
      description: 'Create and launch coaching calls directly from client profiles. Auto-send join links to clients.',
      connected: zoomConnected,
      onConnect: () => setModal('zoom'),
      onManage: () => setModal('zoom'),
    },
  ];

  return (
    <>
      <SettingsPanel
        title="Integrations"
        subtitle={`${integrations.filter(i => i.connected).length} of ${integrations.length} connected. Stripe is how clients pay you directly.`}
      >
        {integrations.map(i => (
          <IntegrationCard key={i.name} {...i} />
        ))}
      </SettingsPanel>

      <p className="text-sm text-muted-foreground">
        Twilio SMS, Strava, Fitbit and QuickBooks are next on the list.
      </p>

      <ZapierModal open={modal === 'zapier'} onClose={() => setModal(null)} settings={settings} />
      <ResendModal open={modal === 'resend'} onClose={() => setModal(null)} settings={settings} />
      <ZoomModal open={modal === 'zoom'} onClose={() => setModal(null)} settings={settings} />
      <CalendlyModal open={modal === 'calendly'} onClose={() => setModal(null)} settings={settings} />
    </>
  );
}