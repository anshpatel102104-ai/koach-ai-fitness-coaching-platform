import React, { useRef, useState } from 'react';
import { X, ImageIcon } from 'lucide-react';
import { supabase as base44 } from '@/api/supabaseClient';
import { cn } from '@/lib/utils';
import { SignedImg } from '@/components/shared/SignedImage';

export default function ProductImageUpload({ value, onChange, className, label = 'Product Image', tip = 'Recommended: 1200×675px (16:9)' }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file) => {
    if (!file || !file.type.match(/^image\/(jpeg|png|webp)$/)) return;
    setUploading(true);
    const { file_url } = await base44.uploadFile({ file, bucket: 'branding' });
    onChange(file_url);
    setUploading(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  return (
    <div className={className}>
      {label && <p className="text-xs font-semibold text-foreground mb-1.5">{label}</p>}
      {value ? (
        <div className="relative rounded-xl overflow-hidden border border-border" style={{ aspectRatio: '16/9' }}>
          <SignedImg src={value} alt="Product" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            'flex flex-col items-center justify-center rounded-xl border-2 border-dashed cursor-pointer transition-all',
            'bg-background hover:bg-muted',
            dragging ? 'border-primary bg-accent' : 'border-border',
          )}
          style={{ aspectRatio: '16/9' }}
        >
          {uploading ? (
            <div className="w-6 h-6 border-2 border-primary/30 border-t-blue-500 rounded-full animate-spin" />
          ) : (
            <>
              <div className="w-10 h-10 rounded-xl bg-border flex items-center justify-center mb-2">
                <ImageIcon className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-xs font-semibold text-foreground">Drop image or click to upload</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{tip}</p>
              <p className="text-[10px] text-muted-foreground mt-1">JPG, PNG, WEBP</p>
            </>
          )}
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => handleFile(e.target.files[0])} />
    </div>
  );
}