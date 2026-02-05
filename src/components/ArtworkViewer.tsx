import { useEffect, useState, useRef } from 'react';
import { useArtworkHistory } from '../hooks/useArtworkHistory';
import { useSwipeGesture } from '../hooks/useSwipeGesture';
import type { Artwork } from '../types/artwork';
import './ArtworkViewer.css';

export function ArtworkViewer() {
  const {
    currentArtwork,
    isLoading,
    fetchNext,
    goToPrevious,
    goToNext,
    canGoBack,
    canGoForward,
    currentIndex,
    history,
  } = useArtworkHistory();

  const [displayedArtwork, setDisplayedArtwork] = useState<Artwork | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showLightbox, setShowLightbox] = useState(false);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const longPressTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!currentArtwork && !isLoading) {
      loadNextArtwork();
    }
  }, []); 

  useEffect(() => {
    if (currentArtwork) {
      setDisplayedArtwork(currentArtwork);
    }
  }, [currentArtwork]);

  const loadNextArtwork = async () => {
    try {
      setError(null);
      await fetchNext();
    } catch (err) {
      setError('Failed to load artwork. Please try again.');
    }
  };

  const loadPreviousArtwork = () => {
    if (canGoBack) {
      goToPrevious();
    }
  };

  // Advance to next artwork
  const loadNextInHistory = () => {
    if (canGoForward) {
      goToNext();
    } else {
      // At end of history, load a new random artwork
      loadNextArtwork();
    }
  };

  // Open full-screen viewer
  const openLightbox = () => {
    setShowLightbox(true);
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // Close full-screen viewer
  const closeLightbox = () => {
    setShowLightbox(false);
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // Zoom controls
  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.5, 5));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.5, 0.5));

  // Drag start
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  // Dragging
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  // Drag end
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Long press to save image
  const handleLongPressStart = () => {
    longPressTimer.current = window.setTimeout(() => {
      if (displayedArtwork) {
        const link = document.createElement('a');
        link.href = displayedArtwork.imageUrl;
        link.download = `${displayedArtwork.title}-${displayedArtwork.artist}.jpg`;
        link.click();
      }
    }, 800);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // Setup gesture listeners
  useSwipeGesture({
    onSwipeLeft: loadNextInHistory,
    onSwipeRight: loadPreviousArtwork,
    threshold: 30,
  });

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showLightbox) {
        if (e.key === 'Escape') closeLightbox();
        if (e.key === '+' || e.key === '=') handleZoomIn();
        if (e.key === '-') handleZoomOut();
      } else {
        if (e.key === 'ArrowLeft') loadPreviousArtwork();
        if (e.key === 'ArrowRight') loadNextInHistory();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canGoBack, canGoForward, showLightbox]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!displayedArtwork) {
    return (
      <div className="artwork-viewer loading-state">
        <header className="app-header">
          <h1 className="app-title">Unveil</h1>
        </header>
        {error ? (
          <div className="error-overlay">
            <p>{error}</p>
            <button onClick={loadNextArtwork} className="retry-button">
              Retry
            </button>
          </div>
        ) : (
          <div className="loading-overlay">Loading...</div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="artwork-viewer">
        {/* Full-screen background artwork */}
        <div
          className="artwork-background"
          style={{ backgroundImage: `url(${displayedArtwork.imageUrl})` }}
          onClick={openLightbox}
        />

        {/* App header */}
        <header className="app-header">
          <h1 className="app-title">Unveil</h1>
        </header>

        {/* Navigation controls */}
        <div className="floating-controls">
          {canGoBack && (
            <button
              className="control-button prev-button"
              onClick={loadPreviousArtwork}
              disabled={isLoading}
              aria-label="Previous artwork"
              title="Previous artwork"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M15 18L9 12L15 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}

          <button
            className="control-button next-button"
            onClick={loadNextInHistory}
            disabled={isLoading}
            aria-label={canGoForward ? 'Next artwork' : 'New random artwork'}
            title={canGoForward ? 'Next artwork' : 'New random artwork'}
          >
            {canGoForward ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M9 18L15 12L9 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M21.5 2V9M21.5 2H14.5M21.5 2L13.5 10M10 2.5H7.5C6.83696 2.5 6.20107 2.76339 5.73223 3.23223C5.26339 3.70107 5 4.33696 5 5V19C5 19.663 5.26339 20.2989 5.73223 20.7678C6.20107 21.2366 6.83696 21.5 7.5 21.5H17.5C18.163 21.5 18.7989 21.2366 19.2678 20.7678C19.7366 20.2989 20 19.663 20 19V14"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
        </div>

        {/* Artwork info overlay */}
        <div className="artwork-info-overlay">
          <h2 className="artwork-title">{displayedArtwork.title}</h2>
          <p className="artwork-artist">{displayedArtwork.artist}</p>
          {displayedArtwork.year && (
            <p className="artwork-year">{displayedArtwork.year}</p>
          )}
        </div>
      </div>

      {/* Lightbox modal */}
      {showLightbox && (
        <div className="lightbox-overlay" onClick={closeLightbox}>
          <button
            className="lightbox-close"
            onClick={closeLightbox}
            aria-label="Close"
          >
            ✕
          </button>

          <div className="lightbox-controls">
            <button
              className="zoom-button"
              onClick={(e) => {
                e.stopPropagation();
                handleZoomOut();
              }}
              aria-label="Zoom out"
            >
              −
            </button>
            <span className="zoom-level">{Math.round(scale * 100)}%</span>
            <button
              className="zoom-button"
              onClick={(e) => {
                e.stopPropagation();
                handleZoomIn();
              }}
              aria-label="Zoom in"
            >
              +
            </button>
          </div>

          <div
            className="lightbox-content"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <img
              src={displayedArtwork.imageUrl}
              alt={displayedArtwork.title}
              className="lightbox-image"
              style={{
                transform: `scale(${scale}) translate(${position.x / scale}px, ${
                  position.y / scale
                }px)`,
                cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                handleLongPressStart();
              }}
              onMouseDown={handleLongPressStart}
              onMouseUp={handleLongPressEnd}
              onMouseLeave={handleLongPressEnd}
              draggable={false}
            />
          </div>

          <div className="lightbox-info">
            <h3>{displayedArtwork.title}</h3>
            <p>{displayedArtwork.artist}</p>
            {displayedArtwork.year && <p>{displayedArtwork.year}</p>}
            <p className="lightbox-source">
              {getSourceName(displayedArtwork.museumSource)}
            </p>
          </div>
        </div>
      )}
    </>
  );
}

function getSourceName(museumSource: string): string {
  const sourceNames: Record<string, string> = {
    met: 'The Metropolitan Museum of Art',
    rijksmuseum: 'Rijksmuseum',
    artinstitute: 'Art Institute of Chicago',
  };
  return sourceNames[museumSource] || museumSource;
}
