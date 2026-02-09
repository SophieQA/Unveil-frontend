import type {
  ArchiveResponse,
  Artwork,
  ArtworkResponse,
  FavoriteRequest,
  FavoritesResponse,
} from '../types/artwork';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:10000';
const USER_ID = import.meta.env.VITE_USER_ID || 'user123';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export const isApiError = (error: unknown): error is ApiError => error instanceof ApiError;

const getActiveUserId = () => {
  if (typeof window !== 'undefined') {
    const stored = window.localStorage.getItem('userId');
    if (stored) return stored;
  }
  return USER_ID;
};

const getHeaders = (userId?: string) => {
  const resolvedUserId = userId ?? getActiveUserId();
  return {
    'Content-Type': 'application/json',
    ...(resolvedUserId ? { 'X-User-Id': resolvedUserId } : {}),
  };
};

const buildQueryString = (params: Record<string, string | number | undefined>) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).length > 0) {
      searchParams.set(key, String(value));
    }
  });
  const query = searchParams.toString();
  return query ? `?${query}` : '';
};

const toApiError = async (response: Response, fallbackMessage: string) => {
  try {
    const text = await response.text();
    if (text) {
      return new ApiError(text, response.status);
    }
  } catch {
    // ignore parse errors
  }
  return new ApiError(fallbackMessage, response.status);
};

