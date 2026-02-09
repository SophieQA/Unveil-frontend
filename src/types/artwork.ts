export interface Artwork {
  id: string;
  artworkId?: string;
  title: string;
  artist: string;
  imageUrl: string;
  museumSource: string;
  isFavorited?: boolean;
  year?: string;
  description?: string;
  viewedAt?: string;
  // Additional detailed fields
  objectDate?: string;
  medium?: string;
  dimensions?: string;
  creditLine?: string;
}

export interface ArtworkResponse {
  artwork: Artwork;
  success: boolean;
}

export interface ViewRecordRequest {
  artworkId: string;
  userId?: string;
  title: string;
  artist: string;
  imageUrl: string;
  museumSource: string;
  year?: string;
  description?: string;
  objectDate?: string;
  medium?: string;
  dimensions?: string;
  creditLine?: string;
}

export interface ArchiveResponse {
  items?: Artwork[];
  artworks?: Artwork[];
  archive?: Artwork[];
  data?: Artwork[];
  results?: Artwork[];
  page?: number;
  limit?: number;
  total?: number;
  count?: number;
}

export interface FavoriteRequest {
  userId: string;
  artworkId: string;
}

export interface FavoritesResponse {
  favorites?: Array<Artwork | { artwork?: Artwork } | { artworkData?: Artwork }>;
  data?: Array<Artwork | { artwork?: Artwork } | { artworkData?: Artwork }>;
  items?: Array<Artwork | { artwork?: Artwork } | { artworkData?: Artwork }>;
  results?: Array<Artwork | { artwork?: Artwork } | { artworkData?: Artwork }>;
  totalCount?: number;
  currentPage?: number;
  pageSize?: number;
  page?: number;
  limit?: number;
  total?: number;
  count?: number;
}
