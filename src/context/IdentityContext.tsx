import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types';
import { dataService } from '../services/dataService';

/**
 * Identity context — which Assembly user the browser is posting as.
 * The choice is persisted in localStorage (via dataService) and used to
 * attribute comments, replies, and threads. Until one is chosen, posts fall
 * back to the first user (previous behavior: admin in live mode).
 */
interface IdentityContextType {
  currentUser: User | null;
  users: User[];
  setCurrentUser: (id: string | null) => void;
}

const IdentityContext = createContext<IdentityContextType>({
  currentUser: null,
  users: [],
  setCurrentUser: () => {},
});

export const IdentityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUserState] = useState<User | null>(null);

  // main.tsx awaits initDataService() before rendering, so users are
  // already in the cache when this mounts.
  useEffect(() => {
    setUsers(dataService.getUsers());
    setCurrentUserState(dataService.getCurrentUser());
  }, []);

  const setCurrentUser = (id: string | null) => {
    dataService.setCurrentUser(id);
    setCurrentUserState(dataService.getCurrentUser());
  };

  return (
    <IdentityContext.Provider value={{ currentUser, users, setCurrentUser }}>
      {children}
    </IdentityContext.Provider>
  );
};

export const useIdentity = () => useContext(IdentityContext);
