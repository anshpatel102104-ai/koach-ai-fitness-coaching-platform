import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { Camera, X } from 'lucide-react';
import { supabasePortal as base44 } from '@/api/supabaseClient';
import { SignedImg } from '@/components/shared/SignedImage';

const ANGLES = [
  { key: 'front', label: 'Front', icon: '🧍' },
  { key: 'side', label: 'Side', icon: '🚶' },
  { key: 'back', label: 'Back', icon: '🔙' },
];

export default function CheckInQuestionPhoto({ value, onChange }) {
  const refs = { front: useRef(), side: useRef(), back: useRef() };
  const photos = value || {};

  const handleFile = async (key, file) => {
    if (!file) return;
    try {
      const { file_url } = await base44.uploadFile({ file });
      onChange({ ...photos, [key]: file_url });
    } catch (e) {
      console.error(e);
    }
  };

  const removePhoto = (key) => {
    const updated = { ...photos };
    delete updated[key];
    onChange(Object.keys(updated).length > 0 ? updated : null);
  };

  return (
    <div className="space-y-4">
      <p className="text-white/30 text-xs text-center flex items-center justify-center gap-1">
        🔒 Photos are only visible to your coach
      </p>
      <div className="grid grid-cols-3 gap-3">
        {ANGLES.map(a => (
          <div key={a.key}>
            <input
              ref={refs[a.key]}
              type="file"
              accept="image/*"
              capture="user"
              className="hidden"
              onChange={e => handleFile(a.key, e.target.files[0])}
            />
            {photos[a.key] ? (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="relative rounded-2xl overflow-hidden aspect-square">
                <SignedImg src={photos[a.key]} alt={a.label} className="w-full h-full object-cover" />
                <button onClick={() => removePhoto(a.key)}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(0,0,0,0.7)' }}>
                  <X className="w-3.5 h-3.5 text-white" />
                </button>
                <div className="absolute bottom-0 left-0 right-0 py-1.5 text-center text-[10px] font-bold text-white"
                  style={{ background: 'rgba(0,0,0,0.5)' }}>
                  {a.label}
                </div>
              </motion.div>
            ) : (
              <button onClick={() => refs[a.key].current?.click()}
                className="w-full aspect-square rounded-2xl flex flex-col items-center justify-center gap-2"
                style={{ background: 'rgba(255,255,255,0.05)', border: '2px dashed rgba(255,255,255,0.12)' }}>
                <span className="text-2xl">{a.icon}</span>
                <Camera className="w-5 h-5 text-white/30" />
                <span className="text-white/30 text-[10px] font-semibold">{a.label}</span>
              </button>
            )}
          </div>
        ))}
      </div>
      <p className="text-white/20 text-[10px] text-center">All photos are optional</p>
    </div>
  );
}