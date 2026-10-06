import React from 'react';
import { CheckCircle2, AlertTriangle, HelpCircle, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CONFIDENCE_CONFIG = {
  high:     { icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10', label: 'High' },
  medium:   { icon: AlertTriangle, color: 'text-warning',  bg: 'bg-warning/10',   label: 'Medium' },
  low:      { icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning-soft',  label: 'Low' },
  unmapped: { icon: HelpCircle,    color: 'text-muted-foreground',   bg: 'bg-muted',   label: 'Unmapped' },
};

export default function ImportStep2Mapping({ headers, mapping, confidence, koachFields, onMappingChange, aiLoading }) {
  if (aiLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm font-semibold text-foreground">AI is analyzing your columns…</p>
        <p className="text-xs text-muted-foreground">This takes a few seconds</p>
      </div>
    );
  }

  // __last_name__ is a special sentinel meaning "merged into name" — don't count as a used field
  const usedFields = new Set(Object.values(mapping).filter(f => f && f !== '__last_name__'));

  const mappedCount =
    Object.values(mapping).filter(f => f && f !== '__last_name__').length +
    (Object.values(mapping).includes('__last_name__') ? 1 : 0);
  const unmappedCount = headers.length - mappedCount;

  return (
    // No fixed height or overflow here — the parent modal body owns scrolling
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-[18px] text-foreground">Review AI column mapping</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          The AI has proposed a mapping for each column. Adjust any incorrect mappings using the dropdowns.
          Unmapped columns will be stored in client notes.
        </p>
      </div>

      {/* Summary stat */}
      <p className="text-xs text-muted-foreground">
        {mappedCount} of {headers.length} columns mapped
        {unmappedCount > 0
          ? ` · ${unmappedCount} will be stored in notes`
          : ' · all columns mapped '}
      </p>

      {/* Mapping table */}
      <div className="border border-border rounded-xl overflow-hidden">
        {/* Table header */}
        <div className="grid gap-3 px-4 py-2 bg-muted border-b border-border text-xs font-semibold text-muted-foreground"
          style={{ gridTemplateColumns: '1fr 20px minmax(180px,1.4fr) 90px' }}>
          <div>CSV column</div>
          <div />
          <div>KOACH field</div>
          <div>Confidence</div>
        </div>

        {/* Rows — no max-h here; modal body scrolls */}
        <div className="divide-y divide-muted">
          {headers.map((col) => {
            const mapped = mapping[col] || '';
            const conf   = confidence[col] || 'unmapped';
            const { icon: Icon, color, bg, label } = CONFIDENCE_CONFIG[conf] || CONFIDENCE_CONFIG.unmapped;

            return (
              <div
                key={col}
                className="grid gap-3 items-center px-4 py-2.5"
                style={{ gridTemplateColumns: '1fr 20px minmax(180px,1.4fr) 90px' }}
              >
                {/* CSV column name */}
                <div className="text-sm font-medium text-foreground truncate min-w-0" title={col}>
                  {col}
                </div>

                {/* Arrow */}
                <div className="text-border text-xs text-center">→</div>

                {/* KOACH field — sentinel or dropdown */}
                {mapped === '__last_name__' ? (
                  <div className="h-8 px-3 flex items-center text-xs text-success bg-success/10 border border-success rounded-md whitespace-nowrap overflow-hidden text-ellipsis">
                    Last Name → merged into Name 
                  </div>
                ) : (
                  <Select
                    value={mapped || '__unmapped__'}
                    onValueChange={(val) => onMappingChange(col, val === '__unmapped__' ? null : val)}
                  >
                    <SelectTrigger className="h-8 text-xs w-full">
                      <SelectValue placeholder="Select field…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__unmapped__">
                        <span className="text-muted-foreground italic">Unmapped (→ notes)</span>
                      </SelectItem>
                      {(koachFields || []).map(f => (
                        <SelectItem
                          key={f.key}
                          value={f.key}
                          disabled={usedFields.has(f.key) && mapped !== f.key}
                        >
                          {f.label}
                          {usedFields.has(f.key) && mapped !== f.key && (
                            <span className="text-muted-foreground ml-1 text-[11px]">(taken)</span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {/* Confidence badge */}
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold ${bg} ${color} w-fit`}>
                  <Icon className="w-3 h-3 shrink-0" />
                  <span>{label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}