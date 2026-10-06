import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { db } from '@/api/supabaseClient';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { CheckCircle2, Salad } from 'lucide-react';

const RATING_LABELS = {
  1: 'Very Poor', 2: 'Poor', 3: 'Below Average', 4: 'Slightly Off',
  5: 'Halfway There', 6: 'Decent', 7: 'Good', 8: 'Great', 9: 'Excellent', 10: 'Perfect'
};

const QUICK_WINS = [
  'Hit protein target every day',
  'Stayed within calorie range',
  'Prepped meals in advance',
  'Drank enough water',
  'No cheat meals',
  'Ate all scheduled meals',
];

const STRUGGLES = [
  'Missed meals',
  'Overate on weekends',
  'Ate out too much',
  'Cravings were hard',
  'Not enough protein',
  'Skipped meal prep',
];

export default function NutritionCheckInModal({ open, onOpenChange, planId, clientId }) {
  const [rating, setRating] = useState(7);
  const [note, setNote] = useState('');
  const [wins, setWins] = useState([]);
  const [issues, setIssues] = useState([]);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const toggleTag = (arr, setArr, val) => {
    setArr(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);
  };

  const submit = async () => {
    setSaving(true);
    const noteText = [
      wins.length ? `Wins: ${wins.join(', ')}` : '',
      issues.length ? `Struggles: ${issues.join(', ')}` : '',
      note ? `Notes: ${note}` : '',
    ].filter(Boolean).join('\n');

    await db.entities.CheckIn.create({
      client_id: clientId || 'self',
      date: new Date().toISOString().slice(0, 10),
      compliance_nutrition: rating * 10,
      notes: noteText,
    });
    setSaving(false);
    setDone(true);
    toast.success('Nutrition check-in sent');
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => { setDone(false); setRating(7); setNote(''); setWins([]); setIssues([]); }, 300);
  };

  const ratingColor = rating >= 8 ? 'text-success' : rating >= 5 ? 'text-warning' : 'text-destructive';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden rounded-xl">
        <div className="px-5 pt-5 pb-4 border-b border-border bg-card flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-success/10 flex items-center justify-center">
              <Salad className="w-4.5 h-4.5 text-success" />
            </div>
            <div>
              <DialogTitle className="text-base">Weekly Nutrition Check-In</DialogTitle>
              <p className="text-xs text-muted-foreground">How well did you follow your plan this week?</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {done ? (
            <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
              <CheckCircle2 className="w-14 h-14 text-success" />
              <div>
                <p className="text-lg font-bold text-foreground">Check-in sent</p>
                <p className="text-sm text-muted-foreground mt-1">Great work staying accountable. Your coach will review this.</p>
              </div>
              <Button onClick={handleClose}>Done</Button>
            </div>
          ) : (
            <>
              {/* Rating slider */}
              <div>
                <Label className="text-sm font-semibold text-foreground block mb-3">
                  Adherence Rating: <span className={`font-bold text-lg ${ratingColor}`}>{rating}/10</span>
                  <span className="text-xs text-muted-foreground ml-2">— {RATING_LABELS[rating]}</span>
                </Label>
                <input
                  type="range"
                  min={1} max={10} value={rating}
                  onChange={e => setRating(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Poor</span><span>Perfect</span>
                </div>
              </div>

              {/* Quick wins */}
              <div>
                <Label className="text-xs font-semibold text-muted-foreground mb-2 block">Quick Wins (select all that apply)</Label>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_WINS.map(w => (
                    <button
                      key={w}
                      onClick={() => toggleTag(wins, setWins, w)}
                      className={cn(
                        'text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-all',
                        wins.includes(w) ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border hover:border-success'
                      )}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>

              {/* Struggles */}
              <div>
                <Label className="text-xs font-semibold text-muted-foreground mb-2 block">Challenges (select all that apply)</Label>
                <div className="flex flex-wrap gap-1.5">
                  {STRUGGLES.map(s => (
                    <button
                      key={s}
                      onClick={() => toggleTag(issues, setIssues, s)}
                      className={cn(
                        'text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-all',
                        issues.includes(s) ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border hover:border-destructive'
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Free text */}
              <div>
                <Label className="text-xs font-semibold text-muted-foreground mb-2 block">Additional Notes (optional)</Label>
                <Textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Anything else your coach should know…"
                  rows={3}
                  className="text-sm"
                />
              </div>
            </>
          )}
        </div>

        {!done && (
          <div className="px-5 py-4 border-t border-border bg-card flex-shrink-0 flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
            <Button onClick={submit} disabled={saving} className="gap-2">
              {saving ? 'Saving…' : 'Submit Check-In'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}