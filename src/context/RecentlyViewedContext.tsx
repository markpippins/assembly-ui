import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { dataService } from '../services/dataService';

export interface RecentlyViewedItem {
  id: string;
  title: string;
  type: string;
  path: string;
  timestamp: number;
}

interface RecentlyViewedContextType {
  recentlyViewed: RecentlyViewedItem[];
  addRecentlyViewed: (item: Omit<RecentlyViewedItem, 'timestamp'>) => void;
  clearRecentlyViewed: () => void;
}

const RecentlyViewedContext = createContext<RecentlyViewedContextType | undefined>(undefined);

const STORAGE_KEY = 'assembly_workspace_recently_viewed';

export const RecentlyViewedProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewedItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Fallback
    }
    return [];
  });

  const location = useLocation();

  // Automatically record entities visited based on current path
  useEffect(() => {
    const path = location.pathname;
    if (path === '/' || path === '/feed') return;

    // Check if path matches entity routes like /work-requests/WR-101 or /open-questions/OQ-102 or /forums/infra/thread-1
    const parts = path.split('/').filter(Boolean);
    if (parts.length >= 2) {
      const category = parts[0];
      const id = parts[parts.length - 1];

      // Try searching entity in dataService
      const results = dataService.searchAll(id);
      const match = results.find((r) => r.href === path || r.id === id);

      if (match) {
        addRecentlyViewed({
          id: match.id,
          title: match.title ?? '',
          type: match.type,
          path: match.href,
        });
      } else {
        // Fallback title formatting
        const formattedTitle = id
          .split('-')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');

        addRecentlyViewed({
          id,
          title: `${category.replace('-', ' ').slice(0, -1).toUpperCase()}: ${formattedTitle}`,
          type: category.replace('-', ' '),
          path,
        });
      }
    }
  }, [location.pathname]);

  const addRecentlyViewed = (item: Omit<RecentlyViewedItem, 'timestamp'>) => {
    setRecentlyViewed((prev) => {
      // Filter out duplicate path or ID
      const filtered = prev.filter((i) => i.path !== item.path && i.id !== item.id);
      const updated = [
        { ...item, timestamp: Date.now() },
        ...filtered,
      ].slice(0, 10); // Keep top 10

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Ignore
      }

      return updated;
    });
  };

  const clearRecentlyViewed = () => {
    setRecentlyViewed([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  };

  return (
    <RecentlyViewedContext.Provider
      value={{
        recentlyViewed: recentlyViewed.slice(0, 5), // Return last 5
        addRecentlyViewed,
        clearRecentlyViewed,
      }}
    >
      {children}
    </RecentlyViewedContext.Provider>
  );
};

export const useRecentlyViewed = () => {
  const context = useContext(RecentlyViewedContext);
  if (!context) {
    throw new Error('useRecentlyViewed must be used within a RecentlyViewedProvider');
  }
  return context;
};
