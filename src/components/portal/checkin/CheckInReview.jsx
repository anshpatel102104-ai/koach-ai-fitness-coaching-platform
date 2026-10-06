import React from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FocusScreen, FocusFooter } from '@/components/portal/PortalUI';
import CheckInSteps, { shortLabel } from './CheckInSteps';

const MOOD_LABEL = { stressed: 'Stressed', tired: 'Tired', okay: 'Okay', good: 'Good', great: 'Great' };

export default function CheckInReview({ form, responses, onBack, onSubmit, submitting, lastCheckIn, onEditQuestion, onExit }) {
  const getDisplayValue = (q, val) => {
    if (val === null || val === undefined || val === '') return null;
    if (q.type === 'mood') return MOOD_LABEL[val] || String(val);
    if (q.type === 'scale') return `${val} of ${q.max || 10}`;
    if (q.type === 'percent') return `${val}%`;
    if (q.type === 'yes_no') return val === true || val === 'yes' ? 'Yes' : 'No';
    if (Array.isArray(val)) return val.join(', ');
    if (typeof val === 'object') {
      const n = Object.values(val).filter(Boolean).length;
      return q.type === 'photos' || q.type === 'photo' ? `${n} photo${n === 1 ? '' : 's'}` : `${n} filled in`;
    }
    return String(val);
  };

  const questions = form?.questions || [];
  const weightQ = questions.find(q => q.type === 'number' && /weight/i.test(q.label || '')) || questions.find(q => q.type === 'number');
  const weight = responses[weightQ?.id];
  const trend = lastCheckIn?.weight && weight ? weight - lastCheckIn.weight : null;
  const answered = questions.filter(q => getDisplayValue(q, responses[q.id]) !== null).length;
  const steps = [...questions.map(shortLabel), 'Send'];

  return (
    <FocusScreen>
      <CheckInSteps current={questions.length} steps={steps} onClose={onExit || onBack} title={form?.name || 'Weekly check-in'} />

      <div className="flex-1 overflow-y-auto px-4 pt-6 pb-8">
        <h1 className="text-[32px] text-foreground">Check and send</h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          {answered} of {questions.length} answered. Tap any answer to change it.
        </p>

        {weight ? (
          <div className="mt-5 flex items-end justify-between rounded-xl bg-secondary px-4 py-3.5">
            <div>
              <p className="text-[13px] text-muted-foreground">{weightQ?.label || 'Weight'}</p>
              <p className="num mt-1 text-[36px] text-foreground">{weight}<span className="ml-1 text-lg text-muted-foreground">lb</span></p>
            </div>
            {trend !== null && (
              <p className={trend < 0 ? 'num text-2xl text-success' : 'num text-2xl text-foreground'}>
                {trend > 0 ? '+' : ''}{trend.toFixed(1)} lb
                <span className="block text-right text-[13px] font-normal text-muted-foreground" style={{ fontFamily: 'var(--font-body)' }}>since last week</span>
              </p>
            )}
          </div>
        ) : null}

        <ul className="mt-5 divide-y divide-border border-y border-border">
          {questions.map((q, i) => {
            const shown = getDisplayValue(q, responses[q.id]);
            return (
              <li key={q.id}>
                <button type="button" onClick={() => onEditQuestion ? onEditQuestion(i) : onBack()} className="flex w-full items-start gap-4 py-3 text-left">
                  <span className="min-w-0 flex-1 text-sm text-muted-foreground">{q.label}</span>
                  <span className={shown ? 'max-w-[55%] text-right text-sm font-semibold text-foreground break-words' : 'text-sm text-muted-foreground underline underline-offset-4'}>
                    {shown || 'Add'}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <FocusFooter className="flex gap-2">
        <Button variant="outline" size="lg" className="h-[52px] px-6 text-base" onClick={onBack} disabled={submitting}>
          Back
        </Button>
        <Button size="lg" className="h-[52px] flex-1 text-base font-bold" onClick={onSubmit} disabled={submitting}>
          {submitting ? <><Loader2 className="animate-spin" /> Sending</> : 'Send to your coach'}
        </Button>
      </FocusFooter>
    </FocusScreen>
  );
}
