import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Artwork } from '../types/artwork';
import { artworkAPI, isApiError } from '../services/api';
import ArtworkCard from '../components/ArtworkCard';
import ImageViewer from '../components/ImageViewer';
import { useAuth } from '../hooks/useAuth';
import '../styles/GalleryPage.css';

const PAGE_SIZE = 24;

export default function ArchivePage() {
  const [items, setItems] = useState<Artwork[]>([]);
  const [queryInput, setQueryInput] = useState('');
  const [query, setQuery] = useState('');
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

  const loadArchive = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      if (!isLoggedIn) {
        setItems([]);
        setTotal(0);
        return;
      }
      const response = await artworkAPI.getUserArchive({
        userId: userId ?? undefined,
        query: query || undefined,
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
      setError(err instanceof Error ? err.message : 'Failed to load archive');
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn, logout, openAuthDialog, page, query, userId]);

  useEffect(() => {
    void loadArchive();
  }, [loadArchive]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setQuery(queryInput.trim());
  };

  const toggleFavorite = async (artwork: Artwork) => {
    if (!isLoggedIn) {
      openAuthDialog('login');
      return;
    }
    const favoriteKey = artwork.artworkId ?? artwork.id;
    const isFavorited = Boolean(artwork.isFavorited);
    try {
      if (isFavorited) {
        await artworkAPI.removeFavorite(favoriteKey, userId ?? undefined);
        setItems((prev) =>
          prev.map((item) =>
            (item.artworkId ?? item.id) === favoriteKey
              ? { ...item, isFavorited: false }
              : item
          )
        );
      } else {
        await artworkAPI.addFavorite(favoriteKey, userId ?? undefined);
        setItems((prev) =>
          prev.map((item) =>
            (item.artworkId ?? item.id) === favoriteKey
              ? { ...item, isFavorited: true }
              : item
          )
        );
      }
    } catch (err) {
      if (isApiError(err)) {
        if (err.status === 409) {
          setItems((prev) =>
            prev.map((item) =>
              (item.artworkId ?? item.id) === favoriteKey
                ? { ...item, isFavorited: true }
                : item
            )
          );
          alert('Already favorited');
          return;
        }
        if (err.status === 401) {
          logout();
          openAuthDialog('login');
          return;
        }
      }
      console.error('Failed to update favorite:', err);
      alert('Failed to update favorite');
    }
  };

  return (
    <div className="gallery-page">
      <header className="gallery-header">
        <div>
          <h2 className="gallery-title">Artwork Archive</h2>
          <p className="gallery-subtitle">
            Browse the complete archive of featured artworks.
          </p>
        </div>
        <form className="gallery-search" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Search by title or artist"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
          />
          <button type="submit">Search</button>
        </form>
      </header>

      {!isLoggedIn ? (
        <div className="gallery-state">
          Please log in to view your archive.
          <button type="button" onClick={() => openAuthDialog('login')}>
            Login
          </button>
        </div>
      ) : isLoading ? (
        <div className="gallery-state">Loading archive...</div>
      ) : error ? (
        <div className="gallery-state">{error}</div>
      ) : items.length === 0 ? (
        <div className="gallery-state">No artworks found.</div>
      ) : (
        <div className="gallery-grid">
          {items.map((artwork) => (
            <ArtworkCard
              key={artwork.id}
              artwork={artwork}
              onView={setSelectedArtwork}
              onPrimaryAction={toggleFavorite}
              primaryActionLabel={
                artwork.isFavorited ? 'Remove favorite' : 'Add favorite'
              }
              primaryActionType="favorite"
              isActive={Boolean(artwork.isFavorited)}
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
