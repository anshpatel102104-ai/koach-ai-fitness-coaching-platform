import React, { useState } from 'react';
import { portalDb } from '@/api/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import ProfileSectionCard from './ProfileSectionCard';

function FieldRow({ label, value, field, editValues, setEditValues, editing, setEditing }) {
  return (
    <div className="py-3 border-b border-white/5 last:border-0">
      <p className="text-white/30 text-[10px] uppercase tracking-wider mb-1">{label}</p>
      {editing === field ? (
        <input
          autoFocus
          className="w-full bg-transparent text-white text-sm outline-none border-b border-primary pb-1"
          value={editValues[field] || ''}
          onChange={e => setEditValues(p => ({ ...p, [field]: e.target.value }))}
          onBlur={() => setEditing(null)}
        />
      ) : (
        <button onClick={() => setEditing(field)} className="text-left w-full">
          <p className="text-white/70 text-sm">{value || <span className="text-white/20 italic">Tap to add</span>}</p>
        </button>
      )}
    </div>
  );
}

export default function ProfileMyInfo({ user, client, queryClient }) {
  const [editValues, setEditValues] = useState({
    name: client?.name || user?.full_name || '',
    email: user?.email || '',
    phone: client?.phone || '',
  });
  const [editing, setEditing] = useState(null);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  const handleChange = (updates) => {
    setEditValues(p => ({ ...p, ...updates }));
    setDirty(true);
  };

  const save = async () => {
    if (client?.id) {
      await portalDb.entities.Client.update(client.id, { name: editValues.name, phone: editValues.phone });
    }
    setSaved(true);
    setDirty(false);
    queryClient.invalidateQueries({ queryKey: ['portal-client-profile'] });
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <ProfileSectionCard icon="👤" title="My Information">
      <div className="pt-3 space-y-0">
        <FieldRow label="Full Name" value={editValues.name} field="name"
          editValues={editValues} setEditValues={(fn) => { setEditValues(fn); setDirty(true); }}
          editing={editing} setEditing={setEditing} />
        <FieldRow label="Email" value={editValues.email} field="email"
          editValues={editValues} setEditValues={(fn) => { setEditValues(fn); setDirty(true); }}
          editing={editing} setEditing={setEditing} />
        <FieldRow label="Phone" value={editValues.phone} field="phone"
          editValues={editValues} setEditValues={(fn) => { setEditValues(fn); setDirty(true); }}
          editing={editing} setEditing={setEditing} />
      </div>
      <AnimatePresence>
        {dirty && (
          <motion.button initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            onClick={save}
            className="mt-4 w-full py-3 rounded-xl font-bold text-sm text-white"
            style={{ background: 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--primary)))' }}>
            {saved ? '✓ Saved' : 'Save Changes'}
          </motion.button>
        )}
      </AnimatePresence>
    </ProfileSectionCard>
  );
}