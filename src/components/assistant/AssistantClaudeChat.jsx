import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Send, Sparkles, Copy, Check, Mic, BookmarkPlus, User, Zap, CheckCircle, AlertCircle, Loader2, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { averageAdherenceScore, calculateStreak } from '@/lib/adherence';
import { format } from 'date-fns';

const TOOL_ICONS = {
  create_nutrition_plan: '🥗',
  update_nutrition_plan: '📊',
  update_program: '🏋️',
  get_program: '🔍',
  list_checkins: '📋',
  create_program: '💪',
  update_client: '👤',
  flag_client_at_risk: '⚠️',
  send_message: '💬',
  create_checkin_response: '✅',
  award_badge: '🏆',
  get_client_data: '🔍',
  list_clients: '📋',
};

function ActionCard({ action }) {
  const icon = TOOL_ICONS[action.tool] || '⚙️';
  const label = (action.tool || '').replace(/_/g, ' ');
  const isError = !!action.result?.error;
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-background border border-border rounded-xl text-sm">
      <span className="text-lg">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground capitalize">{label}</p>
        <p className="text-muted-foreground text-xs truncate">{action.result?.message || action.result?.error || 'Done'}</p>
      </div>
      {isError
        ? <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
        : <CheckCircle className="w-4 h-4 text-success shrink-0" />
      }
    </div>
  );
}


/* A write the assistant proposed. Nothing is saved until the coach confirms. */
function ProposalCard({ proposal, onResolve }) {
  const icon = TOOL_ICONS[proposal.tool] || '⚙️';
  const busy = proposal.status === 'saving';
  const done = proposal.status === 'confirmed';
  const dismissed = proposal.status === 'dismissed';
  return (
    <div className={cn('w-full rounded-xl border p-3 text-sm space-y-2',
      done ? 'border-success bg-success/10' : dismissed ? 'border-border bg-secondary opacity-60' : 'border-primary/40 bg-primary/5')}>
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <p className="font-semibold text-foreground flex-1 min-w-0">{proposal.summary}</p>
        {done && <CheckCircle className="w-4 h-4 text-success shrink-0" />}
        {proposal.status === 'failed' && <AlertCircle className="w-4 h-4 text-destructive shrink-0" />}
      </div>
      {proposal.changes?.length > 0 && (
        <ul className="space-y-1 text-xs">
          {proposal.changes.map((c, i) => (
            <li key={i} className="flex flex-wrap gap-x-2 text-muted-foreground">
              <span className="font-medium text-foreground">{String(c.field).replace(/_/g, ' ')}:</span>
              {c.before !== '' && c.before != null && <span className="line-through">{String(c.before)}</span>}
              <span className="text-foreground">{String(c.after)}</span>
            </li>
          ))}
        </ul>
      )}
      {proposal.error && <p className="text-xs text-destructive">{proposal.error}</p>}
      {(proposal.status === 'pending' || proposal.status === 'failed' || busy) && (
        <div className="flex gap-2 pt-1">
          <button onClick={() => onResolve(proposal, 'confirm')} disabled={busy}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-60">
            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Confirm &amp; save
          </button>
          <button onClick={() => onResolve(proposal, 'dismiss')} disabled={busy}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:bg-secondary disabled:opacity-60">
            <X className="w-3 h-3" /> Dismiss
          </button>
        </div>
      )}
      {done && <p className="text-xs text-success font-medium">Saved</p>}
      {dismissed && <p className="text-xs text-muted-foreground">Dismissed — nothing was changed</p>}
    </div>
  );
}

