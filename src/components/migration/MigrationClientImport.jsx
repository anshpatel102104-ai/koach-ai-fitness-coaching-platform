import React, { useState, useRef } from 'react';
import { Upload, FileText, X, CheckCircle2, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { db } from '@/api/supabaseClient';
import { toast } from 'sonner';

function parseCSV(text) {
  const lines = text.trim().split('\n').filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/["']/g, ''));
  return lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim().replace(/["']/g, ''));
    const row = {};
    headers.forEach((h, i) => { row[h] = vals[i] || ''; });
    return row;
  }).filter(r => r.name || r['full name'] || r.email);
}

function normalizeClient(row) {
  return {
    name: row.name || row['full name'] || row['full_name'] || '',
    email: row.email || row['e-mail'] || '',
    phone: row.phone || row['phone number'] || row.mobile || '',
    goal: 'general_fitness',
    lifecycle_status: 'active',
    status: 'active',
  };
}

const SAMPLE_CSV = `name,email,phone
Sarah Johnson,sarah@example.com,555-0101
Mike Chen,mike@example.com,555-0102
Emma Davis,emma@example.com,555-0103`;

export default function MigrationClientImport({ onComplete, onSkip }) {
  const [parsed, setParsed] = useState(null);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState(null);
  const [showPreview, setShowPreview] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();

  const handleFile = (file) => {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const rows = parseCSV(e.target.result);
      setParsed(rows.map(normalizeClient).filter(c => c.name));
    };
    reader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const doImport = async () => {
    setImporting(true);
    const ok = [], fail = [];
    for (const client of parsed) {
      try {
        await db.entities.Client.create(client);
        ok.push(client);
      } catch {
        fail.push(client);
      }
    }
    setResults({ ok, fail });
    setImporting(false);
    if (ok.length > 0) toast.success(`${ok.length} clients imported!`);
    onComplete(ok);
  };

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'sample_clients.csv';
    a.click();
  };

  if (results) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 bg-success/10 border border-success rounded-xl">
          <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
          <div>
            <p className="font-semibold text-success text-sm">{results.ok.length} clients imported</p>
            {results.fail.length > 0 && <p className="text-xs text-success mt-0.5">{results.fail.length} failed (duplicate emails)</p>}
          </div>
        </div>
        <button onClick={() => onComplete(results.ok)} className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">
          Continue to Workouts →
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Drop zone */}
      {!parsed ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={cn(
            'border-2 border-dashed rounded-2xl px-6 py-10 flex flex-col items-center text-center cursor-pointer transition-all',
            dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-secondary/20'
          )}
        >
          <Upload className={cn('w-10 h-10 mb-3', dragOver ? 'text-primary' : 'text-muted-foreground')} />
          <p className="font-semibold text-foreground">Drop your CSV here</p>
          <p className="text-xs text-muted-foreground mt-1">or click to browse — needs <code className="bg-secondary px-1 rounded">name</code> and <code className="bg-secondary px-1 rounded">email</code> columns</p>
          <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={e => handleFile(e.target.files[0])} />
        </div>
      ) : (
        <div className="border border-success bg-success/10 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-success" />
              <span className="text-sm font-semibold text-success">{fileName}</span>
              <span className="text-xs text-success">· {parsed.length} clients found</span>
            </div>
            <button onClick={() => { setParsed(null); setFileName(''); }} className="text-muted-foreground hover:text-destructive transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Preview */}
      {parsed?.length > 0 && (
        <div>
          <button
            onClick={() => setShowPreview(s => !s)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2 transition-colors"
          >
            {showPreview ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            Preview ({parsed.length} rows)
          </button>
          {showPreview && (
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="grid grid-cols-3 bg-secondary/50 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <span>Name</span><span>Email</span><span>Phone</span>
              </div>
              <div className="divide-y divide-border max-h-48 overflow-y-auto">
                {parsed.slice(0, 20).map((c, i) => (
                  <div key={i} className="grid grid-cols-3 px-4 py-2.5 text-sm hover:bg-secondary/20">
                    <span className="font-medium text-foreground truncate">{c.name}</span>
                    <span className="text-muted-foreground truncate">{c.email}</span>
                    <span className="text-muted-foreground truncate">{c.phone}</span>
                  </div>
                ))}
                {parsed.length > 20 && (
                  <div className="px-4 py-2 text-xs text-muted-foreground text-center">+{parsed.length - 20} more</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sample download */}
      <div className="flex items-center gap-2 p-3 bg-secondary/40 rounded-xl">
        <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
        <p className="text-xs text-muted-foreground flex-1">Need a template? Download our sample CSV</p>
        <button onClick={downloadSample} className="text-xs text-primary font-semibold hover:underline">Download</button>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={onSkip} className="flex-1 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors">
          Skip this step
        </button>
        {parsed?.length > 0 && (
          <button
            onClick={doImport}
            disabled={importing}
            className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {importing ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Importing...</>
            ) : (
              <><Users className="w-4 h-4" /> Import {parsed.length} Clients</>
            )}
          </button>
        )}
      </div>
    </div>
  );
}