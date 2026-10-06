import React from 'react';
import { format } from 'date-fns';
import { KeyValue, Initials } from '@/components/kit';
import { SignedImg } from '@/components/shared/SignedImage';

export default function ReviewStep({
  selectedClients,
  program,
  startDate,
  repeatProgram,
  pace,
  customMessage,
  notifyClient,
  kickoffSession,
  allClients,
}) {
  const clientData = allClients.filter((c) => selectedClients.includes(c.id));
  const formattedDate = format(new Date(startDate), 'EEEE, MMM d, yyyy');

  const paceLabels = {
    standard: 'Standard',
    accelerated: 'Faster',
    extended: 'Slower',
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-1 text-[13px] text-muted-foreground">
          {clientData.length} client{clientData.length !== 1 ? 's' : ''}
        </p>
        {clientData.map((client) => (
          <div key={client.id} className="flex items-center gap-3 border-b border-border py-2.5 last:border-b-0">
            {client.avatar_url
              ? <SignedImg src={client.avatar_url} alt={client.name} className="h-8 w-8 rounded-full object-cover" />
              : <Initials name={client.name} size={32} />}
            <span className="text-[15px] font-semibold text-foreground">{client.name}</span>
          </div>
        ))}
      </div>

      <div>
        <p className="mb-1 text-[13px] text-muted-foreground">Program</p>
        <KeyValue label="Program" value={program.title} />
        <KeyValue label="Length" value={`${program.duration_weeks} weeks`} />
        <KeyValue label="Training days" value={`${program.days_per_week} a week`} />
        <KeyValue label="Starts" value={formattedDate} />
        <KeyValue label="Pace" value={paceLabels[pace]} />
        {repeatProgram && <KeyValue label="When it ends" value="Starts again from week 1" />}
      </div>

      <div>
        <p className="mb-1 text-[13px] text-muted-foreground">Telling them</p>
        <KeyValue label="Notification" value={notifyClient ? 'In-app notification and message' : 'None'} />
        <KeyValue
          label="Kickoff call"
          value={kickoffSession ? format(new Date(kickoffSession.date + ' ' + kickoffSession.time), 'EEE, MMM d, h:mm a') : 'Not booked'}
        />
        {customMessage && (
          <p className="mt-3 rounded-xl bg-secondary p-3 text-sm text-foreground">“{customMessage}”</p>
        )}
      </div>
    </div>
  );
}
