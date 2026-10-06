import React from 'react';
import { CheckCircle2, AlertTriangle, SkipForward, Flag } from 'lucide-react';

export default function ImportStep4Complete({ imported, skipped, flagged, errorLog = [], onDone }) {
  return (
    <div className="text-center space-y-6 py-4">
      <div
        className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto"
      >
        <CheckCircle2 className="w-8 h-8 text-success" />
      </div>

      <div>
        <h3 className="text-lg font-bold text-foreground">Import complete</h3>
        <p className="text-sm text-muted-foreground mt-1">Your clients have been added to KOACH AI.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-success/10 border border-success rounded-xl p-4">
          <CheckCircle2 className="w-5 h-5 text-success mx-auto mb-1" />
          <p className="text-2xl font-bold text-success">{imported}</p>
          <p className="text-xs text-success font-medium">Imported</p>
        </div>
        <div className="bg-warning/10 border border-warning rounded-xl p-4">
          <SkipForward className="w-5 h-5 text-warning mx-auto mb-1" />
          <p className="text-2xl font-bold text-warning">{skipped}</p>
          <p className="text-xs text-warning font-medium">Skipped</p>
          <p className="text-[11px] text-warning mt-0.5">duplicates</p>
        </div>
        <div className="bg-destructive/10 border border-destructive rounded-xl p-4">
          <Flag className="w-5 h-5 text-destructive mx-auto mb-1" />
          <p className="text-2xl font-bold text-destructive">{flagged}</p>
          <p className="text-xs text-destructive font-medium">Flagged</p>
          <p className="text-[11px] text-destructive mt-0.5">review manually</p>
        </div>
      </div>

      {errorLog.length > 0 && (
        <div className="text-left bg-muted border border-border rounded-xl p-4 space-y-1 max-h-36 overflow-y-auto">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            <p className="text-xs font-semibold text-foreground">Issues to review</p>
          </div>
          {errorLog.map((e, i) => (
            <p key={i} className="text-xs text-muted-foreground font-mono">{e}</p>
          ))}
        </div>
      )}

      <div className="text-xs text-muted-foreground space-y-1">
        {skipped > 0 && <p>Skipped clients already existed by email address.</p>}
        {flagged > 0 && <p>Flagged clients had errors — check your Clients list and edit manually.</p>}
      </div>

      <button
        onClick={onDone}
        className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
      >
        View clients
      </button>
    </div>
  );
}