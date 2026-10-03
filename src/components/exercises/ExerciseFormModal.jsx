import React, { useState, useEffect } from 'react';
import { supabase as base44 } from '@/api/supabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Upload, Loader2, Link } from 'lucide-react';

const defaultForm = {
  name: '', muscle_group: 'chest', secondary_muscles: [], equipment: 'barbell',
  movement_pattern: 'push', difficulty: 'intermediate', video_url: '', thumbnail_url: '',
  is_coach_branded: false, form_cues: [], common_mistakes: [], tempo: '',
  default_rest_seconds: 90, description: '', notes: ''
};

export default function ExerciseFormModal({ open, onOpenChange, exercise, onSuccess }) {
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newCue, setNewCue] = useState('');
  const [newMistake, setNewMistake] = useState('');
  const [newMuscle, setNewMuscle] = useState('');

  useEffect(() => {
    setForm(exercise ? { ...defaultForm, ...exercise } : defaultForm);
  }, [exercise, open]);

  const handleVideoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.uploadFile({ file, scope: 'shared' });
    setForm(f => ({ ...f, video_url: file_url }));
    setUploading(false);
  };

  const handleThumbnailUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.uploadFile({ file, scope: 'shared' });
    setForm(f => ({ ...f, thumbnail_url: file_url }));
    setUploading(false);
  };

  const addCue = () => {
    if (!newCue.trim()) return;
    setForm(f => ({ ...f, form_cues: [...(f.form_cues || []), newCue.trim()] }));
    setNewCue('');
  };

  const removeCue = (i) => setForm(f => ({ ...f, form_cues: f.form_cues.filter((_, idx) => idx !== i) }));

  const addMistake = () => {
    if (!newMistake.trim()) return;
    setForm(f => ({ ...f, common_mistakes: [...(f.common_mistakes || []), newMistake.trim()] }));
    setNewMistake('');
  };

  const removeMistake = (i) => setForm(f => ({ ...f, common_mistakes: f.common_mistakes.filter((_, idx) => idx !== i) }));

  const addMuscle = () => {
    if (!newMuscle.trim()) return;
    setForm(f => ({ ...f, secondary_muscles: [...(f.secondary_muscles || []), newMuscle.trim()] }));
    setNewMuscle('');
  };

  const removeMuscle = (i) => setForm(f => ({ ...f, secondary_muscles: f.secondary_muscles.filter((_, idx) => idx !== i) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    if (exercise?.id) {
      await base44.entities.ExerciseLibrary.update(exercise.id, form);
    } else {
      await base44.entities.ExerciseLibrary.create(form);
    }
    setSaving(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">{exercise ? 'Edit Exercise' : 'Add Exercise'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-2">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Exercise Name *</Label>
              <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required placeholder="e.g., Barbell Back Squat" />
            </div>
            <div className="col-span-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} placeholder="Brief overview of the exercise" />
            </div>
            <div>
              <Label>Primary Muscle Group</Label>
              <Select value={form.muscle_group} onValueChange={v => setForm({...form, muscle_group: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['chest','back','shoulders','biceps','triceps','legs','glutes','core','full_body','cardio'].map(m => (
                    <SelectItem key={m} value={m}>{m.replace('_',' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Equipment</Label>
              <Select value={form.equipment} onValueChange={v => setForm({...form, equipment: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['barbell','dumbbell','cable','machine','bodyweight','kettlebell','resistance_band','trx','other'].map(e => (
                    <SelectItem key={e} value={e}>{e.replace('_',' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Movement Pattern</Label>
              <Select value={form.movement_pattern} onValueChange={v => setForm({...form, movement_pattern: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['push','pull','hinge','squat','carry','rotation','isometric','cardio'].map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Difficulty</Label>
              <Select value={form.difficulty} onValueChange={v => setForm({...form, difficulty: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Secondary Muscles */}
          <div>
            <Label>Secondary Muscles</Label>
            <div className="flex flex-wrap gap-1.5 mb-2 mt-1">
              {form.secondary_muscles?.map((m, i) => (
                <Badge key={i} variant="secondary" className="gap-1 text-xs pr-1">
                  {m}
                  <button type="button" onClick={() => removeMuscle(i)}><X className="w-3 h-3" /></button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={newMuscle} onChange={e => setNewMuscle(e.target.value)} placeholder="e.g., glutes" className="h-8 text-sm"
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addMuscle(); }}} />
              <Button type="button" variant="outline" size="sm" onClick={addMuscle}>Add</Button>
            </div>
          </div>

          {/* Tempo & Rest */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tempo (ecc–pause–con–pause)</Label>
              <Input value={form.tempo} onChange={e => setForm({...form, tempo: e.target.value})} placeholder="e.g. 3-1-2-0" />
            </div>
            <div>
              <Label>Default Rest (seconds)</Label>
              <Input type="number" value={form.default_rest_seconds} onChange={e => setForm({...form, default_rest_seconds: Number(e.target.value)})} />
            </div>
          </div>

          {/* Video */}
          <div className="space-y-3 p-4 bg-secondary/40 rounded-xl">
            <h3 className="font-medium text-sm">Demo Video</h3>
            <div>
              <Label className="text-xs text-muted-foreground">YouTube / Vimeo URL or direct MP4 link</Label>
              <div className="flex gap-2 mt-1">
                <div className="relative flex-1">
                  <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={form.video_url} onChange={e => setForm({...form, video_url: e.target.value})} placeholder="https://youtube.com/watch?v=..." className="pl-9" />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <Button type="button" variant="outline" size="sm" className="pointer-events-none" disabled={uploading}>
                {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                Upload Video
              </Button>
              <input type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
              {form.video_url && <span className="text-xs text-accent font-medium">✓ Video set</span>}
            </label>
            <div>
              <Label className="text-xs text-muted-foreground">Custom Thumbnail (optional)</Label>
              <label className="flex items-center gap-2 cursor-pointer mt-1">
                <Button type="button" variant="outline" size="sm" className="pointer-events-none" disabled={uploading}>
                  <Upload className="w-4 h-4 mr-2" /> Upload Thumbnail
                </Button>
                <input type="file" accept="image/*" className="hidden" onChange={handleThumbnailUpload} />
                {form.thumbnail_url && <span className="text-xs text-accent font-medium">✓ Thumbnail set</span>}
              </label>
            </div>

            {/* Coach Branded */}
            <div className="flex items-center gap-3 pt-1">
              <Switch checked={!!form.is_coach_branded} onCheckedChange={v => setForm({...form, is_coach_branded: v})} />
              <div>
                <p className="text-sm font-medium">Coach-Branded Video</p>
                <p className="text-xs text-muted-foreground">Mark as your own form demo for clients</p>
              </div>
            </div>
          </div>

          {/* Form Cues */}
          <div>
            <Label className="font-medium">Form Cues</Label>
            <div className="space-y-1.5 mt-2 mb-2">
              {form.form_cues?.map((cue, i) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-secondary/40 rounded-lg text-sm">
                  <span className="w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0">{i+1}</span>
                  <span className="flex-1">{cue}</span>
                  <button type="button" onClick={() => removeCue(i)}><X className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" /></button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={newCue} onChange={e => setNewCue(e.target.value)} placeholder="Add a form cue..." className="h-8 text-sm"
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCue(); }}} />
              <Button type="button" variant="outline" size="sm" onClick={addCue}><Plus className="w-3.5 h-3.5" /></Button>
            </div>
          </div>

          {/* Common Mistakes */}
          <div>
            <Label className="font-medium">Common Mistakes</Label>
            <div className="space-y-1.5 mt-2 mb-2">
              {form.common_mistakes?.map((m, i) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-chart-4/5 border border-chart-4/15 rounded-lg text-sm">
                  <span className="flex-1">{m}</span>
                  <button type="button" onClick={() => removeMistake(i)}><X className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" /></button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={newMistake} onChange={e => setNewMistake(e.target.value)} placeholder="Add a common mistake..." className="h-8 text-sm"
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addMistake(); }}} />
              <Button type="button" variant="outline" size="sm" onClick={addMistake}><Plus className="w-3.5 h-3.5" /></Button>
            </div>
          </div>

          {/* Coach Notes */}
          <div>
            <Label>Private Coach Notes</Label>
            <Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} placeholder="Internal notes, not shown to clients" />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {exercise ? 'Update Exercise' : 'Add to Library'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}