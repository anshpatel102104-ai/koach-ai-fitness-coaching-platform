import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import SessionBookingMini from './SessionBookingMini';

export default function NotificationsStep({
  notifyClient,
  onNotifyClientChange,
  program,
  customMessage,
  startDate,
  selectedClients,
  scheduleKickoff,
  onScheduleKickoffChange,
  kickoffSession,
  onKickoffSessionChange,
  allClients,
}) {
  const [showBooking, setShowBooking] = useState(false);

  const selectedClientData = allClients.filter((c) => selectedClients.includes(c.id));
  const formattedDate = format(new Date(startDate), 'EEEE, MMM d');

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[15px] font-semibold text-foreground">Tell them it's ready</p>
            <p className="text-[13px] text-muted-foreground">Sends an in-app notification and a message.</p>
          </div>
          <Switch checked={notifyClient} onCheckedChange={onNotifyClientChange} />
        </div>

        {notifyClient && (
          <div className="mt-3 rounded-xl bg-secondary p-4">
            <p className="mb-2 text-[13px] text-muted-foreground">What they'll see</p>
            <p className="text-[15px] font-semibold text-foreground">
              Your new program is ready. {program.title} starts {formattedDate}.
            </p>
            {customMessage && <p className="mt-2 text-sm text-foreground">{customMessage}</p>}
          </div>
        )}
      </div>

      <div className="border-t border-border pt-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[15px] font-semibold text-foreground">Book a kickoff call</p>
            <p className="text-[13px] text-muted-foreground">A short call to walk them through week 1.</p>
          </div>
          <Switch checked={scheduleKickoff} onCheckedChange={onScheduleKickoffChange} />
        </div>

        {scheduleKickoff && (
          <div className="mt-3 space-y-3">
            {kickoffSession ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3">
                <div>
                  <p className="text-[15px] font-semibold text-foreground">
                    {format(new Date(kickoffSession.date + ' ' + kickoffSession.time), 'EEE, MMM d, h:mm a')}
                  </p>
                  <p className="text-[13px] text-muted-foreground">
                    With {selectedClientData.length > 1 ? 'every selected client' : selectedClientData[0]?.name}
                  </p>
                </div>
                <button onClick={() => setShowBooking(true)} className="text-sm font-semibold text-foreground underline underline-offset-4">
                  Change
                </button>
              </div>
            ) : (
              !showBooking && (
                <Button variant="outline" onClick={() => setShowBooking(true)}>
                  Pick a time
                </Button>
              )
            )}

            {showBooking && (
              <SessionBookingMini
                clients={selectedClientData}
                onConfirm={(session) => {
                  onKickoffSessionChange(session);
                  setShowBooking(false);
                }}
                onCancel={() => setShowBooking(false)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
