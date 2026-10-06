/**
 * Shared building blocks for the check-in review screens (queue review, Run my
 * day, single check-in detail). Presentational only; callers own data + writes.
 */
import React, { useState } from 'react';
import { differenceInCalendarDays, differenceInWeeks, format, isToday, isYesterday, parseISO } from 'date-fns';
import { ChevronDown, Check, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Panel, KeyValue } from '@/components/kit';
import { SignedImg, SignedLink } from '@/components/shared/SignedImage';
import { applyRecommendation, getConfirmText } from '@/lib/applyRecommendation';
import { extraAnswers, formatAnswer } from '@/lib/checkinResponses';

export const MOOD_LABEL = { great: 'Great', good: 'Good', okay: 'Okay', tired: 'Tired', stressed: 'Stressed' };

/* ── Small helpers ───────────────────────────────────────────────────────── */

export function firstName(client, checkIn) {
  return (client?.name || checkIn?.client_name || 'Client').split(' ')[0];
}

/** "his" / "her" / "their" — used in the AI disclosure line. */
export function possessive(client) {
  if (client?.sex === 'male') return 'his';
  if (client?.sex === 'female') return 'her';
  return 'their';
}

/** Timestamp the client actually hit submit, falling back to the check-in date. */
function submittedAt(ci) {
  const ts = ci?.created_date || ci?.created_at;
  if (ts && String(ts).length > 10) return { date: new Date(ts), hasTime: true };
  if (ci?.date) return { date: parseISO(ci.date), hasTime: false };
  return null;
}

const time = (d) => format(d, 'h:mm aaa');

/** "Today, 7:42 am" / "Yesterday" / "2 days ago" / "Sep 26" */
export function shortWhen(ci) {
  const s = submittedAt(ci);
  if (!s) return '';
  if (isToday(s.date)) return s.hasTime ? `Today, ${time(s.date)}` : 'Today';
  if (isYesterday(s.date)) return 'Yesterday';
  const days = differenceInCalendarDays(new Date(), s.date);
  if (days < 7) return `${days} days ago`;
  return format(s.date, 'MMM d');
}

/** "Submitted today at 7:42 am" */
export function submittedLabel(ci) {
  const s = submittedAt(ci);
  if (!s) return '';
  const at = s.hasTime ? ` at ${time(s.date)}` : '';
  if (isToday(s.date)) return `Submitted today${at}`;
  if (isYesterday(s.date)) return `Submitted yesterday${at}`;
  return `Submitted ${format(s.date, 'EEEE, MMM d')}${at}`;
}

/** "sent 7:42 am" / "sent yesterday" / "sent Sep 26" */
export function sentLabel(ci) {
  const s = submittedAt(ci);
  if (!s) return '';
  if (isToday(s.date)) return s.hasTime ? `sent ${time(s.date)}` : 'sent today';
  if (isYesterday(s.date)) return 'sent yesterday';
  return `sent ${format(s.date, 'MMM d')}`;
}

/** Week of coaching this check-in belongs to (1-based). */
export function weekNumber(ci, client, clientCIs = []) {
  if (!ci?.date) return null;
  if (client?.start_date) {
    const w = differenceInWeeks(parseISO(ci.date), parseISO(client.start_date)) + 1;
    if (w >= 1) return w;
  }
  const older = clientCIs.filter(c => c.date && c.date < ci.date).length;
  return older + 1;
}

/** Most recent check-in before this one (clientCIs in any order). */
export function previousCheckIn(ci, clientCIs = []) {
  return [...clientCIs]
    .filter(c => c.id !== ci?.id && c.date && ci?.date && c.date <= ci.date)
    .sort((a, b) => (a.date < b.date ? 1 : -1))[0] || null;
}

export function weightDelta(ci, prev) {
  if (ci?.weight == null || prev?.weight == null) return null;
  return Math.round((Number(ci.weight) - Number(prev.weight)) * 10) / 10;
}

/** Signed delta with a real minus sign: "−1.4", "+0.8", "0.0" */
export function signed(n, digits = 1) {
  if (n == null || Number.isNaN(n)) return '';
  const v = Math.abs(n).toFixed(digits);
  if (n > 0) return `+${v}`;
  if (n < 0) return `−${v}`;
  return v;
}

/* ── Answers ─────────────────────────────────────────────────────────────── */

