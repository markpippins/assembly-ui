import React, { createContext, useContext, useState, useEffect } from 'react';

interface TTSContextType {
  isPlaying: boolean;
  activeText: string | null;
  speak: (text: string) => void;
  stop: () => void;
}

const TTSContext = createContext<TTSContextType>({
  isPlaying: false,
  activeText: null,
  speak: () => {},
  stop: () => {},
});

export const TTSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeText, setActiveText] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speak = (text: string) => {
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    if (isPlaying && activeText === text) {
      setIsPlaying(false);
      setActiveText(null);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => {
      setIsPlaying(false);
      setActiveText(null);
    };
    utterance.onerror = () => {
      setIsPlaying(false);
      setActiveText(null);
    };

    setActiveText(text);
    setIsPlaying(true);
    window.speechSynthesis.speak(utterance);
  };

  const stop = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setActiveText(null);
  };

  return (
    <TTSContext.Provider value={{ isPlaying, activeText, speak, stop }}>
      {children}
    </TTSContext.Provider>
  );
};

export const useTTS = () => useContext(TTSContext);
