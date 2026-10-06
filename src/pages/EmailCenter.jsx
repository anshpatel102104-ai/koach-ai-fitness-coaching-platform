import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { templates, TEMPLATE_OPTIONS } from '@/lib/emailTemplates';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, Loader2, Search } from 'lucide-react';
import { Page, PageHeader, Panel, Segmented } from '@/components/kit';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const AUDIENCE_TABS = [
  { id: 'all',    label: 'All' },
  { id: 'client', label: 'To clients' },
  { id: 'coach',  label: 'To you' },
];

const AUDIENCE_LABEL = { client: 'To clients', coach: 'To you' };
// Template labels come from lib/emailTemplates in Title Case; show them in sentence case.
const sentence = (str = '') => str.split(' ').map((w, i) => (i === 0 || /^[A-Z0-9]{2,}$/.test(w) ? w : w.toLowerCase())).join(' ');

function TemplateList({ templates: tpls, selected, onSelect, search }) {
  const filtered = tpls.filter(t =>
    t.label.toLowerCase().includes(search.toLowerCase()) ||
    t.desc.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div>
      {filtered.map(t => {
        const active = selected === t.key;
        return (
          <button
            key={t.key}
            onClick={() => onSelect(t.key)}
            className={cn(
              'relative w-full px-5 py-3 text-left transition-colors',
              active ? 'bg-accent' : 'hover:bg-accent/50'
            )}
          >
            {active && <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-brand" />}
            <span className="flex items-baseline justify-between gap-2">
              <span className="text-[15px] font-semibold text-foreground truncate">{sentence(t.label)}</span>
              <span className="text-[12px] text-muted-foreground flex-shrink-0">{AUDIENCE_LABEL[t.audience] || t.audience}</span>
            </span>
            <span className="block text-[13px] text-muted-foreground truncate mt-0.5">{t.desc}</span>
          </button>
        );
      })}
      {filtered.length === 0 && (
        <p className="px-5 py-6 text-sm text-muted-foreground">No templates match "{search}".</p>
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
      badgeEarned: { label: '30-day streak', desc: '30 days of training in a row' },
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
      toast.error('Choose a client first');
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
      toast.success(toMode === 'single' ? `Email sent to ${selectedClient.name}` : `Email sent to ${targets.length} clients`);
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

  const withEmail = clients.filter(c => c.email);

  return (
    <Page wide>
      <PageHeader
        title="Email"
        subtitle="Pick a template, check the preview, then send it to one client or everyone. Replies come to your inbox."
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Templates */}
        <Panel className="xl:col-span-3 overflow-hidden flex flex-col">
          <div className="px-5 pt-5 pb-3 space-y-3">
            <h2 className="text-[22px] text-foreground">Templates</h2>
            <Segmented size="sm" value={audienceTab} onChange={setAudienceTab} options={AUDIENCE_TABS.map(t => ({ value: t.id, label: t.label }))} />
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Find a template" className="pl-9 bg-secondary border-transparent" aria-label="Find a template" />
            </div>
          </div>
          <div className="overflow-y-auto flex-1 border-t border-border" style={{ maxHeight: 560 }}>
            <TemplateList
              templates={filteredTemplates}
              selected={selectedTemplate}
              onSelect={(key) => { setSelectedTemplate(key); setCustomSubject(''); }}
              search={searchQuery}
            />
          </div>
        </Panel>

        {/* Compose */}
        <div className="xl:col-span-4 space-y-5">
          <Panel className="p-5 sm:p-6 space-y-5">
            <div>
              <p className="text-[13px] text-muted-foreground">{currentTemplate ? (AUDIENCE_LABEL[currentTemplate.audience] || currentTemplate.audience) : 'Template'}</p>
              <h2 className="text-[22px] text-foreground mt-0.5">{currentTemplate ? sentence(currentTemplate.label) : 'Choose a template'}</h2>
              {currentTemplate?.desc && <p className="text-sm text-muted-foreground mt-1">{currentTemplate.desc}</p>}
            </div>

            <div>
              <Label className="mb-1.5 block">Send to</Label>
              <Segmented
                size="sm"
                value={toMode}
                onChange={setToMode}
                options={[{ value: 'single', label: 'One client' }, { value: 'all', label: 'Everyone', count: withEmail.length }]}
              />
              {toMode === 'single' && (
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger className="mt-2"><SelectValue placeholder="Choose a client" /></SelectTrigger>
                  <SelectContent>
                    {withEmail.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}, {c.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {toMode === 'all' && <p className="text-[13px] text-muted-foreground mt-2">Goes to {withEmail.length} {withEmail.length === 1 ? 'client' : 'clients'} with an email address, one at a time.</p>}
            </div>

            <div>
              <Label htmlFor="ec-subject" className="mb-1.5 block">Subject</Label>
              <Input id="ec-subject" value={customSubject || rendered.subject || ''} onChange={e => setCustomSubject(e.target.value)} placeholder="Filled in from the template" />
            </div>

            <Button className="w-full" onClick={handleSendToClient} disabled={sending || (toMode === 'single' && !selectedClient)}>
              {sending ? <><Loader2 className="animate-spin" /> Sending</> : sentSuccess ? 'Sent' : <><Send /> {toMode === 'single' ? 'Send email' : `Send to ${withEmail.length}`}</>}
            </Button>
          </Panel>

          <Panel className="p-5 sm:p-6">
            <p className="text-[15px] font-semibold text-foreground">Send yourself a test first</p>
            <p className="text-[13px] text-muted-foreground mt-0.5">The subject starts with [TEST].</p>
            <div className="flex gap-2 mt-3">
              <Input type="email" value={testEmailAddress} onChange={e => setTestEmailAddress(e.target.value)} placeholder="you@example.com" className="flex-1" aria-label="Test email address" />
              <Button variant="outline" onClick={handleSendTest} disabled={sending}>
                {sending ? <Loader2 className="animate-spin" /> : 'Send test'}
              </Button>
            </div>
          </Panel>
        </div>

        {/* Preview */}
        <Panel className="xl:col-span-5 overflow-hidden flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-border">
            <div className="min-w-0 flex-1 basis-48">
              <p className="text-[13px] text-muted-foreground">Preview</p>
              <p className="text-[15px] font-semibold text-foreground truncate">{displaySubject || 'No subject'}</p>
            </div>
            <Segmented size="sm" value={previewDevice} onChange={setPreviewDevice} options={[{ value: 'desktop', label: 'Desktop' }, { value: 'mobile', label: 'Phone' }]} />
          </div>
          <div className="flex-1 overflow-auto bg-secondary p-4" style={{ minHeight: 400 }}>
            <div className={cn('mx-auto', previewDevice === 'mobile' ? 'max-w-[375px]' : 'max-w-full')}>
              <iframe
                srcDoc={rendered.html || '<p style="padding:20px;color:#6b7280;font-family:sans-serif">Pick a template to preview it.</p>'}
                className="w-full border-0 rounded-lg bg-white"
                style={{ minHeight: 560 }}
                title="Email preview"
              />
            </div>
          </div>
        </Panel>
      </div>
    </Page>
  );
}
