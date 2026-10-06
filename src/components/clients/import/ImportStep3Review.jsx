import React, { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';

const PREVIEW_COUNT = 10;

// Same normalization as commit function for display purposes
function getPreviewValue(row, koachField, mapping) {
  const reverseMap = {};
  Object.entries(mapping).forEach(([csv, kf]) => { if (kf) reverseMap[kf] = csv; });
  const col = reverseMap[koachField];
  return col ? (row[col] ?? '') : '';
}

export default function ImportStep3Review({ headers, rows, mapping, existingEmails = [] }) {
  const existingSet = useMemo(() => new Set(existingEmails.map(e => e.toLowerCase())), [existingEmails]);

  const preview = rows.slice(0, PREVIEW_COUNT);

  // Mapped fields to show as columns (only mapped ones)
  const reverseMap = {};
  Object.entries(mapping).forEach(([csv, kf]) => { if (kf) reverseMap[kf] = csv; });

  const DISPLAY_FIELDS = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'status', label: 'Status' },
    { key: 'start_date', label: 'Start date' },
    { key: 'tags', label: 'Tags' },
  ].filter(f => reverseMap[f.key]);

  // Count duplicates across all rows
  const dupCount = rows.filter(row => {
    const emailCol = reverseMap['email'];
    const email = emailCol ? (row[emailCol] || '').toLowerCase() : '';
    return email && existingSet.has(email);
  }).length;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[18px] text-foreground">Preview import</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Showing first {Math.min(PREVIEW_COUNT, rows.length)} of {rows.length} clients.
            Review before confirming.
          </p>
        </div>
        <div className="flex flex-col gap-1 text-right flex-shrink-0">
          <span className="text-xs font-semibold text-foreground">{rows.length} total</span>
          {dupCount > 0 && (
            <span className="text-xs text-warning font-medium">{dupCount} duplicates (will skip)</span>
          )}
        </div>
      </div>

      {dupCount > 0 && (
        <div className="flex items-center gap-2 text-xs text-warning bg-warning/10 border border-warning rounded-xl px-3 py-2.5">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{dupCount} client{dupCount !== 1 ? 's' : ''} already exist by email and will be skipped automatically.</span>
        </div>
      )}

      {/* Preview table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted border-b border-border">
                <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground whitespace-nowrap">#</th>
                {DISPLAY_FIELDS.map(f => (
                  <th key={f.key} className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground whitespace-nowrap">
                    {f.label}
                  </th>
                ))}
                <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-muted">
              {preview.map((row, idx) => {
                const emailCol = reverseMap['email'];
                const email = emailCol ? (row[emailCol] || '').toLowerCase() : '';
                const isDuplicate = email && existingSet.has(email);

                return (
                  <tr
                    key={idx}
                    className={`${isDuplicate ? 'opacity-50 bg-warning/30' : 'hover:bg-muted/50'}`}
                  >
                    <td className="px-3 py-2 text-muted-foreground font-mono">{idx + 1}</td>
                    {DISPLAY_FIELDS.map(f => {
                      const col = reverseMap[f.key];
                      const val = col ? (row[col] || '') : '';
                      return (
                        <td key={f.key} className="px-3 py-2 text-foreground max-w-[140px] truncate" title={val}>
                          {val}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2">
                      {isDuplicate ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning/10 text-warning text-[11px] font-semibold border border-warning whitespace-nowrap">
                          Skip (dup)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/10 text-success text-[11px] font-semibold border border-success whitespace-nowrap">
                          Import
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {rows.length > PREVIEW_COUNT && (
          <div className="px-4 py-2 bg-muted border-t border-border text-xs text-muted-foreground text-center">
            + {rows.length - PREVIEW_COUNT} more clients not shown in preview
          </div>
        )}
      </div>
    </div>
  );
}