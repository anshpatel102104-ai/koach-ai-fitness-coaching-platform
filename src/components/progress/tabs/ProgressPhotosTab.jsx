import React, { useState, useMemo, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase as base44 } from '@/api/supabaseClient';
import { format, parseISO } from 'date-fns';
import { ImagePlus, ArrowLeftRight, X, ZoomIn } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { SignedImg } from '@/components/shared/SignedImage';

const VIEWS = ['Front', 'Side', 'Back', 'All'];

export default function ProgressPhotosTab({ client, checkIns }) {
  const [activeView, setActiveView] = useState('All');
  const [compareA, setCompareA] = useState(null);
  const [compareB, setCompareB] = useState(null);
  const [compareMode, setCompareMode] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [sliderPos, setSliderPos] = useState(50);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();
  const sliderRef = useRef();
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CheckIn.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['checkins'] }); toast.success('Photo added!'); setShowUpload(false); },
  });

  const allPhotos = useMemo(() => {
    const photos = [];
    for (const ci of checkIns) {
      for (const url of (ci.photo_urls || [])) {
        photos.push({ url, date: ci.date, weight: ci.weight, ciId: ci.id });
      }
    }
    return photos.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [checkIns]);

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.uploadFile({ file, scope: client?.id ? { clientId: client.id } : undefined });
      // Add to most recent check-in or create new
      const sorted = [...checkIns].sort((a, b) => new Date(b.date) - new Date(a.date));
      const recent = sorted[0];
      if (recent) {
        const existing = recent.photo_urls || [];
        await updateMutation.mutateAsync({ id: recent.id, data: { photo_urls: [...existing, file_url] } });
      } else {
        await base44.entities.CheckIn.create({ client_id: client.id, client_name: client.name, date: format(new Date(), 'yyyy-MM-dd'), photo_urls: [file_url] });
        queryClient.invalidateQueries({ queryKey: ['checkins'] });
        toast.success('Photo added!');
        setShowUpload(false);
      }
    } catch (e) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSliderMouseMove = (e) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = (e.clientX ?? e.touches?.[0]?.clientX) - rect.left;
    setSliderPos(Math.max(5, Math.min(95, (x / rect.width) * 100)));
  };

  return (
    <div className="p-6 space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {VIEWS.map(v => (
            <button key={v} onClick={() => setActiveView(v)}
              className={cn('px-3 py-1 rounded-md text-xs font-semibold transition-all',
                activeView === v ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground')}>
              {v}
            </button>
          ))}
        </div>
        <button onClick={() => { setCompareMode(!compareMode); setCompareA(null); setCompareB(null); }}
          className={cn('flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all',
            compareMode ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-foreground')}>
          <ArrowLeftRight className="w-3.5 h-3.5" /> Compare
        </button>
        <button onClick={() => setShowUpload(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90">
          <ImagePlus className="w-3.5 h-3.5" /> Add Photos
        </button>
      </div>

      {/* Before/After Slider — shown when both selected */}
      {compareMode && compareA && compareB && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Before / After Comparison</h3>
            <button onClick={() => { setCompareA(null); setCompareB(null); }} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div
            ref={sliderRef}
            className="relative w-full aspect-[4/3] rounded-xl overflow-hidden cursor-col-resize select-none"
            onMouseMove={handleSliderMouseMove}
            onTouchMove={handleSliderMouseMove}
          >
            {/* Right (after) */}
            <SignedImg src={compareB.url} alt="after" className="absolute inset-0 w-full h-full object-cover" />
            {/* Left (before) — clipped */}
            <div className="absolute inset-0 overflow-hidden" style={{ width: `${sliderPos}%` }}>
              <SignedImg src={compareA.url} alt="before" className="absolute inset-0 h-full object-cover" style={{ width: `${100 / (sliderPos / 100)}%` }} />
            </div>
            {/* Divider */}
            <div className="absolute top-0 bottom-0 w-0.5 bg-card shadow-lg z-10" style={{ left: `${sliderPos}%` }}>
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-card rounded-full shadow-lg flex items-center justify-center">
                <ArrowLeftRight className="w-4 h-4 text-foreground" />
              </div>
            </div>
            {/* Labels */}
            <div className="absolute bottom-2 left-2 text-[10px] text-white font-bold bg-black/50 px-2 py-0.5 rounded z-20">
              {format(parseISO(compareA.date), 'MMM d, yyyy')}
            </div>
            <div className="absolute bottom-2 right-2 text-[10px] text-white font-bold bg-black/50 px-2 py-0.5 rounded z-20">
              {format(parseISO(compareB.date), 'MMM d, yyyy')}
            </div>
          </div>
        </div>
      )}

      {/* Compare selection prompt */}
      {compareMode && !(compareA && compareB) && (
        <div className="bg-accent border border-accent rounded-xl px-4 py-3 text-xs text-primary font-medium">
          {!compareA ? '👆 Select the first photo (Before)' : '👆 Now select the second photo (After)'}
        </div>
      )}

      {/* Photo grid */}
      {allPhotos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-card border border-border rounded-xl gap-3">
          <ImagePlus className="w-10 h-10 text-muted-foreground" />
          <p className="text-sm text-foreground font-medium">No progress photos yet</p>
          <p className="text-xs text-muted-foreground">Upload photos to start tracking visual transformation</p>
          <button onClick={() => setShowUpload(true)} className="mt-2 px-4 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground">
            Add First Photo
          </button>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Photo Timeline</h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {allPhotos.map((photo, i) => {
              const selA = compareMode && compareA === photo;
              const selB = compareMode && compareB === photo;
              return (
                <div key={i}
                  onClick={() => {
                    if (compareMode) {
                      if (!compareA) { setCompareA(photo); }
                      else if (!compareB && photo !== compareA) { setCompareB(photo); }
                      else { setCompareA(photo); setCompareB(null); }
                    } else {
                      setExpanded(photo);
                    }
                  }}
                  className={cn(
                    'relative rounded-xl overflow-hidden cursor-pointer group transition-all',
                    selA ? 'ring-2 ring-primary' : selB ? 'ring-2 ring-ai' : compareMode ? 'ring-2 ring-transparent hover:ring-primary' : 'hover:scale-[1.02]'
                  )}>
                  <SignedImg src={photo.url} alt="progress" className="w-full aspect-square object-cover" />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                    <p className="text-[9px] text-white font-semibold">{format(parseISO(photo.date), 'MMM d, yy')}</p>
                    {photo.weight && <p className="text-[8px] text-white/70">{photo.weight} lbs</p>}
                  </div>
                  {!compareMode && (
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                      <ZoomIn className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-all" />
                    </div>
                  )}
                  {(selA || selB) && (
                    <div className={cn('absolute top-1 right-1 text-[9px] font-bold px-1.5 py-0.5 rounded',
                      selA ? 'bg-primary text-primary-foreground' : 'bg-ai text-ai-foreground')}>
                      {selA ? 'Before' : 'After'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Expanded photo modal */}
      {expanded && (
        <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4" onClick={() => setExpanded(null)}>
          <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <SignedImg src={expanded.url} alt="expanded" className="w-full rounded-xl shadow-2xl" />
            <div className="absolute bottom-4 left-4 text-white">
              <p className="text-sm font-semibold">{format(parseISO(expanded.date), 'MMMM d, yyyy')}</p>
              {expanded.weight && <p className="text-xs opacity-70">{expanded.weight} lbs</p>}
            </div>
            <button onClick={() => setExpanded(null)} className="absolute top-3 right-3 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center">
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* Upload modal */}
      {showUpload && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Add Progress Photos</h3>
              <button onClick={() => setShowUpload(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <div
              className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileRef.current?.click()}>
              <ImagePlus className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-foreground font-medium">Click to upload photos</p>
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG — front, side, or back</p>
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
              onChange={e => Array.from(e.target.files).forEach(handleUpload)} />
            {uploading && <p className="text-xs text-center text-muted-foreground animate-pulse">Uploading...</p>}
          </div>
        </div>
      )}
    </div>
  );
}