import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Trash2, CheckSquare, Square, Loader2, ShieldCheck, Info } from 'lucide-react';
import { db } from '@/api/supabaseClient';
import { toast } from 'sonner';

/**
 * ImportCleanupModal
 *
 * Shows ONLY clients that were created by the CSV import feature
 * (identified by having a non-empty external_id field, which the importer sets).
 * You must manually check each record you want to remove, then confirm deletion.
 * Nothing is deleted automatically.
 */
export default function ImportCleanupModal({ open, onOpenChange, clients = [], onDeleted }) {
  const [selected, setSelected] = useState(new Set());
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Only show clients that were produced by the importer:
  // commitClientImport sets external_id on every committed row.
  const importedClients = useMemo(() =>
    clients
      .filter(c => c.external_id && c.external_id.trim() !== '')
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date)),
    [clients]
  );

  const toggle = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === importedClients.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(importedClients.map(c => c.id)));
    }
  };

  const handleClose = (v) => {
    if (deleting) return;
    setSelected(new Set());
    setConfirming(false);
    onOpenChange(v);
  };

  const handleDelete = async () => {
    if (selected.size === 0) return;
    setDeleting(true);
    let deleted = 0;
    let failed = 0;
    for (const id of selected) {
      try {
        await db.entities.Client.delete(id);
        deleted++;
      } catch {
        failed++;
      }
    }
    setDeleting(false);
    setConfirming(false);
    setSelected(new Set());
    if (deleted > 0) {
      toast.success(`Deleted ${deleted} imported client${deleted > 1 ? 's' : ''}.`);
      onDeleted?.();
    }
    if (failed > 0) {
      toast.error(`${failed} record(s) could not be deleted.`);
    }
    if (deleted > 0) handleClose(false);
  };

  const allChecked = selected.size === importedClients.length && importedClients.length > 0;
  const someChecked = selected.size > 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl w-full p-0 gap-0 overflow-hidden">
        <div style={{ display: 'flex', flexDirection: 'column', height: '85dvh', maxHeight: '85dvh', overflow: 'hidden' }}>

          {/* ── HEADER ── */}
          <div style={{ flexShrink: 0 }} className="px-6 py-4 border-b border-border">
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-destructive" />
              Review Imported Clients
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">
              These are the <strong>{importedClients.length}</strong> client records created by the CSV import feature
              (they have an <code className="bg-muted px-1 rounded text-[11px]">external_id</code> set).
              Check the ones you want to delete, then confirm. Nothing is removed until you click&nbsp;
              <strong>Delete Selected</strong>.
            </p>
          </div>

          {/* ── BODY ── */}
          <div style={{ flex: '1 1 0', minHeight: 0, overflowY: 'auto' }} className="px-6 py-4">
            {importedClients.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <ShieldCheck className="w-10 h-10 text-success mb-3" />
                <p className="text-sm font-semibold text-foreground">No imported clients found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  All clients in your account were added manually or have no import marker.
                </p>
              </div>
            ) : (
              <>
                {/* Select-all row */}
                <div className="flex items-center gap-3 py-2 mb-2 border-b border-border">
                  <button onClick={toggleAll} className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
                    {allChecked
                      ? <CheckSquare className="w-4 h-4 text-destructive" />
                      : <Square className="w-4 h-4 text-border" />
                    }
                    {allChecked ? 'Deselect all' : `Select all (${importedClients.length})`}
                  </button>
                  {someChecked && (
                    <span className="ml-auto text-xs text-destructive font-semibold">
                      {selected.size} selected for deletion
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  {importedClients.map(client => {
                    const isSelected = selected.has(client.id);
                    return (
                      <button
                        key={client.id}
                        onClick={() => toggle(client.id)}
                        className={`w-full flex items-start gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'border-destructive bg-destructive/10'
                            : 'border-border bg-card hover:border-border hover:bg-muted'
                        }`}
                      >
                        <div className="mt-0.5 flex-shrink-0">
                          {isSelected
                            ? <CheckSquare className="w-4 h-4 text-destructive" />
                            : <Square className="w-4 h-4 text-border" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-sm font-semibold ${isSelected ? 'text-destructive' : 'text-foreground'}`}>
                              {client.name || '(no name)'}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                              client.lifecycle_status === 'active' ? 'bg-success/10 text-success'
                              : client.lifecycle_status === 'lead' ? 'bg-accent text-primary'
                              : 'bg-muted text-muted-foreground'
                            }`}>
                              {client.lifecycle_status || 'lead'}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                            {client.email && (
                              <span className="text-xs text-muted-foreground">{client.email}</span>
                            )}
                            {client.phone && (
                              <span className="text-xs text-muted-foreground">{client.phone}</span>
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-1.5">
                            <Info className="w-3 h-3 text-border flex-shrink-0" />
                            <span className="text-[10px] text-muted-foreground font-mono truncate">
                              external_id: {client.external_id}
                            </span>
                          </div>
                          {client.notes && (
                            <p className="text-[11px] text-muted-foreground mt-1 truncate">
                              Notes: {client.notes.slice(0, 100)}{client.notes.length > 100 ? '…' : ''}
                            </p>
                          )}
                        </div>
                        <div className="text-[10px] text-border flex-shrink-0 mt-0.5">
                          {client.created_date ? new Date(client.created_date).toLocaleDateString() : ''}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* ── FOOTER ── */}
          {importedClients.length > 0 && (
            <div style={{ flexShrink: 0 }} className="px-6 py-4 border-t border-border">
              {confirming ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive rounded-xl">
                    <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-destructive">
                      You are about to permanently delete{' '}
                      <strong>{selected.size} client record{selected.size > 1 ? 's' : ''}</strong>.
                      This cannot be undone. Are you sure?
                    </p>
                  </div>
                  <div className="flex items-center justify-end gap-3">
                    <Button variant="outline" size="sm" onClick={() => setConfirming(false)} disabled={deleting}>
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="bg-destructive hover:bg-destructive text-white"
                      onClick={handleDelete}
                      disabled={deleting}
                    >
                      {deleting
                        ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Deleting…</>
                        : `Yes, delete ${selected.size} record${selected.size > 1 ? 's' : ''}`
                      }
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {someChecked
                      ? `${selected.size} of ${importedClients.length} selected`
                      : 'Select records above to delete them'
                    }
                  </p>
                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={() => handleClose(false)}>
                      Close
                    </Button>
                    <Button
                      size="sm"
                      className="bg-destructive hover:bg-destructive text-white"
                      disabled={!someChecked}
                      onClick={() => setConfirming(true)}
                    >
                      <Trash2 className="w-4 h-4 mr-1.5" />
                      Delete Selected ({selected.size})
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}