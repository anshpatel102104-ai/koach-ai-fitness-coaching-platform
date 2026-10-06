import React, { useRef, useState } from 'react';
import { Camera, Check, X, Loader2 } from 'lucide-react';
import { portalDb } from '@/api/supabaseClient';
import { SignedImg } from '@/components/shared/SignedImage';
import { cn } from '@/lib/utils';

const ANGLES = [
  { key: 'front', label: 'Front' },
  { key: 'side', label: 'Side' },
  { key: 'back', label: 'Back' },
];

/**
 * Three photo slots (front / side / back). Filled slots show the photo with a
 * green check; the next empty slot gets a dark dashed border.
 */
export default function CheckInQuestionPhoto({ value, onChange }) {
  const refs = { front: useRef(), side: useRef(), back: useRef() };
  const [uploading, setUploading] = useState(null);
  const photos = value || {};
  const nextEmpty = ANGLES.find(a => !photos[a.key])?.key;

  const handleFile = async (key, file) => {
    if (!file) return;
    setUploading(key);
    try {
      const { file_url } = await portalDb.uploadFile({ file });
      onChange({ ...photos, [key]: file_url });
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(null);
    }
  };

  const removePhoto = (key) => {
    const updated = { ...photos };
    delete updated[key];
    onChange(Object.keys(updated).length > 0 ? updated : null);
  };

  return (
    <div>
      <div className="grid grid-cols-3 gap-2.5">
        {ANGLES.map(a => (
          <div key={a.key} className="flex flex-col items-center gap-2">
            <input
              ref={refs[a.key]}
              type="file"
              accept="image/*"
              capture="user"
              className="hidden"
              onChange={e => handleFile(a.key, e.target.files[0])}
            />
            {photos[a.key] ? (
              <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-secondary">
                <SignedImg src={photos[a.key]} alt={a.label} className="h-full w-full object-cover" />
                <span className="absolute bottom-2 left-2 flex h-7 w-7 items-center justify-center rounded-full bg-success text-white">
                  <Check className="h-4 w-4" strokeWidth={3} />
                </span>
                <button type="button" aria-label={`Remove ${a.label.toLowerCase()} photo`} onClick={() => removePhoto(a.key)}
                  className="touch-compact absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => refs[a.key].current?.click()}
                className={cn(
                  'flex aspect-[3/4] w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed text-[15px] font-semibold',
                  a.key === nextEmpty ? 'border-foreground bg-secondary text-foreground' : 'border-input text-muted-foreground',
                )}
              >
                {uploading === a.key ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
                {uploading === a.key ? 'Uploading' : 'Add'}
              </button>
            )}
            <span className="text-[15px] font-semibold text-foreground">{a.label}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3 rounded-xl bg-secondary p-3.5">
        <span className="h-12 w-10 flex-shrink-0 rounded-md bg-input/60" aria-hidden />
        <p className="text-[15px] leading-snug text-foreground">Same spot, same light, same time of day. All three are optional.</p>
      </div>
    </div>
  );
}
