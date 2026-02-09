import { useState } from 'react';
import { isApiError } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import '../styles/AuthDialog.css';

export default function AuthDialog() {
  const {
    isAuthDialogOpen,
    authDialogMode,
    openAuthDialog,
    closeAuthDialog,
    login,
    register,
  } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isAuthDialogOpen) return null;

  const isLogin = authDialogMode === 'login';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter a username and password.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      if (isLogin) {
        await login(username.trim(), password.trim());
      } else {
        await register(username.trim(), password.trim());
      }
    } catch (err) {
      if (isApiError(err)) {
        if (err.status === 401) {
          setError('Incorrect username or password.');
        } else if (err.status === 409) {
          setError('That username is already registered.');
        } else {
          setError(err.message || 'Operation failed.');
        }
      } else {
        setError('Operation failed.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMode = () => {
    openAuthDialog(isLogin ? 'register' : 'login');
  };

  return (
    <div className="auth-dialog-backdrop" onClick={closeAuthDialog}>
      <div className="auth-dialog" onClick={(e) => e.stopPropagation()}>
        <header className="auth-dialog-header">
          <h2>{isLogin ? 'Log in' : 'Sign up'}</h2>
          <button type="button" className="auth-close" onClick={closeAuthDialog}>
            ✕
          </button>
        </header>

        <form className="auth-dialog-form" onSubmit={handleSubmit}>
          <label>
            Username
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Enter username"
              autoComplete="username"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter password"
              autoComplete={isLogin ? 'current-password' : 'new-password'}
            />
          </label>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Working...' : isLogin ? 'Log in' : 'Sign up'}
          </button>
        </form>

        <footer className="auth-dialog-footer">
          <span>{isLogin ? "Don't have an account?" : 'Already have an account?'}</span>
          <button type="button" className="auth-link" onClick={toggleMode}>
            {isLogin ? 'Sign up' : 'Log in'}
          </button>
        </footer>
      </div>
    </div>
  );
}
