import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Trash2, AlertTriangle, Lock } from 'lucide-react';
import { toast } from 'sonner';
import ProfileSectionCard from './ProfileSectionCard';

function Toggle({ value, onChange }) {
  return (
    <button onClick={() => onChange(!value)}
      className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
      style={{ background: value ? 'rgb(var(--primary))' : 'rgb(var(--border))' }}>
      <motion.div animate={{ x: value ? 18 : 2 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="absolute top-1 w-4 h-4 rounded-full bg-card" />
    </button>
  );
}

export default function ProfilePrivacy({ client }) {
  const [shareProgress, setShareProgress] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  const handleExport = () => {
    toast.success('Data export started — you\'ll receive an email shortly');
  };

  const handleDelete = () => {
    if (deleteConfirm !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }
    toast.error('Account deletion requested — your coach has been notified');
    setShowDelete(false);
  };

  return (
    <ProfileSectionCard icon={Lock} title="Privacy & Data">
      <div className="pt-3 space-y-0">
        <div className="flex items-center gap-3 py-3 border-b border-border">
          <div className="flex-1">
            <p className="text-foreground text-sm">Profile Visibility</p>
            <p className="text-muted-foreground text-[12px]">Coach only (default)</p>
          </div>
        </div>

        <div className="flex items-center gap-3 py-3 border-b border-border">
          <div className="flex-1">
            <p className="text-foreground text-sm">Share Progress with Community</p>
            <p className="text-muted-foreground text-[12px]">Coming soon</p>
          </div>
          <Toggle value={shareProgress} onChange={setShareProgress} />
        </div>

        <button onClick={handleExport}
          className="flex items-center gap-3 py-3 border-b border-border w-full text-left">
          <Download className="w-4 h-4 text-primary flex-shrink-0" />
          <p className="text-primary text-sm font-semibold flex-1">Download My Data</p>
        </button>

        <button onClick={() => setShowDelete(true)}
          className="flex items-center gap-3 py-3 w-full text-left">
          <Trash2 className="w-4 h-4 text-destructive flex-shrink-0" />
          <p className="text-destructive text-sm font-semibold">Delete My Account</p>
        </button>
      </div>

      <AnimatePresence>
        {showDelete && (
          <motion.div exit={{ opacity: 0 }}
            className="mt-4 p-4 rounded-xl" style={{ background: 'rgb(var(--destructive) / 0.1)', border: '1px solid rgb(var(--destructive) / 0.25)' }}>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <p className="text-destructive font-bold text-sm">Delete Account</p>
            </div>
            <p className="text-muted-foreground text-xs mb-3">This will permanently delete all your data including check-ins, progress, and messages. Type <span className="text-destructive font-bold">DELETE</span> to confirm.</p>
            <input
              className="w-full bg-transparent text-foreground text-sm outline-none border border-destructive/30 rounded-xl px-3 py-2 mb-3"
              placeholder="Type DELETE here"
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
            />
            <div className="flex gap-2">
              <button onClick={() => setShowDelete(false)}
                className="flex-1 py-2 rounded-xl text-sm text-muted-foreground"
                style={{ background: 'rgb(var(--secondary))' }}>Cancel</button>
              <button onClick={handleDelete}
                className="flex-1 py-2 rounded-xl text-sm font-bold text-foreground"
                style={{ background: 'rgb(var(--destructive) / 0.7)' }}>Delete</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </ProfileSectionCard>
  );
}