import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Mic, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { averageAdherenceScore, calculateStreak } from '@/lib/adherence';
import { format } from 'date-fns';

const TOOL_LABELS = {
  create_nutrition_plan: 'Created a nutrition plan',
  update_nutrition_plan: 'Updated the nutrition plan',
  update_program: 'Updated the program',
  get_program: 'Read the program',
  list_checkins: 'Read check-ins',
  create_program: 'Created a program',
  update_client: 'Updated the client',
  flag_client_at_risk: 'Flagged as at risk',
  send_message: 'Sent a message',
  create_checkin_response: 'Replied to a check-in',
  award_badge: 'Awarded a badge',
  get_client_data: 'Read client data',
  list_clients: 'Read your client list',
};
const toolLabel = (tool) => TOOL_LABELS[tool] || String(tool || 'Action').replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());

function ActionCard({ action }) {
  const isError = !!action.result?.error;
  return (
    <div className="flex items-start gap-3 px-4 py-2.5 rounded-lg bg-secondary text-sm">
      <span className={cn('mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0', isError ? 'bg-destructive' : 'bg-success')} />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground">{toolLabel(action.tool)}</p>
        <p className={cn('text-[13px] truncate', isError ? 'text-destructive' : 'text-muted-foreground')}>
          {action.result?.message || action.result?.error || 'Done'}
        </p>
      </div>
    </div>
  );
}


/* A write the assistant proposed. Nothing is saved until the coach confirms. */
function ProposalCard({ proposal, onResolve }) {
  const busy = proposal.status === 'saving';
  const done = proposal.status === 'confirmed';
  const dismissed = proposal.status === 'dismissed';
  return (
    <div className={cn('w-full rounded-xl bg-card p-4 text-sm', done ? 'ring-1 ring-success' : 'ring-1 ring-border', dismissed && 'opacity-60')}>
      <p className="text-[13px] font-semibold text-muted-foreground">
        {done ? 'Saved' : dismissed ? 'Dismissed, nothing was changed' : 'Proposed change'}
      </p>
      <p className="text-[15px] font-semibold text-foreground mt-1">{proposal.summary}</p>
      {proposal.changes?.length > 0 && (
        <dl className="mt-2 divide-y divide-border">
          {proposal.changes.map((c, i) => (
            <div key={i} className="flex flex-wrap items-baseline gap-x-2 py-1.5 text-[13px]">
              <dt className="font-semibold text-foreground capitalize">{String(c.field).replace(/_/g, ' ')}</dt>
              <dd className="text-muted-foreground">
                {c.before !== '' && c.before != null && <span className="line-through mr-2">{String(c.before)}</span>}
                <span className="text-foreground font-medium">{String(c.after)}</span>
              </dd>
            </div>
          ))}
        </dl>
      )}
      {proposal.error && <p className="text-[13px] text-destructive mt-2">{proposal.error}</p>}
      {(proposal.status === 'pending' || proposal.status === 'failed' || busy) && (
        <div className="flex gap-2 pt-3">
          <Button size="sm" onClick={() => onResolve(proposal, 'confirm')} disabled={busy}>
            {busy && <Loader2 className="animate-spin" />} Confirm and save
          </Button>
          <Button size="sm" variant="outline" onClick={() => onResolve(proposal, 'dismiss')} disabled={busy}>
            Dismiss
          </Button>
        </div>
      )}
    </div>
  );
}

