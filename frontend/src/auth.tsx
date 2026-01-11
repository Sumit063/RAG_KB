import React, { createContext, useContext, useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { TOKEN_KEY, USERNAME_KEY } from './constants';
import { clearStoredValue, getStoredValue, setStoredValue } from './storage';

export type AuthState = {
  token: string;
  username: string;
  login: (token: string, username: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState(getStoredValue(TOKEN_KEY));
  const [username, setUsername] = useState(getStoredValue(USERNAME_KEY));

  const value = useMemo<AuthState>(
    () => ({
      token,
      username,
      login: (nextToken, nextUsername) => {
        setStoredValue(TOKEN_KEY, nextToken);
        setStoredValue(USERNAME_KEY, nextUsername);
        setToken(nextToken);
        setUsername(nextUsername);
      },
      logout: () => {
        clearStoredValue(TOKEN_KEY);
        clearStoredValue(USERNAME_KEY);
        setToken('');
        setUsername('');
      }
    }),
    [token, username]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
