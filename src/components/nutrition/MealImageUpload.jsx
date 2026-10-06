import React, { useRef, useState } from 'react';
import { db } from '@/api/supabaseClient';
import { Camera, X, Loader2, UtensilsCrossed } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { SignedImg } from '@/components/shared/SignedImage';

const MAX_SIZE_MB = 5;

/**
 * Compact image uploader for a meal card in the builder.
 * Props:
 *   imageUrl  — current image URL (string | null)
 *   onchange  — (url: string | null) => void
 *   className — extra classes for the container
 */
export default function MealImageUpload({ imageUrl, onChange, className }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Image must be under ${MAX_SIZE_MB} MB`);
      e.target.value = '';
      return;
    }

    setUploading(true);
    try {
      // Compress: draw onto canvas at max 800px wide, export as jpeg 0.75
      const compressed = await compressImage(file, 800, 0.75);
      const { file_url } = await db.uploadFile({ file: compressed, scope: 'shared' });
      onChange(file_url);
    } catch (err) {
      toast.error('Upload failed — try again');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  function handleRemove(ev) {
    ev.stopPropagation();
    onChange(null);
  }

  if (imageUrl) {
    return (
      <div className={cn('relative group rounded-xl overflow-hidden', className)} style={{ height: 80 }}>
        <SignedImg
          src={imageUrl}
          alt="Meal"
          className="w-full h-full object-cover"
          onError={e => { e.target.style.display = 'none'; }}
        />
        {/* Overlay controls */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button
            onClick={() => inputRef.current?.click()}
            title="Replace image"
            className="p-1.5 rounded-lg bg-card text-foreground hover:bg-accent transition-colors"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleRemove}
            title="Remove image"
            className="p-1.5 rounded-lg bg-card text-destructive hover:bg-accent transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      disabled={uploading}
      className={cn(
        'flex items-center justify-center gap-2 rounded-xl border border-dashed border-muted-foreground bg-background text-muted-foreground hover:border-primary hover:text-foreground hover:bg-accent/10 transition-all text-xs font-medium',
        className
      )}
      style={{ height: 48 }}
    >
      {uploading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <>
          <Camera className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Add photo</span>
        </>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </button>
  );
}

/** Compress an image File to max width px, jpeg quality q. Returns a File. */
async function compressImage(file, maxWidth, quality) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) => resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })),
          'image/jpeg',
          quality
        );
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/** Placeholder shown in read-only views when no image is set. */
export function MealImagePlaceholder({ className }) {
  return (
    <div
      className={cn('flex items-center justify-center bg-muted rounded-xl', className)}
    >
      <UtensilsCrossed className="w-6 h-6 text-muted-foreground" />
    </div>
  );
}