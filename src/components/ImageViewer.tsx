import { useState, useRef, useEffect } from 'react';
import type { Artwork } from '../types/artwork';
import '../styles/ImageViewer.css';

interface ImageViewerProps {
  artwork: Artwork;
  onClose: () => void;
}

export default function ImageViewer({ artwork, onClose }: ImageViewerProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const longPressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const MIN_SCALE = 0.5;
  const MAX_SCALE = 4;
  const ZOOM_STEP = 0.2;

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + ZOOM_STEP, MAX_SCALE));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - ZOOM_STEP, MIN_SCALE));
  };

  const resetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-') {
        handleZoomOut();
      } else if (e.key === '0') {
        resetZoom();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleMouseWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });

    // Start long press timer for download
    longPressTimeoutRef.current = setTimeout(() => {
      // Long press detected - could trigger download
      handleDownload();
    }, 500);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;

    // Clear long press timer if mouse moves
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }

    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;

    // Constrain movement to prevent too much panning
    if (scale > 1) {
      setPosition({ x: newX, y: newY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(artwork.imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${artwork.title}-${artwork.artist}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download image:', error);
      alert('Failed to download image');
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch zoom
      setIsDragging(false);
    } else if (e.touches.length === 1) {
      // Single touch - pan
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch zoom
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      // Pinch zoom support could be implemented here
      void Math.hypot(
        touch1.clientX - touch2.clientX,
        touch1.clientY - touch2.clientY
      );
      // Simplified pinch handling - could be enhanced
    } else if (isDragging && e.touches.length === 1) {
      // Pan
      const newX = e.touches[0].clientX - dragStart.x;
      const newY = e.touches[0].clientY - dragStart.y;
      setPosition({ x: newX, y: newY });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  return (
    <div className="image-viewer-modal" onClick={onClose}>
      <div
        className="image-viewer-content"
        onClick={(e) => e.stopPropagation()}
        onWheel={handleMouseWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        ref={containerRef}
      >
        {/* Close button */}
        <button
          className="close-btn"
          onClick={onClose}
          aria-label="Close image viewer"
          title="Close (Esc)"
        >
          ✕
        </button>

        {/* Controls */}
        <div className="viewer-controls">
          <button
            onClick={handleZoomOut}
            className="control-btn zoom-btn"
            disabled={scale <= MIN_SCALE}
            title="Zoom out (- key)"
          >
            −
          </button>
          <span className="zoom-level">{Math.round(scale * 100)}%</span>
          <button
            onClick={handleZoomIn}
            className="control-btn zoom-btn"
            disabled={scale >= MAX_SCALE}
            title="Zoom in (+ key)"
          >
            +
          </button>
          <button
            onClick={resetZoom}
            className="control-btn"
            disabled={scale === 1 && position.x === 0 && position.y === 0}
            title="Reset zoom (0 key)"
          >
            Reset
          </button>
          <button
            onClick={handleDownload}
            className="control-btn download-btn"
            title="Download image (or long press on image)"
          >
            ⬇
          </button>
        </div>

        {/* Image */}
        <div className="image-container" style={{ cursor: isDragging ? 'grabbing' : 'grab' }}>
          <img
            ref={imageRef}
            src={artwork.imageUrl}
            alt={artwork.title}
            className={`viewer-image ${isDragging ? 'dragging' : ''}`}
            style={{
              transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
              cursor: isDragging ? 'grabbing' : 'grab',
            }}
            onLoad={() => setImageLoaded(true)}
            draggable={false}
          />
        </div>

        {/* Artwork info */}
        <div className="viewer-info">
          <h3>{artwork.title}</h3>
          <p className="artist">{artwork.artist}</p>
          {artwork.year && <p className="year">{artwork.year}</p>}
          {artwork.description && (
            <p className="description">{artwork.description}</p>
          )}
          <p className="source">From: {artwork.museumSource}</p>
        </div>

        {/* Loading indicator */}
        {!imageLoaded && <div className="loading-spinner">Loading image...</div>}
      </div>
    </div>
  );
}
