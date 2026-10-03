import React, { useState } from 'react';
import { Sparkles, Loader2, BookOpen, Check, ChevronDown, Send, RefreshCw, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { db } from '@/api/supabaseClient';

const TEMPLATES = [
  { label: 'Great Check-in', text: "Awesome check-in this week! Your consistency is really showing. Keep up the great work and let's build on this momentum! 💪" },
  { label: 'Motivation Boost', text: "Just wanted to say I'm proud of the effort you've been putting in. Some weeks are harder than others — keep showing up and the results will follow 🔥" },
  { label: 'Nutrition Reminder', text: "Quick reminder to stay on track with your nutrition targets this week. Even 80% compliance makes a huge difference over time. You've got this!" },
  { label: 'Missed Check-in', text: "Hey, I noticed you missed your check-in this week. Everything okay? Let me know if anything came up — I'm here to support you!" },
  { label: 'Training Adjustment', text: "I've reviewed your recent sessions and made some adjustments to your program. Check the updated plan and let me know if you have questions!" },
  { label: 'Weekly Win', text: "You crushed it this week! I saw real progress in your numbers. Let's keep that energy going into next week 🙌" },
];


export default function CheckInResponseBox({ checkIn, client, allClientCIs = [], onSave, saving }) {
  const [reply, setReply] = useState(checkIn.coach_notes || '');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDraft, setAiDraft] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editMode, setEditMode] = useState(!checkIn.coach_notes);

  const generateAI = async () => {
    setAiLoading(true);
    setAiDraft('');
    try {
      const res = await db.functions.invoke('aiMessageAssistant', {
        action: 'generateCheckInResponse',
        client,
        checkIn,
        recentCheckIns: allClientCIs,
      });
      setAiDraft(res.data?.message || '');
    } catch (e) {
      toast.error('Could not generate a draft. Please try again.');
    }
    setAiLoading(false);
  };

  const useAIDraft = () => {
    setReply(aiDraft);
    setAiDraft('');
    setEditMode(true);
  };

  const handleSave = async () => {
    // Save to check-in + mark responded
    await onSave({ coach_notes: reply, coach_responded: true });

    // Deliver message instantly to client's inbox
    if (checkIn?.client_id && reply.trim()) {
      await db.entities.Message.create({
        client_id: checkIn.client_id,
        client_name: checkIn.client_name,
        sender: 'coach',
        content: reply.trim(),
        tag: 'check_in',
        is_read: false,
      });
    }

    setSaved(true);
    setEditMode(false);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Coach Response</p>
        <div className="flex gap-1.5 items-center">
          {/* Templates dropdown */}
          <div className="relative">
            <Button
              size="sm" variant="outline"
              className="h-7 text-xs gap-1.5"
              onClick={() => setShowTemplates(s => !s)}
            >
              <BookOpen className="w-3 h-3" /> Templates <ChevronDown className="w-3 h-3" />
            </Button>
            {showTemplates && (
              <div className="absolute right-0 top-8 z-20 bg-card border border-border rounded-xl shadow-xl p-2 w-64 max-h-60 overflow-y-auto">
                {TEMPLATES.map((t, i) => (
                  <button
                    key={i}
                    onClick={() => { setReply(t.text); setEditMode(true); setShowTemplates(false); }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-secondary transition-colors"
                  >
                    <p className="text-xs font-medium">{t.label}</p>
                    <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{t.text}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Generate AI button */}
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
            onClick={generateAI}
            disabled={aiLoading}
          >
            {aiLoading
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : <Sparkles className="w-3 h-3" />
            }
            {aiLoading ? 'Generating...' : 'Generate Response'}
          </Button>
        </div>
      </div>

      {/* AI Draft card */}
      {aiDraft && (
        <div className="bg-primary/6 border border-primary/25 rounded-xl p-3.5 space-y-3">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <p className="text-xs font-semibold text-primary">AI-Generated Response</p>
          </div>
          <p className="text-sm leading-relaxed text-foreground">{aiDraft}</p>
          <div className="flex gap-2">
            <Button size="sm" className="h-7 text-xs gap-1.5" onClick={useAIDraft}>
              <Pencil className="w-3 h-3" /> Edit & Send
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={generateAI} disabled={aiLoading}>
              <RefreshCw className="w-3 h-3" /> Regenerate
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAiDraft('')}>Dismiss</Button>
          </div>
        </div>
      )}

      {/* Edit / read view */}
      {editMode ? (
        <>
          <Textarea
            value={reply}
            onChange={e => setReply(e.target.value)}
            placeholder="Write your coaching response..."
            className="text-sm resize-none"
            rows={4}
            autoFocus
          />
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">{reply.length} chars</span>
            <div className="flex gap-2">
              {checkIn.coach_notes && (
                <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setReply(checkIn.coach_notes); setEditMode(false); }}>
                  Cancel
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving || !reply.trim()}
                className="h-8 text-xs gap-1.5"
              >
                {saving
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : saved
                    ? <Check className="w-3 h-3" />
                    : <Send className="w-3 h-3" />
                }
                {saved ? 'Sent!' : 'Send to Client'}
              </Button>
            </div>
          </div>
        </>
      ) : reply ? (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 group">
          <p className="text-sm leading-relaxed text-foreground">{reply}</p>
          <button
            onClick={() => setEditMode(true)}
            className="mt-2 text-[11px] text-primary/70 hover:text-primary flex items-center gap-1 transition-colors"
          >
            <Pencil className="w-3 h-3" /> Edit response
          </button>
        </div>
      ) : (
        <button
          onClick={() => setEditMode(true)}
          className="w-full py-3 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
        >
          + Write a response manually
        </button>
      )}
    </div>
  );
}