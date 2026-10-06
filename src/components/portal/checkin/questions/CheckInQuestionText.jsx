import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

export default function CheckInQuestionText({ value, onChange, multiline = true, placeholder = '' }) {
  const MAX = 1000;
  return (
    <div>
      {multiline ? (
        <Textarea
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder || 'Write it how you would say it to your coach.'}
          rows={6}
          maxLength={MAX}
          className="text-base leading-relaxed"
        />
      ) : (
        <Input
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-12 text-base"
        />
      )}
      <p className="mt-1.5 text-right text-[13px] text-muted-foreground tabular-nums">{(value || '').length}/{MAX}</p>
    </div>
  );
}
