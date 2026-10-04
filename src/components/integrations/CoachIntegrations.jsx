import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { CheckCircle2, Info, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import ZapierSetupSheet from './ZapierSetupSheet';
import GoogleCalendarSettings from './GoogleCalendarSettings';
import ZoomConnectModal from './ZoomConnectModal';
import StripeConnectModal from './StripeConnectModal';
import CalendlyConnectModal from './CalendlyConnectModal';
import SendGridConnectModal from './SendGridConnectModal';

/* ── Letter-avatar icon helper ── */
function LetterIcon({ letter, bg }) {
  return (
    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ background: bg }}>
      {letter}
    </div>
  );
}

const INTEGRATION_GROUPS = [
  {
    label: 'Fitness & Health',
    items: [
      {
        id: 'apple_health', name: 'Apple Health', category: 'Health',
        description: 'Sync client steps, sleep, heart rate, and workouts from iPhone and Apple Watch.',
        note: 'Clients connect via their iPhone — data syncs automatically each check-in.',
        icon: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="var(--kc-ff3b30)"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>,
      },
      {
        id: 'garmin', name: 'Garmin Connect', category: 'Health',
        description: 'Pull training data, heart rate zones, recovery metrics, and GPS sessions from Garmin devices.',
        note: 'Clients authorize via Garmin Connect — syncs training load and sleep automatically.',
        icon: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="var(--kc-007dc5)"><circle cx="12" cy="12" r="10"/><path fill="white" d="M12 6a6 6 0 0 0-6 6 6 6 0 0 0 6 6 6 6 0 0 0 6-6 6 6 0 0 0-6-6zm0 2a4 4 0 0 1 4 4 4 4 0 0 1-4 4 4 4 0 0 1-4-4 4 4 0 0 1 4-4z"/><circle fill="white" cx="12" cy="12" r="2"/></svg>,
      },
      {
        id: 'whoop', name: 'Whoop', category: 'Health',
        description: 'Sync recovery scores, HRV, sleep performance, and strain data from WHOOP band.',
        note: 'Connect your WHOOP account to pull daily recovery and strain metrics automatically.',
        icon: <LetterIcon letter="W" bg="var(--kc-000000)" />,
      },
      {
        id: 'fitbit', name: 'Fitbit', category: 'Health',
        description: 'Import daily steps, heart rate, sleep stages, and calorie burn from Fitbit devices.',
        note: 'Clients authorize Fitbit — activity and sleep data syncs to their profile.',
        icon: <LetterIcon letter="F" bg="var(--kc-00b0b9)" />,
      },
      {
        id: 'oura', name: 'Oura Ring', category: 'Health',
        description: 'Sync readiness scores, sleep quality, and recovery data from Oura Ring.',
        note: 'Connect the Oura API to pull nightly readiness and sleep stage data.',
        icon: <LetterIcon letter="O" bg="var(--kc-0a0a0a)" />,
      },
      {
        id: 'samsung_health', name: 'Samsung Health', category: 'Health',
        description: 'Pull workout logs, steps, and biometric data from Samsung Health.',
        note: 'Clients connect Samsung Health on their Galaxy device to share activity data.',
        icon: <LetterIcon letter="S" bg="var(--kc-1428a0)" />,
      },
      {
        id: 'polar', name: 'Polar', category: 'Health',
        description: 'Import heart rate zones and training load from Polar devices.',
        note: 'Authorize Polar Flow to sync session data and training load scores.',
        icon: <LetterIcon letter="P" bg="var(--kc-d10d0d)" />,
      },
    ],
  },
  {
    label: 'Nutrition',
    items: [
      {
        id: 'myfitnesspal', name: 'MyFitnessPal', category: 'Nutrition',
        description: 'See client calorie intake, macro breakdown, and meal logging data in real time.',
        note: 'Clients connect their MFP account — nutrition diary syncs to their profile automatically.',
        icon: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="var(--kc-0093d0)"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/></svg>,
      },
      {
        id: 'cronometer', name: 'Cronometer', category: 'Nutrition',
        description: 'Detailed micronutrient tracking — sync client food logs and nutrient breakdowns.',
        note: 'Clients connect their Cronometer account to share detailed micro and macro data.',
        icon: <LetterIcon letter="C" bg="var(--kc-f5a623)" />,
      },
      {
        id: 'loseit', name: 'Lose It!', category: 'Nutrition',
        description: 'Import client calorie and macro logs from Lose It! food diary.',
        note: "Connect clients' Lose It! accounts to pull daily food diary data automatically.",
        icon: <LetterIcon letter="L" bg="var(--kc-e85c2c)" />,
      },
    ],
  },
  {
    label: 'Communication',
    items: [
      {
        id: 'zoom', name: 'Zoom', category: 'Communication',
        description: 'Schedule and launch coaching calls directly from client profiles.',
        note: 'Connect Zoom to generate meeting links automatically when booking sessions.',
        icon: <LetterIcon letter="Z" bg="var(--kc-2d8cff)" />,
      },
      {
        id: 'calendly', name: 'Calendly', category: 'Communication',
        description: 'Sync your Calendly availability for seamless session booking.',
        note: 'Embed your Calendly link so clients can book time directly from their portal.',
        icon: <LetterIcon letter="C" bg="var(--kc-006bff)" />,
      },
      {
        id: 'whatsapp', name: 'WhatsApp Business', category: 'Communication',
        description: 'Send check-in reminders and updates via WhatsApp.',
        note: 'Connect WhatsApp Business API to send automated reminders to clients.',
        icon: <LetterIcon letter="W" bg="var(--kc-25d366)" />,
      },
      {
        id: 'slack', name: 'Slack', category: 'Communication',
        description: 'Get coaching alerts and client notifications in your Slack workspace.',
        note: 'Receive new check-in alerts and at-risk client notifications directly in Slack.',
        icon: <LetterIcon letter="S" bg="var(--kc-4a154b)" />,
      },
    ],
  },
  {
    label: 'Business & Payments',
    items: [
      {
        id: 'sendgrid', name: 'SendGrid', category: 'Email',
        description: 'Send automated welcome emails, progress reports, check-in reminders, and badge notifications.',
        note: 'Connect SendGrid to enable email automation for your clients. Requires a free SendGrid account.',
        icon: <LetterIcon letter="SG" bg="var(--kc-1a82e2)" />,
      },
      {
        id: 'stripe', name: 'Stripe', category: 'Payments',
        description: 'Accept payments, manage subscriptions, and track revenue from clients.',
        note: 'Connect your Stripe account to enable payment links and auto-billing.',
        icon: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="var(--kc-635bff)"><path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C4.68 22.75 7.420 24 11.315 24c2.58 0 4.718-.615 6.254-1.944 1.65-1.415 2.474-3.35 2.474-5.764 0-4.014-2.441-5.726-6.067-7.142z"/></svg>,
        action: 'navigate', actionTarget: '/revenue',
      },
      {
        id: 'google_calendar', name: 'Google Calendar', category: 'Scheduling',
        description: 'Sync sessions, schedule calls, and manage availability directly from Google Calendar.',
        note: 'Authorize once — sessions automatically appear in your Google Calendar.',
        icon: <svg viewBox="0 0 24 24" className="w-5 h-5"><path fill="var(--kc-4285f4)" d="M19.5 3h-2.25V1.5h-1.5V3h-7.5V1.5h-1.5V3H4.5C3.675 3 3 3.675 3 4.5v15C3 20.325 3.675 21 4.5 21h15c.825 0 1.5-.675 1.5-1.5v-15C21 3.675 20.325 3 19.5 3zm0 16.5h-15V9h15v10.5z"/><path fill="var(--kc-ea4335)" d="M7 10.5h2.25v2.25H7zm3.75 0H13v2.25h-2.25zM14.5 10.5h2.25v2.25H14.5zM7 14.25h2.25v2.25H7zm3.75 0H13v2.25h-2.25zM14.5 14.25h2.25v2.25H14.5z"/></svg>,
        action: 'navigate', actionTarget: '/schedule',
      },
      {
        id: 'zapier', name: 'Zapier / Webhooks', category: 'Automation',
        description: 'Connect to 5,000+ apps. Automate workflows with custom webhook triggers.',
        note: 'Use Zapier to trigger actions in any app when clients check in or hit milestones.',
        icon: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="var(--kc-ff4a00)"><path d="M14.488 9.512L12 12l-2.488-2.488A8.494 8.494 0 0 0 3.5 12a8.5 8.5 0 1 0 17 0 8.494 8.494 0 0 0-6.012-2.488zM12 20.5a8.5 8.5 0 1 1 0-17 8.5 8.5 0 0 1 0 17z"/><circle cx="12" cy="12" r="2.5"/></svg>,
        action: 'external', actionTarget: 'https://zapier.com',
      },
      {
        id: 'paypal', name: 'PayPal', category: 'Payments',
        description: 'Accept PayPal payments from clients worldwide.',
        note: 'Connect your PayPal Business account to generate payment links for clients.',
        icon: <LetterIcon letter="P" bg="var(--kc-003087)" />,
      },
      {
        id: 'quickbooks', name: 'QuickBooks', category: 'Business',
        description: 'Sync revenue and invoices with QuickBooks for accounting.',
        note: 'Connect QuickBooks to automatically sync invoices and revenue data.',
        icon: <LetterIcon letter="Q" bg="var(--kc-2ca01c)" />,
      },
      {
        id: 'typeform', name: 'Typeform', category: 'Forms',
        description: 'Import client intake forms and questionnaires from Typeform.',
        note: 'Connect Typeform to pull responses from onboarding and assessment forms.',
        icon: <LetterIcon letter="T" bg="var(--kc-262627)" />,
      },
      {
        id: 'notion', name: 'Notion', category: 'Productivity',
        description: 'Sync client notes and program documentation to Notion.',
        note: 'Connect Notion to keep client notes and program docs in sync.',
        icon: <LetterIcon letter="N" bg="var(--kc-000000)" />,
      },
    ],
  },
  {
    label: 'Wearables & Activity',
    items: [
      {
        id: 'strava', name: 'Strava', category: 'Wearables',
        description: 'Import running, cycling, and activity data from Strava.',
        note: 'Clients connect Strava — workouts and activity data syncs automatically.',
        icon: <LetterIcon letter="S" bg="var(--kc-fc4c02)" />,
      },
      {
        id: 'peloton', name: 'Peloton', category: 'Wearables',
        description: 'Sync Peloton workout completions and output metrics.',
        note: 'Connect the Peloton API to pull class completions and output data.',
        icon: <LetterIcon letter="P" bg="var(--kc-ff0000)" />,
      },
    ],
  },
];

