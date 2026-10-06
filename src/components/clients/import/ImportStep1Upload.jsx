import React, { useRef, useState } from 'react';
import { FileText, AlertCircle } from 'lucide-react';

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row.');

  // Parse a single CSV line respecting quoted fields
  const parseLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(line => {
    const vals = parseLine(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] ?? ''; });
    return obj;
  }).filter(row => Object.values(row).some(v => v !== ''));

  return { headers, rows };
}

export default function ImportStep1Upload({ onParsed }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFile = async (file) => {
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a .csv file.');
      return;
    }
    setLoading(true);
    setError('');
    const text = await file.text();
    try {
      const { headers, rows } = parseCSV(text);
      onParsed({ headers, rows, fileName: file.name });
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  return (
    <div className="space-y-6 py-4">
      <div className="text-center">
        <h3 className="text-base font-bold text-foreground">Upload your client CSV</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Export your clients from any platform (e.g. TrueCoach, PT Distinction, Google Sheets) and upload here.
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
          dragging ? 'border-primary bg-accent' : 'border-border hover:border-primary hover:bg-muted'
        }`}
      >
        <FileText className="w-10 h-10 text-border mx-auto mb-3" />
        <p className="text-sm font-semibold text-muted-foreground">
          {loading ? 'Parsing…' : 'Drop your CSV here, or click to browse'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">.csv files only</p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={e => handleFile(e.target.files[0])}
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="bg-muted rounded-xl p-4 text-xs text-muted-foreground space-y-1">
        <p className="font-semibold text-foreground mb-2">Tips for best results</p>
        <p>• Include a header row with column names</p>
        <p>• Add an "Email" column — it's used to detect duplicates</p>
        <p>• Columns that can't be mapped are stored in client notes, not dropped</p>
        <p>• Nothing is saved until you confirm the import on the next steps</p>
      </div>
    </div>
  );
}