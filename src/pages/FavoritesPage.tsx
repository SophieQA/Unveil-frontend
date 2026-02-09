import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Artwork } from '../types/artwork';
import { artworkAPI, isApiError } from '../services/api';
import ArtworkCard from '../components/ArtworkCard';
import ImageViewer from '../components/ImageViewer';
import { useAuth } from '../hooks/useAuth';
import '../styles/GalleryPage.css';

const PAGE_SIZE = 24;

export default function FavoritesPage() {
  const [items, setItems] = useState<Artwork[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null);
  const { isLoggedIn, userId, openAuthDialog, logout } = useAuth();

  const totalPages = useMemo(() => {
    if (!total) return 1;
    return Math.max(1, Math.ceil(total / PAGE_SIZE));
  }, [total]);

  const loadFavorites = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      if (!isLoggedIn) {
        setItems([]);
        setTotal(0);
        return;
      }
      const response = await artworkAPI.getFavorites({
        userId: userId ?? undefined,
        page,
        limit: PAGE_SIZE,
      });
      setItems(response.items);
      setTotal(response.total);
    } catch (err) {
      if (isApiError(err) && err.status === 401) {
        logout();
        openAuthDialog('login');
        return;
      }
      console.error('Failed to load favorites:', err);
      setError(err instanceof Error ? err.message : 'Failed to load favorites');
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn, logout, openAuthDialog, page, userId]);

  useEffect(() => {
    void loadFavorites();
  }, [loadFavorites]);

  const removeFavorite = async (artwork: Artwork) => {
    const favoriteKey = artwork.artworkId ?? artwork.id;
    try {
      await artworkAPI.removeFavorite(favoriteKey, userId ?? undefined);
      setItems((prev) => prev.filter((item) => (item.artworkId ?? item.id) !== favoriteKey));
      setTotal((prev) => Math.max(0, prev - 1));
    } catch (err) {
      if (isApiError(err) && err.status === 401) {
        logout();
        openAuthDialog('login');
        return;
      }
      console.error('Failed to remove favorite:', err);
      alert('Failed to remove favorite');
    }
  };

  const viewArtworkDetails = (artwork: Artwork) => {
    setSelectedArtwork(artwork);
  };

  return (
    <div className="gallery-page">
      <header className="gallery-header">
        <div>
          <h2 className="gallery-title favorites-title">
            <span className="favorites-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M12.1 20.3 12 20.4l-.1-.1C7.1 16 4 13.1 4 9.8 4 7.4 5.9 5.5 8.3 5.5c1.4 0 2.8.7 3.7 1.8.9-1.1 2.3-1.8 3.7-1.8 2.4 0 4.3 1.9 4.3 4.3 0 3.3-3.1 6.2-7.9 10.5Z" />
              </svg>
            </span>
            My Favorites
          </h2>
          <p className="gallery-subtitle">
            Your personal collection of {items.length} beloved artworks
          </p>
        </div>
      </header>

      {!isLoggedIn ? (
        <div className="gallery-state">
          Please log in to view your favorites.
          <button type="button" onClick={() => openAuthDialog('login')}>
            Login
          </button>
        </div>
      ) : isLoading ? (
        <div className="gallery-state">Loading favorites...</div>
      ) : error ? (
        <div className="gallery-state">{error}</div>
      ) : items.length === 0 ? (
        <div className="gallery-state">No favorites yet.</div>
      ) : (
        <div className="gallery-grid">
          {items.map((artwork) => (
            <ArtworkCard
              key={artwork.id}
              artwork={artwork}
              onView={viewArtworkDetails}
              onPrimaryAction={removeFavorite}
              primaryActionLabel="Remove favorite"
              primaryActionType="remove"
            />
          ))}
        </div>
      )}

      <div className="gallery-footer">
        <button
          onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          disabled={page <= 1}
        >
          Previous
        </button>
        <button disabled>
          Page {page} / {totalPages}
        </button>
        <button
          onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          disabled={page >= totalPages}
        >
          Next
        </button>
      </div>

      {selectedArtwork && (
        <ImageViewer
          artwork={selectedArtwork}
          onClose={() => setSelectedArtwork(null)}
        />
      )}
    </div>
  );
}
