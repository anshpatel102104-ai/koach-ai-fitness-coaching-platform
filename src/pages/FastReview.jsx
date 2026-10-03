import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { differenceInDays, parseISO, format } from 'date-fns';
import {
  ChevronLeft, CheckCircle2, Sparkles, MessageSquare,
  Flame, Footprints, Check, Loader2, Send, Moon, Zap,
  TrendingDown, TrendingUp, Minus, BookOpen, ChevronDown,
  ClipboardCheck, ChevronUp, AlertTriangle, X, Play,
  Brain, Camera, ArrowRight, AlertCircle, Home, Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { compositeAdherenceScore, scoreColor } from '@/lib/adherence';
import { evaluateClientRisk } from '@/lib/riskEngine';
import { generateRecommendations, PRIORITY_STYLES, CATEGORY_ICONS } from '@/lib/decisionEngine';
import { applyRecommendation, getConfirmText } from '@/lib/applyRecommendation';
import { Link } from 'react-router-dom';
import { SignedImg } from '@/components/shared/SignedImage';

/* ─── Constants ─── */
const MOOD_EMOJI = { great: '😄', good: '🙂', okay: '😐', tired: '😴', stressed: '😰' };
const MOOD_LABEL = { great: 'Great', good: 'Good', okay: 'Okay', tired: 'Tired', stressed: 'Stressed' };

const TEMPLATES = [
  { label: '🔥 Great Check-in', text: "Awesome check-in this week! Your consistency is really showing. Keep up the great work and let's build on this momentum! 💪" },
  { label: '💪 Motivation Boost', text: "Just wanted to say I'm proud of the effort you've been putting in. Some weeks are harder than others — keep showing up and the results will follow 🔥" },
  { label: '🥗 Nutrition Reminder', text: "Quick reminder to stay on track with your nutrition targets this week. Even 80% compliance makes a huge difference over time. You've got this!" },
  { label: '📅 Missed Check-in', text: "Hey, I noticed you missed your check-in this week. Everything okay? Let me know if anything came up — I'm here to support you!" },
  { label: '😴 Sleep Check', text: "Your sleep has been lower than ideal lately. Try to prioritize 7–8 hours — recovery is where the real progress happens. Let me know if you need any sleep tips!" },
];

/* ─── Queue builder ─── */
function buildQueue(checkIns, clients) {
  const cisByClient = {};
  for (const ci of checkIns) {
    if (!cisByClient[ci.client_id]) cisByClient[ci.client_id] = [];
    cisByClient[ci.client_id].push(ci);
  }
  const clientMap = Object.fromEntries(clients.map(c => [c.id, c]));
  const seen = new Set();
  const items = [];

  for (const ci of checkIns) {
    if (seen.has(ci.client_id)) continue;
    seen.add(ci.client_id);
    if (ci.coach_responded && ci.review_status === 'reviewed') continue;
    const daysAgo = differenceInDays(new Date(), parseISO(ci.date));
    if (daysAgo > 21) continue;

    const client = clientMap[ci.client_id];
    const clientCIs = cisByClient[ci.client_id] || [];
    const riskEntry = client ? evaluateClientRisk(client, checkIns) : null;
    const riskScore = riskEntry?.riskScore || 0;
    const isOverdue = daysAgo > 7;

    let tier = 2; // new
    if (riskScore >= 40) tier = 0; // at-risk
    else if (isOverdue) tier = 1; // overdue

    items.push({ ci, client, clientCIs, riskScore, riskEntry, daysAgo, tier });
  }

  items.sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;
    if (a.tier === 0) return b.riskScore - a.riskScore;
    if (a.tier === 1) return new Date(a.ci.date) - new Date(b.ci.date);
    return new Date(b.ci.date) - new Date(a.ci.date);
  });

  return items;
}

/* ─── AI prompt builder ─── */

