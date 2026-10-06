import React, { useState } from 'react';
import { format } from 'date-fns';
import { X } from 'lucide-react';

export default function LogWeightModal({ client, onSave, onClose, loading }) {
  const [weight, setWeight] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState('');

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-card rounded-xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Log Weight{client?.name ? ` — ${client.name}` : ''}</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Weight (lbs)</label>
          <input type="number" step="0.1" placeholder="e.g. 185.5" value={weight} onChange={e => setWeight(e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Notes (optional)</label>
          <input placeholder="e.g. Morning, after workout" value={notes} onChange={e => setNotes(e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-xs rounded-lg border border-border text-foreground">Cancel</button>
          <button
            onClick={() => weight && onSave(parseFloat(weight), date, notes)}
            disabled={!weight || loading}
            className="px-4 py-2 text-xs rounded-lg bg-primary text-primary-foreground font-semibold disabled:opacity-50">
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}