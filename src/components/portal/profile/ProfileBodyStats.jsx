import React, { useState } from 'react';
import { portalDb } from '@/api/supabaseClient';
import { format, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import ProfileSectionCard from './ProfileSectionCard';

export default function ProfileBodyStats({ client, checkIns, queryClient }) {
  const [units, setUnits] = useState('imperial'); // imperial | metric
  const [values, setValues] = useState({
    current_weight: client?.current_weight || '',
    target_weight: client?.target_weight || '',
    height: client?.height || '',
  });
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  const lastCI = [...(checkIns || [])].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  const lastWeightDate = lastCI?.date ? format(parseISO(lastCI.date), 'MMM d') : null;

  const convert = (val) => {
    if (!val) return '';
    if (units === 'metric') return Math.round(val * 0.453592 * 10) / 10;
    return val;
  };

  const save = async () => {
    if (client?.id) {
      await portalDb.entities.Client.update(client.id, {
        current_weight: parseFloat(values.current_weight) || client?.current_weight,
        target_weight: parseFloat(values.target_weight) || client?.target_weight,
        height: values.height,
      });
    }
    setSaved(true);
    setDirty(false);
    queryClient.invalidateQueries({ queryKey: ['portal-client-profile'] });
    setTimeout(() => setSaved(false), 2000);
  };

  const weightUnit = units === 'imperial' ? 'lbs' : 'kg';
  const heightUnit = units === 'imperial' ? 'ft/in' : 'cm';

  return (
    <ProfileSectionCard icon="⚖️" title="Body Stats">
      {/* Unit toggle */}
      <div className="flex gap-1 mt-3 mb-4 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
        {['imperial', 'metric'].map(u => (
          <button key={u} onClick={() => setUnits(u)}
            className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: units === u ? 'rgb(var(--primary) / 0.3)' : 'transparent',
              color: units === u ? 'rgb(var(--primary))' : 'rgba(255,255,255,0.3)',
            }}>
            {u === 'imperial' ? 'Imperial' : 'Metric'}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {[
          { label: `Current Weight (${weightUnit})`, key: 'current_weight', note: lastWeightDate ? `Last updated ${lastWeightDate}` : null },
          { label: `Goal Weight (${weightUnit})`, key: 'target_weight' },
          { label: `Height (${heightUnit})`, key: 'height' },
        ].map(({ label, key, note }) => (
          <div key={key}>
            <p className="text-white/30 text-[10px] uppercase tracking-wider mb-1.5">{label}</p>
            <input
              type={key === 'height' ? 'text' : 'number'}
              className="w-full bg-transparent text-white text-base outline-none border-b border-white/10 pb-1 focus:border-primary transition-colors"
              value={values[key]}
              placeholder={`Enter ${label.toLowerCase()}`}
              onChange={e => { setValues(p => ({ ...p, [key]: e.target.value })); setDirty(true); }}
            />
            {note && <p className="text-white/20 text-[10px] mt-1">{note}</p>}
          </div>
        ))}
      </div>

      <AnimatePresence>
        {dirty && (
          <motion.button initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            onClick={save}
            className="mt-5 w-full py-3 rounded-xl font-bold text-sm text-white"
            style={{ background: 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--primary)))' }}>
            {saved ? '✓ Saved' : 'Save Body Stats'}
          </motion.button>
        )}
      </AnimatePresence>
    </ProfileSectionCard>
  );
}