/* ─── Mini weight sparkline ─── */
function WeightSparkline({ clientCIs }) {
  const weights = clientCIs.filter(c => c.weight).slice(0, 6).reverse();
  if (weights.length < 2) return null;
  const vals = weights.map(c => c.weight);
  const min = Math.min(...vals) - 2;
  const max = Math.max(...vals) + 2;
  const range = max - min || 1;
  const W = 80, H = 28;
  const pts = vals.map((v, i) => ({
    x: (i / (vals.length - 1)) * W,
    y: H - ((v - min) / range) * H,
  }));
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const diff = (vals[vals.length - 1] - vals[0]).toFixed(1);
  const isDown = Number(diff) < 0;
  const isUp = Number(diff) > 0;
  const color = isDown ? 'var(--tc-success)' : isUp ? 'var(--tc-destructive)' : 'var(--tc-muted-foreground)';

  return (
    <div className="flex items-center gap-2">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="3" fill={color} />
      </svg>
      <div>
        <p className="text-sm font-bold tabular-nums text-foreground">{vals[vals.length - 1]} lbs</p>
        <p className={cn('text-[10px] font-semibold flex items-center gap-0.5',
          isDown ? 'text-success' : isUp ? 'text-destructive' : 'text-muted-foreground')}>
          {isDown ? <TrendingDown className="w-2.5 h-2.5" /> : isUp ? <TrendingUp className="w-2.5 h-2.5" /> : <Minus className="w-2.5 h-2.5" />}
          {isUp ? '+' : ''}{diff} lbs
        </p>
      </div>
    </div>
  );
}

/* ─── Stat tile ─── */
function StatTile({ icon: Icon, label, value, sub, color, bg }) {
  return (
    <div className={cn('flex flex-col items-center gap-1 rounded-xl py-3 px-1 border', bg || 'bg-muted border-border')}>
      <Icon className={cn('w-3.5 h-3.5', color || 'text-muted-foreground')} />
      <span className={cn('text-base font-bold tabular-nums leading-none', color || 'text-foreground')}>{value ?? '–'}</span>
      {sub && <span className="text-[9px] text-muted-foreground">{sub}</span>}
      <span className="text-[9px] text-muted-foreground text-center">{label}</span>
    </div>
  );
}

