import { useState, useEffect, useRef, useCallback } from 'react';
import { artworkAPI } from '../services/api';
import { useArtworkHistory } from '../hooks/useArtworkHistory';
import type { Artwork } from '../types/artwork';
import ImageViewer from '../components/ImageViewer.tsx';
import '../styles/ArtworkDisplayPage.css';

export default function ArtworkDisplayPage() {
  const [currentArtwork, setCurrentArtwork] = useState<Artwork | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isBrowsingHistory, setIsBrowsingHistory] = useState(false);
  const hasLoadedInitialArtwork = useRef(false);
  const lastNavDirection = useRef<'prev' | 'next' | null>(null);

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
      const artwork = await artworkAPI.getRandomArtwork();
      setCurrentArtwork(artwork);
      addToHistory(artwork);
      artworkAPI.recordView(artwork);
      setIsBrowsingHistory(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load artwork');
    } finally {
      setIsLoading(false);
    }
  }, [addToHistory]);

  // Load initial random artwork
  useEffect(() => {
    if (hasLoadedInitialArtwork.current) return;
    hasLoadedInitialArtwork.current = true;
    const loadInitialArtwork = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const artwork = await artworkAPI.getRandomArtwork();
        setCurrentArtwork(artwork);
        addToHistory(artwork);
        artworkAPI.recordView(artwork);
        setIsBrowsingHistory(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load artwork');
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialArtwork();
  }, [addToHistory]);

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
    }
  }, [currentIndex, history]);

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
    <div className="artwork-display-page">
      {/* Background with artwork image */}
      <div
        ref={bgImageRef}
        className="artwork-background"
        style={{
          backgroundImage: currentArtwork
            ? `url('${currentArtwork.imageUrl}')`
            : 'none',
        }}
        onLoad={handleLoad}
      />

      {/* Overlay for darkening the background */}
      <div className="artwork-overlay" />

      {/* Top branding */}
      <header className="header">
        <h1 className="logo">Unveil</h1>
      </header>

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
