import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Sun, Moon, Volume2, Cpu, Settings as SettingsIcon, Layers } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useTTS } from '../context/TTSContext';
import { Avatar } from './Avatar';
import { NotificationCenter } from './NotificationCenter';
import { RecentlyViewedDropdown } from './RecentlyViewedDropdown';

interface HeaderProps {
  onOpenSearch?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSearch }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { theme, setTheme } = useTheme();
  const { isPlaying, stop } = useTTS();
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (onOpenSearch) {
      onOpenSearch();
    } else if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full h-14 bg-white/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800/90 backdrop-blur-md px-4 flex items-center justify-between gap-4 transition-colors">
      {/* Brand Logo & Name */}
      <div className="flex items-center gap-3 shrink-0">
        <Link to="/feed" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-sm shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Cpu className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="font-poppins font-bold text-sm tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
              Assembly
              <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                v2.0
              </span>
            </span>
          </div>
        </Link>
      </div>

      {/* Global Search Trigger Bar */}
      <div
        onClick={onOpenSearch}
        className="flex-1 max-w-xl relative cursor-pointer group"
      >
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none group-hover:text-indigo-500 transition-colors" />
        <div className="w-full h-9 pl-9 pr-3 text-xs bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-lg text-slate-400 dark:text-slate-500 flex items-center justify-between transition-all group-hover:border-indigo-500/50 group-hover:ring-2 group-hover:ring-indigo-500/10">
          <span className="truncate">Search work requests, requirements, agendas, questions...</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md shadow-xs shrink-0">
            <span className="text-[11px]">⌘</span>K
          </kbd>
        </div>
      </div>

      {/* Controls & User Profile */}
      <div className="flex items-center gap-2 shrink-0">
        {isPlaying && (
          <button
            onClick={stop}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-rose-50 dark:bg-rose-500/20 border border-rose-200 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 rounded-lg animate-pulse"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>TTS Active</span>
          </button>
        )}

        {/* Theme Selector */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setTheme('light')}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all ${
              theme === 'light'
                ? 'bg-white text-indigo-600 shadow-sm border border-slate-200 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="Light Theme"
          >
            <Sun className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">Light</span>
          </button>
          <button
            onClick={() => setTheme('steel')}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all ${
              theme === 'steel'
                ? 'bg-slate-700 text-white shadow-sm font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="Steel Theme"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Steel</span>
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all ${
              theme === 'dark'
                ? 'bg-slate-900 text-sky-300 shadow-sm border border-slate-700 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="Dark Theme"
          >
            <Moon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">Dark</span>
          </button>
        </div>

        {/* Notification Center */}
        <NotificationCenter />

        {/* Recently Viewed Dropdown */}
        <RecentlyViewedDropdown />

        {/* Settings button */}
        <Link
          to="/settings"
          className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all"
          title="Workspace Settings"
        >
          <SettingsIcon className="w-4 h-4" />
        </Link>

        {/* User Profile Avatar */}
        <Link to="/profile/9abe1316-312e-4a2f-96ad-88c4b86c7b1e" className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800" title="Your Profile">
          <Avatar name="User Contributor" email="mpippins@gmail.com" size="sm" showStatus={true} />
        </Link>
      </div>
    </header>
  );
};

