import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function ProgressDataTable({ data, metric, selectedClient, onLog }) {
  const [showLog, setShowLog] = useState(false);
  const [form, setForm] = useState({ value: '', date: format(new Date(), 'yyyy-MM-dd'), notes: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    onLog({ value: Number(form.value), date: form.date, notes: form.notes });
    setShowLog(false);
    setForm({ value: '', date: format(new Date(), 'yyyy-MM-dd'), notes: '' });
  };

  const rows = [...(data || [])].reverse();

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h3 className="text-[18px] text-foreground">History</h3>
        <Button size="sm" onClick={() => setShowLog(true)} disabled={!selectedClient}
          className="bg-primary text-primary-foreground hover:bg-primary gap-1.5 h-7 text-xs">
          <Plus className="w-3.5 h-3.5" /> Log entry
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm">No entries yet. Log your first data point.</div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-background border-b border-border">
              <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground">Date</th>
              <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground">Value</th>
              <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground">Change</th>
              <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground">Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const prev = rows[i + 1];
              const change = prev ? (row.value - prev.value).toFixed(1) : null;
              const changeColor = change === null ? '' : Number(change) > 0 ? 'var(--tc-success)' : Number(change) < 0 ? 'var(--tc-destructive)' : 'var(--tc-muted-foreground)';
              return (
                <tr key={i} className={i % 2 === 0 ? 'bg-card' : 'bg-background'}>
                  <td className="px-5 py-3 text-foreground">{format(new Date(row.date), 'MMM d, yyyy')}</td>
                  <td className="px-5 py-3 font-semibold text-foreground">{row.value}{metric.unit}</td>
                  <td className="px-5 py-3 font-medium" style={{ color: changeColor }}>
                    {change !== null ? `${Number(change) >= 0 ? '+' : ''}${change}${metric.unit}` : '—'}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground text-xs max-w-[200px] truncate">{row.notes || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <Dialog open={showLog} onOpenChange={setShowLog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Log {metric.label}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div>
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
            </div>
            <div>
              <Label>{metric.label} ({metric.unit || 'value'})</Label>
              <Input type="number" step="0.1" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} required placeholder={`Enter ${metric.label.toLowerCase()}`} />
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setShowLog(false)}>Cancel</Button>
              <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary">Save</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}