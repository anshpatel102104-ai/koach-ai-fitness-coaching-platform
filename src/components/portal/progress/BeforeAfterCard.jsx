import React, { useState, useMemo } from 'react';
import { Plus, Camera } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { SignedImg } from '@/components/shared/SignedImage';

export default function BeforeAfterCard({ checkIns, client, onAddPhoto }) {
  const [selectedBefore, setSelectedBefore] = useState(0);
  const [selectedAfter, setSelectedAfter] = useState(-1); // -1 = last

  const allPhotos = useMemo(() => {
    const photos = [];
    checkIns.forEach(ci => {
      (ci.photo_urls || []).forEach(url => {
        photos.push({ url, date: ci.date });
      });
    });
    return photos.sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [checkIns]);

  const beforePhoto = allPhotos[selectedBefore];
  const afterPhoto = allPhotos[selectedAfter === -1 ? allPhotos.length - 1 : selectedAfter];

  const weightChange = useMemo(() => {
    const first = checkIns.find(ci => ci.weight);
    const last = [...checkIns].reverse().find(ci => ci.weight);
    if (!first || !last || first.id === last.id) return null;
    return (last.weight - first.weight).toFixed(1);
  }, [checkIns]);

  if (!allPhotos.length) {
    return (
      <div className="rounded-xl p-4" style={{ background: 'rgb(var(--secondary))', border: '1px solid rgb(var(--secondary))' }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-foreground font-bold text-sm">My Transformation</p>
        </div>
        <div className="py-10 text-center">
          <Camera className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-xs font-semibold">No photos yet</p>
          <p className="text-muted-foreground text-[12px] mt-1">Add your first progress photo to start your visual journey</p>
          <button onClick={onAddPhoto} className="mt-3 px-4 py-2 rounded-xl text-xs font-bold text-primary-foreground"
            style={{ background: 'rgb(var(--primary))', border: '1px solid rgb(var(--primary) / 0.3)' }}>
            + Add Photo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl p-4" style={{ background: 'rgb(var(--secondary))', border: '1px solid rgb(var(--secondary))' }}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-foreground font-bold text-sm">My Transformation</p>
        <button onClick={onAddPhoto}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[12px] font-bold"
          style={{ background: 'rgb(var(--card))', color: 'rgb(var(--foreground))', border: '1px solid rgb(var(--input))' }}>
          <Plus className="w-3 h-3" /> Photo
        </button>
      </div>

      {/* Before/After comparison */}
      {allPhotos.length >= 2 ? (
        <div className="grid grid-cols-2 gap-2 mb-3">
          {[
            { photo: beforePhoto, label: 'Before', color: 'rgb(var(--warning))' },
            { photo: afterPhoto, label: 'After', color: 'rgb(var(--success))' },
          ].map(({ photo, label, color }) => (
            <div key={label} className="relative rounded-xl overflow-hidden aspect-[3/4]">
              <SignedImg src={photo?.url} alt={label} className="w-full h-full object-cover" />
              <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5"
                style={{ background: 'rgb(var(--secondary))' }}>
                <p className="text-[12px] font-bold" style={{ color }}>{label}</p>
                {photo?.date && <p className="text-muted-foreground text-[12px]">{format(parseISO(photo.date), 'MMM d, yyyy')}</p>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="relative rounded-xl overflow-hidden h-48 mb-3">
          <SignedImg src={allPhotos[0]?.url} alt="Progress" className="w-full h-full object-cover" />
          <div className="absolute bottom-0 left-0 right-0 px-3 py-2"
            style={{ background: 'rgb(var(--secondary))' }}>
            <p className="text-foreground text-xs">{format(parseISO(allPhotos[0]?.date), 'MMM d, yyyy')}</p>
          </div>
        </div>
      )}

      {weightChange && (
        <div className="text-center mb-3">
          <span className="px-3 py-1 rounded-full text-xs font-bold"
            style={{ background: 'rgb(var(--success) / 0.15)', color: 'rgb(var(--success))', border: '1px solid rgb(var(--success) / 0.25)' }}>
            {weightChange > 0 ? '+' : ''}{weightChange} lbs since start
          </span>
        </div>
      )}

      {/* Photo timeline */}
      {allPhotos.length > 2 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pt-2 border-t border-border">
          {allPhotos.map((photo, i) => (
            <button key={i} onClick={() => {
              if (i < allPhotos.length - 1) setSelectedBefore(i);
              else setSelectedAfter(i);
            }}
              className="relative flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden"
              style={{ border: `2px solid ${i === selectedBefore || i === (selectedAfter === -1 ? allPhotos.length - 1 : selectedAfter) ? 'rgb(var(--primary))' : 'transparent'}` }}>
              <SignedImg src={photo.url} alt="" className="w-full h-full object-cover" />
              <div className="absolute bottom-0 left-0 right-0 px-1 py-0.5" style={{ background: 'rgba(0,0,0,0.6)' }}>
                <p className="text-[7px] text-foreground text-center">{format(parseISO(photo.date), 'MMM d')}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}