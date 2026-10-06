import React, { useState } from 'react';
import { portalDb } from '@/api/supabaseClient';
import { format, parseISO } from 'date-fns';
import { Send } from 'lucide-react';
import { SignedImg } from '@/components/shared/SignedImage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Initials, KeyValue } from '@/components/kit';
import { PortalScreen, PortalHeader, Pill } from '@/components/portal/PortalUI';

const MOOD_LABEL = { stressed: 'Stressed', tired: 'Tired', okay: 'Okay', good: 'Good', great: 'Great' };

export const REVIEW_STATUS = {
  reviewed: { tone: 'success', label: 'Reviewed' },
  flagged: { tone: 'danger', label: 'Flagged' },
  pending: { tone: 'warning', label: 'Waiting for review' },
};

export default function CheckInDetailView({ checkIn, client, onBack, onMessage }) {
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const handleReply = async () => {
    if (!reply.trim() || !client?.id) return;
    setSending(true);
    await portalDb.entities.Message.create({
      client_id: client.id,
      client_name: client.name,
      sender: 'client',
      content: reply,
      tag: 'check_in',
    });
    setReply('');
    setSending(false);
    onMessage();
  };

  const status = REVIEW_STATUS[checkIn.review_status] || REVIEW_STATUS.pending;

  const stats = [
    ['Weight', checkIn.weight ? `${checkIn.weight} lb` : null],
    ['Mood', MOOD_LABEL[checkIn.mood] || null],
    ['Energy', checkIn.energy_level ? `${checkIn.energy_level} of 10` : null],
    ['Stress', checkIn.stress_level ? `${checkIn.stress_level} of 10` : null],
    ['Sleep', checkIn.sleep_hours ? `${checkIn.sleep_hours} hours` : null],
    ['Training', checkIn.compliance_training ? `${checkIn.compliance_training}%` : null],
    ['Nutrition', checkIn.compliance_nutrition ? `${checkIn.compliance_nutrition}%` : null],
  ].filter(([, v]) => v !== null);

  const lateDays = (() => {
    if (!checkIn.date || !checkIn.created_date) return 0;
    const diff = Math.floor((new Date(checkIn.created_date) - new Date(checkIn.date)) / (1000 * 60 * 60 * 24));
    return diff > 1 ? diff : 0;
  })();

  return (
    <PortalScreen>
      <PortalHeader
        onBack={onBack}
        eyebrow={format(parseISO(checkIn.date), 'EEEE, MMMM d, yyyy')}
        title="Your check-in"
        right={<Pill tone={status.tone}>{status.label}</Pill>}
      />

      <div className="space-y-3">
        {/* Coach response first: it's what you came back for */}
        {checkIn.coach_notes && (
          <section className="panel p-4">
            <div className="flex items-start gap-3">
              <Initials name="Coach" tone="ink" size={40} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-[15px] font-semibold text-foreground">Your coach replied</p>
                  {checkIn.updated_date && (
                    <p className="text-[13px] text-muted-foreground">{format(new Date(checkIn.updated_date), 'MMM d, h:mm a')}</p>
                  )}
                </div>
                <p className="mt-1 text-[15px] leading-relaxed text-foreground">{checkIn.coach_notes}</p>
              </div>
            </div>
            <div className="mt-4 flex gap-2 border-t border-border pt-3">
              <Input
                value={reply}
                onChange={e => setReply(e.target.value)}
                placeholder="Reply to your coach"
                className="h-11 flex-1 text-base"
              />
              <Button size="icon" className="h-11 w-11" onClick={handleReply} disabled={!reply.trim() || sending} aria-label="Send reply">
                <Send />
              </Button>
            </div>
          </section>
        )}

        {stats.length > 0 && (
          <section className="panel px-4 py-1">
            {stats.map(([label, value]) => <KeyValue key={label} label={label} value={value} />)}
          </section>
        )}

        {checkIn.notes && (
          <section className="panel p-4">
            <h2 className="text-lg text-foreground">Your notes</h2>
            <p className="mt-1.5 text-[15px] leading-relaxed text-foreground">{checkIn.notes}</p>
          </section>
        )}

        {checkIn.photo_urls?.length > 0 && (
          <section className="panel p-4">
            <h2 className="text-lg text-foreground">Progress photos</h2>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {checkIn.photo_urls.map((url, i) => (
                <SignedImg key={i} src={url} alt="" className="aspect-[3/4] w-full rounded-lg object-cover bg-secondary" />
              ))}
            </div>
          </section>
        )}

        {lateDays > 0 && (
          <p className="px-1 text-[13px] text-muted-foreground">Sent {lateDays} day{lateDays !== 1 ? 's' : ''} after it was due.</p>
        )}

        {!checkIn.coach_notes && (
          <Button variant="outline" size="lg" className="w-full" onClick={onMessage}>
            Message your coach
          </Button>
        )}
      </div>
    </PortalScreen>
  );
}
