import { useState } from 'react';
import ArtworkDisplayPage from './pages/ArtworkDisplayPage';
import ArchivePage from './pages/ArchivePage';
import FavoritesPage from './pages/FavoritesPage';
import './App.css';

function App() {
  const [activeView, setActiveView] = useState<'home' | 'archive' | 'favorites'>('home');

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
      </nav>

      {activeView === 'home' && <ArtworkDisplayPage />}
      {activeView === 'archive' && <ArchivePage />}
      {activeView === 'favorites' && <FavoritesPage />}
    </div>
  );
}

export default App
