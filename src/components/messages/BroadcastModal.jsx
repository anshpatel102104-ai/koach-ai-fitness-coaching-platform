import React, { useState, useMemo, useRef } from 'react';
import { X, Megaphone, Search, Check, ChevronRight, ChevronLeft, Send, Calendar, Users, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { generateBroadcastMessage } from '@/lib/aiMessageAssistant';
import { SignedImg } from '@/components/shared/SignedImage';

const FILTERS = [
  { key: 'all', label: 'All Clients' },
  { key: 'active', label: 'Active' },
  { key: 'at_risk', label: 'At-Risk' },
  { key: 'no_program', label: 'No Program' },
  { key: 'lead', label: 'Leads' },
];

const TOKENS = [
  { label: '[First Name]', value: '[First Name]' },
  { label: '[Goal]', value: '[Goal]' },
  { label: '[Program Name]', value: '[Program Name]' },
  { label: '[Last Check-in Date]', value: '[Last Check-in Date]' },
  { label: '[Coach Name]', value: '[Coach Name]' },
];

const AVATAR_COLORS = [
  ['bg-accent', 'text-primary'],
  ['bg-ai/10', 'text-ai'],
  ['bg-success/10', 'text-success'],
  ['bg-warning/10', 'text-warning'],
  ['bg-destructive/10', 'text-destructive'],
];

function getAvatarColor(name = '') {
  return AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length];
}

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
    toast.success(`Broadcast sent to ${selected.size} client${selected.size !== 1 ? 's' : ''} ✓`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-ai to-primary flex items-center justify-center">
              <Megaphone className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Broadcast Message</p>
              <p className="text-[11px] text-muted-foreground">Step {step} of 3</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-1 px-5 py-3 border-b border-border flex-shrink-0">
          {[1, 2, 3].map(s => (
            <React.Fragment key={s}>
              <div className={cn(
                'flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full transition-all',
                step === s ? 'bg-primary text-primary-foreground' : step > s ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
              )}>
                {step > s ? <Check className="w-3 h-3" /> : s}
                {s === 1 ? 'Recipients' : s === 2 ? 'Compose' : 'Review'}
              </div>
              {s < 3 && <div className="flex-1 h-px bg-border" />}
            </React.Fragment>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* ── Step 1: Recipients ── */}
          {step === 1 && (
            <div className="p-5 space-y-3">
              {/* Filter chips */}
              <div className="flex flex-wrap gap-1.5">
                {FILTERS.map(f => (
                  <button
                    key={f.key}
                    onClick={() => handleFilterChange(f.key)}
                    className={cn(
                      'text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all',
                      filter === f.key
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted text-muted-foreground border-border hover:border-primary/40 hover:text-primary'
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Search + select all/none */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    placeholder="Search clients…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-muted outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20"
                  />
                </div>
                <button onClick={selectAll} className="text-[11px] text-primary font-semibold hover:underline whitespace-nowrap">All</button>
                <button onClick={deselectAll} className="text-[11px] text-muted-foreground font-semibold hover:underline whitespace-nowrap">None</button>
              </div>

              {/* Counter */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Users className="w-3.5 h-3.5" />
                <span><span className="font-bold text-primary">{selected.size}</span> client{selected.size !== 1 ? 's' : ''} selected</span>
              </div>

              {/* Client list */}
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {filteredClients.map(client => {
                  const [bg, text] = getAvatarColor(client.name);
                  const initials = (client.name || '?').split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase();
                  const isChecked = selected.has(client.id);
                  return (
                    <button
                      key={client.id}
                      onClick={() => toggleClient(client.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 rounded-xl border transition-all text-left',
                        isChecked ? 'border-primary/30 bg-accent/10' : 'border-border bg-card hover:bg-muted'
                      )}
                    >
                      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold overflow-hidden flex-shrink-0', bg, text)}>
                        {client.avatar_url
                          ? <SignedImg src={client.avatar_url} alt={client.name} className="w-full h-full object-cover" />
                          : initials}
                      </div>
                      <span className="flex-1 text-sm font-medium text-foreground truncate">{client.name}</span>
                      <div className={cn(
                        'w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
                        isChecked ? 'bg-primary border-primary' : 'border-muted-foreground'
                      )}>
                        {isChecked && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                    </button>
                  );
                })}
                {filteredClients.length === 0 && (
                  <p className="text-xs text-center text-muted-foreground py-6">No clients found</p>
                )}
              </div>
            </div>
          )}

          {/* ── Step 2: Compose ── */}
          {step === 2 && (
            <div className="p-5 space-y-4">
              {/* AI Generate button */}
              <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-accent/10 to-ai/10 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <p className="text-[11px] font-bold text-primary">AI Write Message</p>
                  {aiVersions.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold ml-auto">
                      {aiVersions[aiVersionIdx]?.tone_label}
                    </span>
                  )}
                </div>
                {aiVersions.length > 0 && (
                  <p className="text-[11px] text-muted-foreground mb-2">{aiVersions[aiVersionIdx]?.description}</p>
                )}
                <div className="flex items-center gap-2">
                  <button
                    onClick={generateAI}
                    disabled={aiLoading || selected.size === 0}
                    className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    {aiLoading ? 'Generating…' : aiVersions.length > 0 ? 'Regenerate' : '✨ AI Write'}
                  </button>
                  {aiVersions.length > 1 && (
                    <>
                      <button onClick={() => cyclAIVersion(-1)} className="text-[11px] font-semibold px-2 py-1.5 bg-card border border-border text-muted-foreground rounded-full hover:bg-muted">← Prev</button>
                      <span className="text-[10px] text-muted-foreground">{aiVersionIdx + 1}/{aiVersions.length}</span>
                      <button onClick={() => cyclAIVersion(1)} className="text-[11px] font-semibold px-2 py-1.5 bg-card border border-border text-muted-foreground rounded-full hover:bg-muted">Next →</button>
                    </>
                  )}
                </div>
              </div>

              {/* Token bar */}
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground mb-2">Personalization tokens — click to insert:</p>
                <div className="flex flex-wrap gap-1.5">
                  {TOKENS.map(t => (
                    <button
                      key={t.value}
                      onClick={() => insertToken(t.value)}
                      className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-ai/10 text-ai border border-ai hover:bg-ai/10 transition-colors"
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message textarea */}
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">Message</p>
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Hey [First Name], just wanted to check in on your [Goal] journey…"
                  rows={5}
                  className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 focus:bg-card transition-all"
                />
                <p className="text-[10px] text-muted-foreground mt-1 text-right">{message.length} chars</p>
              </div>

              {/* Live preview */}
              {message.trim() && sampleClient && (
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">Preview (for {sampleClient.name?.split(' ')[0]}):</p>
                  <div className="rounded-xl bg-gradient-to-br from-primary to-ai px-4 py-3">
                    <p className="text-sm text-white leading-relaxed">{previewMessage(message, sampleClient)}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Review & Send ── */}
          {step === 3 && (
            <div className="p-5 space-y-4">
              {/* Summary card */}
              <div className="rounded-xl border border-border bg-background p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">{selected.size} recipient{selected.size !== 1 ? 's' : ''}</span>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground mb-1">Message preview:</p>
                  <div className="rounded-lg bg-gradient-to-br from-primary to-ai px-3 py-2">
                    <p className="text-xs text-white leading-relaxed line-clamp-4">
                      {sampleClient ? previewMessage(message, sampleClient) : message}
                    </p>
                  </div>
                </div>
                {!scheduleMode && (
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Send className="w-3.5 h-3.5" />
                    Sends immediately to all selected clients
                  </div>
                )}
                {scheduleMode && scheduleDate && (
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    Scheduled for {format(new Date(scheduleDate), 'MMM d, yyyy h:mm a')}
                  </div>
                )}
              </div>

              {/* Schedule send toggle */}
              <div>
                <button
                  onClick={() => setScheduleMode(m => !m)}
                  className={cn(
                    'w-full text-xs font-semibold py-2 rounded-xl border transition-all flex items-center justify-center gap-2',
                    scheduleMode
                      ? 'bg-primary/10 text-primary border-primary/30'
                      : 'bg-muted text-muted-foreground border-border hover:border-primary/30 hover:text-primary'
                  )}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  {scheduleMode ? 'Switch to Send Now' : 'Schedule Send'}
                </button>
                {scheduleMode && (
                  <input
                    type="datetime-local"
                    value={scheduleDate}
                    onChange={e => setScheduleDate(e.target.value)}
                    className="mt-2 w-full text-xs rounded-xl border border-border bg-background px-3 py-2 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border flex items-center justify-between gap-3 flex-shrink-0">
          <button
            onClick={step === 1 ? onClose : () => setStep(s => s - 1)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground font-medium transition-colors"
          >
            {step === 1 ? (
              'Cancel'
            ) : (
              <><ChevronLeft className="w-4 h-4" /> Back</>
            )}
          </button>

          {step < 3 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={(step === 1 && selected.size === 0) || (step === 2 && !message.trim())}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={sending || selected.size === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-ai text-white text-sm font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md"
            >
              <Send className="w-3.5 h-3.5" />
              {sending ? 'Sending…' : scheduleMode && scheduleDate ? 'Schedule Broadcast' : `Send to ${selected.size} Client${selected.size !== 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}