function MessageBubble({ message, onSaveNote, onResolveProposal }) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn('flex flex-col gap-2', isUser ? 'items-end' : 'items-start')}>
      <div className={cn('flex flex-col gap-2 w-full', isUser ? 'items-end max-w-[85%] sm:max-w-[70%]' : 'items-start max-w-[92%] sm:max-w-[80%]')}>
        {message.actions?.length > 0 && (
          <div className="w-full space-y-1.5">
            {message.actions.map((a, i) => <ActionCard key={i} action={a} />)}
          </div>
        )}

        {message.proposals?.length > 0 && (
          <div className="w-full space-y-2">
            {message.proposals.map((p) => <ProposalCard key={p.id} proposal={p} onResolve={onResolveProposal} />)}
          </div>
        )}

        {message.content && (
          <div className={cn('rounded-xl px-4 py-3 text-[15px]',
            isUser ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground ring-1 ring-border/60')}>
            {isUser ? (
              <p className="leading-relaxed whitespace-pre-wrap">{message.content}</p>
            ) : (
              <ReactMarkdown
                className="max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                components={{
                  p: ({ children }) => <p className="my-1.5 leading-relaxed">{children}</p>,
                  ul: ({ children }) => <ul className="my-1.5 ml-5 list-disc space-y-1">{children}</ul>,
                  ol: ({ children }) => <ol className="my-1.5 ml-5 list-decimal space-y-1">{children}</ol>,
                  li: ({ children }) => <li className="my-0 leading-relaxed">{children}</li>,
                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                  h1: ({ children }) => <p className="text-[15px] font-bold mt-3 mb-1">{children}</p>,
                  h2: ({ children }) => <p className="text-[15px] font-bold mt-3 mb-1">{children}</p>,
                  h3: ({ children }) => <p className="text-[15px] font-semibold mt-2 mb-1">{children}</p>,
                  code: ({ children }) => <code className="px-1 py-0.5 rounded bg-secondary text-[13px] font-mono">{children}</code>,
                }}
              >
                {message.content}
              </ReactMarkdown>
            )}
          </div>
        )}

        <div className="flex items-center gap-3 px-1 text-[12px] text-muted-foreground">
          {message.timestamp && <span>{message.timestamp}</span>}
          {!isUser && message.content && (
            <>
              <button onClick={handleCopy} className="font-semibold text-foreground/80 hover:text-foreground underline underline-offset-4 decoration-1">
                {copied ? 'Copied' : 'Copy'}
              </button>
              {onSaveNote && (
                <button onClick={() => onSaveNote(message.content)} className="font-semibold text-foreground/80 hover:text-foreground underline underline-offset-4 decoration-1">
                  Save to client notes
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground px-1">
      <Loader2 className="w-4 h-4 animate-spin" />
      Working on it
    </div>
  );
}

export default function AssistantClaudeChat({ selectedClient, pendingPrompt, onPromptConsumed, onSave }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: checkIns = [] } = useQuery({
    queryKey: ['checkins-chat'],
    queryFn: () => db.entities.CheckIn.list('-date', 200),
    staleTime: 60_000,
  });
  const { data: plans = [] } = useQuery({
    queryKey: ['nutrition-plans'],
    queryFn: () => db.entities.NutritionPlan.list(),
    staleTime: 60_000,
  });

  const clientCheckIns = checkIns.filter(c => c.client_id === selectedClient?.id)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  const lastCheckIn = clientCheckIns[0];
  const adherenceScore = Math.round(averageAdherenceScore(clientCheckIns) || 0);
  const streak = calculateStreak(clientCheckIns);
  const plan = plans.find(p => p.id === selectedClient?.assigned_nutrition_id);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isLoading]);

  useEffect(() => {
    if (!pendingPrompt) return;
    if (pendingPrompt.__loadMessages) {
      setMessages(pendingPrompt.__loadMessages);
      onPromptConsumed?.();
      return;
    }
    setInput(pendingPrompt);
    onPromptConsumed?.();
    setTimeout(() => textareaRef.current?.focus(), 50);
  }, [pendingPrompt]);

  const sendMessage = useCallback(async (text) => {
    const trimmed = (text || input).trim();
    if (!trimmed || isLoading) return;
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    const userMsg = { role: 'user', content: trimmed, timestamp: format(new Date(), 'h:mm a') };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    // Build client context to send to backend
    const clientContext = selectedClient ? {
      id: selectedClient.id,
      name: selectedClient.name,
      goal: selectedClient.goal,
      current_weight: selectedClient.current_weight,
      target_weight: selectedClient.target_weight,
      assigned_nutrition_id: selectedClient.assigned_nutrition_id,
      assigned_program_id: selectedClient.assigned_program_id,
      lifecycle_status: selectedClient.lifecycle_status,
      adherenceScore,
      streak,
      lastCheckIn: lastCheckIn ? { id: lastCheckIn.id, date: lastCheckIn.date, mood: lastCheckIn.mood, notes: lastCheckIn.notes, compliance_training: lastCheckIn.compliance_training, compliance_nutrition: lastCheckIn.compliance_nutrition, sleep_hours: lastCheckIn.sleep_hours, energy_level: lastCheckIn.energy_level } : null,
    } : null;

    // Build conversation history (last 6 exchanges)
    const conversationHistory = messages.slice(-6).map(m => ({ role: m.role, content: m.content || '' }));

    try {
      const res = await db.functions.invoke('claudeAssistant', {
        userMessage: trimmed,
        conversationHistory,
        clientContext,
      });

      const data = res.data;
      if (data?.error) throw new Error(data.error);

      const aiMsg = {
        role: 'assistant',
        content: data.response || '',
        actions: data.actions || [],
        proposals: (data.proposals || []).map(p => ({ ...p, status: 'pending' })),
        timestamp: format(new Date(), 'h:mm a'),
      };
      setMessages(prev => [...prev, aiMsg]);

      // Invalidate relevant queries so UI reflects changes
      if (data.actions?.length > 0) { // reads only; writes are saved after confirmation
        queryClient.invalidateQueries({ queryKey: ['clients'] });
        queryClient.invalidateQueries({ queryKey: ['nutrition-plans'] });
        queryClient.invalidateQueries({ queryKey: ['programs'] });
        queryClient.invalidateQueries({ queryKey: ['messages'] });
        queryClient.invalidateQueries({ queryKey: ['checkins-review'] });
        queryClient.invalidateQueries({ queryKey: ['checkins-chat'] });
        queryClient.invalidateQueries({ queryKey: ['badges'] });
      }

      // Save conversation
      const title = trimmed.slice(0, 60) + (trimmed.length > 60 ? '...' : '');
      db.entities.AIConversation.create({
        client_id: selectedClient?.id || '',
        client_name: selectedClient?.name || 'General',
        title,
        messages: [...messages, userMsg, aiMsg].filter(m => m.role === 'user' || m.role === 'assistant').map(m => ({ role: m.role, content: m.content, timestamp: m.timestamp })),
      }).then(() => onSave?.()).catch(() => {});

    } catch (err) {
      toast.error('The assistant hit an error: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }, [input, messages, isLoading, selectedClient, adherenceScore, streak, lastCheckIn, plan, queryClient]);

  const patchProposal = (id, patch) => setMessages(prev => prev.map(m =>
    m.proposals?.some(p => p.id === id)
      ? { ...m, proposals: m.proposals.map(p => (p.id === id ? { ...p, ...patch } : p)) }
      : m));

  const handleResolveProposal = async (proposal, decision) => {
    if (decision === 'dismiss') { patchProposal(proposal.id, { status: 'dismissed' }); return; }
    patchProposal(proposal.id, { status: 'saving', error: null });
    try {
      const res = await db.functions.invoke('claudeAssistant', { confirm: { tool: proposal.tool, input: proposal.input } });
      if (res.data?.error) throw new Error(res.data.error);
      if (res.data?.result?.error) throw new Error(res.data.result.error);
      patchProposal(proposal.id, { status: 'confirmed' });
      toast.success(res.data?.result?.message || 'Saved');
      ['clients', 'nutrition-plans', 'programs', 'messages', 'checkins-review', 'checkins-chat', 'badges']
        .forEach(k => queryClient.invalidateQueries({ queryKey: [k] }));
    } catch (err) {
      patchProposal(proposal.id, { status: 'failed', error: err.message });
    }
  };

  const handleSaveNote = async (content) => {
    if (!selectedClient) { toast.error('Select a client first'); return; }
    const note = '[AI Note - ' + format(new Date(), 'MMM d, yyyy') + ']\n' + content.slice(0, 500);
    const existing = await db.entities.Client.filter({ id: selectedClient.id }, '-created_date', 1).then(r => r[0]);
    await db.entities.Client.update(selectedClient.id, { notes: (existing?.notes ? existing.notes + '\n\n' : '') + note });
    queryClient.invalidateQueries({ queryKey: ['clients'] });
    toast.success('Saved to client notes');
  };

  const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };
  const handleInputChange = (e) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  const isEmpty = messages.length === 0;
  const STARTER_PROMPTS = selectedClient ? [
    'Draft a reply to ' + selectedClient.name + "'s latest check-in",
    'Is ' + selectedClient.name + ' at risk of dropping off?',
    'Build a fat loss nutrition plan for ' + selectedClient.name,
    'Write ' + selectedClient.name + ' a short check-in message',
  ] : [
    'Which clients are at risk this week?',
    'Who needs a nutrition plan update?',
    'Draft replies to pending check-ins',
    'Award streak badges to clients who earned them',
  ];

  const firstName = selectedClient?.name?.split(' ')[0];

  return (
    <div className="flex flex-col flex-1 h-[calc(100dvh-56px-96px-140px)] min-h-[520px] xl:min-h-0 xl:h-auto rounded-xl xl:rounded-none overflow-hidden ring-1 ring-border/60 xl:ring-0 bg-background">
      {/* Thread header */}
      <div className="flex items-center justify-between gap-4 px-5 sm:px-6 py-4 bg-card border-b border-border flex-shrink-0">
        <h2 className="text-[22px] sm:text-[26px] text-foreground truncate">{selectedClient ? selectedClient.name : 'General'}</h2>
        <p className="text-[13px] text-muted-foreground text-right hidden sm:block">Proposes changes. Nothing saves until you confirm.</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-5 min-h-0">
        {isEmpty ? (
          <div className="max-w-xl mx-auto pt-6 sm:pt-12">
            <h3 className="text-[28px] text-foreground">{selectedClient ? `What do you need for ${firstName}?` : 'What do you need?'}</h3>
            <p className="text-[15px] text-muted-foreground mt-2">
              {selectedClient
                ? `It can read ${firstName}'s check-ins, plans and program, and draft changes or messages for you to approve.`
                : 'Ask about your roster or business, or pick a client so it can use their numbers.'}
            </p>
            <div className="flex flex-wrap gap-2 mt-5">
              {STARTER_PROMPTS.map(q => (
                <Button key={q} variant="outline" size="sm" className="h-auto min-h-8 py-1.5 whitespace-normal text-left" onClick={() => sendMessage(q)}>
                  {q}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.length > 0 && <p className="text-center text-[13px] text-muted-foreground">Today</p>}
            {messages.map((msg, i) => (
              <MessageBubble
                key={i}
                message={msg}
                onSaveNote={msg.role === 'assistant' ? handleSaveNote : null}
                onResolveProposal={handleResolveProposal}
              />
            ))}
            {isLoading && <TypingIndicator />}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <div className="px-4 sm:px-6 py-4 border-t border-border bg-card flex-shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKey}
            placeholder={selectedClient ? `Ask about ${firstName}, or tell it what to do` : 'Ask a question or give it a job'}
            rows={1}
            aria-label="Message the assistant"
            className="flex-1 resize-none rounded-md border border-input bg-card px-4 py-3 text-[15px] placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[48px]"
            disabled={isLoading}
            style={{ height: 'auto', overflow: 'hidden' }}
          />
          <Button variant="outline" size="icon" className="h-12 w-12 flex-shrink-0 hidden sm:inline-flex" onClick={() => toast.info('Voice input isn’t available yet')} aria-label="Voice input">
            <Mic />
          </Button>
          <Button className="h-12 px-5 flex-shrink-0" onClick={() => sendMessage()} disabled={isLoading || !input.trim()}>
            {isLoading ? <Loader2 className="animate-spin" /> : 'Send'}
          </Button>
        </div>
        <p className="text-[12px] text-muted-foreground mt-2 hidden sm:block">Enter to send, Shift + Enter for a new line.</p>
      </div>
    </div>
  );
}
