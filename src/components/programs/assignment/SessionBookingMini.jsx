import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

export default function SessionBookingMini({ clients, onConfirm, onCancel }) {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState('14:00');

  const handleConfirm = () => {
    onConfirm({
      date,
      time,
      clients: clients.map((c) => c.id),
      title: `Kickoff Call - ${clients.map((c) => c.name).join(', ')}`,
      duration_minutes: 30,
    });
  };

  return (
    <div className="rounded-xl border border-border p-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1.5 block text-[13px] text-muted-foreground">Date</span>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[13px] text-muted-foreground">Time</span>
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-9" />
        </label>
      </div>
      <p className="mt-2 text-[13px] text-muted-foreground">30 minutes.</p>
      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={handleConfirm}>Book it</Button>
        <Button size="sm" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}