export default function CoachIntegrations() {
  const navigate = useNavigate();
  const [connected, setConnected] = useState({});
  const [expandedNote, setExpandedNote] = useState(null);
  const [search, setSearch] = useState('');
  const [zapierOpen, setZapierOpen] = useState(false);
  const [gcalSettingsOpen, setGcalSettingsOpen] = useState(false);
  const [zoomModalOpen, setZoomModalOpen] = useState(false);
  const [stripeModalOpen, setStripeModalOpen] = useState(false);
  const [calendlyModalOpen, setCalendlyModalOpen] = useState(false);
  const [sendgridModalOpen, setSendgridModalOpen] = useState(false);

  // Google Calendar is authorized at the platform level (shared connector)
  const gcalConnected = true;

  const { data: coachSettings = [] } = useQuery({
    queryKey: ['coach-settings'],
    queryFn: () => db.entities.CoachSettings.list(),
  });
  const { data: zapierLogs = [] } = useQuery({
    queryKey: ['zapier-logs'],
    queryFn: () => db.entities.ZapierLog.list('-sent_at', 10),
  });

  const zapierSettings = coachSettings[0];
  const zoomConnected = !!zapierSettings?.zoom_connected && !!zapierSettings?.zoom_access_token;
  const calendlyConnected = !!zapierSettings?.calendly_connected;
  const sendgridConnected = !!zapierSettings?.sendgrid_connected;
  const zapierConnected = !!zapierSettings?.zapier_connected && !!zapierSettings?.zapier_webhook_url;
  const zapierLastTriggered = zapierSettings?.zapier_last_triggered;
  const todayLogs = zapierLogs.filter(l => {
    if (!l.sent_at) return false;
    const d = new Date(l.sent_at);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });

  const handleConnect = (integration) => {
    if (integration.id === 'zapier') {
      setZapierOpen(true);
      return;
    }
    if (connected[integration.id]) {
      setConnected(c => ({ ...c, [integration.id]: false }));
      toast.success(`Disconnected from ${integration.name}`);
      return;
    }
    if (integration.action === 'navigate') {
      navigate(integration.actionTarget);
      return;
    }
    if (integration.action === 'external') {
      window.open(integration.actionTarget, '_blank');
      return;
    }
    toast.info(`Connecting to ${integration.name}... This integration is coming soon. You'll be notified when it's available.`);
  };

  const q = search.trim().toLowerCase();
  const filteredGroups = INTEGRATION_GROUPS.map(group => ({
    ...group,
    items: group.items.filter(i =>
      !q ||
      i.name.toLowerCase().includes(q) ||
      i.description.toLowerCase().includes(q) ||
      i.category.toLowerCase().includes(q)
    ),
  })).filter(g => g.items.length > 0);

  return (
    <div>
      {/* Dark header banner */}
      <div className="bg-sidebar rounded-xl p-5 text-white mb-6">
        <h1 className="text-xl font-semibold text-white">Integrations</h1>
        <p className="text-sm text-white/50 mt-0.5">Connect third-party services to power your coaching workflow</p>
      </div>

      {/* Search */}
      <input
        placeholder="Search integrations..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full border border-border rounded-xl px-4 py-2.5 text-sm mb-6 outline-none focus:border-foreground bg-card"
      />

      <div className="space-y-6">
        {filteredGroups.map((group) => (
          <div key={group.label}>
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">{group.label}</p>
            <div className="space-y-2.5">
              {group.items.map((integration) => {
                const isConnected = !!connected[integration.id];
                const showNote = expandedNote === integration.id;
                return (
                  <div
                    key={integration.id}
                    className={cn(
                      'bg-card border rounded-2xl p-4 transition-all',
                      isConnected ? 'border-success bg-success/20' : 'border-border'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl border border-border bg-card flex items-center justify-center flex-shrink-0 shadow-sm">
                        {integration.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-foreground text-sm">{integration.name}</p>
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted border border-border text-foreground">
                            {integration.category}
                          </span>
                          {(isConnected || (integration.id === 'zapier' && zapierConnected) || (integration.id === 'google_calendar' && gcalConnected) || (integration.id === 'zoom' && zoomConnected) || (integration.id === 'calendly' && calendlyConnected) || (integration.id === 'sendgrid' && sendgridConnected)) && (
                            <span className="flex items-center gap-1 text-[10px] font-semibold text-success bg-success/10 border border-success px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3" /> Connected
                            </span>
                          )}
                          {integration.id === 'zapier' && zapierConnected && todayLogs.length > 0 && (
                            <span className="text-[10px] text-muted-foreground px-2 py-0.5 rounded-full bg-muted border border-border">
                              {todayLogs.length} events today
                            </span>
                          )}
                          {integration.id === 'zapier' && zapierConnected && zapierLastTriggered && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Last triggered {formatDistanceToNow(new Date(zapierLastTriggered), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-1">{integration.description}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => setExpandedNote(showNote ? null : integration.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-primary hover:bg-accent/10 transition-colors"
                          title="How it works"
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>
                        {integration.id === 'zapier' ? (
                          <Button size="sm" variant={zapierConnected ? 'outline' : 'default'}
                            onClick={() => setZapierOpen(true)} className="text-xs h-8 px-3">
                            {zapierConnected ? 'Manage' : 'Connect'}
                          </Button>
                        ) : integration.id === 'google_calendar' ? (
                          <Button size="sm" variant="outline"
                            onClick={() => setGcalSettingsOpen(true)} className="text-xs h-8 px-3">
                            Settings
                          </Button>
                                        ) : integration.id === 'zoom' ? (
                          <Button size="sm" variant={zoomConnected ? 'outline' : 'default'}
                            onClick={() => setZoomModalOpen(true)} className="text-xs h-8 px-3">
                            {zoomConnected ? 'Settings' : 'Connect'}
                          </Button>
                        ) : integration.id === 'stripe' ? (
                          <Button size="sm" variant="outline"
                            onClick={() => setStripeModalOpen(true)} className="text-xs h-8 px-3">
                            Configure
                          </Button>
                        ) : integration.id === 'calendly' ? (
                          <Button size="sm" variant={calendlyConnected ? 'outline' : 'default'}
                            onClick={() => setCalendlyModalOpen(true)} className="text-xs h-8 px-3">
                            {calendlyConnected ? 'Settings' : 'Connect'}
                          </Button>
                        ) : integration.id === 'sendgrid' ? (
                          <Button size="sm" variant={sendgridConnected ? 'outline' : 'default'}
                            onClick={() => setSendgridModalOpen(true)} className="text-xs h-8 px-3">
                            {sendgridConnected ? 'Settings' : 'Connect'}
                          </Button>
                        ) : (
                          <Button size="sm" variant={isConnected ? 'outline' : 'default'}
                            onClick={() => handleConnect(integration)}
                            className={cn('text-xs h-8 px-3',
                              isConnected && 'border-border text-foreground hover:border-destructive hover:text-destructive hover:bg-destructive/10'
                            )}>
                            {isConnected ? 'Disconnect' : 'Connect'}
                          </Button>
                        )}
                      </div>
                    </div>
                    {showNote && (
                      <div className="mt-3 flex items-start gap-2 bg-accent/10 border border-accent rounded-xl px-3 py-2.5">
                        <Info className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-foreground leading-snug">{integration.note}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {filteredGroups.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No integrations match "{search}"</p>
        )}
      </div>

      {/* Zapier log panel */}
      {zapierConnected && zapierLogs.length > 0 && (
        <div className="mt-6">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Recent Webhook Events</p>
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            {zapierLogs.slice(0, 10).map((log, i) => (
              <div key={log.id} className={cn('flex items-center gap-3 px-4 py-3', i !== 0 && 'border-t border-muted')}>
                <div className={cn('w-2 h-2 rounded-full flex-shrink-0', log.success !== false ? 'bg-success' : 'bg-destructive')} />
                <span className="text-xs font-mono text-foreground flex-1 truncate">{log.event_type}</span>
                {log.client_name && <span className="text-xs text-muted-foreground truncate max-w-[120px]">{log.client_name}</span>}
                <span className="text-[10px] text-muted-foreground flex items-center gap-1 flex-shrink-0">
                  <Clock className="w-3 h-3" />
                  {log.sent_at ? formatDistanceToNow(new Date(log.sent_at), { addSuffix: true }) : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <ZapierSetupSheet open={zapierOpen} onClose={() => setZapierOpen(false)} />
      <GoogleCalendarSettings open={gcalSettingsOpen} onClose={() => setGcalSettingsOpen(false)} />
      <ZoomConnectModal open={zoomModalOpen} onClose={() => setZoomModalOpen(false)} settings={zapierSettings} />
      <StripeConnectModal open={stripeModalOpen} onClose={() => setStripeModalOpen(false)} />
      <CalendlyConnectModal open={calendlyModalOpen} onClose={() => setCalendlyModalOpen(false)} />
      <SendGridConnectModal open={sendgridModalOpen} onClose={() => setSendgridModalOpen(false)} />
    </div>
  );
}