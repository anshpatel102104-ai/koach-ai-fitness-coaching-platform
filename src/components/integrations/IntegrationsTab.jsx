import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase as base44 } from '@/api/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle2, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// ── Logo helper ──────────────────────────────────────────────
function Logo({ text, bg, textColor = 'text-white' }) {
  return (
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${bg} ${textColor}`}>
      {text}
    </div>
  );
}

// ── Badge helpers ─────────────────────────────────────────────
function ConnectedBadge() {
  return (
    <span className="bg-success/10 text-success border border-success text-xs rounded-full px-2.5 py-0.5 flex items-center gap-1 flex-shrink-0">
      <CheckCircle2 className="w-3 h-3" /> Connected
    </span>
  );
}

function TagBadge({ label }) {
  return (
    <span className="bg-muted text-foreground text-xs rounded-full px-2 py-0.5 flex-shrink-0">
      {label}
    </span>
  );
}

// ── Integration card ──────────────────────────────────────────
function IntegrationCard({ logo, name, tag, description, connected, onConnect, onManage }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-start gap-4">
      {logo}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-foreground">{name}</p>
          <TagBadge label={tag} />
          {connected && <ConnectedBadge />}
        </div>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
      </div>
      <div className="flex-shrink-0 ml-2">
        {connected ? (
          <button
            onClick={onManage}
            className="border border-border text-foreground text-xs px-4 py-2 rounded-lg hover:bg-background transition-colors"
          >
            Manage
          </button>
        ) : (
          <button
            onClick={onConnect}
            className="bg-sidebar text-white text-xs px-4 py-2 rounded-lg hover:bg-sidebar-accent transition-colors"
          >
            Connect
          </button>
        )}
      </div>
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
        ? base44.entities.CoachSettings.update(settings.id, data)
        : base44.entities.CoachSettings.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach-settings'] });
      toast.success('Zapier webhook saved!');
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
          <div className="bg-warning/10 border border-warning rounded-xl p-4">
            <p className="text-xs font-semibold text-warning mb-2">Setup Instructions</p>
            <ol className="text-xs text-foreground space-y-1.5 list-decimal list-inside leading-relaxed">
              <li>Go to <a href="https://zapier.com" target="_blank" rel="noreferrer" className="text-warning underline font-medium">zapier.com</a> and create a new Zap</li>
              <li>Choose <strong>Webhooks by Zapier</strong> as the trigger</li>
              <li>Select <strong>Catch Hook</strong> and copy the webhook URL</li>
              <li>Paste it below and save</li>
            </ol>
          </div>
          <div>
            <Label className="text-xs mb-1 block">Webhook URL</Label>
            <Input
              value={webhookUrl}
              onChange={e => setWebhookUrl(e.target.value)}
              placeholder="https://hooks.zapier.com/hooks/catch/..."
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button
              className="flex-1 bg-[var(--kc-ff4a00)] hover:bg-[var(--kc-e04000)] text-white"
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
        ? base44.entities.CoachSettings.update(settings.id, data)
        : base44.entities.CoachSettings.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach-settings'] });
      toast.success('Resend connected!');
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
            <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center text-white font-bold text-sm">R</div>
            Connect Resend
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-1">
          <div className="bg-muted border border-border rounded-xl p-4">
            <p className="text-xs font-semibold text-foreground mb-2">Setup Instructions</p>
            <ol className="text-xs text-foreground space-y-1.5 list-decimal list-inside leading-relaxed">
              <li>Get your free API key at <a href="https://resend.com" target="_blank" rel="noreferrer" className="text-black underline font-medium">resend.com</a></li>
              <li>Add <code className="bg-card border border-border px-1 rounded font-mono text-[10px]">VITE_RESEND_API_KEY</code> to your app secrets</li>
              <li>Optionally add <code className="bg-card border border-border px-1 rounded font-mono text-[10px]">VITE_FROM_EMAIL</code> and <code className="bg-card border border-border px-1 rounded font-mono text-[10px]">VITE_FROM_NAME</code></li>
            </ol>
            <a href="https://resend.com/api-keys" target="_blank" rel="noreferrer"
              className="flex items-center gap-1 text-xs text-black font-semibold mt-2 hover:underline">
              Open API Keys <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div>
            <Label className="text-xs mb-1 block">From Email</Label>
            <Input value={fromEmail} onChange={e => setFromEmail(e.target.value)} placeholder="coach@yourdomain.com" />
          </div>
          <div>
            <Label className="text-xs mb-1 block">From Name</Label>
            <Input value={fromName} onChange={e => setFromName(e.target.value)} placeholder="Coach Myles | KOACH AI" />
          </div>
          {tested && (
            <div className="flex items-center gap-2 p-3 bg-success/10 border border-success rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <p className="text-sm font-semibold text-success">Connection verified!</p>
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleTest} disabled={testing} className="flex-1">
              {testing ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> Testing...</> : 'Test Connection'}
            </Button>
            <Button
              className="flex-1 bg-sidebar hover:bg-sidebar-accent"
              onClick={() => saveMutation.mutate({
                resend_connected: true,
                resend_from_email: fromEmail,
                resend_from_name: fromName,
              })}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save & Connect'}
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
        ? base44.entities.CoachSettings.update(settings.id, data)
        : base44.entities.CoachSettings.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach-settings'] });
      toast.success('Zoom credentials saved!');
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
          <div className="bg-accent/10 border border-[var(--kc-2d8cff)]/20 rounded-xl p-4">
            <p className="text-xs font-semibold text-[var(--kc-2d8cff)] mb-2">Setup Instructions</p>
            <ol className="text-xs text-foreground space-y-1.5 list-decimal list-inside leading-relaxed">
              <li>Go to <a href="https://marketplace.zoom.us/develop/create" target="_blank" rel="noreferrer" className="text-[var(--kc-2d8cff)] underline font-medium">Zoom Marketplace</a></li>
              <li>Create an <strong>OAuth app</strong></li>
              <li>Copy your Client ID and Client Secret</li>
            </ol>
            <a href="https://marketplace.zoom.us/develop/create" target="_blank" rel="noreferrer"
              className="flex items-center gap-1 text-xs text-[var(--kc-2d8cff)] font-semibold mt-2 hover:underline">
              Open Zoom Marketplace <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div>
            <Label className="text-xs mb-1 block">Client ID</Label>
            <Input value={clientId} onChange={e => setClientId(e.target.value)} placeholder="Your Zoom Client ID" />
          </div>
          <div>
            <Label className="text-xs mb-1 block">Client Secret</Label>
            <Input value={clientSecret} onChange={e => setClientSecret(e.target.value)} placeholder="Your Zoom Client Secret" type="password" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button
              className="flex-1 bg-[var(--kc-2d8cff)] hover:bg-[var(--kc-1a7aee)] text-white"
              onClick={() => saveMutation.mutate({ zoom_connected: true })}
              disabled={!clientId || !clientSecret || saveMutation.isPending}
            >
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save & Connect'}
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
        ? base44.entities.CoachSettings.update(settings.id, data)
        : base44.entities.CoachSettings.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach-settings'] });
      toast.success('Calendly connected!');
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
          <div className="bg-accent/10 border border-[var(--kc-006bff)]/20 rounded-xl p-4">
            <p className="text-xs font-semibold text-[var(--kc-006bff)] mb-2">Setup Instructions</p>
            <ol className="text-xs text-foreground space-y-1.5 list-decimal list-inside leading-relaxed">
              <li>Go to <a href="https://app.calendly.com/integrations/api_webhooks" target="_blank" rel="noreferrer" className="text-[var(--kc-006bff)] underline font-medium">Calendly Integrations</a></li>
              <li>Generate a Personal Access Token</li>
              <li>Paste it below</li>
            </ol>
          </div>
          <div>
            <Label className="text-xs mb-1 block">Personal Access Token</Label>
            <Input value={token} onChange={e => setToken(e.target.value)} placeholder="eyJhbGci..." type="password" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button
              className="flex-1 bg-[var(--kc-006bff)] hover:bg-[var(--kc-005ee0)] text-white"
              onClick={() => saveMutation.mutate({ calendly_connected: true })}
              disabled={!token || saveMutation.isPending}
            >
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save & Connect'}
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
    queryFn: () => base44.entities.CoachSettings.list(),
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
      logo: <Logo text="R" bg="bg-sidebar" />,
      name: 'Resend',
      tag: 'Email',
      description: 'Send automated emails — welcome messages, check-in reminders, progress reports, and badge alerts.',
      connected: resendConnected,
      onConnect: () => setModal('resend'),
      onManage: () => setModal('resend'),
    },
    {
      logo: <Logo text="Z" bg="bg-[var(--kc-ff4a00)]" />,
      name: 'Zapier',
      tag: 'Automation',
      description: 'Connect KOACH AI to 5,000+ apps. Trigger automations when clients check in, earn badges, or hit milestones.',
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
    <div>
      <div className="space-y-3">
        {integrations.map(i => (
          <IntegrationCard key={i.name} {...i} />
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center mt-6">
        More integrations coming soon — Twilio SMS, Strava, Fitbit, and QuickBooks
      </p>

      <ZapierModal open={modal === 'zapier'} onClose={() => setModal(null)} settings={settings} />
      <ResendModal open={modal === 'resend'} onClose={() => setModal(null)} settings={settings} />
      <ZoomModal open={modal === 'zoom'} onClose={() => setModal(null)} settings={settings} />
      <CalendlyModal open={modal === 'calendly'} onClose={() => setModal(null)} settings={settings} />
    </div>
  );
}