/** The client's answers as label/value pairs, with simple flags for coach attention. */
export function checkInAnswers(ci) {
  if (!ci) return [];
  const rows = [];
  if (ci.energy_level != null) rows.push({ key: 'energy', label: 'Energy', value: `${ci.energy_level} out of 10`, flagged: ci.energy_level <= 4 });
  if (ci.stress_level != null) rows.push({ key: 'stress', label: 'Stress', value: `${ci.stress_level} out of 10`, flagged: ci.stress_level >= 7 });
  if (ci.mood) rows.push({ key: 'mood', label: 'Mood', value: MOOD_LABEL[ci.mood] || ci.mood, flagged: ci.mood === 'stressed' || ci.mood === 'tired' });
  if (ci.sleep_hours != null) rows.push({ key: 'sleep', label: 'Sleep', value: `${ci.sleep_hours} h a night`, flagged: ci.sleep_hours < 6 });
  if (ci.compliance_training != null) rows.push({ key: 'training', label: 'Training', value: `${Math.round(ci.compliance_training)}% of sessions`, flagged: ci.compliance_training < 60 });
  if (ci.compliance_nutrition != null) rows.push({ key: 'nutrition', label: 'Nutrition', value: `${Math.round(ci.compliance_nutrition)}% on plan`, flagged: ci.compliance_nutrition < 60 });
  if (ci.body_fat_pct != null) rows.push({ key: 'bf', label: 'Body fat', value: `${ci.body_fat_pct}%`, flagged: false });
  // Custom form questions (stored in check_ins.responses).
  for (const r of extraAnswers(ci)) {
    rows.push({ key: `r-${r.question_id}`, label: r.label, value: formatAnswer(r), flagged: r.preset_key === 'injuries' && r.value === true });
  }
  return rows;
}

/** Two-column key/value answers panel, with the client's own words underneath. */
export function AnswersPanel({ checkIn, client, className }) {
  const rows = checkInAnswers(checkIn);
  if (!rows.length && !checkIn?.notes) return null;
  const half = Math.ceil(rows.length / 2);
  const cols = [rows.slice(0, half), rows.slice(half)];
  return (
    <Panel className={cn('px-5 sm:px-6 py-3', className)}>
      {rows.length > 0 && (
        <div className="grid sm:grid-cols-2 sm:gap-x-8">
          {cols.map((col, i) => (
            <div key={i}>
              {col.map(r => (
                <KeyValue
                  key={r.key}
                  label={r.label}
                  value={<span className={r.flagged ? 'text-destructive' : undefined}>{r.value}</span>}
                  className="py-3"
                />
              ))}
            </div>
          ))}
        </div>
      )}
      {checkIn?.notes && (
        <div className={cn('py-3', rows.length > 0 && 'border-t border-border')}>
          <p className="text-sm text-muted-foreground">In {firstName(client, checkIn)}'s words</p>
          <p className="text-[15px] text-foreground leading-relaxed mt-1">{checkIn.notes}</p>
        </div>
      )}
    </Panel>
  );
}

/* ── Stats ───────────────────────────────────────────────────────────────── */

function buildStats(ci, prev) {
  const stats = [];
  if (ci?.weight != null) {
    const d = weightDelta(ci, prev);
    const sub = d == null ? 'lb' : d < 0 ? `lb, down ${Math.abs(d)}` : d > 0 ? `lb, up ${d}` : 'lb, no change';
    const short = d == null ? 'lb' : `lb, ${signed(d)}`;
    stats.push({ key: 'w', value: Number(ci.weight).toFixed(1), label: sub, short });
  }
  if (ci?.compliance_training != null) stats.push({ key: 't', value: `${Math.round(ci.compliance_training)}%`, label: 'training', short: 'training', bad: ci.compliance_training < 60 });
  if (ci?.compliance_nutrition != null) stats.push({ key: 'n', value: `${Math.round(ci.compliance_nutrition)}%`, label: 'nutrition', short: 'nutrition', bad: ci.compliance_nutrition < 60 });
  if (ci?.sleep_hours != null) stats.push({ key: 's', value: `${ci.sleep_hours} h`, label: 'sleep', short: 'sleep', bad: ci.sleep_hours < 6 });
  return stats;
}

