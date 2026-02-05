export interface Artwork {
  id: string;
  title: string;
  artist: string;
  imageUrl: string;
  museumSource: string;
  year?: string;
  description?: string;
  viewedAt?: string;
}

export interface ArtworkResponse {
  artwork: Artwork;
  success: boolean;
}

export interface ViewRecordRequest {
  artworkId: string;
  title: string;
  artist: string;
  imageUrl: string;
  museumSource: string;
}
