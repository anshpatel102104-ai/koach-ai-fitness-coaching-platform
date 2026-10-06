import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function NotesTab({ client }) {
  const [newNote, setNewNote] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: notes = [], refetch } = useQuery({
    queryKey: ['notes-tab', client?.id],
    queryFn: () => db.entities.CheckIn.filter({ client_id: client.id }),
    enabled: !!client?.id,
    select: d => d.filter(ci => ci.coach_notes).sort((a, b) => new Date(b.date) - new Date(a.date)),
  });

  const save = async () => {
    if (!newNote.trim()) return;
    setSaving(true);
    await db.entities.CheckIn.create({
      client_id: client.id,
      client_name: client.name,
      date: new Date().toISOString().split('T')[0],
      coach_notes: newNote.trim(),
      review_status: 'reviewed',
    });
    setNewNote('');
    await refetch();
    setSaving(false);
    toast.success('Note saved');
  };

  return (
    <div className="h-full flex flex-col">
      {/* Add note */}
      <div className="p-5 border-b border-border bg-card flex-shrink-0">
        <p className="text-sm font-bold text-foreground mb-3">Add Today's Note</p>
        <textarea
          value={newNote}
          onChange={e => setNewNote(e.target.value)}
          placeholder="Write a note about this client…"
          rows={4}
          className="w-full text-sm border border-border rounded-xl p-3 resize-none outline-none focus:ring-2 focus:ring-primary/30 bg-background"
        />
        <button
          onClick={save}
          disabled={saving || !newNote.trim()}
          className="mt-2 bg-primary text-primary-foreground text-sm font-semibold py-2 px-5 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-40"
        >
          {saving ? 'Saving…' : 'Save note'}
        </button>
      </div>

      {/* Notes list */}
      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-semibold text-muted-foreground">Past Notes ({notes.length})</p>
        </div>
        {notes.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm text-muted-foreground">No notes yet</p>
            <p className="text-xs text-muted-foreground mt-1">Add your first note above</p>
          </div>
        ) : notes.map(note => (
          <div key={note.id} className="bg-card border border-border rounded-xl p-4">
            <p className="text-[11px] font-bold text-muted-foreground mb-1.5">{format(new Date(note.date), 'EEEE, MMMM d, yyyy')}</p>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{note.coach_notes}</p>
          </div>
        ))}
      </div>
    </div>
  );
}