/** Inline stat row with hairline dividers (desktop header, right side). */
export function ReviewStats({ checkIn, prev, className }) {
  const stats = buildStats(checkIn, prev);
  if (!stats.length) return null;
  return (
    <div className={cn('flex items-stretch', className)}>
      {stats.map(s => (
        <div key={s.key} className="border-l border-border pl-4 pr-1 ml-3 first:ml-0 text-right">
          <p className={cn('num text-[28px] leading-none', s.bad ? 'text-destructive' : 'text-foreground')}>{s.value}</p>
          <p className="text-[12px] text-muted-foreground mt-1 whitespace-nowrap">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

/** Four white tiles (mobile). */
export function ReviewStatTiles({ checkIn, prev, className }) {
  const stats = buildStats(checkIn, prev);
  if (!stats.length) return null;
  return (
    <div className={cn('grid gap-2', stats.length >= 4 ? 'grid-cols-4' : stats.length === 3 ? 'grid-cols-3' : 'grid-cols-2', className)}>
      {stats.map(s => (
        <div key={s.key} className="panel px-2.5 py-2.5 min-w-0">
          <p className={cn('num text-[19px] leading-none', s.bad ? 'text-destructive' : 'text-foreground')}>{s.value}</p>
          <p className="text-[12px] text-muted-foreground mt-1 truncate">{s.short}</p>
        </div>
      ))}
    </div>
  );
}

/* ── Photos ──────────────────────────────────────────────────────────────── */

const WEEK_WORDS = ['This week', 'Last week', 'Two weeks ago', 'Three weeks ago', 'Four weeks ago', 'Five weeks ago', 'Six weeks ago', 'Seven weeks ago', 'Eight weeks ago'];

/** Earlier check-in with photos, closest to four weeks before this one. */
export function comparisonCheckIn(ci, clientCIs = []) {
  if (!ci?.date) return null;
  const target = parseISO(ci.date);
  const withPhotos = clientCIs.filter(c => c.id !== ci.id && c.date && c.date < ci.date && c.photo_urls?.length);
  if (!withPhotos.length) return null;
  return withPhotos
    .map(c => ({ c, gap: Math.abs(differenceInCalendarDays(target, parseISO(c.date)) - 28) }))
    .sort((a, b) => a.gap - b.gap)[0].c;
}

function weeksBetweenLabel(ci, earlier) {
  const weeks = Math.round(differenceInCalendarDays(parseISO(ci.date), parseISO(earlier.date)) / 7);
  return WEEK_WORDS[weeks] || format(parseISO(earlier.date), 'MMM d');
}

function PhotoSet({ title, urls }) {
  return (
    <Panel className="p-3 sm:p-4 min-w-0">
      <p className="text-sm font-medium text-foreground mb-2.5">{title}</p>
      <div className="grid grid-cols-3 gap-2">
        {urls.slice(0, 3).map((url, i) => (
          <SignedLink key={i} href={url} target="_blank" rel="noreferrer" className="block">
            <SignedImg src={url} alt="" className="w-full aspect-[3/4] object-cover rounded-lg bg-secondary" />
          </SignedLink>
        ))}
      </div>
    </Panel>
  );
}

/** "Four weeks ago" / "This week" photo panels side by side. */
export function PhotoCompare({ checkIn, clientCIs = [], className }) {
  const current = checkIn?.photo_urls || [];
  if (!current.length) return null;
  const earlier = comparisonCheckIn(checkIn, clientCIs);
  const thisLabel = differenceInCalendarDays(new Date(), parseISO(checkIn.date)) < 7 ? 'This week' : format(parseISO(checkIn.date), 'MMM d');
  return (
    <div className={cn('grid gap-4 md:grid-cols-2', className)}>
      {earlier ? (
        <PhotoSet title={weeksBetweenLabel(checkIn, earlier)} urls={earlier.photo_urls} />
      ) : (
        <Panel className="p-4 flex items-center">
          <p className="text-sm text-muted-foreground">No earlier photos to compare yet. These become the baseline.</p>
        </Panel>
      )}
      <PhotoSet title={thisLabel} urls={current} />
    </div>
  );
}

/** Horizontal photo strip (mobile). */
export function PhotoStrip({ urls = [], className }) {
  if (!urls.length) return null;
  return (
    <div className={cn('flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4', className)}>
      {urls.map((url, i) => (
        <SignedLink key={i} href={url} target="_blank" rel="noreferrer" className="flex-shrink-0">
          <SignedImg src={url} alt="" className="h-36 w-28 object-cover rounded-lg bg-secondary" />
        </SignedLink>
      ))}
    </div>
  );
}

/* ── Disclosure ──────────────────────────────────────────────────────────── */

/** Row that expands. Used to tuck secondary review tools away. */
export function Disclosure({ title, meta, defaultOpen = false, children, className }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={cn('border-b border-border last:border-b-0', className)}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-5 sm:px-6 py-4 text-left hover:bg-accent/50 transition-colors"
      >
        <span className="text-[15px] font-semibold text-foreground whitespace-nowrap">{title}</span>
        {meta && <span className="hidden sm:block min-w-0 text-sm text-muted-foreground truncate">{meta}</span>}
        <ChevronDown className={cn('ml-auto h-4 w-4 text-muted-foreground transition-transform flex-shrink-0', open && 'rotate-180')} />
      </button>
      {open && <div className="px-5 sm:px-6 pb-5">{children}</div>}
    </div>
  );
}

/* ── Compare with last check-in ──────────────────────────────────────────── */

export function CompareRows({ checkIn, prev }) {
  if (!prev) return <p className="text-sm text-muted-foreground">This is the first check-in, so there is nothing to compare yet.</p>;
  const rows = [
    { label: 'Weight', curr: checkIn.weight, prev: prev.weight, unit: ' lb', lower: null },
    { label: 'Energy', curr: checkIn.energy_level, prev: prev.energy_level, unit: '/10', lower: false },
    { label: 'Sleep', curr: checkIn.sleep_hours, prev: prev.sleep_hours, unit: ' h', lower: false },
    { label: 'Stress', curr: checkIn.stress_level, prev: prev.stress_level, unit: '/10', lower: true },
    { label: 'Training', curr: checkIn.compliance_training, prev: prev.compliance_training, unit: '%', lower: false },
    { label: 'Nutrition', curr: checkIn.compliance_nutrition, prev: prev.compliance_nutrition, unit: '%', lower: false },
  ].filter(r => r.curr != null || r.prev != null);
  return (
    <div>
      {rows.map(row => {
        const diff = row.curr != null && row.prev != null ? Number((row.curr - row.prev).toFixed(1)) : null;
        const improved = diff === null || row.lower === null ? null : (row.lower ? diff < 0 : diff > 0);
        return (
          <div key={row.label} className="grid grid-cols-[88px_1fr_auto] items-baseline gap-3 py-2.5 border-b border-border last:border-b-0">
            <span className="text-sm text-muted-foreground">{row.label}</span>
            <span className="text-sm text-foreground tabular-nums">
              {row.prev ?? '–'}{row.prev != null && row.unit} <span className="text-muted-foreground">to</span> <span className="font-semibold">{row.curr ?? '–'}{row.curr != null && row.unit}</span>
            </span>
            <span className={cn('text-sm font-semibold tabular-nums',
              diff === 0 || diff === null ? 'text-muted-foreground' : improved === null ? 'text-foreground' : improved ? 'text-success' : 'text-destructive')}>
              {diff === null ? '' : diff === 0 ? 'Same' : signed(diff)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function MeasurementRows({ measurements }) {
  const entries = Object.entries(measurements || {}).filter(([, v]) => v);
  if (!entries.length) return null;
  return (
    <div>
      {entries.map(([k, v]) => (
        <KeyValue key={k} label={k.charAt(0).toUpperCase() + k.slice(1)} value={`${v} in`} />
      ))}
    </div>
  );
}

/* ── Rule-based recommendations (decisionEngine) ─────────────────────────── */

function RecommendationRow({ rec, checkIn, client }) {
  const [stage, setStage] = useState('idle'); // idle | confirm | applying | done
  const confirmText = getConfirmText(rec);
  const urgent = rec.priority === 'critical' || rec.priority === 'high';

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
    <div className={cn('py-3 border-b border-border last:border-b-0', stage === 'done' && 'opacity-60')}>
      <div className="flex items-start gap-3">
        <span aria-hidden className={cn('mt-[7px] h-2 w-2 rounded-full flex-shrink-0', urgent ? 'bg-destructive' : 'bg-muted-foreground/50')} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{rec.title}</p>
          <p className="text-[13px] text-muted-foreground mt-0.5">{rec.reason}</p>
          {stage === 'confirm' && confirmText && (
            <p className="text-[13px] text-foreground mt-2">{confirmText}</p>
          )}
        </div>
        <div className="flex-shrink-0 flex items-center gap-1.5">
          {stage === 'idle' && (
            <Button size="sm" variant="outline" onClick={() => setStage('confirm')}>{rec.actionLabel}</Button>
          )}
          {stage === 'confirm' && (
            <>
              <Button size="sm" onClick={handleConfirm}>Apply</Button>
              <Button size="sm" variant="ghost" onClick={() => setStage('idle')} aria-label="Cancel"><X className="h-4 w-4" /></Button>
            </>
          )}
          {stage === 'applying' && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {stage === 'done' && <span className="flex items-center gap-1 text-[13px] font-semibold text-success"><Check className="h-3.5 w-3.5" /> Done</span>}
        </div>
      </div>
    </div>
  );
}

export function RecommendationList({ recommendations = [], checkIn, client, limit = 4 }) {
  if (!recommendations.length) return <p className="text-sm text-muted-foreground">Nothing to change this week.</p>;
  return (
    <div>
      {recommendations.slice(0, limit).map(rec => (
        <RecommendationRow key={rec.id} rec={rec} checkIn={checkIn} client={client} />
      ))}
    </div>
  );
}
