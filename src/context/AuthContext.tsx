import { useState } from 'react';
import { userAPI } from '../services/api';
import { AuthContext } from './authTypes';
import type { AuthMode } from './authTypes';

const getStoredAuth = () => {
  if (typeof window === 'undefined') {
    return { userId: null, username: null, isLoggedIn: false };
  }
  const isLoggedIn = window.localStorage.getItem('isLoggedIn') === 'true';
  const userId = window.localStorage.getItem('userId');
  const username = window.localStorage.getItem('username');
  return {
    userId: userId ?? null,
    username: username ?? null,
    isLoggedIn: Boolean(isLoggedIn && userId && username),
  };
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const stored = getStoredAuth();
  const [userId, setUserId] = useState<string | null>(stored.userId);
  const [username, setUsername] = useState<string | null>(stored.username);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(stored.isLoggedIn);
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [authDialogMode, setAuthDialogMode] = useState<AuthMode>('login');

  const persistAuth = (id: string, name: string) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('userId', id);
    window.localStorage.setItem('username', name);
    window.localStorage.setItem('isLoggedIn', 'true');
  };

  const clearAuthStorage = () => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem('userId');
    window.localStorage.removeItem('username');
    window.localStorage.removeItem('isLoggedIn');
  };

  const openAuthDialog = (mode: AuthMode = 'login') => {
    setAuthDialogMode(mode);
    setIsAuthDialogOpen(true);
  };

  const closeAuthDialog = () => {
    setIsAuthDialogOpen(false);
  };

  const login = async (name: string, password: string) => {
    const user = await userAPI.login(name, password);
    setUserId(user.id);
    setUsername(user.username);
    setIsLoggedIn(true);
    persistAuth(user.id, user.username);
    closeAuthDialog();
  };

  const register = async (name: string, password: string) => {
    const user = await userAPI.register(name, password);
    setUserId(user.id);
    setUsername(user.username);
    setIsLoggedIn(true);
    persistAuth(user.id, user.username);
    closeAuthDialog();
  };

  const logout = () => {
    setUserId(null);
    setUsername(null);
    setIsLoggedIn(false);
    clearAuthStorage();
  };

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        userId,
        username,
        isAuthDialogOpen,
        authDialogMode,
        openAuthDialog,
        closeAuthDialog,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
