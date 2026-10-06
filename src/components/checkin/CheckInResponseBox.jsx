import React, { useState } from 'react';
import { Loader2, Check, ChevronDown, Send } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { db } from '@/api/supabaseClient';

const TEMPLATES = [
  { label: 'Good check-in', text: "Good check-in this week. The consistency is showing. Same plan, keep going." },
  { label: 'Hard week', text: "Some weeks are harder than others. You kept showing up, and that is what counts." },
  { label: 'Nutrition nudge', text: "Quick nudge on nutrition this week. Hitting your targets 80% of the time is plenty. Aim for that." },
  { label: 'Missed check-in', text: "I didn't get your check-in this week. Everything okay? Let me know if something came up." },
  { label: 'Program adjusted', text: "I've looked at your recent sessions and adjusted your program. Have a look at the updated plan and ask me anything." },
  { label: 'Big week', text: "Big week. The numbers moved the right way. Let's keep that going into next week." },
];


export default function CheckInResponseBox({ checkIn, client, allClientCIs = [], onSave, saving }) {
  const [reply, setReply] = useState(checkIn.coach_notes || '');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDraft, setAiDraft] = useState('');
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
      toast.error('Could not draft a reply. Try again in a moment.');
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
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[20px] text-foreground">Your reply</h2>
        <div className="flex gap-2 items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline">Templates <ChevronDown /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              {TEMPLATES.map((t, i) => (
                <DropdownMenuItem key={i} onClick={() => { setReply(t.text); setEditMode(true); }} className="flex-col items-start gap-0.5">
                  <span className="font-medium">{t.label}</span>
                  <span className="text-[13px] text-muted-foreground line-clamp-1">{t.text}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" onClick={generateAI} disabled={aiLoading}>
            {aiLoading && <Loader2 className="animate-spin" />}
            {aiLoading ? 'Drafting…' : 'Draft with AI'}
          </Button>
        </div>
      </div>

      {aiDraft && (
        <div className="rounded-xl bg-ai text-ai-foreground p-4 space-y-3">
          <p className="text-[13px] text-ai-foreground/70">AI draft from {client?.name?.split(' ')[0] || 'their'}'s answers</p>
          <p className="text-[15px] leading-relaxed">{aiDraft}</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" className="bg-ai-foreground text-ai hover:bg-ai-foreground/90" onClick={useAIDraft}>Use and edit</Button>
            <Button size="sm" variant="ghost" className="border border-ai-foreground/25 text-ai-foreground hover:bg-ai-foreground/10" onClick={generateAI} disabled={aiLoading}>Draft again</Button>
            <Button size="sm" variant="ghost" className="text-ai-foreground/80 hover:bg-ai-foreground/10" onClick={() => setAiDraft('')}>Dismiss</Button>
          </div>
        </div>
      )}

      {editMode ? (
        <>
          <Textarea
            value={reply}
            onChange={e => setReply(e.target.value)}
            placeholder="Write your reply"
            className="resize-y min-h-[140px]"
            rows={5}
            autoFocus
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-[13px] text-muted-foreground">Sends to their inbox and saves on this check-in.</span>
            <div className="flex gap-2">
              {checkIn.coach_notes && (
                <Button size="sm" variant="ghost" onClick={() => { setReply(checkIn.coach_notes); setEditMode(false); }}>
                  Cancel
                </Button>
              )}
              <Button size="sm" onClick={handleSave} disabled={saving || !reply.trim()}>
                {saving ? <Loader2 className="animate-spin" /> : saved ? <Check /> : <Send />}
                {saved ? 'Sent' : 'Send'}
              </Button>
            </div>
          </div>
        </>
      ) : reply ? (
        <div className="rounded-lg bg-secondary p-4">
          <p className="text-[15px] leading-relaxed text-foreground">{reply}</p>
          <button
            onClick={() => setEditMode(true)}
            className="mt-2 text-[13px] font-semibold text-foreground underline underline-offset-4 decoration-1"
          >
            Edit reply
          </button>
        </div>
      ) : (
        <Button variant="outline" className="w-full" onClick={() => setEditMode(true)}>
          Write a reply yourself
        </Button>
      )}
    </div>
  );
}
