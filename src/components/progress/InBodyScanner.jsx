import React, { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, ArrowLeftRight, ScanLine, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

// ── Circular progress ring for InBody score ──
function ScoreRing({ score }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(score / 100, 1);
  const color = score >= 80 ? 'var(--tc-success)' : score >= 60 ? 'var(--tc-warning)' : 'var(--tc-destructive)';
  return (
    <div className="relative w-16 h-16 flex items-center justify-center">
      <svg width="64" height="64" className="-rotate-90">
        <circle cx="32" cy="32" r={r} strokeWidth="5" stroke="var(--tc-border)" fill="none" />
        <circle cx="32" cy="32" r={r} strokeWidth="5" stroke={color} fill="none"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <span className="absolute text-sm font-bold" style={{ color }}>{score}</span>
    </div>
  );
}

// ── BMI bar ──
function BMIBar({ bmi }) {
  const clamp = Math.min(Math.max(bmi, 15), 40);
  const pct = ((clamp - 15) / 25) * 100;
  const label = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese';
  const color = bmi < 18.5 ? 'var(--tc-primary)' : bmi < 25 ? 'var(--tc-success)' : bmi < 30 ? 'var(--tc-warning)' : 'var(--tc-destructive)';
  return (
    <div>
      <div className="flex justify-between text-xs text-muted-foreground mb-1">
        <span>15</span><span className="font-medium" style={{ color }}>{label}</span><span>40</span>
      </div>
      <div className="h-2 bg-border rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <p className="text-center text-xs text-muted-foreground mt-0.5">BMI: {bmi}</p>
    </div>
  );
}

// ── Segmental body diagram ──
function SegmentalDiagram({ data }) {
  const segments = [
    { label: 'R Arm', muscle: data.right_arm_muscle, fat: data.right_arm_fat, pos: 'top-0 left-1' },
    { label: 'L Arm', muscle: data.left_arm_muscle, fat: data.left_arm_fat, pos: 'top-0 right-1' },
    { label: 'Trunk', muscle: data.trunk_muscle, fat: data.trunk_fat, pos: 'top-1/3 left-1/2 -translate-x-1/2' },
    { label: 'R Leg', muscle: data.right_leg_muscle, fat: data.right_leg_fat, pos: 'bottom-0 left-4' },
    { label: 'L Leg', muscle: data.left_leg_muscle, fat: data.left_leg_fat, pos: 'bottom-0 right-4' },
  ];

  const hasAny = segments.some(s => s.muscle != null);
  if (!hasAny) return null;

  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Segmental Analysis</p>
      <div className="grid grid-cols-5 gap-2">
        {segments.map(seg => {
          if (seg.muscle == null) return null;
          return (
            <div key={seg.label} className="flex flex-col items-center gap-1 bg-background rounded-lg p-2 text-center">
              <p className="text-[9px] text-muted-foreground font-semibold uppercase">{seg.label}</p>
              <p className="text-sm font-bold text-foreground">{seg.muscle} <span className="text-[9px] font-normal text-muted-foreground">lbs</span></p>
              {seg.fat != null && <p className="text-[10px] text-warning">Fat: {seg.fat}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Results display card ──
function ScanResults({ results, onSave, clients, preselectedClientId, saving, saved }) {
  const [clientId, setClientId] = useState(preselectedClientId || '');

  const metricRow = (label, value, unit, color) => {
    if (value == null) return null;
    return (
      <div className="flex items-center justify-between py-2 border-b border-muted last:border-0">
        <span className="text-sm text-foreground">{label}</span>
        <span className="text-sm font-semibold" style={{ color: color || 'var(--tc-foreground)' }}>
          {value}{unit}
        </span>
      </div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {results.raw_text && (
        <div className="bg-muted border border-accent rounded-lg p-3 text-xs text-primary">
          🤖 {results.raw_text}
        </div>
      )}

      {/* Body Composition */}
      <div className="bg-card border border-border rounded-xl p-4">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Body Composition</p>
        {metricRow('Weight', results.weight_lbs, ' lbs')}
        {metricRow('Body Fat %', results.body_fat_percent, '%',
          results.body_fat_percent > 25 ? 'var(--tc-destructive)' : results.body_fat_percent > 20 ? 'var(--tc-warning)' : 'var(--tc-success)')}
        {metricRow('Fat Mass', results.fat_mass_lbs, ' lbs')}
        {metricRow('Lean Mass', results.lean_mass_lbs, ' lbs', 'var(--tc-success)')}
        {metricRow('Muscle Mass', results.muscle_mass_lbs, ' lbs', 'var(--tc-primary)')}
        {metricRow('Total Body Water', results.total_body_water, ' L')}
      </div>

      {/* Segmental */}
      {(results.right_arm_muscle || results.trunk_muscle) && (
        <div className="bg-card border border-border rounded-xl p-4">
          <SegmentalDiagram data={results} />
        </div>
      )}

      {/* Health Indicators */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-4">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Health Indicators</p>
        <div className="grid grid-cols-2 gap-4">
          {results.inbody_score != null && (
            <div className="flex flex-col items-center gap-1">
              <ScoreRing score={results.inbody_score} />
              <p className="text-xs text-muted-foreground">InBody Score</p>
            </div>
          )}
          {results.bmr != null && (
            <div className="flex flex-col items-center justify-center gap-1">
              <p className="text-2xl font-bold text-foreground">{results.bmr}</p>
              <p className="text-xs text-muted-foreground">BMR (kcal/day)</p>
            </div>
          )}
          {results.visceral_fat_level != null && (
            <div className="flex flex-col items-center justify-center gap-1">
              <p className="text-2xl font-bold"
                style={{ color: results.visceral_fat_level < 10 ? 'var(--tc-success)' : results.visceral_fat_level < 15 ? 'var(--tc-warning)' : 'var(--tc-destructive)' }}>
                {results.visceral_fat_level}
              </p>
              <p className="text-xs text-muted-foreground">Visceral Fat</p>
            </div>
          )}
        </div>
        {results.bmi != null && <BMIBar bmi={results.bmi} />}
      </div>

      {/* Save */}
      <div className="bg-muted border border-accent rounded-xl p-4 space-y-3">
        <p className="text-sm font-semibold text-foreground">Save to client profile</p>
        <Select value={clientId} onValueChange={setClientId}>
          <SelectTrigger className="h-9"><SelectValue placeholder="Select client" /></SelectTrigger>
          <SelectContent>
            {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {saved ? (
          <div className="flex items-center gap-2 text-success text-sm font-medium">
            <CheckCircle2 className="w-4 h-4" /> Scan saved! Progress charts updated.
          </div>
        ) : (
          <Button
            className="w-full bg-primary text-primary-foreground hover:bg-primary"
            disabled={!clientId || saving}
            onClick={() => onSave(clientId)}
          >
            {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving...</> : `Save to Profile`}
          </Button>
        )}
      </div>
    </motion.div>
  );
}

// ── Scan history row ──
function ScanHistoryItem({ scan, onSelect, selected }) {
  return (
    <button
      onClick={() => onSelect(scan)}
      className={cn(
        'w-full text-left px-3 py-2.5 rounded-lg border transition-all',
        selected ? 'bg-accent/10 border-accent' : 'bg-card border-border hover:border-primary'
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">{format(new Date(scan.scan_date), 'MMM d, yyyy')}</p>
        {scan.inbody_score && <span className="text-xs font-bold text-primary">Score: {scan.inbody_score}</span>}
      </div>
      <div className="flex gap-3 mt-0.5">
        {scan.weight_lbs && <span className="text-xs text-muted-foreground">{scan.weight_lbs} lbs</span>}
        {scan.body_fat_percent && <span className="text-xs text-muted-foreground">{scan.body_fat_percent}% BF</span>}
        {scan.muscle_mass_lbs && <span className="text-xs text-muted-foreground">{scan.muscle_mass_lbs} lbs muscle</span>}
      </div>
    </button>
  );
}

// ── Main component ──
export default function InBodyScanner({ preselectedClient, onScanSaved }) {
  const [dragOver, setDragOver] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState(null);
  const [results, setResults] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [compareMode, setCompareMode] = useState(false);
  const [comparePair, setComparePair] = useState([null, null]);
  const fileInputRef = useRef();
  const queryClient = useQueryClient();

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => db.entities.Client.list('name'),
  });

  const { data: scanHistory = [] } = useQuery({
    queryKey: ['inbody-scans', preselectedClient?.id],
    queryFn: () => preselectedClient
      ? db.entities.InBodyScan.filter({ client_id: preselectedClient.id }, '-scan_date', 50)
      : db.entities.InBodyScan.list('-scan_date', 50),
    enabled: true,
  });

  const activeClients = clients.filter(c => c.status === 'active');

  const toBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const parseFile = async (file) => {
    setParsing(true);
    setParseError(null);
    setResults(null);
    setSaved(false);
    try {
      // For PDFs, we need to upload and use URL; for images use base64
      let messageContent;
      const isImage = file.type.startsWith('image/');

      if (isImage) {
        const base64Data = await toBase64(file);
        messageContent = [
          {
            type: 'image',
            source: { type: 'base64', media_type: file.type, data: base64Data },
          },
          {
            type: 'text',
            text: `Extract all metrics from this InBody scan and return ONLY a JSON object with no markdown:
{
  "scan_date": "YYYY-MM-DD or null",
  "weight_lbs": number or null,
  "weight_kg": number or null,
  "body_fat_percent": number or null,
  "fat_mass_lbs": number or null,
  "lean_mass_lbs": number or null,
  "muscle_mass_lbs": number or null,
  "bmi": number or null,
  "bmr": number or null,
  "visceral_fat_level": number or null,
  "total_body_water": number or null,
  "protein_kg": number or null,
  "minerals_kg": number or null,
  "right_arm_muscle": number or null,
  "left_arm_muscle": number or null,
  "trunk_muscle": number or null,
  "right_leg_muscle": number or null,
  "left_leg_muscle": number or null,
  "right_arm_fat": number or null,
  "left_arm_fat": number or null,
  "trunk_fat": number or null,
  "right_leg_fat": number or null,
  "left_leg_fat": number or null,
  "inbody_score": number or null,
  "raw_text": "brief summary of what was found"
}
Return null for any field not found in the scan.`,
          },
        ];
      } else {
        // PDF — upload first then describe via text
        const { file_url } = await db.uploadFile({ file });
        messageContent = [
          {
            type: 'text',
            text: `I have uploaded an InBody scan PDF. The file is at: ${file_url}
Please extract all metrics and return ONLY this JSON with no markdown:
{
  "scan_date": "YYYY-MM-DD or null",
  "weight_lbs": null,
  "body_fat_percent": null,
  "fat_mass_lbs": null,
  "lean_mass_lbs": null,
  "muscle_mass_lbs": null,
  "bmi": null,
  "bmr": null,
  "visceral_fat_level": null,
  "total_body_water": null,
  "inbody_score": null,
  "right_arm_muscle": null,
  "left_arm_muscle": null,
  "trunk_muscle": null,
  "right_leg_muscle": null,
  "left_leg_muscle": null,
  "raw_text": "Unable to parse PDF directly — please upload a photo/screenshot of the InBody scan for best results."
}`,
          },
        ];
      }

      // Vision extraction runs server-side (aiInBodyScan Edge Function); the
      // ANTHROPIC_API_KEY never reaches the browser.
      let extracted;
      if (isImage) {
        const { file_url: uploadedUrl } = await db.uploadFile({ file });
        const res = await db.functions.invoke('aiInBodyScan', { fileUrl: uploadedUrl });
        extracted = res.data;
      } else {
        // PDF fallback
        extracted = {
          raw_text: 'PDF detected — please upload a photo or screenshot of your InBody scan for full AI extraction.',
        };
      }
      setResults(extracted);
    } catch (err) {
      setParseError(err.message || 'Failed to parse scan. Please try again.');
    } finally {
      setParsing(false);
    }
  };

  const handleFile = (file) => {
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      setParseError('Please upload a JPG, PNG, or PDF file.');
      return;
    }
    parseFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleSave = async (clientId) => {
    if (!results || !clientId) return;
    setSaving(true);
    try {
      const client = activeClients.find(c => c.id === clientId);
      const scanDate = results.scan_date || format(new Date(), 'yyyy-MM-dd');
      await db.entities.InBodyScan.create({
        client_id: clientId,
        client_name: client?.name || '',
        scan_date: scanDate,
        weight_lbs: results.weight_lbs,
        body_fat_percent: results.body_fat_percent,
        fat_mass_lbs: results.fat_mass_lbs,
        lean_mass_lbs: results.lean_mass_lbs,
        muscle_mass_lbs: results.muscle_mass_lbs,
        bmi: results.bmi,
        bmr: results.bmr,
        visceral_fat_level: results.visceral_fat_level,
        total_body_water: results.total_body_water,
        protein_kg: results.protein_kg,
        minerals_kg: results.minerals_kg,
        inbody_score: results.inbody_score,
        right_arm_muscle: results.right_arm_muscle,
        left_arm_muscle: results.left_arm_muscle,
        trunk_muscle: results.trunk_muscle,
        right_leg_muscle: results.right_leg_muscle,
        left_leg_muscle: results.left_leg_muscle,
        right_arm_fat: results.right_arm_fat,
        left_arm_fat: results.left_arm_fat,
        trunk_fat: results.trunk_fat,
        right_leg_fat: results.right_leg_fat,
        left_leg_fat: results.left_leg_fat,
        notes: results.raw_text,
      });
      // Also create a CheckIn to populate progress charts
      if (results.weight_lbs || results.body_fat_percent) {
        await db.entities.CheckIn.create({
          client_id: clientId,
          client_name: client?.name || '',
          date: scanDate,
          weight: results.weight_lbs,
          body_fat_pct: results.body_fat_percent,
          notes: `InBody scan: ${results.raw_text || ''}`,
        });
      }
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ['inbody-scans'] });
      queryClient.invalidateQueries({ queryKey: ['checkins'] });
      onScanSaved?.();
    } catch (err) {
      setParseError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCompareSelect = (scan) => {
    const [a, b] = comparePair;
    if (!a) { setComparePair([scan, null]); return; }
    if (!b && scan.id !== a.id) { setComparePair([a, scan]); return; }
    setComparePair([scan, null]);
  };

  const compareField = (label, field, unit = '') => {
    const [a, b] = comparePair;
    if (!a || !b) return null;
    const va = a[field]; const vb = b[field];
    if (va == null && vb == null) return null;
    const diff = va != null && vb != null ? (vb - va).toFixed(1) : null;
    const diffColor = diff === null ? '' : Number(diff) < 0 ? 'var(--tc-success)' : Number(diff) > 0 ? 'var(--tc-destructive)' : 'var(--tc-muted-foreground)';
    return (
      <div key={label} className="flex items-center justify-between py-1.5 border-b border-muted last:border-0 text-sm">
        <span className="text-muted-foreground w-28">{label}</span>
        <span className="font-medium text-foreground w-16 text-right">{va != null ? `${va}${unit}` : '—'}</span>
        {diff !== null && <span className="w-14 text-right font-semibold text-xs" style={{ color: diffColor }}>{Number(diff) >= 0 ? '+' : ''}{diff}{unit}</span>}
        <span className="font-medium text-foreground w-16 text-right">{vb != null ? `${vb}${unit}` : '—'}</span>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Upload zone */}
      <div
        className={cn(
          'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all',
          dragOver ? 'border-primary bg-accent/10' : 'border-muted-foreground hover:border-primary hover:bg-muted'
        )}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
          onChange={e => handleFile(e.target.files[0])} />
        <ScanLine className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
        <p className="font-medium text-foreground">Drop InBody scan here or click to upload</p>
        <p className="text-xs text-muted-foreground mt-1">Accepts: PDF, JPG, PNG</p>
      </div>

      {/* Parsing state */}
      <AnimatePresence>
        {parsing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex items-center gap-3 bg-muted border border-accent rounded-xl p-4">
            <Loader2 className="w-5 h-5 animate-spin text-primary flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-primary">🤖 AI is reading your scan...</p>
              <p className="text-xs text-muted-foreground mt-0.5">Extracting all metrics automatically</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      {parseError && (
        <div className="flex items-start gap-2 bg-destructive/10 border border-destructive rounded-xl p-4 text-sm text-destructive">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {parseError}
        </div>
      )}

      {/* Results */}
      <AnimatePresence>
        {results && !parsing && (
          <ScanResults
            results={results}
            clients={activeClients}
            preselectedClientId={preselectedClient?.id}
            onSave={handleSave}
            saving={saving}
            saved={saved}
          />
        )}
      </AnimatePresence>

      {/* Scan history */}
      {scanHistory.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold text-foreground">Scan History ({scanHistory.length})</p>
            <button
              onClick={() => { setCompareMode(!compareMode); setComparePair([null, null]); }}
              className={cn('flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition-all',
                compareMode ? 'bg-accent/10 text-primary border-accent' : 'bg-card text-muted-foreground border-border hover:border-primary')}
            >
              <ArrowLeftRight className="w-3 h-3" /> Compare
            </button>
          </div>

          <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
            {compareMode && (
              <p className="text-xs text-primary px-1 pb-1">
                {!comparePair[0] ? 'Select first scan' : !comparePair[1] ? 'Select second scan' : 'Comparing scans below ↓'}
              </p>
            )}
            {scanHistory.map(scan => (
              <ScanHistoryItem
                key={scan.id}
                scan={scan}
                selected={compareMode && comparePair.some(p => p?.id === scan.id)}
                onSelect={compareMode ? handleCompareSelect : setSelectedHistory}
              />
            ))}
          </div>

          {/* Compare table */}
          {compareMode && comparePair[0] && comparePair[1] && (
            <div className="border-t border-border p-4">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground mb-2 px-1">
                <span className="w-28">Metric</span>
                <span className="w-16 text-right">{format(new Date(comparePair[0].scan_date), 'MMM d')}</span>
                <span className="w-14 text-right">Change</span>
                <span className="w-16 text-right">{format(new Date(comparePair[1].scan_date), 'MMM d')}</span>
              </div>
              {compareField('Weight', 'weight_lbs', ' lbs')}
              {compareField('Body Fat %', 'body_fat_percent', '%')}
              {compareField('Lean Mass', 'lean_mass_lbs', ' lbs')}
              {compareField('Muscle Mass', 'muscle_mass_lbs', ' lbs')}
              {compareField('InBody Score', 'inbody_score', '')}
              {compareField('BMR', 'bmr', ' kcal')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}