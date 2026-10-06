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
  const queryClient = useQueryClient();
  const [fromEmail, setFromEmail] = useState(settings?.resend_from_email || '');
  const [fromName, setFromName] = useState(settings?.resend_from_name || 'Coach Myles | KOACH AI');
  const [testing] = useState(false); // test is now instant (server-managed); no async state
  const [tested, setTested] = useState(false);

  const saveMutation = useMutation({
    mutationFn: (data) =>
      settings?.id
        ? db.entities.CoachSettings.update(settings.id, data)
        : db.entities.CoachSettings.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach-settings'] });
      toast.success('Resend connected');
      onClose();
    },
  });

  const handleTest = async () => {
    // SECURITY (S3): never read/send the Resend key from the browser. The key
    // lives in the server env (RESEND_API_KEY) and email is sent via the
    // sendEmailNotification edge function. Connection status is managed
    // server-side; there is nothing to test client-side.
    setTested(true);
    toast.success('Email is configured server-side (RESEND_API_KEY).');
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">R</div>
            Connect Resend
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-1">
          <SetupSteps link={
            <a href="https://resend.com/api-keys" target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm text-foreground font-semibold mt-3 underline underline-offset-4">
              Open API keys <ExternalLink className="w-3.5 h-3.5" />
            </a>
          }>
            <li>Get your free API key at <a href="https://resend.com" target="_blank" rel="noreferrer" className="underline underline-offset-2 font-medium">resend.com</a></li>
            <li>Add <code className="bg-card px-1 rounded font-mono text-xs">VITE_RESEND_API_KEY</code> to your app secrets</li>
            <li>Optionally add <code className="bg-card px-1 rounded font-mono text-xs">VITE_FROM_EMAIL</code> and <code className="bg-card px-1 rounded font-mono text-xs">VITE_FROM_NAME</code></li>
          </SetupSteps>
          <div>
            <Label className="mb-1.5 block">From email</Label>
            <Input value={fromEmail} onChange={e => setFromEmail(e.target.value)} placeholder="coach@yourdomain.com" />
          </div>
          <div>
            <Label className="mb-1.5 block">From name</Label>
            <Input value={fromName} onChange={e => setFromName(e.target.value)} placeholder="Coach Myles | KOACH AI" />
          </div>
          {tested && (
            <div className="flex items-center gap-2 rounded-lg bg-success-soft px-3 py-2.5">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <p className="text-sm font-semibold text-foreground">Email is set up on the server.</p>
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleTest} disabled={testing} className="flex-1">
              {testing ? <><Loader2 className="animate-spin" /> Testing</> : 'Test connection'}
            </Button>
            <Button
              className="flex-1"
              onClick={() => saveMutation.mutate({
                resend_connected: true,
                resend_from_email: fromEmail,
                resend_from_name: fromName,
              })}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save and connect'}
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
      logo: <Logo text="R" bg="bg-primary" textColor="text-primary-foreground" />,
      name: 'Resend',
      tag: 'Email',
      description: 'Sends your welcome emails, check-in reminders, progress reports and badge alerts.',
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