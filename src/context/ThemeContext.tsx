import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'steel' | 'dark';

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  setTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    return (localStorage.getItem('assembly_theme') as ThemeMode) || 'light';
  });

  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode);
    localStorage.setItem('assembly_theme', mode);
  };

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'steel', 'dark');

    if (theme === 'steel') {
      root.classList.add('steel', 'dark');
    } else if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.add('light');
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

