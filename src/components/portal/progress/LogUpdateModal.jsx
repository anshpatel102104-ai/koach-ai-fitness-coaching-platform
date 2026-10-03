import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload } from 'lucide-react';
import { portalDb } from '@/api/supabaseClient';
import { SignedImg } from '@/components/shared/SignedImage';

const TABS = [
  { id: 'weight', label: 'Weight' },
  { id: 'measurements', label: 'Measurements' },
  { id: 'photo', label: 'Photo' },
];

const MEASUREMENT_FIELDS = [
  { key: 'waist', label: 'Waist (in)' },
  { key: 'hips', label: 'Hips (in)' },
  { key: 'chest', label: 'Chest (in)' },
  { key: 'arms', label: 'Arms (in)' },
  { key: 'thighs', label: 'Thighs (in)' },
];

export default function LogUpdateModal({ open, defaultTab = 'weight', onClose, onSave, saving }) {
  const [tab, setTab] = useState(defaultTab);
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [measurements, setMeasurements] = useState({});
  const [photoUrls, setPhotoUrls] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  // sync defaultTab
  React.useEffect(() => { setTab(defaultTab); }, [defaultTab, open]);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await portalDb.uploadFile({ file });
    setPhotoUrls(prev => [...prev, file_url]);
    setUploading(false);
  };

  const handleSave = () => {
    const data = {};
    if (weight) data.weight = parseFloat(weight);
    if (notes) data.notes = notes;
    if (Object.keys(measurements).length > 0) {
      data.measurements = Object.fromEntries(
        Object.entries(measurements).map(([k, v]) => [k, parseFloat(v)]).filter(([, v]) => !isNaN(v))
      );
    }
    if (photoUrls.length > 0) data.photo_urls = photoUrls;
    onSave(data);
  };

  const canSave = weight || Object.values(measurements).some(v => v) || photoUrls.length > 0;

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-50 flex items-end justify-center"
        style={{ background: 'rgba(0,0,0,0.75)' }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}>
        <motion.div className="w-full max-w-md rounded-t-2xl"
          style={{ background: 'rgb(var(--sidebar))', border: '1px solid rgba(255,255,255,0.1)', borderBottom: 'none', maxHeight: '85vh', overflowY: 'auto' }}
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          onClick={e => e.stopPropagation()}>

          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }} />
          </div>

          <div className="px-5 pb-5 pt-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-bold text-base">Log Update</h2>
              <button onClick={onClose}><X className="w-5 h-5 text-white/40" /></button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-5 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
                  style={{
                    background: tab === t.id ? 'rgb(var(--primary) / 0.3)' : 'transparent',
                    color: tab === t.id ? 'rgb(var(--primary))' : 'rgba(255,255,255,0.35)',
                  }}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Weight tab */}
            {tab === 'weight' && (
              <div className="space-y-4">
                <div>
                  <label className="text-white/40 text-xs font-semibold block mb-1.5">Current Weight (lbs)</label>
                  <input
                    type="number" step="0.1" value={weight} onChange={e => setWeight(e.target.value)}
                    placeholder="e.g. 185.5"
                    className="w-full px-4 py-3 rounded-xl text-white text-lg font-bold focus:outline-none"
                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }} />
                </div>
                <div>
                  <label className="text-white/40 text-xs font-semibold block mb-1.5">Notes (optional)</label>
                  <textarea
                    value={notes} onChange={e => setNotes(e.target.value)}
                    placeholder="How are you feeling? Any wins to share?"
                    rows={2}
                    className="w-full px-4 py-3 rounded-xl text-white text-sm focus:outline-none resize-none"
                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }} />
                </div>
              </div>
            )}

            {/* Measurements tab */}
            {tab === 'measurements' && (
              <div className="space-y-3">
                {MEASUREMENT_FIELDS.map(f => (
                  <div key={f.key} className="flex items-center gap-3">
                    <label className="text-white/50 text-sm w-28 flex-shrink-0">{f.label}</label>
                    <input
                      type="number" step="0.1" value={measurements[f.key] || ''}
                      onChange={e => setMeasurements(prev => ({ ...prev, [f.key]: e.target.value }))}
                      placeholder="—"
                      className="flex-1 px-3 py-2.5 rounded-xl text-white text-sm font-bold text-right focus:outline-none"
                      style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }} />
                  </div>
                ))}
              </div>
            )}

            {/* Photo tab */}
            {tab === 'photo' && (
              <div className="space-y-3">
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                <button onClick={() => fileRef.current?.click()}
                  className="w-full py-6 rounded-2xl border-2 border-dashed flex flex-col items-center gap-2 transition-all"
                  style={{ borderColor: 'rgb(var(--primary) / 0.3)', background: uploading ? 'rgb(var(--primary) / 0.08)' : 'transparent' }}>
                  {uploading ? (
                    <div className="w-6 h-6 border-2 border-primary/30 border-t-blue-400 rounded-full animate-spin" />
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-primary" />
                      <p className="text-primary text-sm font-semibold">Add Progress Photo</p>
                      <p className="text-white/20 text-xs">Front, side, or back view</p>
                    </>
                  )}
                </button>

                {photoUrls.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                    {photoUrls.map((url, i) => (
                      <div key={i} className="relative flex-shrink-0 w-20 h-20">
                        <SignedImg src={url} alt="" className="w-full h-full object-cover rounded-xl" />
                        <button onClick={() => setPhotoUrls(prev => prev.filter((_, idx) => idx !== i))}
                          className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                          style={{ background: 'rgb(var(--destructive))' }}>
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={!canSave || saving}
              className="w-full py-3.5 rounded-xl text-white font-bold text-sm mt-5 disabled:opacity-40 transition-all"
              style={{ background: 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--ai)))' }}>
              {saving ? 'Saving...' : 'Save Update'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}