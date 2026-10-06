import React from 'react';
import { X } from 'lucide-react';

const TEMPLATES = [
  { tag: 'check_in', label: 'Check-in reminder', text: "Quick reminder to send in your weekly check-in when you get a minute. Tell me how training and food went." },
  { tag: 'check_in', label: 'Good check-in', text: "Good check-in this week. The consistency is showing. Same plan, keep going." },
  { tag: 'motivation', label: 'Rough week', text: "Some weeks are harder than others. You kept showing up, and that is what moves the needle." },
  { tag: 'nutrition', label: 'Nutrition nudge', text: "Quick nudge on nutrition this week. Hitting your targets 80% of the time is plenty. Aim for that." },
  { tag: 'training', label: 'Program updated', text: "I've updated your program based on the last few weeks. Have a look before your next session and ask me anything." },
  { tag: 'urgent', label: 'Missed check-in', text: "I didn't get your check-in this week. Everything okay? Let me know if something came up." },
];

/** Plain-language labels for message tags. */
const TAG_LABELS = {
  check_in: 'Check-in',
  motivation: 'Motivation',
  nutrition: 'Nutrition',
  training: 'Training',
  urgent: 'Urgent',
  general: 'General',
};

/** Tag chip styles: neutral, except urgent which is a genuine alert. */
const TAG_COLORS = {
  check_in: 'bg-secondary text-foreground border-border',
  motivation: 'bg-secondary text-foreground border-border',
  nutrition: 'bg-secondary text-foreground border-border',
  training: 'bg-secondary text-foreground border-border',
  urgent: 'bg-destructive/10 text-destructive border-destructive/30',
  general: 'bg-secondary text-foreground border-border',
};

export default function MessageTemplates({ onSelect, onClose }) {
  return (
    <div className="panel p-4 w-80">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[15px] font-semibold">Templates</p>
        <button onClick={onClose} aria-label="Close"><X className="w-4 h-4 text-muted-foreground hover:text-foreground" /></button>
      </div>
      <div className="max-h-72 overflow-y-auto -mx-2">
        {TEMPLATES.map((t, i) => (
          <button
            key={i}
            onClick={() => { onSelect(t.text, t.tag); onClose(); }}
            className="w-full text-left px-2 py-2.5 rounded-lg hover:bg-accent transition-colors"
          >
            <p className="text-sm font-semibold text-foreground">{t.label} <span className="font-normal text-muted-foreground">· {TAG_LABELS[t.tag]}</span></p>
            <p className="text-[13px] text-muted-foreground line-clamp-2 mt-0.5">{t.text}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

export { TAG_COLORS, TAG_LABELS };
