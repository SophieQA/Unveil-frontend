import { useState } from 'react';
import ArtworkDisplayPage from './pages/ArtworkDisplayPage';
import ArchivePage from './pages/ArchivePage';
import FavoritesPage from './pages/FavoritesPage';
import TourPlanPage from './pages/TourPlanPage';
import AuthDialog from './components/AuthDialog';
import { useAuth } from './hooks/useAuth';
import './App.css';

function App() {
  const [activeView, setActiveView] = useState<'home' | 'archive' | 'favorites' | 'tour-plan'>(
    'home'
  );
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
        <button
          type="button"
          className={activeView === 'tour-plan' ? 'active' : ''}
          onClick={() => setActiveView('tour-plan')}
        >
          Tour Plan
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
      {activeView === 'tour-plan' && <TourPlanPage />}
      <AuthDialog />
    </div>
  );
}

export default App
