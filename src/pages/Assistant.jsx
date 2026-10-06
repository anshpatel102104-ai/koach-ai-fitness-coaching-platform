import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Plus, Search } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Initials, Stat, Panel } from '@/components/kit';
import { cn } from '@/lib/utils';
import AssistantClaudeChat from '../components/assistant/AssistantClaudeChat';
import { averageAdherenceScore, calculateStreak } from '@/lib/adherence';
import { formatDistanceToNow, format } from 'date-fns';

// ── Quick action categories ────────────────────────────────────────────────
const QUICK_ACTIONS = [
  {
    label: 'Nutrition',
    actions: [
      { label: 'Adjust calories', key: 'calorie_adjust' },
      { label: 'Recalculate macros', key: 'macro_recalc' },
      { label: 'Critique the meal plan', key: 'meal_critique' },
      { label: 'Supplement suggestions', key: 'supplement_recs' },
    ],
  },
  {
    label: 'Programming',
    actions: [
      { label: 'Plan next week’s progression', key: 'workout_progression' },
      { label: 'Plan a deload week', key: 'deload_week' },
      { label: 'Exercise substitutions', key: 'exercise_subs' },
      { label: 'Periodization for the next block', key: 'periodization' },
    ],
  },
  {
    label: 'Client management',
    actions: [
      { label: 'Draft a check-in reply', key: 'checkin_response' },
      { label: 'Weekly summary', key: 'weekly_summary' },
      { label: 'Work out compliance issues', key: 'compliance_issues' },
      { label: 'Write a motivation message', key: 'motivation_msg' },
    ],
  },
  {
    label: 'Analysis',
    actions: [
      { label: 'Full client analysis', key: 'full_analysis' },
      { label: 'Is this client at risk?', key: 'at_risk' },
      { label: 'Break a plateau', key: 'plateau' },
      { label: 'Review their goal', key: 'goal_adjust' },
    ],
  },
];

function buildPrompt(key, client, plan, lastCheckIn, adherenceScore, streak) {
  const cn = client?.name || 'this client';
  const cal = plan?.calories || '?';
  const goal = client?.goal?.replace(/_/g, ' ') || 'general fitness';
  const training = lastCheckIn?.compliance_training ?? '?';
  const nutrition = lastCheckIn?.compliance_nutrition ?? '?';
  const mood = lastCheckIn?.mood || '?';
  const sleep = lastCheckIn?.sleep_hours || '?';
  const energy = lastCheckIn?.energy_level || '?';
  const notes = lastCheckIn?.notes || 'No notes';

  const MAP = {
    calorie_adjust: `Based on ${cn}'s current stats and ${adherenceScore}% overall adherence, should I adjust their calories? They are currently on ${cal} kcal targeting ${goal}. Analyze whether a deficit, surplus, or maintenance is optimal right now and give me specific numbers.`,
    macro_recalc: `Recalculate optimal macros for ${cn} based on their goal of ${goal}, current calories of ${cal} kcal, and ${adherenceScore}% adherence. Provide specific protein, carb, and fat targets with reasoning.`,
    meal_critique: `Critique the current meal plan for ${cn} who is targeting ${goal} at ${cal} kcal. Identify any gaps, improvements, and specific changes I should make.`,
    supplement_recs: `Based on ${cn}'s goal of ${goal} and current performance data, what supplements would you recommend? Be specific about dosage, timing, and expected benefits.`,
    workout_progression: `Review ${cn}'s current program and suggest specific progression for next week. Their training compliance is ${training}% and they're targeting ${goal}. Give concrete sets/reps/weight adjustments.`,
    deload_week: `Should ${cn} take a deload week soon? Their training compliance is ${training}% and they've been at ${adherenceScore}% overall adherence. If yes, design a deload protocol.`,
    exercise_subs: `Suggest the best exercise substitutions for ${cn} targeting ${goal}. Consider their compliance of ${training}% and any potential fatigue patterns.`,
    periodization: `Design a periodization strategy for ${cn} targeting ${goal}. What phase should they be in and what should the next 4-6 weeks look like?`,
    checkin_response: `Draft a professional coach response to ${cn}'s latest check-in. They reported: mood ${mood}, sleep ${sleep} hrs, energy ${energy}/10, training compliance ${training}%, nutrition compliance ${nutrition}%. Notes: "${notes}". Make it encouraging, specific, and actionable.`,
    weekly_summary: `Generate a comprehensive weekly summary for ${cn} covering: their progress this week, key wins to celebrate, areas needing improvement, adherence trends, and specific goals for next week.`,
    compliance_issues: `${cn} is showing ${training}% training compliance and ${nutrition}% nutrition compliance. Analyze potential reasons and give me 3-5 specific strategies to improve their adherence. Be practical and empathetic.`,
    motivation_msg: `Write a personalized motivational message for ${cn} who is working toward ${goal}. Their current mood is ${mood} and recent adherence is ${adherenceScore}%. Make it genuine and specific to their journey.`,
    full_analysis: `Provide a full coaching analysis for ${cn}. Cover: current progress toward ${goal}, nutrition adherence, training compliance, recovery indicators (mood ${mood}, sleep ${sleep}hrs), key wins, biggest concerns, and my top 3 action items as their coach.`,
    at_risk: `Assess ${cn}'s at-risk status. They have ${adherenceScore}% adherence, ${training}% training compliance, ${nutrition}% nutrition compliance, mood is ${mood}, and sleep is ${sleep} hrs. Are they at risk of dropping off? What intervention is needed?`,
    plateau: `${cn} may be hitting a progress plateau with ${adherenceScore}% adherence targeting ${goal}. Diagnose potential causes and give me 3-5 specific, evidence-based solutions to break through it.`,
    goal_adjust: `Should I adjust ${cn}'s goal of ${goal}? Based on their adherence of ${adherenceScore}% and recent trends, is their current goal realistic, too aggressive, or too easy? Recommend any adjustments with reasoning.`,
  };

  return MAP[key] || `Tell me about ${cn}'s coaching situation.`;
}

