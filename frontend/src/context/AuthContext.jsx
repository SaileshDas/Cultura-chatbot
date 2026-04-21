import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [authToken, setAuthToken] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isHydrated, setIsHydrated] = useState(false);

  const API_BASE = import.meta.env.VITE_API_BASE || '';
  const TTS_BASE = import.meta.env.VITE_TTS_BASE || '';

  // Hydrate from localStorage on mount
  useEffect(() => {
    const stored = window.localStorage.getItem('cultura_auth');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.token && parsed.user) {
          const user = parsed.user.username
            ? parsed.user
            : { ...parsed.user, username: parsed.user.email };
          setAuthToken(parsed.token);
          setCurrentUser(user);
        }
      } catch {
        // ignore bad data
      }
    }
    setIsHydrated(true);
  }, []);

  const saveAuth = useCallback((token, user) => {
    setAuthToken(token);
    setCurrentUser(user);
    window.localStorage.setItem('cultura_auth', JSON.stringify({ token, user }));
  }, []);

  const clearAuth = useCallback(() => {
    setAuthToken(null);
    setCurrentUser(null);
    window.localStorage.removeItem('cultura_auth');
  }, []);

  const authHeaders = authToken
    ? { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };

  const value = {
    authToken,
    currentUser,
    isHydrated,
    API_BASE,
    TTS_BASE,
    authHeaders,
    saveAuth,
    clearAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
