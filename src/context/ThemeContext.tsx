import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeMode = 'light';

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  setTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme] = useState<ThemeMode>('light');

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'steel', 'dark');
    root.classList.add('light');
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme: () => {} }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
