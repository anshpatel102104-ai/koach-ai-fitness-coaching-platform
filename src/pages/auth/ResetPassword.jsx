import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import AuthShell, { AuthField, AuthSubmit, AuthError } from './AuthShell.jsx';

/**
 * Reached via Supabase's password-reset email link. The link establishes a
 * recovery session, so updateUser({ password }) works without the old password.
 */
export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setSubmitting(true);
    try {
      await supabase.auth.updatePassword(password);
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err.message || 'Could not update your password. The link may have expired.');
      setSubmitting(false);
    }
  };

  return (
    <AuthShell title="Set a new password">
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField label="New password" type="password" value={password} onChange={setPassword} placeholder="At least 6 characters" autoComplete="new-password" />
        <AuthField label="Confirm password" type="password" value={confirm} onChange={setConfirm} placeholder="Re-enter your password" autoComplete="new-password" />
        <AuthError message={error} />
        <AuthSubmit disabled={submitting || !password || !confirm}>
          {submitting ? 'Updating…' : 'Update password'}
        </AuthSubmit>
      </form>
    </AuthShell>
  );
}
