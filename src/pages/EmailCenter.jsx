import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { templates, TEMPLATE_OPTIONS } from '@/lib/emailTemplates';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Mail, Send, Loader2, Users, ChevronRight,
  Smartphone, Monitor, Search, CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const AUDIENCE_TABS = [
  { id: 'all',    label: 'All' },
  { id: 'client', label: 'Client Emails' },
  { id: 'coach',  label: 'Coach Emails' },
];

function AudienceBadge({ audience }) {
  return (
    <span className={cn(
      'px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide',
      audience === 'client' ? 'bg-accent text-primary' : 'bg-ai/10 text-ai'
    )}>{audience}</span>
  );
}

function TemplateList({ templates: tpls, selected, onSelect, search }) {
  const filtered = tpls.filter(t =>
    t.label.toLowerCase().includes(search.toLowerCase()) ||
    t.desc.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div className="space-y-1">
      {filtered.map(t => (
        <button
          key={t.key}
          onClick={() => onSelect(t.key)}
          className={cn(
            'w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all group',
            selected === t.key
              ? 'border-primary bg-accent'
              : 'border-border hover:border-primary bg-card hover:bg-muted'
          )}
        >
          <span className="text-xl leading-none flex-shrink-0">{t.emoji}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className={cn('text-xs font-bold', selected === t.key ? 'text-primary' : 'text-foreground')}>{t.label}</p>
              <AudienceBadge audience={t.audience} />
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{t.desc}</p>
          </div>
          <ChevronRight className={cn('w-4 h-4 flex-shrink-0 transition-colors', selected === t.key ? 'text-primary' : 'text-border')} />
        </button>
      ))}
      {filtered.length === 0 && (
        <p className="text-center py-8 text-sm text-muted-foreground">No templates match "{search}"</p>
      )}
    </div>
  );
}

