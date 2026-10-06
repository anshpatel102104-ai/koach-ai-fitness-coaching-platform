import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import AuthShell, { AuthField, AuthSubmit, AuthError, AuthNotice, authLinkClass } from './AuthShell.jsx';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await supabase.auth.requestPasswordReset(email);
      // Don't reveal whether the email exists.
      setNotice('If that email has an account, a reset link is on its way.');
    } catch (err) {
      setError(err.message || 'Could not send the reset email.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell title="Reset password">
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" autoComplete="email" />
        <AuthError message={error} />
        <AuthNotice message={notice} />
        {!notice && (
          <AuthSubmit disabled={submitting || !email}>
            {submitting ? 'Sending…' : 'Send reset link'}
          </AuthSubmit>
        )}
      </form>
      <div className="text-center text-[13px]">
        <Link to="/login" className={authLinkClass}>Back to sign in</Link>
      </div>
    </AuthShell>
  );
}
