import type { Artwork } from '../types/artwork';
import '../styles/ArtworkCard.css';

interface ArtworkCardProps {
  artwork: Artwork;
  onView: (artwork: Artwork) => void;
  onPrimaryAction: (artwork: Artwork) => void;
  primaryActionLabel: string;
  primaryActionType: 'favorite' | 'remove';
  isActive?: boolean;
}

export default function ArtworkCard({
  artwork,
  onView,
  onPrimaryAction,
  primaryActionLabel,
  primaryActionType,
  isActive = false,
}: ArtworkCardProps) {
  return (
    <div className="artwork-card">
      <div
        className="artwork-card-image"
        style={{ backgroundImage: `url('${artwork.imageUrl}')` }}
      />
      <div className="artwork-card-overlay">
        <div className="artwork-card-actions">
          <button
            className="icon-btn view-btn"
            onClick={() => onView(artwork)}
            aria-label="View full artwork"
            title="View full artwork"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
            </svg>
          </button>
          <button
            className={`icon-btn ${primaryActionType}-btn ${isActive ? 'active' : ''}`}
            onClick={() => onPrimaryAction(artwork)}
            aria-label={primaryActionLabel}
            title={primaryActionLabel}
          >
            {primaryActionType === 'favorite' ? (
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 6 4 4 6.5 4c1.74 0 3.41.81 4.5 2.09C12.09 4.81 13.76 4 15.5 4 18 4 20 6 20 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.29 19.71 2.88 18.3 9.17 12 2.88 5.71 4.29 4.29 10.59 10.6l6.3-6.31z" />
              </svg>
            )}
          </button>
        </div>
      </div>
      <div className="artwork-card-meta">
        <h3 className="artwork-card-title" title={artwork.title}>
          {artwork.title}
        </h3>
        <p className="artwork-card-artist" title={artwork.artist}>
          {artwork.artist}
        </p>
        {(artwork.year || artwork.museumSource) && (
          <p className="artwork-card-meta-line">
            {artwork.year ?? 'Unknown year'}
            {artwork.museumSource ? ` • ${artwork.museumSource}` : ''}
          </p>
        )}
      </div>
    </div>
  );
}