export default function EmailCenter() {
  const { user } = useAuth();
  const [audienceTab, setAudienceTab] = useState('all');
  const [selectedTemplate, setSelectedTemplate] = useState('welcome');
  const [toMode, setToMode] = useState('single');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [previewDevice, setPreviewDevice] = useState('desktop');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [testEmailAddress, setTestEmailAddress] = useState(user?.email || '');
  const [sentSuccess, setSentSuccess] = useState(false);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => db.entities.Client.list('name'),
  });

  const selectedClient = clients.find(c => c.id === selectedClientId);

  const filteredTemplates = useMemo(() =>
    TEMPLATE_OPTIONS.filter(t => audienceTab === 'all' || t.audience === audienceTab),
    [audienceTab]
  );

  const currentTemplate = TEMPLATE_OPTIONS.find(t => t.key === selectedTemplate);

  const getRendered = (clientOverride) => {
    const tplFn = templates[selectedTemplate];
    if (!tplFn) return { subject: '', html: '' };
    const clientData = clientOverride || selectedClient || {
      name: 'Alex Johnson',
      email: 'alex@example.com',
      goal: 'weight_loss',
      id: 'demo',
    };
    // Some templates need extra args — pass sensible defaults
    const extra = {
      checkInSubmitted: { weight: 185, compliance_training: 88, mood: 'great', energy_level: 8 },
      paymentReceived: { amount: 150, description: 'Monthly Coaching', invoice_number: 'INV-0042', payment_method: 'Card' },
      paymentFailed: { amount: 200, failure_reason: 'Insufficient funds' },
      badgeEarned: { label: '30-Day Warrior', emoji: '🏆', desc: '30 consecutive days of training' },
      invoiceReceived: { amount: 150, due_date: 'June 1, 2026', invoice_number: 'INV-0042', description: 'Monthly Coaching' },
      paymentConfirmation: { amount: 150, invoice_number: 'INV-0042', next_billing_date: 'July 1, 2026' },
      paymentFailedClient: { amount: 200, failure_reason: 'Card declined' },
      streakAtRisk: null, // streakAtRisk(client, coach, streak)
      programComplete: { title: '12-Week Shred' },
      sessionReminder: { date: 'June 3, 2026', time: '10:00 AM', type: 'video_call', duration_minutes: 60 },
      missedCheckin: null,
      lowCompliance: null,
      weeklyDigest: { activeClients: 18, mrr: 2700, newClients: 2, checkIns: 14, unreadMessages: 3 },
      newLead: { name: 'Sarah Miller', email: 'sarah@example.com', phone: '+1 555 0123' },
      subscriptionCancelled: { effectiveDate: 'June 30, 2026', amount: 150, reason: 'Too expensive' },
    };
    try {
      const arg3 = extra[selectedTemplate] !== undefined ? extra[selectedTemplate] : undefined;
      const result = tplFn(clientData, user, arg3);
      return result;
    } catch {
      return { subject: 'Preview', html: '<p>Preview not available</p>' };
    }
  };

  const rendered = getRendered();
  const displaySubject = customSubject || rendered.subject || '';

  const handleSendToClient = async () => {
    if (toMode === 'single' && !selectedClient) {
      toast.error('Please select a client first');
      return;
    }
    setSending(true);
    setSentSuccess(false);
    try {
      const targets = toMode === 'single'
        ? [selectedClient]
        : clients.filter(c => c.email);

      for (const client of targets) {
        const r = getRendered(client);
        await db.functions.invoke('sendEmailNotification', {
          to: client.email,
          toName: client.name,
          subject: customSubject || r.subject,
          html: r.html,
          replyTo: user?.email,
          templateKey: selectedTemplate,
        });
      }
      setSentSuccess(true);
      setTimeout(() => setSentSuccess(false), 3000);
      toast.success(toMode === 'single' ? `Email sent to ${selectedClient.name}!` : `Email sent to ${targets.length} clients!`);
    } catch (err) {
      toast.error(err.message || 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  const handleSendTest = async () => {
    if (!testEmailAddress) { toast.error('Enter a test email address'); return; }
    setSending(true);
    try {
      await db.functions.invoke('sendEmailNotification', {
        to: testEmailAddress,
        toName: 'Test User',
        subject: `[TEST] ${displaySubject}`,
        html: rendered.html,
        templateKey: selectedTemplate,
      });
      toast.success(`Test email sent to ${testEmailAddress}`);
    } catch (err) {
      toast.error(err.message || 'Failed to send test');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-screen-xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-foreground">Email Center</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Send beautifully branded emails to your clients</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">

        {/* ── Left: Template Picker ── */}
        <div className="xl:col-span-4 bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
          <div className="px-4 pt-4 pb-3 border-b border-muted">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">Templates</p>
            {/* Audience tabs */}
            <div className="flex gap-1 mb-3">
              {AUDIENCE_TABS.map(t => (
                <button key={t.id} onClick={() => setAudienceTab(t.id)}
                  className={cn('px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                    audienceTab === t.id ? 'bg-sidebar text-white' : 'bg-muted text-muted-foreground hover:bg-border'
                  )}>{t.label}</button>
              ))}
            </div>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search templates..."
                className="w-full pl-8 pr-3 py-2 text-xs border border-border rounded-lg bg-muted focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          <div className="p-3 overflow-y-auto flex-1" style={{ maxHeight: 520 }}>
            <TemplateList
              templates={filteredTemplates}
              selected={selectedTemplate}
              onSelect={(key) => { setSelectedTemplate(key); setCustomSubject(''); }}
              search={searchQuery}
            />
          </div>
        </div>

        {/* ── Middle: Compose & Send ── */}
        <div className="xl:col-span-4 space-y-4">
          {/* Template info */}
          {currentTemplate && (
            <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
              <span className="text-3xl">{currentTemplate.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-foreground text-sm">{currentTemplate.label}</p>
                  <AudienceBadge audience={currentTemplate.audience} />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{currentTemplate.desc}</p>
              </div>
            </div>
          )}

          {/* Compose */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-black text-foreground flex items-center gap-2">
              <Mail className="w-4 h-4" /> Compose & Send
            </h2>

            {/* Recipients */}
            <div>
              <Label className="text-xs font-bold mb-1.5 block text-muted-foreground">Recipients</Label>
              <div className="flex gap-1.5 mb-2">
                {[
                  { key: 'single', label: 'Single Client', icon: null },
                  { key: 'all',    label: `All (${clients.filter(c => c.email).length})`, icon: Users },
                ].map(m => (
                  <button key={m.key} onClick={() => setToMode(m.key)}
                    className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold border transition-all',
                      toMode === m.key ? 'bg-sidebar text-white border-border' : 'bg-card text-muted-foreground border-border hover:border-border'
                    )}>
                    {m.icon && <m.icon className="w-3.5 h-3.5" />}
                    {m.label}
                  </button>
                ))}
              </div>
              {toMode === 'single' && (
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger className="text-sm"><SelectValue placeholder="Select a client..." /></SelectTrigger>
                  <SelectContent>
                    {clients.filter(c => c.email).map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name} — {c.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Subject */}
            <div>
              <Label className="text-xs font-bold mb-1.5 block text-muted-foreground">Subject</Label>
              <Input
                value={customSubject || rendered.subject || ''}
                onChange={e => setCustomSubject(e.target.value)}
                placeholder="Auto-generated from template..."
                className="text-sm"
              />
            </div>

            {/* Send button */}
            <Button
              className="w-full font-bold gap-2"
              style={{ background: 'linear-gradient(135deg,var(--tc-primary),var(--tc-ai))', boxShadow: '0 4px 12px color-mix(in srgb, var(--tc-primary) 30%, transparent)' }}
              onClick={handleSendToClient}
              disabled={sending || (toMode === 'single' && !selectedClient)}
            >
              {sending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
              ) : sentSuccess ? (
                <><CheckCircle2 className="w-4 h-4" /> Sent!</>
              ) : (
                <><Send className="w-4 h-4" /> Send Email</>
              )}
            </Button>
          </div>

          {/* Test email */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-foreground">Send Test Email</h3>
            <div className="flex gap-2">
              <Input
                type="email"
                value={testEmailAddress}
                onChange={e => setTestEmailAddress(e.target.value)}
                placeholder="your@email.com"
                className="flex-1 text-sm"
              />
              <Button variant="outline" onClick={handleSendTest} disabled={sending} className="font-semibold text-xs whitespace-nowrap">
                {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Send Test'}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">Subject will be prefixed with [TEST]</p>
          </div>
        </div>

        {/* ── Right: Live Preview ── */}
        <div className="xl:col-span-4 bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-muted bg-background flex-shrink-0">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-muted-foreground">Preview</p>
              <p className="text-[11px] text-muted-foreground truncate mt-0.5">{displaySubject}</p>
            </div>
            <div className="flex gap-1 ml-3 flex-shrink-0">
              <button onClick={() => setPreviewDevice('desktop')}
                className={cn('p-1.5 rounded-lg transition-colors', previewDevice === 'desktop' ? 'bg-border text-foreground' : 'text-muted-foreground hover:text-muted-foreground')}>
                <Monitor className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setPreviewDevice('mobile')}
                className={cn('p-1.5 rounded-lg transition-colors', previewDevice === 'mobile' ? 'bg-border text-foreground' : 'text-muted-foreground hover:text-muted-foreground')}>
                <Smartphone className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto bg-muted p-3" style={{ minHeight: 400 }}>
            <div className={cn('mx-auto transition-all', previewDevice === 'mobile' ? 'max-w-[375px]' : 'max-w-full')}>
              <iframe
                srcDoc={rendered.html || '<p style="padding:20px;color:#999999;">Select a template to preview</p>'}
                className="w-full border-0 rounded-xl shadow-sm"
                style={{ minHeight: 520, background: 'var(--tc-card)' }}
                title="Email Preview"
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}