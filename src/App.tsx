import { useState } from 'react';
import ArtworkDisplayPage from './pages/ArtworkDisplayPage';
import ArchivePage from './pages/ArchivePage';
import FavoritesPage from './pages/FavoritesPage';
import AuthDialog from './components/AuthDialog';
import { useAuth } from './hooks/useAuth';
import './App.css';

function App() {
  const [activeView, setActiveView] = useState<'home' | 'archive' | 'favorites'>('home');
  const { isLoggedIn, username, openAuthDialog, logout } = useAuth();

  return (
    <div className="app-shell">
      <nav className="app-nav">
        <button
          type="button"
          className={activeView === 'home' ? 'active' : ''}
          onClick={() => setActiveView('home')}
        >
          Home
        </button>
        <button
          type="button"
          className={activeView === 'archive' ? 'active' : ''}
          onClick={() => setActiveView('archive')}
        >
          Archive
        </button>
        <button
          type="button"
          className={activeView === 'favorites' ? 'active' : ''}
          onClick={() => setActiveView('favorites')}
        >
          Favorites
        </button>
        {isLoggedIn ? (
          <button type="button" className="login-btn" onClick={logout}>
            Logout {username ? `(${username})` : ''}
          </button>
        ) : (
          <button type="button" className="login-btn" onClick={() => openAuthDialog('login')}>
            Login
          </button>
        )}
      </nav>

      {activeView === 'home' && <ArtworkDisplayPage />}
      {activeView === 'archive' && <ArchivePage />}
      {activeView === 'favorites' && <FavoritesPage />}
      <AuthDialog />
    </div>
  );
}

export default App
