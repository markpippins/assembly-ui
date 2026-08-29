import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { dataService } from '../services/dataService';
import { useLiveData } from './LiveDataContext';

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
  const { version } = useLiveData();

  const currentPath = location.pathname;
  const currentParts = currentPath.split('/').filter(Boolean);
  const currentCategory = currentParts[0];
  const currentId = currentParts[currentParts.length - 1];
  const isCurrentThread = currentCategory === 'forums' && currentParts.length === 3;

  // Automatically record entities visited based on current path
  useEffect(() => {
    if (currentPath === '/' || currentPath === '/feed') return;

    // Check if path matches entity routes like /work-requests/WR-101 or /open-questions/OQ-102 or /forums/infra/thread-1
    if (currentParts.length >= 2) {
      // Try searching entity in dataService
      const results = dataService.searchAll(currentId);
      const match = results.find((r) => r.href === currentPath || r.id === currentId);

      if (match) {
        addRecentlyViewed({
          id: match.id,
          title: match.title ?? '',
          type: match.type,
          path: match.href,
        });
      } else if (isCurrentThread) {
        // Forum thread: try to get the title from cache; if not cached yet,
        // the async fetch fires inside getThread and the second useEffect
        // below will resolve the title when the data version bumps.
        const res = dataService.getThread(currentId);
        addRecentlyViewed({
          id: currentId,
          title: res.thread?.title ?? '',
          type: 'Thread',
          path: currentPath,
        });
      } else {
        // Fallback title formatting
        const formattedTitle = currentId
          .split('-')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
        addRecentlyViewed({
          id: currentId,
          title: formattedTitle,
          type: currentCategory.replace('-', ' '),
          path: currentPath,
        });
      }
    }
  }, [currentPath, currentId, currentCategory, currentParts.length, isCurrentThread]);

  // Dynamically resolve and update fallback titles when data loaded / cache updated
  useEffect(() => {
    if (!currentId || currentPath === '/' || currentPath === '/feed') return;

    setRecentlyViewed((prev) => {
      const itemIdx = prev.findIndex((i) => i.id === currentId);
      if (itemIdx === -1) return prev;

      const item = prev[itemIdx];
      // Re-resolve whenever the title is empty or still a raw fallback
      const isFallback =
        !item.title ||
        item.title.startsWith('FORUM:') ||
        item.title.startsWith('WORK REQUEST:') ||
        item.title.startsWith('REQUIREMENT:') ||
        item.title.startsWith('AGENDA:') ||
        item.title.startsWith('CANDIDATE:') ||
        item.title.startsWith('HARVEST:') ||
        item.title.startsWith('OPEN QUESTION:') ||
        item.title.startsWith('ASSESSMENT:') ||
        item.title.startsWith('OBSERVATION:') ||
        item.title.startsWith('AGENT RECORD:') ||
        item.title.startsWith('SPECIFICATION:') ||
        item.title.startsWith('PLAN:');

      if (!isFallback) return prev;

      let resolvedTitle = '';
      if (isCurrentThread) {
        const res = dataService.getThread(currentId);
        if (res.thread && res.thread.title) {
          resolvedTitle = res.thread.title;
        }
      } else {
        const results = dataService.searchAll(currentId);
        const match = results.find((r) => r.href === currentPath || r.id === currentId);
        if (match && match.title) {
          resolvedTitle = match.title;
        }
      }

      if (resolvedTitle && resolvedTitle !== item.title) {
        const updated = [...prev];
        updated[itemIdx] = {
          ...item,
          title: resolvedTitle,
          type: isCurrentThread ? 'Thread' : item.type,
        };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch {
          // Ignore
        }
        return updated;
      }

      return prev;
    });
  }, [version, currentId, isCurrentThread, currentPath]);

  const addRecentlyViewed = (item: Omit<RecentlyViewedItem, 'timestamp'>) => {
    setRecentlyViewed((prev) => {
      // Filter out duplicate path or ID
      const filtered = prev.filter((i) => i.path !== item.path && i.id !== item.id);
      const updated = [
        { ...item, timestamp: Date.now() },
        ...filtered,
      ].slice(0, 25); // Keep top 25

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
        recentlyViewed: recentlyViewed.slice(0, 15), // Return last 15
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
