import React, { useState, useMemo, useRef } from 'react';
import { X, Search, Check, ChevronRight, ChevronLeft, Send, Calendar, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { generateBroadcastMessage } from '@/lib/aiMessageAssistant';
import { Initials } from '@/components/kit';
import { Button } from '@/components/ui/button';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'at_risk', label: 'At risk' },
  { key: 'no_program', label: 'No program' },
  { key: 'lead', label: 'Leads' },
];

const TOKENS = [
  { label: '[First Name]', value: '[First Name]' },
  { label: '[Goal]', value: '[Goal]' },
  { label: '[Program Name]', value: '[Program Name]' },
  { label: '[Last Check-in Date]', value: '[Last Check-in Date]' },
  { label: '[Coach Name]', value: '[Coach Name]' },
];

function previewMessage(message, sampleClient) {
  if (!sampleClient) return message;
  return message
    .replace(/\[First Name\]/g, sampleClient.name?.split(' ')[0] || sampleClient.name)
    .replace(/\[Goal\]/g, sampleClient.goal?.replace('_', ' ') || 'your goal')
    .replace(/\[Program Name\]/g, sampleClient.assigned_program_id ? 'your program' : 'your plan')
    .replace(/\[Last Check-in Date\]/g, format(new Date(), 'MMM d'))
    .replace(/\[Coach Name\]/g, 'Coach');
}

