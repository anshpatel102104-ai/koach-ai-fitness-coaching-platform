import React, { useState } from 'react';
import { db } from '@/api/supabaseClient';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';

function ClientPickerSimple({ selected, onChange }) {
  const [search, setSearch] = useState('');
  const { data: clients = [] } = useQuery({
    queryKey: ['clients-picker-pdf'],
    queryFn: () => db.entities.Client.list(),
  });

  const filtered = clients.filter(c => c.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-3">
      <Input placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} className="text-sm" />
      <div className="max-h-40 overflow-y-auto space-y-0.5 pr-1">
        {filtered.map(c => (
          <label key={c.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-secondary cursor-pointer">
            <input
              type="radio"
              name="pdf-client"
              value={c.id}
              checked={selected === c.id}
              onChange={() => onChange(c.id)}
              className="border-input accent-primary"
            />
            <span className="text-sm font-medium text-foreground">{c.name}</span>
          </label>
        ))}
        {filtered.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">No clients found</p>}
      </div>
    </div>
  );
}

export default function UploadPDFModal({ open, onOpenChange, onSubmit }) {
  const [file, setFile] = useState(null);
  const [planName, setPlanName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fats, setFats] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      if (f.type !== 'application/pdf') {
        toast.error('Please select a PDF file');
        return;
      }
      setFile(f);
    }
  };

  const handleSubmit = async () => {
    if (!planName.trim()) {
      toast.error('Plan name is required');
      return;
    }
    if (!file) {
      toast.error('Please upload a PDF file');
      return;
    }
    if (!calories || !protein || !carbs || !fats) {
      toast.error('All macro targets are required');
      return;
    }
    if (!selectedClient) {
      toast.error('Please select a client');
      return;
    }

    setUploading(true);
    try {
      // Upload PDF file
      const uploadResult = await db.uploadFile({ file, scope: 'shared' });
      const pdfUrl = uploadResult.file_url;

      // Create plan
      const planData = {
        title: planName.trim(),
        plan_type: 'pdf',
        pdf_file_url: pdfUrl,
        calories: Number(calories),
        protein_g: Number(protein),
        carbs_g: Number(carbs),
        fats_g: Number(fats),
        status: 'active',
        tracking_mode: 'macros',
        meals: [],
      };

      const savedPlan = await db.entities.NutritionPlan.create(planData);

      // Assign to client
      if (selectedClient) {
        await db.entities.Client.update(selectedClient, { assigned_nutrition_id: savedPlan.id });
      }

      toast.success('PDF plan uploaded and assigned!');
      onSubmit?.(savedPlan);
      onOpenChange(false);
      setFile(null);
      setPlanName('');
      setCalories('');
      setProtein('');
      setCarbs('');
      setFats('');
      setSelectedClient('');
    } catch (err) {
      console.error('PDF upload error:', err);
      toast.error('Failed to upload PDF plan: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col overflow-hidden">
        <SheetHeader className="px-6 py-5 border-b border-border flex-shrink-0">
          <SheetTitle className="font-heading font-bold text-lg">📄 Upload PDF Plan</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Plan name */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground">Plan Name *</Label>
            <Input
              placeholder="e.g. Client PDF Plan - Week 1"
              value={planName}
              onChange={e => setPlanName(e.target.value)}
              className="text-sm"
            />
          </div>

          {/* PDF Upload */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold text-foreground">Upload PDF *</Label>
            <div className="relative">
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
                id="pdf-input"
              />
              <label
                htmlFor="pdf-input"
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors bg-secondary/30"
              >
                <Upload className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">
                  {file ? file.name : 'Click to select PDF'}
                </span>
              </label>
            </div>
            {file && (
              <button
                onClick={() => setFile(null)}
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="w-3.5 h-3.5" /> Remove file
              </button>
            )}
          </div>

          {/* Macro targets */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-foreground">Macro Targets *</p>
            <div className="grid grid-cols-4 gap-2">
              {[
                { field: 'calories', label: 'Calories', unit: 'kcal', val: calories, set: setCalories, color: 'text-orange-600' },
                { field: 'protein', label: 'Protein', unit: 'g', val: protein, set: setProtein, color: 'text-primary' },
                { field: 'carbs', label: 'Carbs', unit: 'g', val: carbs, set: setCarbs, color: 'text-warning' },
                { field: 'fats', label: 'Fats', unit: 'g', val: fats, set: setFats, color: 'text-destructive' },
              ].map(({ field, label, unit, val, set, color }) => (
                <div key={field}>
                  <label className={`text-[10px] font-semibold ${color} block mb-1`}>
                    {label} <span className="font-normal text-muted-foreground">({unit})</span>
                  </label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={val}
                    onChange={e => set(e.target.value)}
                    className="text-center text-sm h-8"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Client assignment */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold text-foreground">Assign to Client *</Label>
            <ClientPickerSimple selected={selectedClient} onChange={setSelectedClient} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-border px-6 py-4 flex items-center justify-end gap-3 bg-background">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={uploading} className="gap-2 min-w-[110px]">
            {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</> : 'Upload Plan'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}