/* ─── Compliance bar ─── */
function ComplianceBar({ label, value, icon }) {
  if (value == null) return null;
  const pct = Math.min(100, Math.max(0, value));
  const color = pct >= 80 ? 'bg-success' : pct >= 60 ? 'bg-warning' : 'bg-destructive';
  const textColor = pct >= 80 ? 'text-success' : pct >= 60 ? 'text-warning' : 'text-destructive';
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-foreground flex items-center gap-1">{icon} {label}</span>
        <span className={cn('text-xs font-bold tabular-nums', textColor)}>{pct}%</span>
      </div>
      <div className="h-2 bg-border rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-700', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ─── Inline recommendation ─── */
function InlineRec({ rec, checkIn, client }) {
  const [stage, setStage] = useState('idle');
  const styles = PRIORITY_STYLES[rec.priority];
  const confirmText = getConfirmText(rec);

  const handleConfirm = async () => {
    setStage('applying');
    try {
      const msg = await applyRecommendation(rec, checkIn, client);
      setStage('done');
      toast.success(msg);
    } catch (err) {
      toast.error(err.message);
      setStage('idle');
    }
  };

  return (
    <div className={cn('rounded-xl border transition-all',
      stage === 'done' ? 'opacity-50 bg-muted border-border'
      : stage === 'confirm' ? 'bg-accent border-primary'
      : 'bg-card border-border hover:border-primary')}>
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', styles.dot)} />
        <span className="text-sm flex-shrink-0">{CATEGORY_ICONS[rec.category]}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground leading-tight">{rec.title}</p>
          <p className="text-[11px] text-muted-foreground leading-tight mt-0.5 line-clamp-1">{rec.reason}</p>
        </div>
        {stage === 'idle' && (
          <button onClick={() => setStage('confirm')}
            className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border bg-accent/10 border-primary text-primary hover:bg-accent active:scale-95 transition-all">
            <Zap className="w-3 h-3" /> {rec.actionLabel}
          </button>
        )}
        {stage === 'applying' && <Loader2 className="w-4 h-4 animate-spin text-primary flex-shrink-0" />}
        {stage === 'done' && <span className="flex items-center gap-1 text-[11px] font-bold text-success flex-shrink-0"><Check className="w-3 h-3" /> Done</span>}
        {stage === 'confirm' && (
          <div className="flex gap-1.5 flex-shrink-0">
            <button onClick={handleConfirm} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-[11px] font-bold active:scale-95">
              <Check className="w-3 h-3" /> Apply
            </button>
            <button onClick={() => setStage('idle')} className="w-7 h-7 flex items-center justify-center rounded-lg bg-card border border-border active:scale-95">
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
          </div>
        )}
      </div>
      {stage === 'confirm' && confirmText && (
        <div className="px-3 pb-2.5">
          <div className="flex items-start gap-1.5 bg-card border border-accent rounded-lg px-2.5 py-2">
            <AlertCircle className="w-3 h-3 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-foreground leading-snug">{confirmText}</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Feedback composer ─── */
function FeedbackComposer({ checkIn, client, allCIs, onSent }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  const generateAI = async () => {
    setAiLoading(true);
    const result = (await db.functions.invoke('aiMessageAssistant', { action: 'generateCheckInResponse', client, checkIn, recentCheckIns: allCIs })).data?.message || '';
    setText(result);
    setAiLoading(false);
  };

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    await Promise.all([
      db.entities.CheckIn.update(checkIn.id, { coach_notes: text, coach_responded: true, review_status: 'reviewed' }),
      db.entities.Message.create({ client_id: checkIn.client_id, client_name: checkIn.client_name, sender: 'coach', content: text.trim(), tag: 'check_in', is_read: false }),
    ]);
    setSending(false);
    toast.success('Feedback sent! 🎉');
    onSent();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <button onClick={() => setShowTemplates(s => !s)}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:text-foreground hover:bg-muted">
            <BookOpen className="w-3 h-3" /> Templates <ChevronDown className="w-3 h-3" />
          </button>
          {showTemplates && (
            <div className="absolute left-0 top-9 z-30 bg-card border border-border rounded-xl shadow-xl p-2 w-72 max-h-64 overflow-y-auto">
              {TEMPLATES.map((t, i) => (
                <button key={i} onClick={() => { setText(t.text); setShowTemplates(false); }}
                  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-muted transition-colors">
                  <p className="text-xs font-semibold text-foreground">{t.label}</p>
                  <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{t.text}</p>
                </button>
              ))}
            </div>
          )}
        </div>
        <button onClick={generateAI} disabled={aiLoading}
          className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-primary bg-accent/10 text-xs font-medium text-primary hover:bg-accent disabled:opacity-60 transition-colors">
          {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
          {aiLoading ? 'Generating…' : 'AI Draft'}
        </button>
      </div>
      <Textarea
        value={text} onChange={e => setText(e.target.value)}
        placeholder="Write your coaching response..." className="text-sm resize-none" rows={4} autoFocus
      />
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">{text.length} chars</span>
        <button onClick={send} disabled={sending || !text.trim()}
          className="flex items-center gap-1.5 h-9 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 active:scale-95 transition-all hover:bg-primary/90">
          {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          Send Feedback
        </button>
      </div>
    </div>
  );
}

/* ─── Apply Changes Panel ─── */
function ApplyChangesPanel({ checkIn, client, onCalDone, onCardioDone }) {
  const [calResult, setCalResult] = useState(null);
  const [cardioResult, setCardioResult] = useState(null);
  const [saving, setSaving] = useState(false);

  const adjustCal = async (delta) => {
    if (!client?.assigned_nutrition_id) { toast.error('No nutrition plan assigned'); return; }
    setSaving(true);
    const plans = await db.entities.NutritionPlan.filter({ id: client.assigned_nutrition_id });
    const plan = plans[0];
    if (plan) {
      const newCals = Math.max(1000, (plan.calories || 2000) + delta);
      await Promise.all([
        db.entities.NutritionPlan.update(plan.id, { calories: newCals }),
        db.entities.Message.create({ client_id: checkIn.client_id, client_name: checkIn.client_name, sender: 'coach', content: `Your daily calorie target has been updated to ${newCals} kcal (${delta > 0 ? '+' : ''}${delta} kcal adjustment).`, tag: 'nutrition', is_read: false }),
      ]);
      const label = `${delta > 0 ? '+' : ''}${delta} kcal → ${newCals}`;
      toast.success(`Calories adjusted: ${label}`);
      setCalResult(label);
      onCalDone?.(label);
    }
    setSaving(false);
  };

  const adjustCardio = async (dir) => {
    setSaving(true);
    const msg = dir === 'up'
      ? 'Your cardio has been increased — add 1 extra session or 20 min to your current sessions this week.'
      : 'Your cardio has been reduced — drop 1 session or reduce duration by 15–20 min this week.';
    await Promise.all([
      db.entities.CheckIn.update(checkIn.id, { coach_notes: (checkIn.coach_notes ? checkIn.coach_notes + '\n' : '') + '[Cardio] ' + msg }),
      db.entities.Message.create({ client_id: checkIn.client_id, client_name: checkIn.client_name, sender: 'coach', content: msg, tag: 'training', is_read: false }),
    ]);
    const label = dir === 'up' ? '+1 cardio session' : '−1 cardio session';
    toast.success(`Cardio adjusted: ${label}`);
    setCardioResult(label);
    onCardioDone?.(label);
    setSaving(false);
  };

  return (
    <div className="space-y-3">
      {/* Calories */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
          <Flame className="w-3 h-3 text-orange-400" /> Adjust Calories
        </p>
        {calResult ? (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-success/10 border border-success">
            <Check className="w-3.5 h-3.5 text-success" />
            <span className="text-xs font-semibold text-success">{calResult}</span>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-1.5">
            {[[-250, '−250'], [-150, '−150'], [+150, '+150'], [+250, '+250']].map(([d, l]) => (
              <button key={d} onClick={() => adjustCal(d)} disabled={saving}
                className={cn('py-2.5 rounded-xl text-xs font-bold border transition-all active:scale-95',
                  d < 0 ? 'bg-destructive/10 border-destructive text-destructive hover:bg-destructive/10'
                        : 'bg-success/10 border-success text-success hover:bg-success/10')}>
                {saving ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : l}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Cardio */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
          <Footprints className="w-3 h-3 text-primary" /> Adjust Cardio
        </p>
        {cardioResult ? (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-success/10 border border-success">
            <Check className="w-3.5 h-3.5 text-success" />
            <span className="text-xs font-semibold text-success">{cardioResult}</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1.5">
            <button onClick={() => adjustCardio('up')} disabled={saving}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold border bg-accent border-accent text-primary hover:bg-accent active:scale-95 transition-all">
              <ChevronUp className="w-3.5 h-3.5" /> Increase
            </button>
            <button onClick={() => adjustCardio('down')} disabled={saving}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold border bg-muted border-border text-foreground hover:bg-[var(--kc-eceef5)] active:scale-95 transition-all">
              <ChevronDown className="w-3.5 h-3.5" /> Decrease
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Main client review card
───────────────────────────────────────── */
function ClientReviewCard({ item, onMarkReviewed, markSaving }) {
  const { ci: checkIn, client, clientCIs, riskEntry, daysAgo, tier } = item;
  const [activePanel, setActivePanel] = useState(null); // 'feedback' | 'changes' | 'recs'
  const [feedbackSent, setFeedbackSent] = useState(!!checkIn.coach_responded || !!checkIn.coach_notes);
  const [aiSending, setAiSending] = useState(false);
  const [aiDone, setAiDone] = useState(false);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [isReviewedLocal, setIsReviewedLocal] = useState(checkIn.review_status === 'reviewed');

  const avgScore = compositeAdherenceScore(clientCIs);
  const recommendations = useMemo(() => generateRecommendations(checkIn, client, clientCIs), [checkIn, client, clientCIs]);
  const photos = checkIn.photo_urls || [];

  const TIER = {
    0: { label: 'At Risk', bg: 'bg-destructive/10', border: 'border-destructive', text: 'text-destructive', dot: 'bg-destructive' },
    1: { label: 'Overdue', bg: 'bg-warning/10', border: 'border-warning', text: 'text-warning', dot: 'bg-warning' },
    2: { label: 'New', bg: 'bg-accent', border: 'border-accent', text: 'text-primary', dot: 'bg-primary' },
  }[tier];

  const sleepColor = !checkIn.sleep_hours ? 'text-muted-foreground'
    : checkIn.sleep_hours >= 7 ? 'text-success'
    : checkIn.sleep_hours >= 6 ? 'text-warning' : 'text-destructive';
  const energyColor = !checkIn.energy_level ? 'text-muted-foreground'
    : checkIn.energy_level >= 7 ? 'text-success'
    : checkIn.energy_level >= 4 ? 'text-warning' : 'text-destructive';
  const stressColor = !checkIn.stress_level ? 'text-muted-foreground'
    : checkIn.stress_level <= 3 ? 'text-success'
    : checkIn.stress_level <= 6 ? 'text-warning' : 'text-destructive';

  const sendAI = async () => {
    if (aiSending || aiDone || feedbackSent) return;
    setAiSending(true);
    const result = (await db.functions.invoke('aiMessageAssistant', { action: 'generateCheckInResponse', client, checkIn, recentCheckIns: clientCIs })).data?.message || '';
    await Promise.all([
      db.entities.CheckIn.update(checkIn.id, { coach_notes: result, coach_responded: true, review_status: 'reviewed' }),
      db.entities.Message.create({ client_id: checkIn.client_id, client_name: checkIn.client_name, sender: 'coach', content: result, tag: 'check_in', is_read: false }),
    ]);
    setAiDone(true);
    setFeedbackSent(true);
    setAiSending(false);
    toast.success('AI feedback sent! ✨');
  };

  const handleMarkReviewed = async () => {
    if (isReviewedLocal) return;
    setIsReviewedLocal(true);
    await onMarkReviewed();
  };

  const togglePanel = (name) => setActivePanel(p => p === name ? null : name);

  const goalLabel = client?.goal?.replace(/_/g, ' ') || null;

  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <div className="flex items-start gap-3">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-accent border border-accent flex items-center justify-center text-primary font-bold text-2xl flex-shrink-0 shadow-sm">
          {(client?.name || checkIn.client_name || '?')[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h2 className="font-heading font-bold text-xl text-foreground leading-tight">{client?.name || checkIn.client_name}</h2>
            <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', TIER.bg, TIER.border, TIER.text)}>
              {TIER.label}
            </span>
            {(feedbackSent || isReviewedLocal) && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-success bg-success/10 border border-success px-2 py-0.5 rounded-full">
                <Check className="w-2.5 h-2.5" /> Reviewed
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
            <span>{format(parseISO(checkIn.date), 'MMM d')}</span>
            {daysAgo > 0 && (
              <span className={cn(daysAgo > 7 ? 'text-destructive font-medium' : daysAgo > 3 ? 'text-warning' : '')}>
                · {daysAgo}d ago
              </span>
            )}
            {checkIn.mood && <span className="flex items-center gap-1">{MOOD_EMOJI[checkIn.mood]} {MOOD_LABEL[checkIn.mood]}</span>}
            {goalLabel && <span className="capitalize">· 🎯 {goalLabel}</span>}
          </div>
        </div>
        {avgScore !== null && (
          <div className="text-right flex-shrink-0">
            <p className="text-[10px] text-muted-foreground mb-0.5">Adherence</p>
            <p className={cn('text-2xl font-bold tabular-nums leading-none', scoreColor(avgScore))}>{avgScore}<span className="text-sm font-normal text-muted-foreground">%</span></p>
          </div>
        )}
      </div>

      {/* ── Risk flags ── */}
      {riskEntry?.flags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {riskEntry.flags.slice(0, 5).map(f => (
            <span key={f.key} className="flex items-center gap-1 text-[10px] font-medium text-destructive bg-destructive/10 border border-destructive px-2 py-1 rounded-full">
              <AlertTriangle className="w-2.5 h-2.5" /> {f.label}
            </span>
          ))}
        </div>
      )}

      {/* ── Wellness stats ── */}
      <div className="grid grid-cols-5 gap-2">
        <StatTile icon={Moon} label="Sleep" value={checkIn.sleep_hours} sub="hrs" color={sleepColor}
          bg={!checkIn.sleep_hours ? 'bg-muted border-border' : checkIn.sleep_hours < 6 ? 'bg-destructive/10 border-destructive' : 'bg-muted border-border'} />
        <StatTile icon={Zap} label="Energy" value={checkIn.energy_level} sub="/10" color={energyColor}
          bg={!checkIn.energy_level ? 'bg-muted border-border' : checkIn.energy_level < 4 ? 'bg-destructive/10 border-destructive' : 'bg-muted border-border'} />
        <StatTile icon={Brain} label="Stress" value={checkIn.stress_level} sub="/10" color={stressColor}
          bg={!checkIn.stress_level ? 'bg-muted border-border' : checkIn.stress_level > 6 ? 'bg-destructive/10 border-destructive' : 'bg-muted border-border'} />
        <div className="col-span-2 flex flex-col justify-center bg-muted border border-border rounded-xl py-3 px-3 gap-2.5">
          <ComplianceBar label="Training" value={checkIn.compliance_training} icon="💪" />
          <ComplianceBar label="Nutrition" value={checkIn.compliance_nutrition} icon="🥗" />
        </div>
      </div>

      {/* ── Weight + adherence strip ── */}
      {clientCIs.filter(c => c.weight).length >= 2 && (
        <div className="flex items-center justify-between bg-muted border border-border rounded-xl px-4 py-3">
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Weight Trend</p>
            <WeightSparkline clientCIs={clientCIs} />
          </div>
          {client?.target_weight && (
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground">Goal</p>
              <p className="text-sm font-bold text-foreground tabular-nums">{client.target_weight} lbs</p>
            </div>
          )}
        </div>
      )}

      {/* ── Progress photos ── */}
      {photos.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Camera className="w-3 h-3" /> Progress Photos ({photos.length})
          </p>
          <a href={photos[photoIdx]} target="_blank" rel="noreferrer">
            <SignedImg src={photos[photoIdx]} alt="progress" className="w-full h-52 object-cover rounded-xl border border-border hover:opacity-95 transition-opacity" />
          </a>
          {photos.length > 1 && (
            <div className="flex gap-1.5 mt-2 justify-center">
              {photos.map((_, i) => (
                <button key={i} onClick={() => setPhotoIdx(i)}
                  className={cn('w-2 h-2 rounded-full transition-all', i === photoIdx ? 'bg-primary' : 'bg-border')} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Client notes ── */}
      {checkIn.notes && (
        <div className="bg-warning/10 border border-warning rounded-xl p-3.5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-warning mb-1.5">Client Notes</p>
          <p className="text-sm text-foreground leading-relaxed">{checkIn.notes}</p>
        </div>
      )}

      {/* ── Previous coach response ── */}
      {checkIn.coach_notes && (
        <div className="bg-accent/10 border border-accent rounded-xl p-3.5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-primary mb-1.5">Your Previous Response</p>
          <p className="text-sm text-foreground leading-relaxed">{checkIn.coach_notes}</p>
        </div>
      )}

      {/* ─────── ACTION BUTTONS ─────── */}
      <div className="space-y-2">
        {/* Row 1: AI + Message */}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={sendAI} disabled={aiSending || aiDone || feedbackSent}
            className={cn(
              'flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-semibold transition-all active:scale-95',
              aiDone || feedbackSent
                ? 'bg-ai/10 border-ai text-ai opacity-60 cursor-default'
                : 'bg-ai/10 border-ai text-ai hover:bg-ai/10')}>
            {aiSending ? <Loader2 className="w-4 h-4 animate-spin" /> : (aiDone || feedbackSent) ? <Check className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            {aiDone ? 'AI Sent ✓' : feedbackSent ? 'Responded ✓' : 'AI Feedback'}
          </button>

          <button onClick={() => togglePanel('feedback')}
            className={cn(
              'flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-semibold transition-all active:scale-95',
              activePanel === 'feedback'
                ? 'bg-accent/10 border-primary text-primary shadow-sm'
                : 'bg-card border-border text-primary hover:bg-accent/10 hover:border-primary')}>
            <MessageSquare className="w-4 h-4" /> Send Feedback
          </button>
        </div>

        {/* Row 2: Apply Changes + Suggestions */}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => togglePanel('changes')}
            className={cn(
              'flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-semibold transition-all active:scale-95',
              activePanel === 'changes'
                ? 'bg-orange-100 border-orange-200 text-orange-600 shadow-sm'
                : 'bg-orange-50 border-orange-100 text-orange-600 hover:bg-orange-100')}>
            <Activity className="w-4 h-4" /> Apply Changes
          </button>

          {recommendations.length > 0 && (
            <button onClick={() => togglePanel('recs')}
              className={cn(
                'flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-semibold transition-all active:scale-95',
                activePanel === 'recs'
                  ? 'bg-accent/10 border-primary text-primary shadow-sm'
                  : 'bg-muted border-border text-foreground hover:bg-[var(--kc-eceef5)]')}>
              <Zap className="w-4 h-4 text-warning" />
              Suggestions ({recommendations.length})
            </button>
          )}
          {recommendations.length === 0 && (
            <div className="flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-border text-xs text-muted-foreground">
              No suggestions
            </div>
          )}
        </div>

        {/* Expanded panels */}
        {activePanel === 'feedback' && (
          <div className="bg-muted border border-border rounded-xl p-4 fade-up">
            <FeedbackComposer checkIn={checkIn} client={client} allCIs={clientCIs}
              onSent={() => { setFeedbackSent(true); setActivePanel(null); }} />
          </div>
        )}

        {activePanel === 'changes' && (
          <div className="bg-muted border border-border rounded-xl p-4 fade-up">
            <ApplyChangesPanel checkIn={checkIn} client={client} />
          </div>
        )}

        {activePanel === 'recs' && (
          <div className="space-y-1.5 fade-up">
            {recommendations.slice(0, 4).map(rec => (
              <InlineRec key={rec.id} rec={rec} checkIn={checkIn} client={client} />
            ))}
          </div>
        )}

        {/* Mark Reviewed */}
        <button onClick={handleMarkReviewed} disabled={markSaving || isReviewedLocal}
          className={cn(
            'w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border text-sm font-semibold transition-all active:scale-95',
            isReviewedLocal
              ? 'bg-success/10 border-success text-success cursor-default opacity-80'
              : 'bg-success/10 border-success text-success hover:bg-success/10')}>
          {markSaving
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : isReviewedLocal
              ? <><CheckCircle2 className="w-4 h-4" /> Marked as Reviewed</>
              : <><ClipboardCheck className="w-4 h-4" /> Mark as Reviewed</>}
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Main Page
───────────────────────────────────────── */
export default function FastReview() {
  const [idx, setIdx] = useState(0);
  const [reviewed, setReviewed] = useState({});
  const [markSaving, setMarkSaving] = useState(false);
  const queryClient = useQueryClient();

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => db.entities.Client.list('name'),
  });

  const { data: checkIns = [], isLoading } = useQuery({
    queryKey: ['checkins-fast'],
    queryFn: () => db.entities.CheckIn.list('-date', 200),
  });

  const queue = useMemo(() => buildQueue(checkIns, clients), [checkIns, clients]);
  const activeQueue = useMemo(() => queue.filter(item => !reviewed[item.ci.id]), [queue, reviewed]);

  const total = queue.length;
  const completedCount = Object.values(reviewed).filter(Boolean).length;
  const progressPct = total > 0 ? (completedCount / total) * 100 : 0;
  const safeIdx = Math.min(idx, Math.max(0, activeQueue.length - 1));
  const current = activeQueue[safeIdx];

  // Key counts for header pills
  const atRiskCount = activeQueue.filter(i => i.tier === 0).length;
  const overdueCount = activeQueue.filter(i => i.tier === 1).length;
  const newCount = activeQueue.filter(i => i.tier === 2).length;

  const handleMark = async () => {
    if (!current) return;
    setMarkSaving(true);
    await db.entities.CheckIn.update(current.ci.id, { coach_responded: true, review_status: 'reviewed' });
    setReviewed(r => ({ ...r, [current.ci.id]: true }));
    queryClient.invalidateQueries({ queryKey: ['checkins-fast'] });
    setMarkSaving(false);
    toast.success('Marked as reviewed ✓');
  };

  const goNext = () => { if (safeIdx < activeQueue.length - 1) setIdx(i => i + 1); };
  const goPrev = () => { if (safeIdx > 0) setIdx(i => i - 1); };

  if (isLoading) return (
    <div className="flex justify-center items-center min-h-screen bg-muted">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  const allDone = activeQueue.length === 0;

  return (
    <div className="min-h-screen bg-muted">
      {/* ── Top nav bar ── */}
      <div className="sticky top-0 z-40 bg-card border-b border-border px-4 py-3 flex items-center gap-3 shadow-sm">
        <Link to="/" className="flex items-center justify-center w-9 h-9 rounded-xl border border-border bg-card hover:bg-muted transition-colors flex-shrink-0">
          <Home className="w-4 h-4 text-muted-foreground" />
        </Link>
        <div className="flex-1">
          <h1 className="text-[15px] font-heading font-bold text-foreground flex items-center gap-2">
            <Play className="w-4 h-4 text-primary fill-primary" />
            Run My Day
          </h1>
          {!allDone && (
            <p className="text-[11px] text-muted-foreground tabular-nums">
              {safeIdx + 1} of {activeQueue.length} · {completedCount > 0 && `${completedCount} done`}
            </p>
          )}
        </div>
        {!allDone && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {atRiskCount > 0 && <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-destructive/10 border border-destructive text-destructive">🚨 {atRiskCount}</span>}
            {overdueCount > 0 && <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-warning/10 border border-warning text-warning">⏰ {overdueCount}</span>}
            {newCount > 0 && <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-accent/10 border border-accent text-primary">📋 {newCount}</span>}
          </div>
        )}
      </div>

      {/* ── Progress bar ── */}
      {!allDone && (
        <div className="h-1 bg-border">
          <div className="h-full bg-primary transition-all duration-500"
            style={{ width: `${Math.max(progressPct, completedCount > 0 ? 5 : 2)}%` }} />
        </div>
      )}

      {/* ── Content ── */}
      <div className="max-w-xl mx-auto px-4 pt-4 pb-28">

        {allDone ? (
          /* All done state */
          <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
            <div className="w-20 h-20 rounded-3xl bg-success/10 border border-success flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground font-heading">All caught up! 🎉</p>
              <p className="text-sm text-muted-foreground mt-2">
                {completedCount > 0
                  ? `You reviewed ${completedCount} client${completedCount !== 1 ? 's' : ''} — great coaching session!`
                  : 'No pending check-ins right now. Check back soon!'}
              </p>
            </div>
            <Link to="/"
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
              <Home className="w-4 h-4" /> Back to Dashboard
            </Link>
          </div>
        ) : (
          /* Client card */
          current && (
            <div key={current.ci.id} className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-sm fade-up">
              <ClientReviewCard
                item={current}
                onMarkReviewed={handleMark}
                markSaving={markSaving}
              />
            </div>
          )
        )}
      </div>

      {/* ── Sticky bottom nav ── */}
      {!allDone && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-[var(--kc-w-95)] backdrop-blur-sm border-t border-border safe-area-inset-bottom">
          <div className="max-w-xl mx-auto px-4 py-3 flex gap-3">
            <button onClick={goPrev} disabled={safeIdx === 0}
              className="flex items-center gap-1.5 h-12 px-4 rounded-xl border border-border bg-card text-sm font-semibold text-foreground disabled:opacity-30 active:scale-95 transition-all flex-shrink-0 hover:bg-muted">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={safeIdx < activeQueue.length - 1 ? goNext : undefined}
              disabled={safeIdx >= activeQueue.length - 1}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 h-12 rounded-xl text-sm font-bold transition-all active:scale-95',
                safeIdx >= activeQueue.length - 1
                  ? 'bg-success/10 border border-success text-success cursor-default'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm'
              )}>
              {safeIdx >= activeQueue.length - 1
                ? <><CheckCircle2 className="w-4 h-4" /> Last Client</>
                : <>Next Client <ArrowRight className="w-4 h-4" /></>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}