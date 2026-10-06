import React from 'react';
import { Button } from '@/components/ui/button';
import { FocusScreen, FocusFooter } from '@/components/portal/PortalUI';
import CheckInSteps, { shortLabel } from './CheckInSteps';
import CheckInQuestionWeight from './questions/CheckInQuestionWeight';
import CheckInQuestionScale from './questions/CheckInQuestionScale';
import CheckInQuestionMood from './questions/CheckInQuestionMood';
import CheckInQuestionChoice from './questions/CheckInQuestionChoice';
import CheckInQuestionYesNo from './questions/CheckInQuestionYesNo';
import CheckInQuestionText from './questions/CheckInQuestionText';
import CheckInQuestionPhoto from './questions/CheckInQuestionPhoto';
import CheckInQuestionMeasurements from './questions/CheckInQuestionMeasurements';

const isWeight = (q) => q.type === 'number' && /weight/i.test(q.label || '');
const unitFromLabel = (label = '') => (label.match(/\(([^)]+)\)/)?.[1] || '').replace(/^%$/, '%');

/** One plain sentence under the question, by type. */
function helperFor(q, coachName) {
  if (q.description || q.help_text) return q.description || q.help_text;
  if (isWeight(q)) return 'Weigh in first thing, after the bathroom, before you eat.';
  if (q.type === 'photos' || q.type === 'photo') return `Same spot and lighting as last time. Only you and ${coachName || 'your coach'} can see these.`;
  if (q.type === 'scale') return 'Go with your first answer.';
  if (q.type === 'mood') return 'How did the week feel overall?';
  if (q.type === 'percent') return 'A rough number is fine.';
  if (q.type === 'text' || q.type === 'text_long' || q.type === 'text_short') return 'A few lines is plenty. Your coach reads every word.';
  if (q.type === 'multiple_choice' && q.options?.length > 2) return null;
  return null;
}

function QuestionBody({ q, value, onChange, lastCheckIn }) {
  if (isWeight(q)) return <CheckInQuestionWeight value={value} onChange={onChange} lastValue={lastCheckIn?.weight} />;
  if (q.type === 'number') return <CheckInQuestionScale isNumber value={value} onChange={onChange} unit={unitFromLabel(q.label)} />;
  if (q.type === 'percent') return <CheckInQuestionScale isNumber value={value} onChange={onChange} unit="%" />;
  if (q.type === 'scale') return <CheckInQuestionScale value={value} onChange={onChange} min={q.min || 1} max={q.max || 10} />;
  if (q.type === 'mood') return <CheckInQuestionMood value={value} onChange={onChange} />;
  if (q.type === 'multiple_choice') return <CheckInQuestionChoice value={value} onChange={onChange} options={q.options || []} multi={q.options?.length > 2} />;
  if (q.type === 'yes_no') return <CheckInQuestionYesNo value={value} onChange={onChange} values={[true, false]} />;
  if (q.type === 'photos' || q.type === 'photo') return <CheckInQuestionPhoto value={value} onChange={onChange} />;
  if (q.type === 'measurements') return <CheckInQuestionMeasurements value={value} onChange={onChange} />;
  if (q.type === 'text_short') return <CheckInQuestionText multiline={false} value={value} onChange={onChange} />;
  return <CheckInQuestionText value={value} onChange={onChange} />;
}

/* Main form screen: one question per step, sticky Back / Next footer. */
export default function CheckInFormScreen({ form, responses, onResponseChange, onExit, onReview, onStep, currentQ = 0, lastCheckIn, coachName }) {
  const questions = form?.questions || [];
  const q = questions[currentQ];
  const totalQ = questions.length;
  const value = responses[q?.id] ?? null;

  const goNext = () => {
    if (currentQ < totalQ - 1) {
      onStep?.(currentQ + 1);
    } else {
      onReview();
    }
  };

  const goPrev = () => {
    if (currentQ > 0) onStep?.(currentQ - 1);
    else onExit();
  };

  if (!q) return null;

  const steps = [...questions.map(shortLabel), 'Send'];
  const helper = helperFor(q, coachName);
  const nextLabel = currentQ < totalQ - 1 ? `Next: ${shortLabel(questions[currentQ + 1]).toLowerCase()}` : 'Review and send';

  return (
    <FocusScreen>
      <CheckInSteps current={currentQ} steps={steps} onClose={onExit} title={form?.name || 'Weekly check-in'} />

      <div key={currentQ} className="flex-1 overflow-y-auto px-4 pt-6 pb-8">
        <h1 className="text-[32px] text-foreground">{q.label}</h1>
        {helper && <p className="mt-2 text-[15px] leading-snug text-muted-foreground">{helper}</p>}
        <div className="mt-6">
          <QuestionBody q={q} value={value} onChange={v => onResponseChange(q.id, v)} lastCheckIn={lastCheckIn} />
        </div>
      </div>

      <FocusFooter className="flex gap-2">
        <Button variant="outline" size="lg" className="h-[52px] px-6 text-base" onClick={goPrev}>
          {currentQ === 0 ? 'Later' : 'Back'}
        </Button>
        <Button size="lg" className="h-[52px] flex-1 text-base font-bold" onClick={goNext}>
          {nextLabel}
        </Button>
      </FocusFooter>
    </FocusScreen>
  );
}
