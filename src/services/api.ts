import type { Artwork, ArtworkResponse, ViewRecordRequest } from '../types/artwork';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
const USER_ID = import.meta.env.VITE_USER_ID || 'user123';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'X-User-Id': USER_ID,
});

export const artworkAPI = {
  /**
  * Fetch a random artwork
   */
  async getRandomArtwork(): Promise<Artwork> {
    const response = await fetch(`${API_BASE_URL}/api/artworks/random`, {
      headers: getHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to fetch random artwork');
    }
    const data = await response.json();
    const raw = (data as ArtworkResponse).artwork ?? data?.artwork ?? data?.data ?? data;
    return normalizeArtwork(raw);
  },

  /**
   * Record artwork view (async, non-blocking)
   */
  recordView(artwork: Artwork): void {
    // Fire-and-forget; do not await response
    const payload: ViewRecordRequest = {
      artworkId: artwork.id,
      title: artwork.title,
      artist: artwork.artist,
      imageUrl: artwork.imageUrl,
      museumSource: artwork.museumSource,
    };

    fetch(`${API_BASE_URL}/api/artworks/view`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    }).catch((error) => {
      // Fail silently to avoid impacting UX
      console.warn('Failed to record view:', error);
    });
  },

  /**
    * Fetch view history (optional)
   */
  async getHistory(limit: number = 10): Promise<Artwork[]> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/artworks/history?limit=${limit}`,
        {
          headers: getHeaders(),
        }
      );
      if (!response.ok) {
        throw new Error('Failed to fetch history');
      }
      const data = await response.json();
      const history = data?.history ?? data?.data ?? [];
      return Array.isArray(history) ? history.map(normalizeArtwork) : [];
    } catch (error) {
      console.warn('Failed to fetch history from server:', error);
      return [];
    }
  },
};

function normalizeArtwork(raw: unknown): Artwork {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid artwork payload');
  }

  const record = raw as Record<string, unknown>;
  const id = String(record.id ?? record.artworkId ?? record._id ?? '');
  const title = String(record.title ?? record.name ?? 'Untitled');
  const artist = String(record.artist ?? record.artistName ?? record.creator ?? 'Unknown Artist');
  const imageUrl = String(
    record.imageUrl ??
      record.image ??
      record.image_url ??
      record.primaryImage ??
      record.primaryImageSmall ??
      ''
  );
  const museumSource = String(record.museumSource ?? record.museum ?? record.source ?? '');

  return {
    id,
    title,
    artist,
    imageUrl,
    museumSource,
    year: record.year ? String(record.year) : undefined,
    description: record.description ? String(record.description) : undefined,
    viewedAt: record.viewedAt ? String(record.viewedAt) : undefined,
  };
}
