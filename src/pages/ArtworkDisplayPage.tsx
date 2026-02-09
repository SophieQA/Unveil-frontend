import { useState, useEffect, useRef, useCallback } from 'react';
import { artworkAPI, isApiError } from '../services/api';
import { useArtworkHistory } from '../hooks/useArtworkHistory';
import type { Artwork } from '../types/artwork';
import ImageViewer from '../components/ImageViewer.tsx';
import { useAuth } from '../hooks/useAuth';
import '../styles/ArtworkDisplayPage.css';

export default function ArtworkDisplayPage() {
  const [currentArtwork, setCurrentArtwork] = useState<Artwork | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isBrowsingHistory, setIsBrowsingHistory] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [displayMode, setDisplayMode] = useState<'default' | 'minimal'>(() => {
    if (typeof window === 'undefined') return 'default';
    return (window.localStorage.getItem('displayMode') as 'default' | 'minimal') || 'default';
  });
  const hasLoadedInitialArtwork = useRef(false);
  const lastNavDirection = useRef<'prev' | 'next' | null>(null);
  const { isLoggedIn, userId, openAuthDialog, logout } = useAuth();

  const {
    history,
    currentIndex,
    addToHistory,
    goToPrevious,
    goToNext,
    isAtEnd,
  } = useArtworkHistory();

  const bgImageRef = useRef<HTMLDivElement>(null);

  const loadNewArtwork = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const artwork = await artworkAPI.getRandomArtwork({ userId: userId ?? undefined });
      setCurrentArtwork(artwork);
      addToHistory(artwork);
      setIsBrowsingHistory(false);
      setIsFavorited(Boolean(artwork.isFavorited));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load artwork');
    } finally {
      setIsLoading(false);
    }
  }, [addToHistory, userId]);

  // Load initial random artwork
  useEffect(() => {
    if (hasLoadedInitialArtwork.current) return;
    hasLoadedInitialArtwork.current = true;
    const loadInitialArtwork = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const artwork = await artworkAPI.getRandomArtwork({ userId: userId ?? undefined });
        setCurrentArtwork(artwork);
        addToHistory(artwork);
        setIsBrowsingHistory(false);
        setIsFavorited(Boolean(artwork.isFavorited));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load artwork');
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialArtwork();
  }, [addToHistory, userId]);

  const handlePreviousClick = useCallback(() => {
    lastNavDirection.current = 'prev';
    if (!isBrowsingHistory) {
      setIsBrowsingHistory(true);
    }
    goToPrevious();
  }, [isBrowsingHistory, goToPrevious]);

  const handleNextClick = useCallback(() => {
    if (isBrowsingHistory) {
      lastNavDirection.current = 'next';
      if (!isAtEnd) {
        goToNext();
      }
      return;
    }

    void loadNewArtwork();
  }, [isAtEnd, isBrowsingHistory, goToNext, loadNewArtwork]);

  useEffect(() => {
    if (isBrowsingHistory && isAtEnd && lastNavDirection.current === 'next') {
      setIsBrowsingHistory(false);
      lastNavDirection.current = null;
    }
  }, [isAtEnd, isBrowsingHistory]);
  // Update displayed artwork when history index changes
  useEffect(() => {
    if (currentIndex >= 0 && history[currentIndex]) {
      setCurrentArtwork(history[currentIndex]);
      setIsFavorited(Boolean(history[currentIndex].isFavorited));
    }
  }, [currentIndex, history]);

  const handleFavoriteToggle = useCallback(async () => {
    if (!currentArtwork) return;
    if (!isLoggedIn) {
      openAuthDialog('login');
      return;
    }
    const favoriteKey = currentArtwork.artworkId ?? currentArtwork.id;
    try {
      if (isFavorited) {
        await artworkAPI.removeFavorite(favoriteKey, userId ?? undefined);
        setIsFavorited(false);
      } else {
        await artworkAPI.addFavorite(favoriteKey, userId ?? undefined);
        setIsFavorited(true);
      }
    } catch (err) {
      if (isApiError(err)) {
        if (err.status === 409) {
          setIsFavorited(true);
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
  }, [currentArtwork, isFavorited, isLoggedIn, logout, openAuthDialog, userId]);

  const handleDisplayModeToggle = () => {
    setDisplayMode((prev) => {
      const next = prev === 'default' ? 'minimal' : 'default';
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('displayMode', next);
      }
      return next;
    });
  };

  const handleLoad = () => {
    if (currentArtwork && bgImageRef.current) {
      // Adjust background size based on image aspect ratio
      const img = new Image();
      img.src = currentArtwork.imageUrl;
      img.onload = () => {
        const aspectRatio = img.width / img.height;
        const container = bgImageRef.current;
        if (container) {
          if (aspectRatio > window.innerWidth / window.innerHeight) {
            // Image is wider - fit to width
            container.style.backgroundSize = 'cover';
          } else {
            // Image is taller - fit to height
            container.style.backgroundSize = 'cover';
          }
        }
      };
    }
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isViewerOpen) return;

      if (e.key === 'ArrowLeft') {
        handlePreviousClick();
      } else if (e.key === 'ArrowRight') {
        handleNextClick();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isViewerOpen, isBrowsingHistory, isAtEnd, handleNextClick, handlePreviousClick]);

  return (
    <div className={`artwork-display-page ${displayMode === 'minimal' ? 'minimal' : ''}`}>
      {/* Background with artwork image */}
      <div
        ref={bgImageRef}
        className="artwork-background"
        style={{
          backgroundImage: currentArtwork
            ? `url('${currentArtwork.imageUrl}')`
            : 'none',
        }}
        onClick={() => currentArtwork && setIsViewerOpen(true)}
        onLoad={handleLoad}
      />

      {/* Overlay for darkening the background */}
      <div className="artwork-overlay" />

      {/* Top branding */}
      <header className="header">
        <h1 className="logo">Unveil</h1>
      </header>

      <button
        className="display-mode-toggle"
        onClick={handleDisplayModeToggle}
        type="button"
      >
        {displayMode === 'default' ? 'Only Artwork' : 'Default View'}
      </button>

      {/* Main content - centered title and artist */}
      <main className="main-content">
        {isLoading ? (
          <div className="loading">Loading artwork...</div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : currentArtwork ? (
          <div className="artwork-info">
            <h2 className="artwork-title">{currentArtwork.title}</h2>
            <p className="artwork-artist">by {currentArtwork.artist}</p>
            <button
              className="view-full-btn"
              onClick={() => setIsViewerOpen(true)}
              title="Click to view full image with zoom and pan controls"
            >
              View Full Artwork
            </button>
          </div>
        ) : null}
      </main>

      {currentArtwork && !isLoading && !error && (
        <button
          className={`favorite-btn favorite-float ${isFavorited ? 'active' : ''}`}
          onClick={handleFavoriteToggle}
          aria-label={isFavorited ? 'Remove favorite' : 'Add favorite'}
          title={isFavorited ? 'Remove favorite' : 'Add favorite'}
        >
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M12.1 20.3 12 20.4l-.1-.1C7.1 16 4 13.1 4 9.8 4 7.4 5.9 5.5 8.3 5.5c1.4 0 2.8.7 3.7 1.8.9-1.1 2.3-1.8 3.7-1.8 2.4 0 4.3 1.9 4.3 4.3 0 3.3-3.1 6.2-7.9 10.5Z" />
          </svg>
        </button>
      )}

      {/* Navigation controls */}
      <nav className="controls-container">
        {/* Left arrow - previous */}
        <button
          className="control-btn left-btn"
          onClick={handlePreviousClick}
          disabled={!isBrowsingHistory && history.length === 0}
          title="View previous artwork"
          aria-label="Previous artwork"
        >
          <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
          </svg>
        </button>

        {/* Right arrow / Refresh button */}
        {isBrowsingHistory && !isAtEnd ? (
          <button
            className="control-btn right-btn"
            onClick={handleNextClick}
            title={isAtEnd ? 'No more history' : 'View next artwork'}
            aria-label="Next artwork"
          >
            <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
              <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
            </svg>
          </button>
        ) : (
          <button
            className="control-btn right-btn refresh-btn"
            onClick={loadNewArtwork}
            disabled={isLoading}
            title="Get new random artwork"
            aria-label="New artwork"
          >
            <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
              <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-8 3.58-8 8s3.58 8 8 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h6V5l-1.35 1.35z" />
            </svg>
          </button>
        )}
      </nav>

      {/* Image Viewer Modal */}
      {isViewerOpen && currentArtwork && (
        <ImageViewer
          artwork={currentArtwork}
          onClose={() => setIsViewerOpen(false)}
        />
      )}
    </div>
  );
}
