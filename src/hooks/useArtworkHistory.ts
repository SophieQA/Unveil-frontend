import { useState, useEffect, useCallback } from 'react';
import type { Artwork } from '../types/artwork';
import { artworkAPI } from '../services/api';

const HISTORY_KEY = 'artwork_history';
const MAX_HISTORY_SIZE = 100;

export function useArtworkHistory() {
  const [history, setHistory] = useState<Artwork[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [isLoading, setIsLoading] = useState(false);

  // Load history from localStorage
  useEffect(() => {
    const loadHistory = () => {
      try {
        const stored = localStorage.getItem(HISTORY_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as Artwork[];
          setHistory(parsed);
          setCurrentIndex(parsed.length - 1);
        }
      } catch (error) {
        console.error('Failed to load history from localStorage:', error);
      }
    };

    loadHistory();
  }, []);

  // Optional: sync history from backend
  useEffect(() => {
    const syncFromBackend = async () => {
      try {
        const serverHistory = await artworkAPI.getHistory();
        if (serverHistory.length > 0) {
          // Merge local and server history, deduplicate
          const merged = mergeHistories(history, serverHistory);
          setHistory(merged);
          setCurrentIndex(merged.length - 1);
          saveToLocalStorage(merged);
        }
      } catch (error) {
        console.warn('Failed to sync history from backend:', error);
      }
    };

    // Sync only on initial load
    if (history.length === 0) {
      syncFromBackend();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Save to localStorage
  const saveToLocalStorage = useCallback((newHistory: Artwork[]) => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
    } catch (error) {
      console.error('Failed to save history to localStorage:', error);
    }
  }, []);

  // Add new artwork to history
  const addToHistory = useCallback((artwork: Artwork) => {
    setHistory((prev) => {
      // If not at end, drop items after current index
      const newHistory = currentIndex < prev.length - 1
        ? prev.slice(0, currentIndex + 1)
        : [...prev];

      // Add new artwork
      const artworkWithTimestamp = {
        ...artwork,
        viewedAt: new Date().toISOString(),
      };

      newHistory.push(artworkWithTimestamp);

      // Limit history size
      if (newHistory.length > MAX_HISTORY_SIZE) {
        newHistory.shift();
      }

      saveToLocalStorage(newHistory);
      return newHistory;
    });

    setCurrentIndex((prev) => Math.min(prev + 1, MAX_HISTORY_SIZE - 1));

    // Record view in background
    artworkAPI.recordView(artwork);
  }, [currentIndex, saveToLocalStorage]);

  // Fetch next random artwork
  const fetchNext = useCallback(async () => {
    setIsLoading(true);
    try {
      const artwork = await artworkAPI.getRandomArtwork();
      addToHistory(artwork);
      return artwork;
    } catch (error) {
      console.error('Failed to fetch random artwork:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [addToHistory]);

  // Go to previous artwork
  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      return history[currentIndex - 1];
    }
    return null;
  }, [currentIndex, history]);

  // Go to next artwork (if any)
  const goToNext = useCallback(() => {
    if (currentIndex < history.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      return history[currentIndex + 1];
    }
    return null;
  }, [currentIndex, history]);

  // Get current artwork
  const getCurrentArtwork = useCallback(() => {
    if (currentIndex >= 0 && currentIndex < history.length) {
      return history[currentIndex];
    }
    return null;
  }, [currentIndex, history]);

  // Merge history (deduplicate)
  function mergeHistories(local: Artwork[], server: Artwork[]): Artwork[] {
    const seen = new Set<string>();
    const merged: Artwork[] = [];

    [...local, ...server].forEach((artwork) => {
      const key = `${artwork.museumSource}-${artwork.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(artwork);
      }
    });

    // Sort by viewedAt
    return merged.sort((a, b) => {
      const timeA = a.viewedAt ? new Date(a.viewedAt).getTime() : 0;
      const timeB = b.viewedAt ? new Date(b.viewedAt).getTime() : 0;
      return timeA - timeB;
    });
  }

  return {
    history,
    currentIndex,
    isLoading,
    currentArtwork: getCurrentArtwork(),
    fetchNext,
    goToPrevious,
    goToNext,
    addToHistory,
    canGoBack: currentIndex > 0,
    canGoForward: currentIndex < history.length - 1,
    isAtStart: currentIndex <= 0,
    isAtEnd: currentIndex >= history.length - 1,
  };
}
