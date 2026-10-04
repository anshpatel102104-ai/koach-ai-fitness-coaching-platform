import React, { useState } from 'react';
import { portalDb } from '@/api/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import ProfileSectionCard from './ProfileSectionCard';

const GOALS = ['weight_loss', 'muscle_gain', 'strength', 'endurance', 'flexibility', 'general_fitness'];
const LEVELS = ['beginner', 'intermediate', 'advanced', 'elite'];
const DAYS = [1, 2, 3, 4, 5, 6, 7];

export default function ProfileFitnessProfile({ client, queryClient }) {
  const [values, setValues] = useState({
    goal: client?.goal || 'general_fitness',
    injuries: client?.notes || '',
  });
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    if (client?.id) {
      await portalDb.entities.Client.update(client.id, {
        goal: values.goal,
        notes: values.injuries,
      });
    }
    setSaved(true);
    setDirty(false);
    queryClient.invalidateQueries({ queryKey: ['portal-client-profile'] });
    toast.success('Fitness profile updated — coach notified');
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <ProfileSectionCard icon="💪" title="Fitness Profile">
      <div className="pt-3 space-y-5">
        {/* Goal */}
        <div>
          <p className="text-white/30 text-[10px] uppercase tracking-wider mb-2">Primary Goal</p>
          <div className="flex flex-wrap gap-2">
            {GOALS.map(g => (
              <button key={g}
                onClick={() => { setValues(p => ({ ...p, goal: g })); setDirty(true); }}
                className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                style={{
                  background: values.goal === g ? 'rgb(var(--primary) / 0.25)' : 'rgba(255,255,255,0.06)',
                  color: values.goal === g ? 'rgb(var(--primary))' : 'rgba(255,255,255,0.4)',
                  border: `1px solid ${values.goal === g ? 'rgb(var(--primary) / 0.4)' : 'transparent'}`,
                }}>
                {g.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Injuries */}
        <div>
          <p className="text-white/30 text-[10px] uppercase tracking-wider mb-2">Injuries or Limitations</p>
          <textarea
            className="w-full bg-transparent text-white/70 text-sm outline-none border border-white/10 rounded-xl p-3 focus:border-primary transition-colors resize-none"
            rows={3}
            placeholder="e.g. Bad knees, shoulder impingement..."
            value={values.injuries}
            onChange={e => { setValues(p => ({ ...p, injuries: e.target.value })); setDirty(true); }}
          />
        </div>
      </div>

      <AnimatePresence>
        {dirty && (
          <motion.button initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            onClick={save}
            className="mt-4 w-full py-3 rounded-xl font-bold text-sm text-white"
            style={{ background: 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--primary)))' }}>
            {saved ? '✓ Saved' : 'Save & Notify Coach'}
          </motion.button>
        )}
      </AnimatePresence>
    </ProfileSectionCard>
  );
}