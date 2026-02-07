import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Artwork } from '../types/artwork';
import { artworkAPI } from '../services/api';
import ArtworkCard from '../components/ArtworkCard';
import ImageViewer from '../components/ImageViewer';
import '../styles/GalleryPage.css';

const PAGE_SIZE = 24;

export default function ArchivePage() {
  const [items, setItems] = useState<Artwork[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [queryInput, setQueryInput] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null);

  const totalPages = useMemo(() => {
    if (!total) return 1;
    return Math.max(1, Math.ceil(total / PAGE_SIZE));
  }, [total]);

  const loadArchive = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await artworkAPI.getArchive({
        query: query || undefined,
        page,
        limit: PAGE_SIZE,
      });
      setItems(response.items);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load archive');
    } finally {
      setIsLoading(false);
    }
  }, [page, query]);

  const loadFavorites = useCallback(async () => {
    try {
      const response = await artworkAPI.getFavorites({ page: 1, limit: 200 });
      const ids = new Set(response.items.map((item) => item.artworkId ?? item.id));
      setFavorites(ids);
    } catch (err) {
      console.warn('Failed to load favorites:', err);
    }
  }, []);

  useEffect(() => {
    void loadArchive();
  }, [loadArchive]);

  useEffect(() => {
    void loadFavorites();
  }, [loadFavorites]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setQuery(queryInput.trim());
  };

  const toggleFavorite = async (artwork: Artwork) => {
    const favoriteKey = artwork.artworkId ?? artwork.id;
    const isFavorited = favorites.has(favoriteKey);
    try {
      if (isFavorited) {
        await artworkAPI.removeFavorite(favoriteKey);
        setFavorites((prev) => {
          const next = new Set(prev);
          next.delete(favoriteKey);
          return next;
        });
      } else {
        await artworkAPI.addFavorite(favoriteKey);
        setFavorites((prev) => new Set(prev).add(favoriteKey));
      }
    } catch (err) {
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

      {isLoading ? (
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
                favorites.has(artwork.artworkId ?? artwork.id) ? 'Remove favorite' : 'Add favorite'
              }
              primaryActionType="favorite"
              isActive={favorites.has(artwork.artworkId ?? artwork.id)}
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