// ── Selected-client context (shared by the context column and quick actions) ─
function useClientContext(selectedClient) {
  const { data: checkIns = [] } = useQuery({
    queryKey: ['checkins-assistant'],
    queryFn: () => db.entities.CheckIn.list('-date', 200),
    staleTime: 60_000,
  });
  const { data: plans = [] } = useQuery({
    queryKey: ['nutrition-plans'],
    queryFn: () => db.entities.NutritionPlan.list(),
    staleTime: 60_000,
  });

  const clientCheckIns = checkIns.filter(c => c.client_id === selectedClient?.id).sort((a, b) => new Date(b.date) - new Date(a.date));
  const lastCheckIn = clientCheckIns[0];
  const adherenceScore = averageAdherenceScore(clientCheckIns) || 0;
  const streak = calculateStreak(clientCheckIns);
  const plan = plans.find(p => p.id === selectedClient?.assigned_nutrition_id);
  return { lastCheckIn, adherenceScore, streak, plan };
}

const goalLabel = (goal) => (goal ? goal.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()) : null);

// ── Client list (left column on wide screens) ──────────────────────────────
function ClientList({ clients, selectedClient, onSelectClient }) {
  const [query, setQuery] = useState('');
  const shown = clients.filter(c => !query || c.name?.toLowerCase().includes(query.toLowerCase()));
  const Row = ({ client, label, detail }) => {
    const active = client ? selectedClient?.id === client.id : !selectedClient;
    return (
      <button
        onClick={() => onSelectClient(client)}
        className={cn(
          'relative w-full flex items-center gap-3 px-5 py-3 text-left transition-colors',
          active ? 'bg-accent' : 'hover:bg-accent/50'
        )}
      >
        {active && <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-brand" />}
        <Initials name={label} size={36} tone={active ? 'ink' : 'default'} />
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold text-foreground truncate">{label}</span>
          {detail && <span className="block text-[13px] text-muted-foreground truncate">{detail}</span>}
        </span>
      </button>
    );
  };
  return (
    <>
      <div className="px-5 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Find a client" className="pl-9 bg-secondary border-transparent" aria-label="Find a client" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        {!query && <Row client={null} label="General" detail="Your whole roster or business" />}
        <p className="px-5 pt-3 pb-1 text-[13px] font-medium text-muted-foreground">Clients</p>
        {shown.map(c => (
          <Row key={c.id} client={c} label={c.name || 'Client'} detail={goalLabel(c.goal) || c.email} />
        ))}
        {shown.length === 0 && <p className="px-5 py-3 text-sm text-muted-foreground">No client matches that name.</p>}
      </div>
    </>
  );
}

// ── Context + quick actions ────────────────────────────────────────────────
function ContextPanel({ selectedClient, ctx }) {
  if (!selectedClient) {
    return (
      <div>
        <p className="text-[13px] text-muted-foreground">No client selected</p>
        <p className="text-[15px] text-foreground mt-1">Questions go to your whole roster. Pick a client to give the assistant their numbers.</p>
      </div>
    );
  }
  return (
    <div>
      <p className="text-[13px] text-muted-foreground">About {selectedClient.name?.split(' ')[0]}</p>
      <p className="num text-[32px] leading-none mt-2">{Math.round(ctx.adherenceScore)}%</p>
      <p className="text-[13px] text-muted-foreground mt-1">adherence over recent check-ins</p>
      <div className="grid grid-cols-2 gap-4 mt-4">
        <Stat size="sm" label="Check-in streak" value={ctx.streak} sub="in a row" />
        <Stat size="sm" label="Last check-in" value={ctx.lastCheckIn?.date ? format(new Date(ctx.lastCheckIn.date), 'MMM d') : '—'} />
      </div>
      <dl className="mt-4 space-y-1.5 text-sm">
        {selectedClient.goal && <div><dt className="inline font-semibold">Goal: </dt><dd className="inline">{goalLabel(selectedClient.goal)}</dd></div>}
        {selectedClient.current_weight && <div><dt className="inline font-semibold">Weight: </dt><dd className="inline">{selectedClient.current_weight} lb</dd></div>}
        {ctx.plan?.calories && <div><dt className="inline font-semibold">Calories: </dt><dd className="inline">{ctx.plan.calories} kcal</dd></div>}
      </dl>
    </div>
  );
}

function QuickActionList({ onAction }) {
  return (
    <div className="space-y-4">
      {QUICK_ACTIONS.map(cat => (
        <div key={cat.label}>
          <p className="text-[13px] font-medium text-muted-foreground mb-1">{cat.label}</p>
          <ul className="divide-y divide-border">
            {cat.actions.map(action => (
              <li key={action.key}>
                <button
                  onClick={() => onAction(action.key)}
                  className="w-full text-left py-2.5 text-sm text-foreground hover:underline underline-offset-4 decoration-1"
                >
                  {action.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function RecentChats({ conversations, onLoadConversation }) {
  if (!conversations.length) return null;
  return (
    <ul className="divide-y divide-border">
      {conversations.slice(0, 5).map(conv => (
        <li key={conv.id}>
          <button onClick={() => onLoadConversation(conv)} className="w-full text-left py-2.5 group">
            <span className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-semibold text-foreground truncate">{conv.client_name || 'General'}</span>
              <span className="text-[12px] text-muted-foreground flex-shrink-0">
                {conv.created_date ? formatDistanceToNow(new Date(conv.created_date), { addSuffix: true }) : ''}
              </span>
            </span>
            <span className="block text-[13px] text-muted-foreground truncate group-hover:text-foreground">{conv.title || 'Conversation'}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function Assistant() {
  const [selectedClient, setSelectedClient] = useState(null);
  const [pendingPrompt, setPendingPrompt] = useState(null);
  const [chatKey, setChatKey] = useState(0); // bump to reset chat

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => db.entities.Client.list('name'),
  });
  const { data: conversations = [], refetch: refetchConvos } = useQuery({
    queryKey: ['ai-conversations'],
    // Most recently active chats first (a continued chat is updated in place).
    queryFn: () => db.entities.AIConversation.list('-updated_date', 10),
    staleTime: 30_000,
  });

  const ctx = useClientContext(selectedClient);

  const handleQuickAction = useCallback((prompt) => {
    setPendingPrompt(prompt);
  }, []);

  const handleAction = (key) => {
    if (!selectedClient) {
      handleQuickAction(`As a fitness coach, I need help with: ${QUICK_ACTIONS.flatMap(c => c.actions).find(a => a.key === key)?.label}. Please provide expert guidance.`);
      return;
    }
    handleQuickAction(buildPrompt(key, selectedClient, ctx.plan, ctx.lastCheckIn, Math.round(ctx.adherenceScore), ctx.streak));
  };

  const handleNewChat = () => {
    setChatKey(k => k + 1);
    setPendingPrompt(null);
  };

  const handleLoadConversation = (conv) => {
    setChatKey(k => k + 1);
    // Pass the saved messages as initial state via pendingPrompt won't work,
    // so we pass via a special object
    setPendingPrompt({ __loadMessages: conv.messages || [], __conversationId: conv.id, __clientId: conv.client_id ?? null });
  };

  return (
    <div className="xl:h-[calc(100dvh-76px)] flex flex-col xl:flex-row xl:overflow-hidden">
      {/* Left: title + client list (wide) / title + client select (narrow) */}
      <aside className="xl:w-[300px] xl:flex-shrink-0 xl:bg-card xl:border-r xl:border-border flex flex-col xl:min-h-0">
        <div className="px-4 sm:px-6 xl:px-5 pt-6 xl:pt-7 pb-4 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[32px] text-foreground">Assistant</h1>
            <p className="text-sm text-muted-foreground mt-1 xl:hidden">Ask about a client or your roster. It proposes changes; nothing saves until you confirm.</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleNewChat} className="flex-shrink-0"><Plus /> New chat</Button>
        </div>

        <div className="px-4 sm:px-6 pb-4 xl:hidden">
          <Select value={selectedClient?.id || ''} onValueChange={id => setSelectedClient(clients.find(c => c.id === id) || null)}>
            <SelectTrigger className="bg-card" aria-label="Client">
              <SelectValue placeholder="General, no client" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>General, no client</SelectItem>
              {clients.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="hidden xl:flex flex-col flex-1 min-h-0">
          <ClientList clients={clients} selectedClient={selectedClient} onSelectClient={setSelectedClient} />
          {conversations.length > 0 && (
            <div className="border-t border-border px-5 pt-4 pb-3 max-h-[38%] overflow-y-auto flex-shrink-0">
              <p className="text-[13px] font-medium text-muted-foreground">Recent chats</p>
              <RecentChats conversations={conversations} onLoadConversation={handleLoadConversation} />
            </div>
          )}
        </div>
      </aside>

      {/* Centre: the thread */}
      <section className="flex-1 min-w-0 flex flex-col xl:min-h-0 px-4 sm:px-6 xl:px-0">
        <AssistantClaudeChat
          key={chatKey}
          selectedClient={selectedClient}
          pendingPrompt={pendingPrompt}
          onPromptConsumed={() => setPendingPrompt(null)}
          onSave={() => refetchConvos()}
        />
      </section>

      {/* Right: context + quick actions (wide) */}
      <aside className="hidden xl:flex xl:flex-col w-[300px] flex-shrink-0 bg-card border-l border-border overflow-y-auto px-5 py-7 gap-7">
        <ContextPanel selectedClient={selectedClient} ctx={ctx} />
        <div>
          <p className="text-sm font-semibold text-foreground mb-3">Quick actions</p>
          <QuickActionList onAction={handleAction} />
        </div>
      </aside>

      {/* Narrow screens: context, quick actions and recent chats below the thread */}
      <div className="xl:hidden px-4 sm:px-6 py-6 grid gap-5 md:grid-cols-2">
        <Panel className="p-5">
          <ContextPanel selectedClient={selectedClient} ctx={ctx} />
          {conversations.length > 0 && (
            <div className="mt-6 pt-5 border-t border-border">
              <p className="text-sm font-semibold text-foreground mb-1">Recent chats</p>
              <RecentChats conversations={conversations} onLoadConversation={handleLoadConversation} />
            </div>
          )}
        </Panel>
        <Panel className="p-5">
          <p className="text-sm font-semibold text-foreground mb-3">Quick actions</p>
          <QuickActionList onAction={handleAction} />
        </Panel>
      </div>
    </div>
  );
}