export default function BroadcastModal({ clients, onClose, onSend, checkIns = [] }) {
  const [step, setStep] = useState(1);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [scheduleMode, setScheduleMode] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [aiVersions, setAiVersions] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiVersionIdx, setAiVersionIdx] = useState(0);
  const textareaRef = useRef(null);

  const generateAI = async () => {
    if (selected.size === 0) return;
    setAiLoading(true);
    const selectedClients = clients.filter(c => selected.has(c.id));
    const versions = await generateBroadcastMessage(selectedClients, clients, filter, checkIns);
    setAiVersions(versions);
    setAiVersionIdx(0);
    if (versions[0]?.message) setMessage(versions[0].message);
    setAiLoading(false);
  };

  const cyclAIVersion = (dir) => {
    const next = (aiVersionIdx + dir + aiVersions.length) % aiVersions.length;
    setAiVersionIdx(next);
    setMessage(aiVersions[next]?.message || '');
  };

  const filteredClients = useMemo(() => {
    let list = clients;
    if (filter === 'active') list = list.filter(c => c.lifecycle_status === 'active' || c.status === 'active');
    else if (filter === 'at_risk') list = list.filter(c => c.lifecycle_status === 'at_risk');
    else if (filter === 'no_program') list = list.filter(c => !c.assigned_program_id);
    else if (filter === 'lead') list = list.filter(c => c.lifecycle_status === 'lead' || c.status === 'prospect');
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c => c.name?.toLowerCase().includes(q));
    }
    return list;
  }, [clients, filter, search]);

  const handleFilterChange = (key) => {
    setFilter(key);
    const matches = clients.filter(c => {
      if (key === 'all') return true;
      if (key === 'active') return c.lifecycle_status === 'active' || c.status === 'active';
      if (key === 'at_risk') return c.lifecycle_status === 'at_risk';
      if (key === 'no_program') return !c.assigned_program_id;
      if (key === 'lead') return c.lifecycle_status === 'lead' || c.status === 'prospect';
      return true;
    });
    setSelected(new Set(matches.map(c => c.id)));
  };

  const toggleClient = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(filteredClients.map(c => c.id)));
  const deselectAll = () => setSelected(new Set());

  const insertToken = (token) => {
    const el = textareaRef.current;
    if (!el) {
      setMessage(m => m + token);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const newVal = message.slice(0, start) + token + message.slice(end);
    setMessage(newVal);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    }, 0);
  };

  const sampleClient = clients.find(c => selected.has(c.id)) || clients[0];

  const handleSend = async () => {
    if (selected.size === 0 || !message.trim()) return;
    setSending(true);
    await onSend([...selected], message);
    setSending(false);
    toast.success(`Sent to ${selected.size} client${selected.size !== 1 ? 's' : ''}`);
    onClose();
  };

  const STEPS = ['Recipients', 'Message', 'Review'];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[rgb(17_19_24/0.5)] sm:p-4">
      <div className="bg-card rounded-t-xl sm:rounded-xl w-full max-w-lg flex flex-col max-h-[92vh] sm:max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 sm:px-6 pt-5 pb-3 flex-shrink-0">
          <div>
            <h2 className="text-[24px] text-foreground leading-tight">Broadcast</h2>
            <p className="text-sm text-muted-foreground mt-0.5">One message, sent to each client as a private chat.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="touch-compact p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-5 px-5 sm:px-6 border-b border-border flex-shrink-0">
          {STEPS.map((label, i) => {
            const s = i + 1;
            return (
              <span
                key={label}
                className={cn(
                  '-mb-px border-b-2 pb-2.5 text-[13px] font-medium',
                  step === s ? 'border-foreground text-foreground' : step > s ? 'border-transparent text-foreground/70' : 'border-transparent text-muted-foreground'
                )}
              >
                {s}. {label}
              </span>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* ── Step 1: Recipients ── */}
          {step === 1 && (
            <div className="px-5 sm:px-6 py-4 space-y-3">
              <div className="flex gap-0.5 rounded-lg bg-card p-0.5 shadow-[0_0_0_1px_rgb(var(--border)/0.9)] overflow-x-auto scrollbar-hide w-fit max-w-full">
                {FILTERS.map(f => (
                  <button
                    key={f.key}
                    onClick={() => handleFilterChange(f.key)}
                    className={cn(
                      'touch-compact h-8 px-3 rounded-md text-[13px] font-medium whitespace-nowrap transition-colors',
                      filter === f.key ? 'bg-primary text-primary-foreground' : 'text-foreground/80 hover:bg-accent'
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    placeholder="Search clients"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full h-10 pl-9 pr-3 text-sm rounded-lg bg-secondary outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <button onClick={selectAll} className="touch-compact text-[13px] font-semibold text-foreground underline underline-offset-4">All</button>
                <button onClick={deselectAll} className="touch-compact text-[13px] font-medium text-muted-foreground hover:text-foreground">None</button>
              </div>

              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground tabular-nums">{selected.size}</span> client{selected.size !== 1 ? 's' : ''} selected
              </p>

              <div className="max-h-72 overflow-y-auto -mx-2">
                {filteredClients.map(client => {
                  const isChecked = selected.has(client.id);
                  return (
                    <button
                      key={client.id}
                      onClick={() => toggleClient(client.id)}
                      aria-pressed={isChecked}
                      className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-accent transition-colors text-left"
                    >
                      <Initials name={client.name} src={client.avatar_url} size={32} />
                      <span className="flex-1 text-[15px] text-foreground truncate">{client.name}</span>
                      <span className={cn(
                        'w-[18px] h-[18px] rounded-[4px] border flex items-center justify-center flex-shrink-0 transition-colors',
                        isChecked ? 'bg-primary border-primary' : 'border-input bg-card'
                      )}>
                        {isChecked && <Check className="w-3 h-3 text-primary-foreground" strokeWidth={3} />}
                      </span>
                    </button>
                  );
                })}
                {filteredClients.length === 0 && (
                  <p className="text-sm text-muted-foreground px-2 py-6">No clients match.</p>
                )}
              </div>
            </div>
          )}

          {/* ── Step 2: Compose ── */}
          {step === 2 && (
            <div className="px-5 sm:px-6 py-4 space-y-4">
              {/* AI writer */}
              <div className="rounded-xl bg-ai text-ai-foreground p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[15px] font-semibold">Let the AI write a first draft</p>
                  {aiVersions.length > 0 && (
                    <span className="text-[13px] text-ai-foreground/70">{aiVersions[aiVersionIdx]?.tone_label}</span>
                  )}
                </div>
                <p className="text-[13px] text-ai-foreground/70 mt-0.5">
                  {aiVersions.length > 0 ? aiVersions[aiVersionIdx]?.description : `Written for the ${selected.size} client${selected.size !== 1 ? 's' : ''} you picked.`}
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <Button
                    size="sm"
                    onClick={generateAI}
                    disabled={aiLoading || selected.size === 0}
                    className="bg-ai-foreground text-ai hover:bg-ai-foreground/90"
                  >
                    {aiLoading && <Loader2 className="animate-spin" />}
                    {aiLoading ? 'Writing…' : aiVersions.length > 0 ? 'Write another' : 'Write it for me'}
                  </Button>
                  {aiVersions.length > 1 && (
                    <span className="ml-auto flex items-center gap-1">
                      <button onClick={() => cyclAIVersion(-1)} aria-label="Previous version" className="touch-compact p-1.5 rounded-md hover:bg-ai-foreground/10"><ChevronLeft className="w-4 h-4" /></button>
                      <span className="text-[13px] tabular-nums text-ai-foreground/70">{aiVersionIdx + 1} of {aiVersions.length}</span>
                      <button onClick={() => cyclAIVersion(1)} aria-label="Next version" className="touch-compact p-1.5 rounded-md hover:bg-ai-foreground/10"><ChevronRight className="w-4 h-4" /></button>
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="text-[13px] text-muted-foreground" htmlFor="broadcast-message">Message</label>
                <textarea
                  id="broadcast-message"
                  ref={textareaRef}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Hey [First Name], quick one about your [Goal] this week…"
                  rows={5}
                  className="mt-1.5 w-full resize-none rounded-lg border border-input bg-card px-4 py-3 text-[15px] text-foreground placeholder:text-muted-foreground outline-none focus:border-foreground transition-colors"
                />
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[13px] text-muted-foreground mr-1">Insert</span>
                  {TOKENS.map(t => (
                    <button
                      key={t.value}
                      onClick={() => insertToken(t.value)}
                      className="touch-compact h-7 px-2 rounded-md border border-input bg-card text-[12px] font-medium text-foreground hover:bg-accent transition-colors"
                    >
                      {t.label.replace(/[[\]]/g, '')}
                    </button>
                  ))}
                  <span className="ml-auto text-[12px] text-muted-foreground tabular-nums">{message.length}</span>
                </div>
              </div>

              {message.trim() && sampleClient && (
                <div>
                  <p className="text-[13px] text-muted-foreground mb-1.5">What {sampleClient.name?.split(' ')[0]} will see</p>
                  <div className="ml-auto max-w-[90%] rounded-xl bg-primary px-4 py-3">
                    <p className="text-[15px] text-primary-foreground leading-relaxed">{previewMessage(message, sampleClient)}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Review & Send ── */}
          {step === 3 && (
            <div className="px-5 sm:px-6 py-4 space-y-4">
              <div>
                <p className="text-[15px] font-semibold text-foreground">
                  {selected.size} recipient{selected.size !== 1 ? 's' : ''}
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {scheduleMode && scheduleDate
                    ? `Scheduled for ${format(new Date(scheduleDate), 'MMM d, yyyy h:mm a')}`
                    : 'Sends now, as a private message to each client.'}
                </p>
              </div>
              <div className="rounded-xl bg-primary px-4 py-3">
                <p className="text-[15px] text-primary-foreground leading-relaxed line-clamp-6">
                  {sampleClient ? previewMessage(message, sampleClient) : message}
                </p>
              </div>

              <div>
                <Button variant="outline" className="w-full" onClick={() => setScheduleMode(m => !m)}>
                  <Calendar /> {scheduleMode ? 'Send now instead' : 'Schedule for later'}
                </Button>
                {scheduleMode && (
                  <input
                    type="datetime-local"
                    value={scheduleDate}
                    onChange={e => setScheduleDate(e.target.value)}
                    className="mt-2 w-full h-10 text-sm rounded-lg border border-input bg-card px-3 outline-none focus:border-foreground"
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-4 border-t border-border flex items-center justify-between gap-3 flex-shrink-0">
          <Button variant="outline" onClick={step === 1 ? onClose : () => setStep(s => s - 1)}>
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>

          {step < 3 ? (
            <Button
              onClick={() => setStep(s => s + 1)}
              disabled={(step === 1 && selected.size === 0) || (step === 2 && !message.trim())}
            >
              {step === 1 ? 'Next: message' : 'Next: review'}
            </Button>
          ) : (
            <Button onClick={handleSend} disabled={sending || selected.size === 0}>
              <Send />
              {sending ? 'Sending…' : scheduleMode && scheduleDate ? 'Schedule broadcast' : `Send to ${selected.size} client${selected.size !== 1 ? 's' : ''}`}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
