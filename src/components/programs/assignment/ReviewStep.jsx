import React from 'react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Check, Bell, Clock } from 'lucide-react';
import { format } from 'date-fns';
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
  const formattedDate = format(new Date(startDate), 'MMM d, yyyy');

  const paceLabels = {
    standard: 'Standard pace',
    accelerated: 'Accelerated',
    extended: 'Extended',
  };

  return (
    <div className="space-y-4">
      {/* Clients Summary */}
      <Card className="p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">Clients</p>
        <div className="space-y-2">
          {clientData.map((client) => (
            <div key={client.id} className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                {client.avatar_url && <SignedImg src={client.avatar_url} alt={client.name} />}
                <AvatarFallback>{client.name.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{client.name}</span>
              <Check className="w-4 h-4 text-success ml-auto" />
            </div>
          ))}
        </div>
      </Card>

      {/* Program & Settings Summary */}
      <Card className="p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">Program Details</p>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Program</span>
            <span className="font-medium">{program.title}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Duration</span>
            <span className="font-medium">{program.duration_weeks} weeks</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Frequency</span>
            <span className="font-medium">{program.days_per_week} days/week</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Start Date</span>
            <span className="font-medium">{formattedDate}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Pace</span>
            <span className="font-medium">{paceLabels[pace]}</span>
          </div>
          {repeatProgram && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Repeat</span>
              <span className="font-medium text-success">Auto-restart on completion</span>
            </div>
          )}
        </div>
      </Card>

      {/* Notifications & Kickoff */}
      <Card className="p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">Notifications & Kickoff</p>
        <div className="space-y-3">
          {notifyClient ? (
            <div className="flex items-start gap-3">
              <Bell className="w-4 h-4 text-success mt-0.5" />
              <div>
                <p className="text-sm font-medium">Notification will be sent</p>
                <p className="text-xs text-muted-foreground">Client will receive in-app notification and message</p>
                {customMessage && (
                  <p className="text-xs text-muted-foreground mt-1 p-2 bg-secondary rounded">
                    "{customMessage}"
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <Bell className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">No notification</p>
              </div>
            </div>
          )}

          {kickoffSession ? (
            <div className="flex items-start gap-3 pt-3 border-t border-border">
              <Clock className="w-4 h-4 text-success mt-0.5" />
              <div>
                <p className="text-sm font-medium">Kickoff call scheduled</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(kickoffSession.date + ' ' + kickoffSession.time), 'MMM d, yyyy • h:mm a')}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 pt-3 border-t border-border">
              <Clock className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">No kickoff call scheduled</p>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}