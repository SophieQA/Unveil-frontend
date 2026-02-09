import { createContext } from 'react';

export type AuthMode = 'login' | 'register';

export interface AuthContextValue {
  isLoggedIn: boolean;
  userId: string | null;
  username: string | null;
  isAuthDialogOpen: boolean;
  authDialogMode: AuthMode;
  openAuthDialog: (mode?: AuthMode) => void;
  closeAuthDialog: () => void;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
