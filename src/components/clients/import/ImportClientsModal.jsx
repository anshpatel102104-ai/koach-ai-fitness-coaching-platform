import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { supabase as base44 } from '@/api/supabaseClient';
import { toast } from 'sonner';
import ImportStep1Upload from './ImportStep1Upload';
import ImportStep2Mapping from './ImportStep2Mapping';
import ImportStep3Review from './ImportStep3Review';
import ImportStep4Complete from './ImportStep4Complete';

const STEPS = ['Upload', 'Map Columns', 'Review', 'Done'];

export default function ImportClientsModal({ open, onOpenChange, existingEmails = [], onImportComplete }) {
  const [step, setStep] = useState(0);
  const [parsed, setParsed] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [mapping, setMapping] = useState({});
  const [confidence, setConfidence] = useState({});
  const [koachFields, setKoachFields] = useState([]);
  const [committing, setCommitting] = useState(false);
  const [result, setResult] = useState(null);

  const reset = () => {
    setStep(0); setParsed(null); setJobId(null); setAiLoading(false);
    setMapping({}); setConfidence({}); setKoachFields([]);
    setCommitting(false); setResult(null);
  };

  const handleClose = (v) => { if (!v) reset(); onOpenChange(v); };

  const handleParsed = useCallback(async ({ headers, rows, fileName }) => {
    setParsed({ headers, rows, fileName });
    setStep(1);
    setAiLoading(true);
    try {
      const coach = await base44.auth.me(); // coach_id is uuid (profiles.id), not the literal 'me'
      const job = await base44.entities.ClientImportJob.create({
        coach_id: coach.id, status: 'pending', file_name: fileName,
        headers, sample_rows: rows.slice(0, 5), all_rows: rows, total_rows: rows.length,
      });
      setJobId(job.id);

      const res = await base44.functions.invoke('mapImportColumns', {
        headers, sample_rows: rows.slice(0, 5),
      });

      setMapping(res.data.mapping || {});
      setConfidence(res.data.confidence || {});
      setKoachFields(res.data.koach_fields || []);

      await base44.entities.ClientImportJob.update(job.id, {
        status: 'mapped',
        column_mapping: res.data.mapping || {},
        mapping_confidence: res.data.confidence || {},
      });
    } catch (e) {
      toast.error('AI mapping failed: ' + e.message);
    }
    setAiLoading(false);
  }, []);

  const handleMappingChange = (csvCol, koachField) => {
    setMapping(prev => ({ ...prev, [csvCol]: koachField }));
    if (koachField) {
      setConfidence(prev => ({ ...prev, [csvCol]: prev[csvCol] === 'unmapped' ? 'medium' : prev[csvCol] }));
    } else {
      setConfidence(prev => ({ ...prev, [csvCol]: 'unmapped' }));
    }
  };

  const handleMappingConfirm = async () => {
    if (jobId) {
      await base44.entities.ClientImportJob.update(jobId, {
        column_mapping: mapping, mapping_confidence: confidence,
      });
    }
    setStep(2);
  };

  const handleConfirmImport = async () => {
    setCommitting(true);
    try {
      if (jobId) await base44.entities.ClientImportJob.update(jobId, { status: 'confirmed' });
      const res = await base44.functions.invoke('commitClientImport', { job_id: jobId });
      if (res.data?.error) throw new Error(res.data.error);
      setResult(res.data);
      setStep(3);
      onImportComplete?.();
    } catch (e) {
      toast.error('Import failed: ' + e.message);
    }
    setCommitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      {/*
        DialogContent is just a shell (p-0, no gap, overflow-hidden).
        The inner div is the true three-region flex container.
        We use inline styles exclusively so nothing from shadcn or Tailwind can override.
        height+maxHeight on the inner div means it fills up to 85dvh, and the
        flex: '1 1 0' + minHeight: 0 body region is what makes the middle scroll
        instead of pushing the footer off-screen.
      */}
      <DialogContent className="max-w-2xl w-full p-0 gap-0 overflow-hidden">
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          height: '85dvh',
          maxHeight: '85dvh',
          overflow: 'hidden',
        }}>

          {/* ── REGION 1: HEADER — fixed, never scrolls ── */}
          <div style={{ flexShrink: 0 }} className="px-6 py-4 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                {step > 0 && step < 3 && (
                  <button
                    onClick={() => setStep(s => s - 1)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    disabled={committing}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                )}
                <DialogTitle className="text-base font-bold text-foreground">
                  Import Clients from CSV
                </DialogTitle>
              </div>
              <span className="text-xs text-muted-foreground font-medium">
                Step {step + 1} of {STEPS.length}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {STEPS.map((s, i) => (
                <React.Fragment key={s}>
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                    i === step ? 'bg-accent text-primary'
                    : i < step ? 'bg-success/10 text-success'
                    : 'bg-muted text-muted-foreground'
                  }`}>
                    <span>{i < step ? '✓' : i + 1}</span>
                    <span className="hidden sm:inline">{s}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`flex-1 h-px ${i < step ? 'bg-success' : 'bg-muted'}`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* ── REGION 2: BODY — takes remaining space, scrolls vertically ── */}
          <div style={{ flex: '1 1 0', minHeight: 0, overflowY: 'auto' }} className="px-6 py-4">
            {step === 0 && <ImportStep1Upload onParsed={handleParsed} />}
            {step === 1 && (
              <ImportStep2Mapping
                headers={parsed?.headers || []}
                mapping={mapping}
                confidence={confidence}
                koachFields={koachFields}
                onMappingChange={handleMappingChange}
                aiLoading={aiLoading}
              />
            )}
            {step === 2 && (
              <ImportStep3Review
                headers={parsed?.headers || []}
                rows={parsed?.rows || []}
                mapping={mapping}
                existingEmails={existingEmails}
              />
            )}
            {step === 3 && result && (
              <ImportStep4Complete
                imported={result.imported}
                skipped={result.skipped}
                flagged={result.flagged}
                errorLog={result.error_log || []}
                onDone={() => handleClose(false)}
              />
            )}
          </div>

          {/* ── REGION 3: FOOTER — fixed, always visible ── */}
          {step < 3 && (
            <div style={{ flexShrink: 0 }} className="px-6 py-4 border-t border-border flex items-center justify-between">
              <div>
                {step === 1 && !aiLoading && (
                  <p className="text-xs text-muted-foreground">
                    {parsed?.rows?.length || 0} rows · {parsed?.headers?.length || 0} columns
                  </p>
                )}
                {step === 2 && (
                  <p className="text-xs text-muted-foreground">
                    {parsed?.rows?.length || 0} clients ready to import
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                {step === 1 && !aiLoading && (
                  <Button onClick={handleMappingConfirm} size="sm">
                    Continue to Review →
                  </Button>
                )}
                {step === 2 && (
                  <Button
                    onClick={handleConfirmImport}
                    disabled={committing}
                    size="sm"
                    className="bg-success hover:bg-success text-white"
                  >
                    {committing
                      ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Importing…</>
                      : '✓ Confirm Import'
                    }
                  </Button>
                )}
              </div>
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}