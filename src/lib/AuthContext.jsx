import React, { createContext, useState, useContext, useEffect } from 'react';
import { db } from '@/api/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null); // Contains only { id, public_settings }

  useEffect(() => {
    checkSupabaseAuth();
    // Reflect login/logout/token-refresh across the shell.
    const unsub = db.auth.onAuthStateChange?.(() => checkSupabaseAuth());
    return () => { if (typeof unsub === 'function') unsub(); };
  }, []);

  /**
   * Supabase auth check — the session IS the source of truth.
   * me() rejects when signed out.
   */
  const checkSupabaseAuth = async () => {
    setIsLoadingPublicSettings(false);
    setAppPublicSettings(null);
    try {
      const currentUser = await db.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
      setAuthError(null);
      acceptPendingTeamInvite(currentUser);
    } catch (_) {
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  };

  /**
   * Auto-accept a pending team invite for this user.
   * Matches by email (case-insensitive). Sets user_id and flips invite_status → "accepted".
   * Silent no-op if no pending invite exists.
   */
  const acceptPendingTeamInvite = async (currentUser) => {
    if (!currentUser?.email) return;
    try {
      const pending = await db.entities.TeamMember.filter({ invite_status: 'pending' });
      const match = pending.find(
        m => m.email?.toLowerCase() === currentUser.email.toLowerCase()
      );
      if (match) {
        await db.entities.TeamMember.update(match.id, {
          user_id: currentUser.id,
          invite_status: 'accepted',
        });
      }
    } catch (_) {
      // Non-critical — never block login
    }
  };

  const checkUserAuth = checkSupabaseAuth;

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    
    if (shouldRedirect) {
      db.auth.logout(window.location.href);
    } else {
      db.auth.logout();
    }
  };

  const navigateToLogin = () => {
    db.auth.redirectToLogin();
  };

  // Imperative auth helpers so pages/components never import the auth client directly.
  const me = () => db.auth.me();
  const updateMe = (data) => db.auth.updateMe(data);

  return (
    <AuthContext.Provider value={{ 
      user,
      setUser,
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      logout,
      navigateToLogin,
      me,
      updateMe,
      checkUserAuth,
      checkAppState: checkSupabaseAuth
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};