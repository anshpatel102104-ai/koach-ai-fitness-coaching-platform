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
    <ProfileSectionCard icon={null} title="Fitness Profile">
      <div className="pt-3 space-y-5">
        {/* Goal */}
        <div>
          <p className="text-muted-foreground text-xs mb-2">Primary Goal</p>
          <div className="flex flex-wrap gap-2">
            {GOALS.map(g => (
              <button key={g}
                onClick={() => { setValues(p => ({ ...p, goal: g })); setDirty(true); }}
                className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                style={{
                  background: values.goal === g ? 'rgb(var(--primary))' : 'rgb(var(--secondary))',
                  color: values.goal === g ? 'rgb(var(--primary-foreground))' : 'rgb(var(--muted-foreground))',
                  border: `1px solid ${values.goal === g ? 'rgb(var(--primary))' : 'transparent'}`,
                }}>
                {g.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Injuries */}
        <div>
          <p className="text-muted-foreground text-xs mb-2">Injuries or Limitations</p>
          <textarea
            className="w-full bg-transparent text-foreground text-sm outline-none border border-border rounded-xl p-3 focus:border-primary transition-colors resize-none"
            rows={3}
            placeholder="e.g. Bad knees, shoulder impingement..."
            value={values.injuries}
            onChange={e => { setValues(p => ({ ...p, injuries: e.target.value })); setDirty(true); }}
          />
        </div>
      </div>

      <AnimatePresence>
        {dirty && (
          <motion.button exit={{ opacity: 0 }}
            onClick={save}
            className="mt-4 w-full py-3 rounded-xl font-bold text-sm text-primary-foreground"
            style={{ background: 'rgb(var(--primary))' }}>
            {saved ? 'Saved' : 'Save & Notify Coach'}
          </motion.button>
        )}
      </AnimatePresence>
    </ProfileSectionCard>
  );
}