function MessageBubble({ message, onFollowUp, onSaveNote, onResolveProposal, isLast }) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn('flex gap-3 group', isUser && 'flex-row-reverse')}>
      <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
        isUser ? 'bg-foreground' : 'bg-primary/10')}>
        {isUser ? <User className="w-3.5 h-3.5 text-background" /> : <Sparkles className="w-3.5 h-3.5 text-primary" />}
      </div>

      <div className={cn('flex flex-col gap-2', isUser ? 'items-end max-w-[80%]' : 'items-start max-w-[85%]')}>
        {/* Action cards */}
        {message.actions?.length > 0 && (
          <div className="w-full space-y-1.5">
            {message.actions.map((a, i) => <ActionCard key={i} action={a} />)}
          </div>
        )}

        {/* Proposed writes — need coach confirmation */}
        {message.proposals?.length > 0 && (
          <div className="w-full space-y-1.5">
            {message.proposals.map((p) => <ProposalCard key={p.id} proposal={p} onResolve={onResolveProposal} />)}
          </div>
        )}

        {/* Text bubble */}
        {message.content && (
          <div className={cn('rounded-2xl px-4 py-3 text-sm',
            isUser ? 'bg-sidebar text-white' : 'bg-card border border-border text-foreground shadow-sm')}>
            {isUser ? (
              <p className="leading-relaxed whitespace-pre-wrap">{message.content}</p>
            ) : (
              <ReactMarkdown
                className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                components={{
                  p: ({ children }) => <p className="my-1 leading-relaxed">{children}</p>,
                  ul: ({ children }) => <ul className="my-1 ml-4 list-disc space-y-0.5">{children}</ul>,
                  ol: ({ children }) => <ol className="my-1 ml-4 list-decimal space-y-0.5">{children}</ol>,
                  li: ({ children }) => <li className="my-0">{children}</li>,
                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                  h2: ({ children }) => <h2 className="text-sm font-bold mt-3 mb-1">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-sm font-semibold mt-2 mb-1">{children}</h3>,
                  code: ({ children }) => <code className="px-1 py-0.5 rounded bg-secondary text-xs font-mono">{children}</code>,
                }}
              >
                {message.content}
              </ReactMarkdown>
            )}
          </div>
        )}

        {/* Actions row */}
        {!isUser && (
          <div className="flex items-center gap-2 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {message.timestamp && <span className="text-[10px] text-muted-foreground">{message.timestamp}</span>}
            <button onClick={handleCopy} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
              {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            {onSaveNote && (
              <button onClick={() => onSaveNote(message.content)} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                <BookmarkPlus className="w-3 h-3" /> Save note
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Sparkles className="w-3.5 h-3.5 text-primary" />
      </div>
      <div className="bg-card border border-border rounded-2xl px-4 py-3 shadow-sm">
        <div className="flex gap-1 items-center h-4">
          {[0, 150, 300].map(delay => (
            <div key={delay} className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: delay + 'ms' }} />
          ))}
        </div>
      </div>
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
      toast.error('AI error: ' + err.message);
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
    'Create a fat loss nutrition plan for ' + selectedClient.name,
    'Respond to ' + selectedClient.name + "'s latest check-in",
    'Send ' + selectedClient.name + ' a motivational message',
    'Analyze ' + selectedClient.name + "'s progress and flag if at risk",
  ] : [
    'List all my at-risk clients',
    'Who needs a nutrition plan update?',
    'Respond to all pending check-ins',
    'Award streak badges to qualifying clients',
  ];

  return (
    <div className="bg-card border border-border rounded-xl flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 200px)', minHeight: '500px' }}>
      {/* Agent indicator */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
        <Zap className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-semibold text-primary">Agentic Mode</span>
        <span className="text-xs text-muted-foreground">— proposes changes; nothing saves until you confirm</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 min-h-0">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-12">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="font-bold text-lg text-foreground">
                {selectedClient ? 'Coaching ' + selectedClient.name : 'AI Coach Assistant'}
              </p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                {selectedClient
                  ? 'I can take real actions for ' + selectedClient.name + ' — create plans, send messages, respond to check-ins, award badges, and more.'
                  : 'Select a client for context, or ask me anything about your coaching business.'}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 max-w-md w-full mt-2">
              {STARTER_PROMPTS.map(q => (
                <button key={q} onClick={() => sendMessage(q)}
                  className="text-xs text-left bg-secondary hover:bg-border p-3 rounded-xl transition-colors text-muted-foreground">
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <MessageBubble
                key={i}
                message={msg}
                isLast={i === messages.length - 1 && msg.role === 'assistant'}
                onFollowUp={sendMessage}
                onSaveNote={msg.role === 'assistant' ? handleSaveNote : null}
                onResolveProposal={handleResolveProposal}
              />
            ))}
            {isLoading && <TypingIndicator />}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border bg-card flex-shrink-0">
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKey}
              placeholder={selectedClient ? 'Tell me what to do for ' + selectedClient.name + '...' : 'Ask or give me an action to take...'}
              rows={1}
              className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring pr-10 min-h-[40px]"
              disabled={isLoading}
              style={{ height: 'auto', overflow: 'hidden' }}
            />
          </div>
          <button onClick={() => toast.info('Voice input coming soon!')}
            className="h-9 w-9 rounded-xl border border-input bg-background flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors shrink-0">
            <Mic className="w-4 h-4" />
          </button>
          <button onClick={() => sendMessage()} disabled={isLoading || !input.trim()}
            className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 px-1">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}