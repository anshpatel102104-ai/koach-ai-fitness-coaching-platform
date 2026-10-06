import React, { useState } from 'react';
import { ArrowLeftRight, X } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { SignedImg } from '@/components/shared/SignedImage';

export default function ProgressPhotos({ checkIns }) {
  const [compareMode, setCompareMode] = useState(false);
  const [compareA, setCompareA] = useState(null);
  const [compareB, setCompareB] = useState(null);

  const allPhotos = (checkIns || []).flatMap(ci =>
    (ci.photo_urls || []).map(url => ({ url, date: ci.date }))
  ).sort((a, b) => new Date(b.date) - new Date(a.date));

  if (allPhotos.length === 0) return null;

  const selectForCompare = (photo) => {
    if (!compareA) { setCompareA(photo); return; }
    if (!compareB && photo !== compareA) { setCompareB(photo); return; }
    setCompareA(photo); setCompareB(null);
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h3 className="text-[18px] text-foreground">Progress photos</h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => { setCompareMode(!compareMode); setCompareA(null); setCompareB(null); }}
            className="gap-1.5 h-7 text-xs">
            <ArrowLeftRight className="w-3.5 h-3.5" /> Compare
          </Button>
        </div>
      </div>

      {compareMode && (compareA || compareB) && (
        <div className="p-4 bg-muted border-b border-accent">
          <p className="text-xs text-primary mb-3 font-medium">
            {!compareA ? 'Select first photo' : !compareB ? 'Select second photo to compare' : 'Comparing:'}
          </p>
          {compareA && compareB && (
            <div className="grid grid-cols-2 gap-4">
              {[compareA, compareB].map((p, i) => (
                <div key={i} className="relative">
                  <SignedImg src={p.url} alt="compare" className="w-full aspect-[3/4] object-cover rounded-lg" />
                  <p className="text-center text-xs text-muted-foreground mt-1">{format(new Date(p.date), 'MMM d, yyyy')}</p>
                  <button onClick={() => i === 0 ? setCompareA(null) : setCompareB(null)}
                    className="absolute top-2 right-2 bg-black/50 rounded-full p-0.5">
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="p-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
        {allPhotos.map((photo, i) => {
          const selected = compareMode && (compareA === photo || compareB === photo);
          return (
            <div
              key={i}
              onClick={() => compareMode ? selectForCompare(photo) : null}
              className={`relative rounded-lg overflow-hidden cursor-pointer group ${compareMode ? 'ring-2 ' + (selected ? 'ring-primary' : 'ring-transparent hover:ring-primary') : ''}`}
            >
              <SignedImg src={photo.url} alt="progress" className="w-full aspect-square object-cover" />
              <div className="absolute bottom-0 left-0 right-0 bg-black/55 p-1.5">
                <p className="text-[11px] text-white font-medium">{format(new Date(photo.date), 'MMM d')}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}