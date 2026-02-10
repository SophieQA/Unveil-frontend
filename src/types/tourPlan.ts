export type TourEventType = 'TOUR' | 'EVENT';

export interface TourEventDto {
  id: number;
  type: TourEventType;
  title: string;
  description?: string | null;
  startTime: string;
  endTime?: string | null;
  location?: string | null;
  sourceUrl?: string | null;
  isInPlan?: boolean;
}

export interface PlanItemDto {
  id: number;
  tourEventId: number;
  type: TourEventType;
  title: string;
  description?: string | null;
  startTime: string;
  endTime?: string | null;
  location?: string | null;
  addedAt: string;
}

export interface GalleryLocationDto {
  galleryNumber: string;
  galleryName?: string | null;
  floor: string;
  xCoordinate: number;
  yCoordinate: number;
  polygonData?: string | null;
}

export interface RoutePoint {
  type: 'artwork' | 'waypoint';
  galleryNumber?: string | null;
  galleryName?: string | null;
  floor: string;
  xCoordinate: number;
  yCoordinate: number;
  artworkId?: string | null;
  artworkTitle?: string | null;
  artworkImageUrl?: string | null;
  description?: string | null;
  order?: number | null;
}

export interface RouteSegment {
  start: RoutePoint;
  end: RoutePoint;
}

export interface RouteFloor {
  floor: string;
  points: RoutePoint[];
  pathSegments: RouteSegment[];
}

export interface RouteResponse {
  floors: RouteFloor[];
  totalArtworks: number;
  estimatedDuration: string;
}