export const artworkAPI = {
  /**
   * Fetch a random artwork
   */
  async getRandomArtwork(params?: { userId?: string }): Promise<Artwork> {
    const userId = params?.userId ?? getActiveUserId();
    const response = await fetch(
      `${API_BASE_URL}/api/artworks/random${buildQueryString({ userId })}`,
      {
        headers: getHeaders(userId),
      }
    );

    if (!response.ok) {
      throw await toApiError(response, 'Failed to fetch random artwork');
    }

    const data = await response.json();
    const raw = (data as ArtworkResponse).artwork ?? data?.artwork ?? data?.data ?? data;
    return normalizeArtwork(raw);
  },

  /**
    * Fetch view history (optional)
   */
  async getHistory(limit: number = 10, userId?: string): Promise<Artwork[]> {
    try {
      const response = await artworkAPI.getUserArchive({
        userId,
        limit,
      });
      return response.items;
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
      throw await toApiError(response, 'Failed to fetch archive');
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
   * Fetch user's archive (view history) with optional pagination
   */
  async getUserArchive(params?: {
    userId?: string;
    page?: number;
    limit?: number;
    query?: string;
  }): Promise<{ items: Artwork[]; page: number; limit: number; total: number }> {
    const userId = params?.userId ?? getActiveUserId();
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 24;
    const query = params?.query?.trim();

    const response = await fetch(
      `${API_BASE_URL}/api/artworks/archive/user/${encodeURIComponent(userId)}${buildQueryString({
        page,
        limit,
        query,
      })}`,
      { headers: getHeaders(userId) }
    );

    if (!response.ok) {
      throw await toApiError(response, 'Failed to fetch user archive');
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
  async addFavorite(artworkId: string, userId?: string): Promise<void> {
    const resolvedUserId = userId ?? getActiveUserId();
    const payload: FavoriteRequest = {
      userId: resolvedUserId,
      artworkId,
    };

    const response = await fetch(`${API_BASE_URL}/api/favorites`, {
      method: 'POST',
      headers: getHeaders(resolvedUserId),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw await toApiError(response, 'Failed to add favorite');
    }
  },

  /**
   * Remove artwork from favorites
   */
  async removeFavorite(artworkId: string, userId?: string): Promise<void> {
    const resolvedUserId = userId ?? getActiveUserId();
    const response = await fetch(
      `${API_BASE_URL}/api/favorites/${encodeURIComponent(artworkId)}?userId=${encodeURIComponent(resolvedUserId)}`,
      { method: 'DELETE', headers: getHeaders(resolvedUserId) }
    );

    if (!response.ok) {
      throw await toApiError(response, 'Failed to remove favorite');
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
    const userId = params?.userId ?? getActiveUserId();
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 24;
    const searchParams = new URLSearchParams({ userId });

    if (page) searchParams.set('page', String(page));
    if (limit) searchParams.set('limit', String(limit));

    const response = await fetch(
      `${API_BASE_URL}/api/favorites?${searchParams.toString()}`,
      { headers: getHeaders(userId) }
    );

    if (!response.ok) {
      throw await toApiError(response, 'Failed to fetch favorites');
    }

    const data = (await response.json()) as FavoritesResponse;
    const rawItems = data.favorites ?? data.data ?? data.items ?? data.results ?? [];

    const items = Array.isArray(rawItems)
      ? rawItems
          .map((item) => {
            if (item && typeof item === 'object') {
              const record = item as Record<string, unknown>;
              // Backend should return nested artwork object
              if (record.artwork && typeof record.artwork === 'object') {
                const normalized = normalizeArtwork(record.artwork);
                return normalized;
              }
              if (record.artworkData && typeof record.artworkData === 'object') {
                return normalizeArtwork(record.artworkData);
              }
            }
            const normalized = normalizeArtwork(item as Artwork);
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
  async getArtworkDetails(artworkId: string, userId?: string): Promise<Artwork | null> {
    const resolvedUserId = userId ?? getActiveUserId();
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/artworks/details?userId=${encodeURIComponent(resolvedUserId)}&artworkId=${encodeURIComponent(artworkId)}`,
        { headers: getHeaders(resolvedUserId) }
      );

      if (response.status === 404) {
        console.warn('No historical record found for artwork:', artworkId);
        return null;
      }

      if (!response.ok) {
        throw await toApiError(response, 'Failed to fetch artwork details');
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

export const userAPI = {
  async register(username: string, password: string): Promise<{ id: string; username: string }> {
    const response = await fetch(`${API_BASE_URL}/api/users/register`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      throw await toApiError(response, 'Failed to register');
    }

    const data = await response.json();
    const raw = data?.user ?? data;
    const id = String(raw?.id ?? raw?.userId ?? raw?.user_id ?? '');
    const name = String(raw?.username ?? raw?.name ?? '');
    if (!id || !name) {
      throw new ApiError('Invalid user payload', 500);
    }
    return { id, username: name };
  },

  async login(username: string, password: string): Promise<{ id: string; username: string }> {
    const response = await fetch(`${API_BASE_URL}/api/users/login`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      throw await toApiError(response, 'Failed to login');
    }

    const data = await response.json();
    const raw = data?.user ?? data;
    const id = String(raw?.id ?? raw?.userId ?? raw?.user_id ?? '');
    const name = String(raw?.username ?? raw?.name ?? '');
    if (!id || !name) {
      throw new ApiError('Invalid user payload', 500);
    }
    return { id, username: name };
  },
};

function normalizeArtwork(raw: unknown): Artwork {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid artwork payload');
  }

  const record = raw as Record<string, unknown>;
  const artworkId = String(
    record.artworkId ?? record.artwork_id ?? record.id ?? record._id ?? ''
  );
  const id = String(
    record.id ?? record.artworkId ?? record.artwork_id ?? record._id ?? artworkId
  );
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
  const isFavorited = Boolean(
    record.isFavorited ?? record.is_favorited ?? record.favorited ?? false
  );

  return {
    id,
    artworkId,
    title,
    artist,
    imageUrl,
    museumSource,
    isFavorited,
    year: record.year ? String(record.year) : undefined,
    description: record.description ? String(record.description) : undefined,
    viewedAt: record.viewedAt ? String(record.viewedAt) : undefined,
    objectDate: record.objectDate ? String(record.objectDate) : undefined,
    medium: record.medium ? String(record.medium) : undefined,
    dimensions: record.dimensions ? String(record.dimensions) : undefined,
    creditLine: record.creditLine ? String(record.creditLine) : undefined,
  };
}
