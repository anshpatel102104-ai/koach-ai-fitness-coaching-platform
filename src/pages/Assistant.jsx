import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Sparkles, PlusCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import AssistantClaudeChat from '../components/assistant/AssistantClaudeChat';
import { averageAdherenceScore, calculateStreak } from '@/lib/adherence';
import { formatDistanceToNow } from 'date-fns';

// ── Quick action categories ────────────────────────────────────────────────
const QUICK_ACTIONS = [
  {
    label: 'Nutrition',
    color: 'text-success',
    bg: 'bg-success/10',
    actions: [
      { label: 'Calorie Adjustment', key: 'calorie_adjust' },
      { label: 'Macro Recalculation', key: 'macro_recalc' },
      { label: 'Meal Plan Critique', key: 'meal_critique' },
      { label: 'Supplement Recommendations', key: 'supplement_recs' },
    ],
  },
  {
    label: 'Programming',
    color: 'text-primary',
    bg: 'bg-accent',
    actions: [
      { label: 'Workout Progression', key: 'workout_progression' },
      { label: 'Deload Week Planning', key: 'deload_week' },
      { label: 'Exercise Substitutions', key: 'exercise_subs' },
      { label: 'Program Periodization', key: 'periodization' },
    ],
  },
  {
    label: 'Client Management',
    color: 'text-ai',
    bg: 'bg-ai/10',
    actions: [
      { label: 'Check-In Response Draft', key: 'checkin_response' },
      { label: 'Weekly Summary', key: 'weekly_summary' },
      { label: 'Compliance Issues', key: 'compliance_issues' },
      { label: 'Motivation Message', key: 'motivation_msg' },
    ],
  },
  {
    label: 'Analysis',
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    actions: [
      { label: 'Full Client Analysis', key: 'full_analysis' },
      { label: 'At-Risk Assessment', key: 'at_risk' },
      { label: 'Progress Plateau Solutions', key: 'plateau' },
      { label: 'Goal Adjustment', key: 'goal_adjust' },
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

// ── Sidebar component ──────────────────────────────────────────────────────
function AssistantSidebar({ clients, selectedClient, onSelectClient, onQuickAction, conversations, onLoadConversation, onNewChat }) {
  const [expandedCat, setExpandedCat] = useState('Nutrition');

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

  const handleAction = (key) => {
    if (!selectedClient) {
      onQuickAction(`As a fitness coach, I need help with: ${QUICK_ACTIONS.flatMap(c => c.actions).find(a => a.key === key)?.label}. Please provide expert guidance.`);
      return;
    }
    onQuickAction(buildPrompt(key, selectedClient, plan, lastCheckIn, Math.round(adherenceScore), streak));
  };

  return (
    <div className="w-full lg:w-[280px] lg:shrink-0 flex flex-col gap-4 overflow-y-auto pr-1">
      {/* Client selector */}
      <div className="bg-card border border-border rounded-xl p-4">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Client Context</p>
        <Select value={selectedClient?.id || ''} onValueChange={id => onSelectClient(clients.find(c => c.id === id) || null)}>
          <SelectTrigger className="text-sm">
            <SelectValue placeholder="Select a client..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>General Question</SelectItem>
            {clients.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Client context card */}
        {selectedClient && (
          <div className="mt-3 pt-3 border-t border-border space-y-1.5">
            <p className="text-xs font-semibold truncate">{selectedClient.name}</p>
            <div className="flex flex-wrap gap-1">
              <span className="text-[10px] bg-accent text-primary px-2 py-0.5 rounded-full font-medium capitalize">{selectedClient.goal?.replace(/_/g, ' ')}</span>
              {selectedClient.current_weight && (
                <span className="text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">{selectedClient.current_weight} lbs</span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-1 mt-2">
              <div className="text-center bg-secondary rounded-lg py-1.5">
                <p className="text-sm font-black text-foreground">{Math.round(adherenceScore)}%</p>
                <p className="text-[9px] text-muted-foreground">Adherence</p>
              </div>
              <div className="text-center bg-secondary rounded-lg py-1.5">
                <p className="text-sm font-black text-foreground">{streak}</p>
                <p className="text-[9px] text-muted-foreground">Streak</p>
              </div>
              <div className="text-center bg-secondary rounded-lg py-1.5">
                <p className="text-sm font-black text-foreground">{lastCheckIn ? '✓' : '–'}</p>
                <p className="text-[9px] text-muted-foreground">Check-in</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-4 py-3 border-b border-border">Quick Actions</p>
        {QUICK_ACTIONS.map(cat => (
          <div key={cat.label} className="border-b border-border last:border-0">
            <button
              onClick={() => setExpandedCat(expandedCat === cat.label ? null : cat.label)}
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-secondary/40 transition-colors"
            >
              <span className={cn('text-xs font-bold', cat.color)}>{cat.label}</span>
              {expandedCat === cat.label ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
            </button>
            {expandedCat === cat.label && (
              <div className="pb-1">
                {cat.actions.map(action => (
                  <button
                    key={action.key}
                    onClick={() => handleAction(action.key)}
                    className="w-full text-left text-xs px-5 py-2 hover:bg-secondary/40 text-foreground transition-colors"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Recent Conversations */}
      {conversations.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Recent Chats</p>
            <button onClick={onNewChat} className="text-[10px] text-primary font-semibold hover:underline">+ New</button>
          </div>
          {conversations.slice(0, 5).map(conv => (
            <button
              key={conv.id}
              onClick={() => onLoadConversation(conv)}
              className="w-full text-left px-4 py-3 border-b border-border last:border-0 hover:bg-secondary/40 transition-colors"
            >
              <p className="text-xs font-semibold truncate text-foreground">{conv.client_name || 'General'}</p>
              <p className="text-[10px] text-muted-foreground truncate mt-0.5">{conv.title || 'Conversation'}</p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                {conv.created_date ? formatDistanceToNow(new Date(conv.created_date), { addSuffix: true }) : ''}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
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
    queryFn: () => db.entities.AIConversation.list('-created_date', 10),
    staleTime: 30_000,
  });

  const handleQuickAction = useCallback((prompt) => {
    setPendingPrompt(prompt);
  }, []);

  const handleNewChat = () => {
    setChatKey(k => k + 1);
    setPendingPrompt(null);
  };

  const handleLoadConversation = (conv) => {
    setChatKey(k => k + 1);
    // Pass the saved messages as initial state via pendingPrompt won't work,
    // so we pass via a special object
    setPendingPrompt({ __loadMessages: conv.messages || [] });
  };

  return (
    <div className="p-4 lg:p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="bg-sidebar rounded-xl p-5 text-white mb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[var(--kc-w-10)] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">AI Coach Assistant</h1>
              <p className="text-xs text-white/60 mt-0.5">Your personal coaching intelligence — powered by Claude</p>
            </div>
          </div>
          <button
            onClick={handleNewChat}
            className="flex items-center gap-1.5 text-xs font-semibold bg-[var(--kc-w-10)] hover:bg-[var(--kc-w-20)] text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" /> New Chat
          </button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        <AssistantSidebar
          clients={clients}
          selectedClient={selectedClient}
          onSelectClient={setSelectedClient}
          onQuickAction={handleQuickAction}
          conversations={conversations}
          onLoadConversation={handleLoadConversation}
          onNewChat={handleNewChat}
        />

        <div className="flex-1 min-w-0">
          <AssistantClaudeChat
            key={chatKey}
            selectedClient={selectedClient}
            pendingPrompt={pendingPrompt}
            onPromptConsumed={() => setPendingPrompt(null)}
            onSave={() => refetchConvos()}
          />
        </div>
      </div>
    </div>
  );
}