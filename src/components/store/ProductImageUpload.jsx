import React, { useRef, useState } from 'react';
import { X, ImageIcon } from 'lucide-react';
import { db } from '@/api/supabaseClient';
import { cn } from '@/lib/utils';
import { SignedImg } from '@/components/shared/SignedImage';

export default function ProductImageUpload({ value, onChange, className, label = 'Product image', tip = '1200 × 675 px works best' }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file) => {
    if (!file || !file.type.match(/^image\/(jpeg|png|webp)$/)) return;
    setUploading(true);
    const { file_url } = await db.uploadFile({ file, bucket: 'branding' });
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
      {label && <p className="text-sm font-medium text-foreground mb-1.5">{label}</p>}
      {value ? (
        <div className="relative rounded-lg overflow-hidden bg-secondary" style={{ aspectRatio: '16/9' }}>
          <SignedImg src={value} alt="Product" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/85 transition-colors"
            aria-label="Remove image"
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
            'flex flex-col items-center justify-center rounded-lg border border-dashed cursor-pointer transition-colors px-2 text-center',
            'hover:bg-accent/60',
            dragging ? 'border-foreground bg-accent' : 'border-input',
          )}
          style={{ aspectRatio: '16/9' }}
        >
          {uploading ? (
            <div className="w-5 h-5 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
          ) : (
            <>
              <ImageIcon className="w-5 h-5 text-muted-foreground mb-1.5" />
              <p className="text-[13px] font-semibold text-foreground">Drop an image or click</p>
              <p className="text-xs text-muted-foreground mt-0.5">{tip}. JPG, PNG or WEBP.</p>
            </>
          )}
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => handleFile(e.target.files[0])} />
    </div>
  );
}