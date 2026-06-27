import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { UiPath, UiPathError } from '@uipath/uipath-typescript/core';
import type { UiPathSDKConfig } from '@uipath/uipath-typescript/core';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  sdk: UiPath;
  user: string; // signed-in person's display name / email (from the access token)
  login: () => Promise<void>;
  logout: () => void;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Decode the user identity from the SDK's JWT access token. Reads the usual
// identity claims; returns '' if the token is missing or unparseable.
function userFromToken(token: string | undefined): string {
  if (!token) return '';
  try {
    const payload = token.split('.')[1];
    if (!payload) return '';
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const c = JSON.parse(json) as Record<string, unknown>;
    const pick = (k: string) => (typeof c[k] === 'string' ? (c[k] as string) : '');
    return pick('name') || pick('email') || pick('preferred_username') || pick('prefer_username') || pick('unique_name') || pick('sub') || '';
  } catch {
    return '';
  }
}

export const AuthProvider: React.FC<{ children: ReactNode; config: UiPathSDKConfig }> = ({ children, config }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState('');
  const [sdk] = useState<UiPath>(() => new UiPath(config));
  const didInit = useRef(false);

  useEffect(() => {
    // Guard against React Strict Mode's double-invocation in dev.
    // OAuth authorization codes are single-use — calling completeOAuth()
    // twice would fail the second time with "Authentication failed".
    if (didInit.current) return;
    didInit.current = true;

    const initializeAuth = async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (sdk.isInOAuthCallback()) {
          await sdk.completeOAuth();
          // Strip OAuth params from the URL so a refresh doesn't try to
          // re-consume the (now-invalid) code.
          window.history.replaceState({}, document.title, window.location.pathname);
        }
        const ok = sdk.isAuthenticated();
        setIsAuthenticated(ok);
        if (ok) setUser(userFromToken(sdk.getToken()));
      } catch (err) {
        console.error('Authentication failed:', err);
        setError(err instanceof UiPathError ? err.message : 'Authentication failed');
      } finally {
        setIsLoading(false);
      }
    };
    initializeAuth();
  }, [sdk]);

  const login = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await sdk.initialize();
    } catch (err) {
      setError(err instanceof UiPathError ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    sdk.logout();
    setIsAuthenticated(false);
    setError(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, sdk, user, login, logout, error }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
