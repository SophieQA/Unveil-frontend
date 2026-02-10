import { useEffect, useMemo, useRef, useState } from 'react';
import type { Artwork } from '../types/artwork';
import type {
  GalleryLocationDto,
  PlanItemDto,
  RouteResponse,
  TourEventDto,
} from '../types/tourPlan';
import { artworkAPI, galleryAPI, tourPlanAPI, isApiError } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import '../styles/TourPlanPage.css';

const FLOOR_IMAGES: Record<string, string> = {
  '1': '/maps/floor1.png',
  '2': '/maps/floor2.png',
};

const MET_HIGHLIGHT_LINK = 'https://www.metmuseum.org/audio-guide';
const TICKETS_LINK = 'https://engage.metmuseum.org/admission/?promocode=59559';
const VISITOR_GUIDELINES_LINK = 'https://www.metmuseum.org/policies/visitor-guidelines';

type TourPlanTab = 'prep' | 'tours' | 'events' | 'plan';

function sortPlanItems(items: PlanItemDto[]) {
  return [...items].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
}

function formatTimeRange(startTime: string, endTime?: string | null) {
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : null;
  const startText = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (!end) return startText;
  const endText = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${startText} - ${endText}`;
}

function formatDateLabel(value: string) {
  // Parse YYYY-MM-DD as local date to avoid timezone issues
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function TourPlanPage() {
  const { isLoggedIn, userId, openAuthDialog, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TourPlanTab>('prep');
  const [selectedDate, setSelectedDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [tours, setTours] = useState<TourEventDto[]>([]);
  const [events, setEvents] = useState<TourEventDto[]>([]);
  const [planItems, setPlanItems] = useState<PlanItemDto[]>([]);
  const [favorites, setFavorites] = useState<Artwork[]>([]);
  const [galleryLocations, setGalleryLocations] = useState<Record<string, GalleryLocationDto>>({});
  const [searchInput, setSearchInput] = useState('');
  const [searchLocation, setSearchLocation] = useState<GalleryLocationDto | null>(null);
  const [routeData, setRouteData] = useState<RouteResponse | null>(null);
  const [selectedFloor, setSelectedFloor] = useState('1');
  const [mapScale, setMapScale] = useState(1);
  const [mapOffset, setMapOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
  const [mapStageSize, setMapStageSize] = useState({ width: 0, height: 0 });
  const [mapNaturalSize, setMapNaturalSize] = useState<Record<string, { width: number; height: number }>>({});
  const [mapImageError, setMapImageError] = useState<Record<string, boolean>>({});
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mapCanvasRef = useRef<HTMLDivElement>(null);
  const mapStageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapStageRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setMapStageSize({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    observer.observe(mapStageRef.current);
    return () => observer.disconnect();
  }, []);

  const mapBaseScale = useMemo(() => {
    const natural = mapNaturalSize[selectedFloor];
    if (!natural || !mapStageSize.width || !mapStageSize.height) return 1;
    return Math.min(
      mapStageSize.width / natural.width,
      mapStageSize.height / natural.height
    );
  }, [mapNaturalSize, mapStageSize.height, mapStageSize.width, selectedFloor]);

  useEffect(() => {
    const natural = mapNaturalSize[selectedFloor];
    if (!natural) return;
    const width = Math.round(natural.width * mapBaseScale);
    const height = Math.round(natural.height * mapBaseScale);
    setMapSize({ width, height });
  }, [mapBaseScale, mapNaturalSize, selectedFloor]);


  useEffect(() => {
    const loadToursAndEvents = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [tourData, eventData] = await Promise.all([
          tourPlanAPI.getTours({ date: selectedDate, userId: userId ?? undefined }),
          tourPlanAPI.getEvents({ date: selectedDate, userId: userId ?? undefined }),
        ]);
        setTours(tourData);
        setEvents(eventData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tours & events');
      } finally {
        setIsLoading(false);
      }
    };

    void loadToursAndEvents();
  }, [selectedDate, userId]);

  useEffect(() => {
    const loadPlan = async () => {
      if (!isLoggedIn || !userId) {
        setPlanItems([]);
        return;
      }
      try {
        const items = await tourPlanAPI.getMyPlan(userId);
        setPlanItems(sortPlanItems(items));
      } catch (err) {
        if (isApiError(err) && err.status === 401) {
          logout();
          openAuthDialog('login');
          return;
        }
        setError(err instanceof Error ? err.message : 'Failed to load plan');
      }
    };

    void loadPlan();
  }, [isLoggedIn, logout, openAuthDialog, userId]);

  useEffect(() => {
    const loadFavoritesAndGalleries = async () => {
      if (!isLoggedIn || !userId) {
        setFavorites([]);
        setGalleryLocations({});
        return;
      }
      try {
        const response = await artworkAPI.getFavorites({ userId, page: 1, limit: 200 });
        setFavorites(response.items);
        const galleryNumbers = Array.from(
          new Set(response.items.map((item) => item.galleryNumber).filter(Boolean))
        ) as string[];
        const locationEntries = await Promise.all(
          galleryNumbers.map(async (number) => {
            try {
              const location = await galleryAPI.getGalleryByNumber(number);
              return [number, location] as const;
            } catch (err) {
              console.warn('Failed to load gallery location:', number, err);
              return null;
            }
          })
        );
        const nextLocations: Record<string, GalleryLocationDto> = {};
        locationEntries.forEach((entry) => {
          if (entry) {
            const [number, location] = entry;
            nextLocations[number] = location;
          }
        });
        setGalleryLocations(nextLocations);
      } catch (err) {
        console.error('Failed to load favorites:', err);
      }
    };

    void loadFavoritesAndGalleries();
  }, [isLoggedIn, userId]);

  const plannedIds = useMemo(
    () => new Set(planItems.map((item) => item.tourEventId)),
    [planItems]
  );

  const handleAddToPlan = async (item: TourEventDto) => {
    if (!isLoggedIn || !userId) {
      openAuthDialog('login');
      return;
    }
    try {
      console.log('[TourPlan] Adding to plan:', { userId, tourEventId: item.id, item });
      const added = await tourPlanAPI.addToPlan(userId, item.id);
      console.log('[TourPlan] Successfully added to plan:', added);
      setPlanItems((prev) => sortPlanItems([...prev, added]));
      setTours((prev) => prev.map((tour) => (tour.id === item.id ? { ...tour, isInPlan: true } : tour)));
      setEvents((prev) => prev.map((event) => (event.id === item.id ? { ...event, isInPlan: true } : event)));
    } catch (err) {
      console.error('[TourPlan] Failed to add to plan:', err);
      if (isApiError(err) && err.status === 401) {
        logout();
        openAuthDialog('login');
        return;
      }
      alert(err instanceof Error ? err.message : 'Failed to add to plan');
    }
  };

  const handleRemoveFromPlan = async (tourEventId: number) => {
    if (!isLoggedIn || !userId) return;
    try {
      await tourPlanAPI.removeFromPlan(userId, tourEventId);
      setPlanItems((prev) => prev.filter((item) => item.tourEventId !== tourEventId));
      setTours((prev) => prev.map((tour) => (tour.id === tourEventId ? { ...tour, isInPlan: false } : tour)));
      setEvents((prev) => prev.map((event) => (event.id === tourEventId ? { ...event, isInPlan: false } : event)));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove from plan');
    }
  };

  const handleSearchSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalized = searchInput.trim().replace(/\D+/g, '');
    if (!normalized) {
      setSearchLocation(null);
      return;
    }
    try {
      const location = await galleryAPI.getGalleryByNumber(normalized);
      console.log('Search location found:', location);
      setSearchLocation(location);
      setSelectedFloor(location.floor);
    } catch (error) {
      console.error('Gallery search error:', error);
      alert('Gallery not found');
    }
  };

  const handleGenerateRoute = async () => {
    if (!isLoggedIn || !userId) {
      openAuthDialog('login');
      return;
    }
    try {
      const response = await galleryAPI.getRoute(userId);
      setRouteData(response);
      if (response.floors.length > 0) {
        setSelectedFloor(response.floors[0].floor);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to generate route');
    }
  };

  const currentRouteFloor = useMemo(() => {
    if (!routeData) return null;
    return routeData.floors.find((floor) => floor.floor === selectedFloor) ?? null;
  }, [routeData, selectedFloor]);

  const favoriteMarkers = useMemo(() => {
    console.log('Computing favoriteMarkers:', {
      totalFavorites: favorites.length,
      selectedFloor,
      galleryLocationsCount: Object.keys(galleryLocations).length,
      galleryLocations
    });
    
    return favorites
      .map((artwork) => {
        const galleryNumber = artwork.galleryNumber;
        if (!galleryNumber) {
          console.log('Artwork without gallery number:', artwork.title);
          return null;
        }
        const location = galleryLocations[galleryNumber];
        if (!location) {
          console.log('No location found for gallery:', galleryNumber);
          return null;
        }
        if (location.floor !== selectedFloor) {
          console.log('Gallery on different floor:', galleryNumber, 'is on floor', location.floor, 'but selected is', selectedFloor);
          return null;
        }
        console.log('Adding marker for:', artwork.title, 'at gallery', galleryNumber, 'coords:', location.xCoordinate, location.yCoordinate);
        return { artwork, location };
      })
      .filter(Boolean) as Array<{ artwork: Artwork; location: GalleryLocationDto }>;
  }, [favorites, galleryLocations, selectedFloor]);

  const displayMarkers = useMemo(() => {
    const markers = [...favoriteMarkers];
    if (searchLocation && searchLocation.floor === selectedFloor) {
      console.log('Adding search marker:', searchLocation);
      markers.push({
        artwork: {
          id: 'search-marker',
          title: `Gallery ${searchLocation.galleryNumber}`,
          artist: searchLocation.galleryName ?? 'Selected gallery',
          imageUrl: '',
          museumSource: 'The Met',
        },
        location: searchLocation,
      });
    }
    console.log('Total display markers:', markers.length, 'on floor', selectedFloor);
    console.log('Display markers details:', markers.map(m => ({
      title: m.artwork.title,
      gallery: m.location.galleryNumber,
      floor: m.location.floor,
      x: m.location.xCoordinate,
      y: m.location.yCoordinate
    })));
    return markers;
  }, [favoriteMarkers, searchLocation, selectedFloor]);

  const getDisplayCoordinate = (
    value: number,
    axis: 'x' | 'y'
  ) => {
    const natural = mapNaturalSize[selectedFloor];
    const display = axis === 'x' ? mapSize.width : mapSize.height;
    const naturalValue = axis === 'x' ? natural?.width : natural?.height;

    if (!display) return 0;
    if (value <= 1) {
      return value * display;
    }
    if (naturalValue) {
      return (value / naturalValue) * display;
    }
    return value;
  };

  const mapImageSrc = FLOOR_IMAGES[selectedFloor];
  const hasMapImage = Boolean(mapImageSrc) && !mapImageError[selectedFloor];
  const effectiveScale = mapScale * mapBaseScale;

  const handlePanStart = (event: React.PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('.map-marker') || target.closest('.map-zoom-controls')) {
      return;
    }
    if (mapScale <= 1) return;
    event.preventDefault();
    setIsPanning(true);
    setPanStart({ x: event.clientX - mapOffset.x, y: event.clientY - mapOffset.y });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePanMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanning) return;
    setMapOffset({
      x: event.clientX - panStart.x,
      y: event.clientY - panStart.y,
    });
  };

  const handlePanEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanning) return;
    setIsPanning(false);
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <div className="tour-plan-page">
      <header className="tour-plan-hero">
        <div>
          <p className="tour-plan-eyebrow">The Met Fifth Avenue</p>
          <h1>Tour Plan</h1>
          <p className="tour-plan-subtitle">Build a personalized day at The Met with tours, events, and your favorite artworks.</p>
        </div>
        <div className="tour-plan-date">
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
          />
        </div>
      </header>

      <nav className="tour-plan-tabs">
        <button
          type="button"
          className={activeTab === 'prep' ? 'active' : ''}
          onClick={() => setActiveTab('prep')}
        >
          Trip prep
        </button>
        <button
          type="button"
          className={activeTab === 'tours' ? 'active' : ''}
          onClick={() => setActiveTab('tours')}
        >
          Free tours
        </button>
        <button
          type="button"
          className={activeTab === 'events' ? 'active' : ''}
          onClick={() => setActiveTab('events')}
        >
          Events
        </button>
        <button
          type="button"
          className={activeTab === 'plan' ? 'active' : ''}
          onClick={() => setActiveTab('plan')}
        >
          My plan
        </button>
      </nav>

      <section className="tour-plan-content">
        {activeTab === 'prep' && (
          <section className="tour-card">
            <h2>Trip prep</h2>
            <p className="tour-card-text">
              The Metropolitan Museum of Art is one of the world’s most renowned art institutions, spanning 5,000 years of creativity.
            </p>
            <div className="tour-links">
              <a href={TICKETS_LINK} target="_blank" rel="noreferrer">Tickets</a>
              <a href={VISITOR_GUIDELINES_LINK} target="_blank" rel="noreferrer">Visitor Guidelines</a>
            </div>
            <div className="tour-card-block">
              <strong>Address:</strong>
              <div>The Met Fifth Avenue</div>
              <div>1000 Fifth Avenue</div>
              <div>New York, NY 10028</div>
            </div>
            <div className="tour-card-block">
              <strong>Hours:</strong>
              <div>Sunday–Thursday: 10:00 AM - 5:00 PM</div>
              <div>Friday–Saturday: 10:00 AM - 9:00 PM</div>
            </div>
            <div className="tour-highlight">
              <span>Highlight from the Met</span>
              <a href={MET_HIGHLIGHT_LINK} target="_blank" rel="noreferrer">
                Audio Guide →
              </a>
            </div>
          </section>
        )}

        {activeTab === 'tours' && (
          <section className="tour-card">
            <div className="tour-card-header">
              <h2>Free tours</h2>
              <span className="tour-card-caption">{formatDateLabel(selectedDate)}</span>
            </div>
            {isLoading ? (
              <div className="tour-card-state">Loading tours…</div>
            ) : tours.length === 0 ? (
              <div className="tour-card-state">No tours scheduled.</div>
            ) : (
              <div className="tour-card-list">
                {tours.map((tour) => (
                  <div className="tour-item" key={`tour-${tour.id}`}>
                    <div>
                      <p className="tour-item-time">{formatTimeRange(tour.startTime, tour.endTime)}</p>
                      <h3>{tour.title}</h3>
                      {tour.location && <p className="tour-item-meta">{tour.location}</p>}
                      {tour.description && <p className="tour-item-desc">{tour.description}</p>}
                    </div>
                    <button
                      type="button"
                      className="tour-add-btn"
                      disabled={Boolean(tour.isInPlan) || plannedIds.has(tour.id)}
                      onClick={() => handleAddToPlan(tour)}
                    >
                      {tour.isInPlan || plannedIds.has(tour.id) ? '✓' : '+'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === 'events' && (
          <section className="tour-card">
            <div className="tour-card-header">
              <h2>Events</h2>
              <span className="tour-card-caption">{formatDateLabel(selectedDate)}</span>
            </div>
            {isLoading ? (
              <div className="tour-card-state">Loading events…</div>
            ) : events.length === 0 ? (
              <div className="tour-card-state">No events scheduled.</div>
            ) : (
              <div className="tour-card-list">
                {events.map((event) => (
                  <div className="tour-item" key={`event-${event.id}`}>
                    <div>
                      <p className="tour-item-time">{formatTimeRange(event.startTime, event.endTime)}</p>
                      <h3>{event.title}</h3>
                      {event.location && <p className="tour-item-meta">{event.location}</p>}
                      {event.description && <p className="tour-item-desc">{event.description}</p>}
                    </div>
                    <button
                      type="button"
                      className="tour-add-btn"
                      disabled={Boolean(event.isInPlan) || plannedIds.has(event.id)}
                      onClick={() => handleAddToPlan(event)}
                    >
                      {event.isInPlan || plannedIds.has(event.id) ? '✓' : '+'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === 'plan' && (
          <section className="tour-card my-plan">
            <div className="tour-card-header">
              <div>
                <h2>My plan</h2>
                <p className="tour-card-caption">Tours & events sorted by time</p>
              </div>
            </div>

            <div className="my-plan-layout">
              <div className="my-plan-map">
                <div className="map-toolbar">
                  <h3 className="map-title">Museum Map</h3>
                  <div className="floor-switch">
                    {Object.keys(FLOOR_IMAGES).map((floor) => (
                      <button
                        key={floor}
                        type="button"
                        className={selectedFloor === floor ? 'active' : ''}
                        onClick={() => setSelectedFloor(floor)}
                      >
                        Floor {floor}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="map-search-bar">
                  <form className="map-search" onSubmit={handleSearchSubmit}>
                    <input
                      type="text"
                      value={searchInput}
                      onChange={(event) => setSearchInput(event.target.value)}
                      placeholder="Search The Met"
                    />
                    <button type="submit">Search</button>
                  </form>
                </div>

                <div
                  className={`map-stage ${isPanning ? 'is-panning' : ''}`}
                  ref={mapStageRef}
                  onPointerDown={handlePanStart}
                  onPointerMove={handlePanMove}
                  onPointerUp={handlePanEnd}
                  onPointerLeave={handlePanEnd}
                >
                  <div
                    className="map-canvas"
                    ref={mapCanvasRef}
                    style={{
                      transform: `translate(${mapOffset.x}px, ${mapOffset.y}px) scale(${effectiveScale})`,
                      transformOrigin: 'center center',
                    }}
                  >
                    {hasMapImage ? (
                      <img
                        src={mapImageSrc}
                        alt={`The Met floor ${selectedFloor}`}
                        className="map-image"
                        onError={() => {
                          setMapImageError((prev) => ({ ...prev, [selectedFloor]: true }));
                        }}
                        onLoad={(event) => {
                          const target = event.currentTarget;
                          if (!target) return;
                          if (!target.naturalWidth || !target.naturalHeight) return;
                          setMapNaturalSize((prev) => ({
                            ...prev,
                            [selectedFloor]: {
                              width: target.naturalWidth,
                              height: target.naturalHeight,
                            },
                          }));
                        }}
                      />
                    ) : (
                      <div className="map-fallback">Map image not available.</div>
                    )}
                    <svg className="map-route" width={mapSize.width} height={mapSize.height}>
                      {currentRouteFloor?.pathSegments.map((segment, index) => {
                        const x1 = getDisplayCoordinate(segment.start.xCoordinate, 'x');
                        const y1 = getDisplayCoordinate(segment.start.yCoordinate, 'y');
                        const x2 = getDisplayCoordinate(segment.end.xCoordinate, 'x');
                        const y2 = getDisplayCoordinate(segment.end.yCoordinate, 'y');
                        return (
                          <line
                            key={`segment-${index}`}
                            x1={x1}
                            y1={y1}
                            x2={x2}
                            y2={y2}
                            stroke="#ef4444"
                            strokeWidth="3"
                            strokeDasharray="6 6"
                            strokeLinecap="round"
                          />
                        );
                      })}
                    </svg>
                    <div className="map-markers">
                      {displayMarkers.map(({ artwork, location }) => {
                        const left = getDisplayCoordinate(location.xCoordinate, 'x');
                        const top = getDisplayCoordinate(location.yCoordinate, 'y');
                        const isSearch = artwork.id === 'search-marker';
                        console.log(`Rendering marker for ${location.galleryNumber}:`, {
                          title: artwork.title,
                          rawX: location.xCoordinate,
                          rawY: location.yCoordinate,
                          displayLeft: left,
                          displayTop: top,
                          mapSize,
                          mapNaturalSize: mapNaturalSize[selectedFloor]
                        });
                        return (
                          <button
                            key={`${artwork.id}-${location.galleryNumber}`}
                            type="button"
                            className={`map-marker ${isSearch ? 'search-marker' : ''}`}
                            style={{ left: `${left}px`, top: `${top}px` }}
                            onClick={() => setSelectedArtwork(artwork)}
                            title={location.galleryName ?? `Gallery ${location.galleryNumber}`}
                          >
                            {location.galleryNumber}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="map-zoom-controls">
                    <button type="button" onClick={() => setMapScale((prev) => Math.min(prev + 0.2, 2.5))}>
                      +
                    </button>
                    <button type="button" onClick={() => setMapScale((prev) => Math.max(prev - 0.2, 1))}>
                      −
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMapScale(1);
                        setMapOffset({ x: 0, y: 0 });
                      }}
                    >
                      1:1
                    </button>
                  </div>
                </div>

              </div>

              <aside className="my-plan-sidebar">
                {/* Favorites Location List */}
                <div className="favorites-location-list">
                  <h3>Favorite Artworks Locations</h3>
                  {favoriteMarkers.length === 0 ? (
                    <p className="empty-state">No favorites yet</p>
                  ) : (
                    <div className="location-items">
                      {favoriteMarkers.map(({ artwork, location }) => (
                        <button
                          key={artwork.id}
                          type="button"
                          className="location-item"
                          onClick={() => {
                            setSelectedArtwork(artwork);
                            setSelectedFloor(location.floor);
                          }}
                        >
                          <svg width="16" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                            <circle cx="12" cy="9" r="2.5"/>
                          </svg>
                          <div>
                            <strong>Gallery {location.galleryNumber}</strong>
                            <span>Floor {location.floor}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Artwork Details Card */}
                {selectedArtwork && (
                  <div className="artwork-detail-card">
                    <button 
                      type="button" 
                      className="artwork-close"
                      onClick={() => setSelectedArtwork(null)}
                      aria-label="Close"
                    >
                      ✕
                    </button>
                    <h3>Artwork Details</h3>
                    {selectedArtwork.imageUrl && (
                      <div className="artwork-image">
                        <img src={selectedArtwork.imageUrl} alt={selectedArtwork.title} />
                      </div>
                    )}
                    <div className="artwork-info">
                      <h4>{selectedArtwork.title}</h4>
                      <p className="artwork-artist">{selectedArtwork.artist}</p>
                      {selectedArtwork.year && <p className="artwork-year">{selectedArtwork.year}</p>}
                      {selectedArtwork.galleryNumber && (
                        <p className="artwork-gallery">
                          <svg width="16" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                            <circle cx="12" cy="9" r="2.5"/>
                          </svg>
                          Gallery: {selectedArtwork.galleryNumber}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* My Itinerary */}
                <div className="my-itinerary">
                  <h3>My Itinerary</h3>
                  {planItems.length === 0 ? (
                    <p className="empty-state">Add tours and events from the Tour Plan page to your itinerary</p>
                  ) : (
                    <div className="plan-list">
                      {planItems.map((item) => (
                        <div className="plan-item" key={`plan-${item.id}`}>
                          <div>
                            <p className="plan-time">{formatTimeRange(item.startTime, item.endTime)}</p>
                            <h4>{item.title}</h4>
                            {item.location && <p className="plan-meta">{item.location}</p>}
                          </div>
                          <button
                            type="button"
                            className="plan-remove"
                            onClick={() => handleRemoveFromPlan(item.tourEventId)}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* AI 路线按钮 */}
                <button type="button" className="route-btn" onClick={handleGenerateRoute}>
                  AI Route
                </button>

                {routeData && (
                  <div className="route-summary">
                    <h4>AI Route Summary</h4>
                    <p>{routeData.estimatedDuration}</p>
                    <p>{routeData.totalArtworks} favorites included</p>
                  </div>
                )}
              </aside>
            </div>
          </section>
        )}
      </section>

      {error && <div className="tour-plan-error">{error}</div>}
    </div>
  );
}
