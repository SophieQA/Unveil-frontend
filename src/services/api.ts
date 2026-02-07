import type {
  ArchiveResponse,
  Artwork,
  ArtworkResponse,
  FavoriteRequest,
  FavoritesResponse,
  ViewRecordRequest,
} from '../types/artwork';

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
      year: artwork.year,
      description: artwork.description,
      objectDate: artwork.objectDate,
      medium: artwork.medium,
      dimensions: artwork.dimensions,
      creditLine: artwork.creditLine,
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

  /**
   * Fetch artwork archive with optional search & pagination
   */
  async getArchive(params?: {
    query?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: Artwork[]; page: number; limit: number; total: number }> {
    const query = params?.query?.trim();
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 24;
    const searchParams = new URLSearchParams();

    if (query) searchParams.set('query', query);
    if (page) searchParams.set('page', String(page));
    if (limit) searchParams.set('limit', String(limit));

    const response = await fetch(
      `${API_BASE_URL}/api/artworks/archive${searchParams.toString() ? `?${searchParams}` : ''}`,
      { headers: getHeaders() }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch archive');
    }

    const data = (await response.json()) as ArchiveResponse;
    const rawItems =
      data.items ?? data.artworks ?? data.archive ?? data.data ?? data.results ?? [];
    const items = Array.isArray(rawItems) ? rawItems.map(normalizeArtwork) : [];
    const total = data.total ?? data.count ?? items.length;

    return {
      items,
      page: data.page ?? page,
      limit: data.limit ?? limit,
      total,
    };
  },

  /**
   * Add artwork to favorites
   */
  async addFavorite(artworkId: string, userId: string = USER_ID): Promise<void> {
    const payload: FavoriteRequest = {
      userId,
      artworkId,
    };

    console.log('addFavorite payload:', payload, 'USER_ID:', USER_ID);

    const response = await fetch(`${API_BASE_URL}/api/favorites`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error('Failed to add favorite');
    }
  },

  /**
   * Remove artwork from favorites
   */
  async removeFavorite(artworkId: string, userId: string = USER_ID): Promise<void> {
    const response = await fetch(
      `${API_BASE_URL}/api/favorites/${encodeURIComponent(artworkId)}?userId=${encodeURIComponent(userId)}`,
      { method: 'DELETE', headers: getHeaders() }
    );

    if (!response.ok) {
      throw new Error('Failed to remove favorite');
    }
  },

  /**
   * Fetch user's favorites with optional pagination
   */
  async getFavorites(params?: {
    userId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: Artwork[]; page: number; limit: number; total: number }> {
    const userId = params?.userId ?? USER_ID;
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 24;
    const searchParams = new URLSearchParams({ userId });

    if (page) searchParams.set('page', String(page));
    if (limit) searchParams.set('limit', String(limit));

    const response = await fetch(
      `${API_BASE_URL}/api/favorites?${searchParams.toString()}`,
      { headers: getHeaders() }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch favorites');
    }

    const data = (await response.json()) as FavoritesResponse;
    const rawItems = data.favorites ?? data.data ?? data.items ?? data.results ?? [];
    console.log('📋 First favorite record:', rawItems[0]);
    
    const items = Array.isArray(rawItems)
      ? rawItems
          .map((item) => {
            if (item && typeof item === 'object') {
              const record = item as Record<string, unknown>;
              // Backend should return nested artwork object
              if (record.artwork && typeof record.artwork === 'object') {
                const normalized = normalizeArtwork(record.artwork);
                console.log('🎨 Normalized artwork:', normalized);
                return normalized;
              }
            }
            const normalized = normalizeArtwork(item as Artwork);
            console.log('🎨 Normalized artwork (direct):', normalized);
            return normalized;
          })
          .filter((artwork) => Boolean(artwork.imageUrl))
      : [];

    const total = data.totalCount ?? data.total ?? data.count ?? items.length;

    return {
      items,
      page: data.currentPage ?? data.page ?? page,
      limit: data.pageSize ?? data.limit ?? limit,
      total,
    };
  },

  /**
   * Get detailed artwork information
   * Called when user clicks "View Details" button
   */
  async getArtworkDetails(artworkId: string, userId: string = USER_ID): Promise<Artwork | null> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/artworks/details?userId=${encodeURIComponent(userId)}&artworkId=${encodeURIComponent(artworkId)}`,
        { headers: getHeaders() }
      );

      if (response.status === 404) {
        console.warn('No historical record found for artwork:', artworkId);
        return null;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch artwork details');
      }

      const data = await response.json();
      const raw = data.artwork ?? data.data ?? data;
      return normalizeArtwork(raw);
    } catch (error) {
      console.error('Failed to fetch artwork details:', error);
      return null;
    }
  },
};

function normalizeArtwork(raw: unknown): Artwork {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid artwork payload');
  }

  const record = raw as Record<string, unknown>;
  const artworkId = String(record.artworkId ?? record.id ?? record._id ?? '');
  const id = String(record.id ?? record.artworkId ?? record._id ?? artworkId);
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
    artworkId,
    title,
    artist,
    imageUrl,
    museumSource,
    year: record.year ? String(record.year) : undefined,
    description: record.description ? String(record.description) : undefined,
    viewedAt: record.viewedAt ? String(record.viewedAt) : undefined,
    objectDate: record.objectDate ? String(record.objectDate) : undefined,
    medium: record.medium ? String(record.medium) : undefined,
    dimensions: record.dimensions ? String(record.dimensions) : undefined,
    creditLine: record.creditLine ? String(record.creditLine) : undefined,
  };
}
